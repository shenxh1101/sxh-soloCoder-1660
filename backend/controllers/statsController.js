const moment = require('moment');
const ExcelJS = require('exceljs');
const { db, findAll, populateUser, findById } = require('../config/nedb');
const { repairTypeMap, statusMap, formatDuration } = require('../utils/common');

const safeNum = (v, defaultValue = 0) => {
  if (v === null || v === undefined || isNaN(Number(v))) return defaultValue;
  return Number(v);
};

const round2 = (v) => Math.round(v * 10) / 10;

const avg = (arr) => {
  const valid = arr.filter(v => v !== null && v !== undefined && !isNaN(Number(v)));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + Number(v), 0) / valid.length;
};

const filterOrdersByRange = (orders, startDate, endDate) => {
  let result = [...orders];
  if (startDate) {
    const sd = new Date(startDate);
    result = result.filter(o => new Date(o.createdAt) >= sd);
  }
  if (endDate) {
    const ed = new Date(endDate + ' 23:59:59');
    result = result.filter(o => new Date(o.createdAt) <= ed);
  }
  return result;
};

const getDashboardStats = async (req, res, next) => {
  try {
    const today = moment().startOf('day').toDate();
    const weekAgo = moment().subtract(7, 'days').startOf('day').toDate();
    const monthAgo = moment().subtract(30, 'days').startOf('day').toDate();

    const allUsers = await findAll(db.users, {});
    const allOrders = await findAll(db.orders, {});

    const usersMap = {};
    allUsers.forEach(u => { usersMap[u._id] = u; });

    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
    const processingOrders = allOrders.filter(o => ['assigned', 'processing'].includes(o.status)).length;
    const completedOrders = allOrders.filter(o => ['completed', 'closed'].includes(o.status)).length;
    const todayNewOrders = allOrders.filter(o => new Date(o.createdAt) >= today).length;

    const responseTimes = allOrders.map(o => o.responseTime);
    const completionTimes = allOrders.map(o => o.completionTime);
    const avgResponseTime = Math.round(safeNum(avg(responseTimes)));
    const avgCompletionTime = Math.round(safeNum(avg(completionTimes)));

    const activeWorkers = allUsers.filter(u => u.role === 'worker' && u.status === 'active');
    const busyWorkers = activeWorkers.filter(w => w.workStatus === 'busy' || safeNum(w.currentOrderCount) >= 2).length;
    const totalWorkers = activeWorkers.length;

    const monthOrders = allOrders.filter(o => new Date(o.createdAt) >= monthAgo);
    const repairTypeStats = {};
    monthOrders.forEach(o => {
      const t = o.repairType || 'other';
      if (!repairTypeStats[t]) {
        repairTypeStats[t] = { count: 0, responseTimes: [], completionTimes: [], totalTimes: [] };
      }
      repairTypeStats[t].count += 1;
      repairTypeStats[t].responseTimes.push(o.responseTime);
      repairTypeStats[t].completionTimes.push(o.completionTime);
      repairTypeStats[t].totalTimes.push(o.totalTime);
    });
    const repairTypeStatsList = Object.keys(repairTypeStats).map(t => ({
      _id: t,
      count: repairTypeStats[t].count,
      avgResponse: Math.round(safeNum(avg(repairTypeStats[t].responseTimes))),
      avgCompletion: Math.round(safeNum(avg(repairTypeStats[t].completionTimes))),
      avgTotal: Math.round(safeNum(avg(repairTypeStats[t].totalTimes)))
    })).sort((a, b) => b.count - a.count);

    const statusDist = {};
    allOrders.forEach(o => {
      statusDist[o.status] = (statusDist[o.status] || 0) + 1;
    });
    const statusDistribution = Object.keys(statusDist).map(s => ({
      _id: s,
      count: statusDist[s]
    }));

    const dailyMap = {};
    const weekOrders = allOrders.filter(o => new Date(o.createdAt) >= weekAgo);
    weekOrders.forEach(o => {
      const date = new Date(o.createdAt).toISOString().slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = { count: 0, completed: 0 };
      dailyMap[date].count += 1;
      if (['completed', 'closed'].includes(o.status)) dailyMap[date].completed += 1;
    });
    const dailyTrend = Object.keys(dailyMap).sort().map(d => ({
      _id: d,
      count: dailyMap[d].count,
      completed: dailyMap[d].completed
    }));

    const lastMonthOrders = allOrders.filter(o => new Date(o.createdAt) >= monthAgo && o.worker);
    const workerAgg = {};
    lastMonthOrders.forEach(o => {
      const wid = String(o.worker);
      if (!workerAgg[wid]) {
        workerAgg[wid] = { totalOrders: 0, completedOrders: 0, responseTimes: [], completionTimes: [], ratings: [] };
      }
      workerAgg[wid].totalOrders += 1;
      if (['completed', 'closed'].includes(o.status)) workerAgg[wid].completedOrders += 1;
      workerAgg[wid].responseTimes.push(o.responseTime);
      workerAgg[wid].completionTimes.push(o.completionTime);
      if (o.rating && o.rating.score) workerAgg[wid].ratings.push(o.rating.score);
    });
    const workerStats = Object.keys(workerAgg).map(wid => {
      const info = usersMap[wid];
      const a = workerAgg[wid];
      const avgR = avg(a.ratings);
      return {
        workerId: wid,
        workerName: info ? info.name : '已删除',
        totalOrders: a.totalOrders,
        completedOrders: a.completedOrders,
        avgResponse: Math.round(safeNum(avg(a.responseTimes))),
        avgCompletion: Math.round(safeNum(avg(a.completionTimes))),
        avgRating: avgR === null ? '暂无' : round2(avgR).toFixed(1)
      };
    }).sort((a, b) => b.totalOrders - a.totalOrders);

    res.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          pendingOrders,
          processingOrders,
          completedOrders,
          todayNewOrders,
          avgResponseTime,
          avgCompletionTime,
          totalWorkers,
          busyWorkers
        },
        repairTypeStats: repairTypeStatsList.map(item => ({
          repairType: item._id,
          repairTypeName: repairTypeMap[item._id] || '其他',
          count: item.count,
          avgResponse: item.avgResponse,
          avgCompletion: item.avgCompletion,
          avgTotal: item.avgTotal
        })),
        statusDistribution: statusDistribution.map(item => ({
          status: item._id,
          statusName: statusMap[item._id] || item._id,
          count: item.count
        })),
        dailyTrend,
        workerStats
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRepairTypeStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let allOrders = await findAll(db.orders, {});
    allOrders = filterOrdersByRange(allOrders, startDate, endDate);

    const typeMap = {};
    allOrders.forEach(o => {
      const t = o.repairType || 'other';
      if (!typeMap[t]) {
        typeMap[t] = { total: 0, completed: 0, responseTimes: [], completionTimes: [], totalTimes: [], ratings: [] };
      }
      typeMap[t].total += 1;
      if (['completed', 'closed'].includes(o.status)) typeMap[t].completed += 1;
      typeMap[t].responseTimes.push(o.responseTime);
      typeMap[t].completionTimes.push(o.completionTime);
      typeMap[t].totalTimes.push(o.totalTime);
      if (o.rating && o.rating.score) typeMap[t].ratings.push(o.rating.score);
    });

    const result = Object.keys(typeMap).map(t => {
      const d = typeMap[t];
      const avgRating = avg(d.ratings);
      const completionRate = d.total > 0 ? ((d.completed / d.total) * 100).toFixed(1) + '%' : '0%';
      return {
        _id: t,
        repairType: t,
        repairTypeName: repairTypeMap[t] || '其他',
        total: d.total,
        completed: d.completed,
        completionRate,
        avgResponseTimeNum: Math.round(safeNum(avg(d.responseTimes))),
        avgCompletionTimeNum: Math.round(safeNum(avg(d.completionTimes))),
        avgTotalTimeNum: Math.round(safeNum(avg(d.totalTimes))),
        avgResponseTime: formatDuration(Math.round(safeNum(avg(d.responseTimes)))),
        avgCompletionTime: formatDuration(Math.round(safeNum(avg(d.completionTimes)))),
        avgTotalTime: formatDuration(Math.round(safeNum(avg(d.totalTimes)))),
        avgResponseTimeMinutes: Math.round(safeNum(avg(d.responseTimes))),
        avgCompletionTimeMinutes: Math.round(safeNum(avg(d.completionTimes))),
        avgRating: avgRating === null ? '暂无' : round2(avgRating).toFixed(1)
      };
    }).sort((a, b) => b.total - a.total);

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

    const allUsers = await findAll(db.users, {});
    const usersMap = {};
    allUsers.forEach(u => { usersMap[u._id] = u; });

    let allOrders = await findAll(db.orders, {});
    allOrders = filterOrdersByRange(allOrders, startDate, endDate);
    const workerOrders = allOrders.filter(o => o.worker);

    const workerAgg = {};
    workerOrders.forEach(o => {
      const wid = String(o.worker);
      if (!workerAgg[wid]) {
        workerAgg[wid] = {
          totalOrders: 0,
          completedOrders: 0,
          processingOrders: 0,
          responseTimes: [],
          completionTimes: [],
          totalTimes: [],
          ratings: [],
          ratingCount: 0
        };
      }
      workerAgg[wid].totalOrders += 1;
      if (['completed', 'closed'].includes(o.status)) workerAgg[wid].completedOrders += 1;
      if (['assigned', 'processing'].includes(o.status)) workerAgg[wid].processingOrders += 1;
      workerAgg[wid].responseTimes.push(o.responseTime);
      workerAgg[wid].completionTimes.push(o.completionTime);
      workerAgg[wid].totalTimes.push(o.totalTime);
      if (o.rating && o.rating.score) {
        workerAgg[wid].ratings.push(o.rating.score);
        workerAgg[wid].ratingCount += 1;
      }
    });

    const result = Object.keys(workerAgg).map(wid => {
      const info = usersMap[wid];
      const a = workerAgg[wid];
      const avgR = avg(a.ratings);
      const completionRate = a.totalOrders > 0
        ? ((a.completedOrders / a.totalOrders) * 100).toFixed(1) + '%'
        : '0%';
      const avgRT = Math.round(safeNum(avg(a.responseTimes)));
      const avgCT = Math.round(safeNum(avg(a.completionTimes)));
      const avgTT = Math.round(safeNum(avg(a.totalTimes)));
      return {
        workerId: wid,
        _id: wid,
        workerName: info ? info.name : '已删除',
        workerPhone: info ? info.phone : '',
        workerSkills: info ? (info.skills || []) : [],
        workStatus: info ? (info.workStatus || 'free') : 'free',
        currentOrderCount: info ? safeNum(info.currentOrderCount) : 0,
        totalOrders: a.totalOrders,
        completedOrders: a.completedOrders,
        processingOrders: a.processingOrders,
        completionRate,
        avgResponseTimeMinutes: avgRT,
        avgCompletionTimeMinutes: avgCT,
        avgTotalTimeMinutes: avgTT,
        avgResponseTime: formatDuration(avgRT),
        avgCompletionTime: formatDuration(avgCT),
        avgTotalTime: formatDuration(avgTT),
        avgRating: avgR === null ? '暂无' : round2(avgR).toFixed(1),
        avgRatingNum: avgR === null ? null : round2(avgR),
        totalRatingCount: a.ratingCount
      };
    }).sort((a, b) => b.totalOrders - a.totalOrders);

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
    const { startDate, endDate, status, repairType, keyword } = req.query;

    const allUsers = await findAll(db.users, {});
    const usersMap = {};
    allUsers.forEach(u => { usersMap[u._id] = u; });

    let orders = await findAll(db.orders, {});

    if (startDate) {
      const sd = new Date(startDate);
      orders = orders.filter(o => new Date(o.createdAt) >= sd);
    }
    if (endDate) {
      const ed = new Date(endDate + ' 23:59:59');
      orders = orders.filter(o => new Date(o.createdAt) <= ed);
    }
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    if (repairType) {
      orders = orders.filter(o => o.repairType === repairType);
    }
    if (keyword) {
      const kw = String(keyword).toLowerCase();
      orders = orders.filter(o => {
        const ownerName = usersMap[o.owner] ? usersMap[o.owner].name : '';
        const workerName = o.worker && usersMap[o.worker] ? usersMap[o.worker].name : '';
        return (
          String(o.orderNo || '').toLowerCase().includes(kw) ||
          String(o.title || '').toLowerCase().includes(kw) ||
          String(ownerName || '').toLowerCase().includes(kw) ||
          String(workerName || '').toLowerCase().includes(kw)
        );
      });
    }

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
      { header: '满意度评分', key: 'rating', width: 12 },
      { header: '评价内容', key: 'comment', width: 30 }
    ];

    const priorityMap = { low: '低', medium: '中', high: '高', urgent: '紧急' };

    orders.forEach(order => {
      const owner = usersMap[order.owner];
      const worker = order.worker ? usersMap[order.worker] : null;
      const rt = safeNum(order.responseTime);
      const ct = safeNum(order.completionTime);
      const tt = safeNum(order.totalTime);
      worksheet.addRow({
        orderNo: order.orderNo,
        repairTypeName: repairTypeMap[order.repairType] || order.repairTypeName,
        title: order.title,
        description: order.description,
        ownerName: owner ? owner.name : '',
        ownerPhone: owner ? (owner.phone || '') : '',
        location: `${order.location?.building || ''}${order.location?.room || ''}`,
        statusName: statusMap[order.status] || order.status,
        priority: priorityMap[order.priority] || order.priority,
        workerName: worker ? worker.name : '',
        createdAt: order.createdAt ? moment(order.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
        assignedAt: order.assignedAt ? moment(order.assignedAt).format('YYYY-MM-DD HH:mm:ss') : '',
        startedAt: order.startedAt ? moment(order.startedAt).format('YYYY-MM-DD HH:mm:ss') : '',
        completedAt: order.completedAt ? moment(order.completedAt).format('YYYY-MM-DD HH:mm:ss') : '',
        responseTime: rt,
        completionTime: ct,
        totalTime: tt,
        repairDesc: order.repairResult?.description || '',
        rating: order.rating?.score ? order.rating.score + '分' : '',
        comment: order.rating?.comment || ''
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8EAED' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D5DD' } },
          left: { style: 'thin', color: { argb: 'FFD0D5DD' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D5DD' } },
          right: { style: 'thin', color: { argb: 'FFD0D5DD' } }
        };
      });
    });

    const filename = `报修工单明细_${moment().format('YYYYMMDDHHmmss')}.xlsx`;
    const asciiFilename = `repair_orders_${moment().format('YYYYMMDDHHmmss')}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);

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
