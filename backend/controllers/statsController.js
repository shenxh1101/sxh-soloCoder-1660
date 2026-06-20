const moment = require('moment');
const ExcelJS = require('exceljs');
const RepairOrder = require('../models/RepairOrder');
const User = require('../models/User');
const { repairTypeMap, statusMap, formatDuration } = require('../utils/common');

const getDashboardStats = async (req, res, next) => {
  try {
    const today = moment().startOf('day');
    const weekAgo = moment().subtract(7, 'days').startOf('day');
    const monthAgo = moment().subtract(30, 'days').startOf('day');

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      todayNewOrders,
      avgResponseTime,
      avgCompletionTime,
      totalWorkers,
      busyWorkers
    ] = await Promise.all([
      RepairOrder.countDocuments(),
      RepairOrder.countDocuments({ status: 'pending' }),
      RepairOrder.countDocuments({ status: { $in: ['assigned', 'processing'] } }),
      RepairOrder.countDocuments({ status: { $in: ['completed', 'closed'] } }),
      RepairOrder.countDocuments({ createdAt: { $gte: today.toDate() } }),
      RepairOrder.aggregate([
        { $match: { responseTime: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$responseTime' } } }
      ]),
      RepairOrder.aggregate([
        { $match: { completionTime: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$completionTime' } } }
      ]),
      User.countDocuments({ role: 'worker', status: 'active' }),
      User.countDocuments({ role: 'worker', status: 'active', workStatus: 'busy' })
    ]);

    const repairTypeStats = await RepairOrder.aggregate([
      { $match: { createdAt: { $gte: monthAgo.toDate() } } },
      {
        $group: {
          _id: '$repairType',
          count: { $sum: 1 },
          avgResponse: { $avg: '$responseTime' },
          avgCompletion: { $avg: '$completionTime' },
          avgTotal: { $avg: '$totalTime' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const statusDistribution = await RepairOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const dailyTrend = await RepairOrder.aggregate([
      { $match: { createdAt: { $gte: weekAgo.toDate() } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $in: ['$status', ['completed', 'closed']] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const workerStats = await RepairOrder.aggregate([
      {
        $match: {
          worker: { $exists: true },
          createdAt: { $gte: monthAgo.toDate() }
        }
      },
      {
        $group: {
          _id: '$worker',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: {
              $cond: [{ $in: ['$status', ['completed', 'closed']] }, 1, 0]
            }
          },
          avgResponse: { $avg: '$responseTime' },
          avgCompletion: { $avg: '$completionTime' },
          avgRating: { $avg: '$rating.score' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'workerInfo'
        }
      },
      {
        $project: {
          _id: 0,
          workerId: '$_id',
          workerName: { $arrayElemAt: ['$workerInfo.name', 0] },
          totalOrders: 1,
          completedOrders: 1,
          avgResponse: 1,
          avgCompletion: 1,
          avgRating: 1
        }
      },
      { $sort: { totalOrders: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          pendingOrders,
          processingOrders,
          completedOrders,
          todayNewOrders,
          avgResponseTime: avgResponseTime[0]?.avg ? Math.round(avgResponseTime[0].avg) : 0,
          avgCompletionTime: avgCompletionTime[0]?.avg ? Math.round(avgCompletionTime[0].avg) : 0,
          totalWorkers,
          busyWorkers
        },
        repairTypeStats: repairTypeStats.map(item => ({
          repairType: item._id,
          repairTypeName: repairTypeMap[item._id] || '其他',
          count: item.count,
          avgResponse: item.avgResponse ? Math.round(item.avgResponse) : 0,
          avgCompletion: item.avgCompletion ? Math.round(item.avgCompletion) : 0,
          avgTotal: item.avgTotal ? Math.round(item.avgTotal) : 0
        })),
        statusDistribution: statusDistribution.map(item => ({
          status: item._id,
          statusName: statusMap[item._id] || item._id,
          count: item.count
        })),
        dailyTrend,
        workerStats: workerStats.map(item => ({
          ...item,
          avgResponse: item.avgResponse ? Math.round(item.avgResponse) : 0,
          avgCompletion: item.avgCompletion ? Math.round(item.avgCompletion) : 0,
          avgRating: item.avgRating ? item.avgRating.toFixed(1) : '暂无'
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRepairTypeStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const match = {};
    if (startDate) {
      match.createdAt = { ...match.createdAt, $gte: new Date(startDate) };
    }
    if (endDate) {
      match.createdAt = { ...match.createdAt, $lte: new Date(endDate) };
    }

    const stats = await RepairOrder.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$repairType',
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $in: ['$status', ['completed', 'closed']] }, 1, 0]
            }
          },
          avgResponseTime: { $avg: '$responseTime' },
          avgCompletionTime: { $avg: '$completionTime' },
          avgTotalTime: { $avg: '$totalTime' },
          avgRating: { $avg: '$rating.score' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const result = stats.map(item => ({
      repairType: item._id,
      repairTypeName: repairTypeMap[item._id] || '其他',
      total: item.total,
      completed: item.completed,
      completionRate: ((item.completed / item.total) * 100).toFixed(1) + '%',
      avgResponseTime: item.avgResponseTime ? formatDuration(Math.round(item.avgResponseTime)) : '未计算',
      avgCompletionTime: item.avgCompletionTime ? formatDuration(Math.round(item.avgCompletionTime)) : '未计算',
      avgTotalTime: item.avgTotalTime ? formatDuration(Math.round(item.avgTotalTime)) : '未计算',
      avgRating: item.avgRating ? item.avgRating.toFixed(1) : '暂无'
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getWorkerStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const match = { worker: { $exists: true } };
    if (startDate) {
      match.createdAt = { ...match.createdAt, $gte: new Date(startDate) };
    }
    if (endDate) {
      match.createdAt = { ...match.createdAt, $lte: new Date(endDate) };
    }

    const stats = await RepairOrder.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$worker',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: {
              $cond: [{ $in: ['$status', ['completed', 'closed']] }, 1, 0]
            }
          },
          processingOrders: {
            $sum: {
              $cond: [{ $in: ['$status', ['assigned', 'processing']] }, 1, 0]
            }
          },
          avgResponseTime: { $avg: '$responseTime' },
          avgCompletionTime: { $avg: '$completionTime' },
          avgTotalTime: { $avg: '$totalTime' },
          avgRating: { $avg: '$rating.score' },
          totalRatingCount: {
            $sum: {
              $cond: [{ $ne: ['$rating.score', undefined] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'worker'
        }
      },
      {
        $unwind: '$worker'
      },
      {
        $project: {
          _id: 0,
          workerId: '$_id',
          workerName: '$worker.name',
          workerPhone: '$worker.phone',
          workerSkills: '$worker.skills',
          workStatus: '$worker.workStatus',
          currentOrderCount: '$worker.currentOrderCount',
          totalOrders: 1,
          completedOrders: 1,
          processingOrders: 1,
          avgResponseTime: 1,
          avgCompletionTime: 1,
          avgTotalTime: 1,
          avgRating: 1,
          totalRatingCount: 1
        }
      },
      { $sort: { totalOrders: -1 } }
    ]);

    const result = stats.map(item => ({
      ...item,
      completionRate: ((item.completedOrders / item.totalOrders) * 100).toFixed(1) + '%',
      avgResponseTime: item.avgResponseTime ? formatDuration(Math.round(item.avgResponseTime)) : '未计算',
      avgCompletionTime: item.avgCompletionTime ? formatDuration(Math.round(item.avgCompletionTime)) : '未计算',
      avgTotalTime: item.avgTotalTime ? formatDuration(Math.round(item.avgTotalTime)) : '未计算',
      avgRating: item.avgRating ? item.avgRating.toFixed(1) : '暂无'
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const exportOrders = async (req, res, next) => {
  try {
    const { startDate, endDate, status, repairType } = req.query;

    const query = {};
    if (startDate) query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };
    if (status) query.status = status;
    if (repairType) query.repairType = repairType;

    const orders = await RepairOrder.find(query)
      .populate('owner', 'name phone building room')
      .populate('worker', 'name phone')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('报修工单明细');

    worksheet.columns = [
      { header: '工单号', key: 'orderNo', width: 20 },
      { header: '报修类型', key: 'repairTypeName', width: 12 },
      { header: '标题', key: 'title', width: 20 },
      { header: '报修描述', key: 'description', width: 30 },
      { header: '报修人', key: 'ownerName', width: 12 },
      { header: '联系电话', key: 'ownerPhone', width: 15 },
      { header: '报修位置', key: 'location', width: 20 },
      { header: '状态', key: 'statusName', width: 10 },
      { header: '优先级', key: 'priority', width: 10 },
      { header: '维修师傅', key: 'workerName', width: 12 },
      { header: '提交时间', key: 'createdAt', width: 20 },
      { header: '派单时间', key: 'assignedAt', width: 20 },
      { header: '开始时间', key: 'startedAt', width: 20 },
      { header: '完成时间', key: 'completedAt', width: 20 },
      { header: '响应时长(分钟)', key: 'responseTime', width: 15 },
      { header: '处理时长(分钟)', key: 'completionTime', width: 15 },
      { header: '总时长(分钟)', key: 'totalTime', width: 15 },
      { header: '维修说明', key: 'repairDesc', width: 30 },
      { header: '评分', key: 'rating', width: 8 },
      { header: '评价内容', key: 'comment', width: 30 }
    ];

    const priorityMap = { low: '低', medium: '中', high: '高', urgent: '紧急' };

    orders.forEach(order => {
      worksheet.addRow({
        orderNo: order.orderNo,
        repairTypeName: order.repairTypeName,
        title: order.title,
        description: order.description,
        ownerName: order.owner?.name || '',
        ownerPhone: order.owner?.phone || '',
        location: `${order.location?.building || ''}${order.location?.room || ''}`,
        statusName: statusMap[order.status] || order.status,
        priority: priorityMap[order.priority] || order.priority,
        workerName: order.worker?.name || '',
        createdAt: order.createdAt ? moment(order.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
        assignedAt: order.assignedAt ? moment(order.assignedAt).format('YYYY-MM-DD HH:mm:ss') : '',
        startedAt: order.startedAt ? moment(order.startedAt).format('YYYY-MM-DD HH:mm:ss') : '',
        completedAt: order.completedAt ? moment(order.completedAt).format('YYYY-MM-DD HH:mm:ss') : '',
        responseTime: order.responseTime || '',
        completionTime: order.completionTime || '',
        totalTime: order.totalTime || '',
        repairDesc: order.repairResult?.description || '',
        rating: order.rating?.score || '',
        comment: order.rating?.comment || ''
      });
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8EAED' }
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=报修工单报表_${moment().format('YYYYMMDDHHmmss')}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getRepairTypeStats,
  getWorkerStats,
  exportOrders
};
