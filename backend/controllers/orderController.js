const moment = require('moment');
const RepairOrder = require('../models/RepairOrder');
const User = require('../models/User');
const { generateOrderNo, repairTypeMap, statusMap, calculateDuration } = require('../utils/common');
const wechatService = require('../services/wechatService');

const createOrder = async (req, res, next) => {
  try {
    const { repairType, title, description, building, room, contactName, contactPhone, priority } = req.body;

    if (!repairType || !title || !description) {
      return res.status(400).json({
        success: false,
        message: '报修类型、标题和描述不能为空'
      });
    }

    const images = req.files?.map(file => `/uploads/${file.fieldname}/${file.filename}`) || [];

    const orderNo = generateOrderNo();

    const owner = await User.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const order = new RepairOrder({
      orderNo,
      owner: req.user.id,
      repairType,
      repairTypeName: repairTypeMap[repairType] || '其他',
      title,
      description,
      images,
      location: {
        building: building || owner.building,
        room: room || owner.room
      },
      contact: {
        name: contactName || owner.name,
        phone: contactPhone || owner.phone
      },
      priority: priority || 'medium',
      status: 'pending',
      timeline: [{
        status: 'pending',
        title: '工单已提交',
        description: '等待客服派单',
        operator: req.user.id,
        operatorName: owner.name
      }]
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: '报修提交成功',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const getOrderList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, status, repairType, startDate, endDate } = req.query;

    const query = {};

    if (req.user.role === 'owner') {
      query.owner = req.user.id;
    } else if (req.user.role === 'worker') {
      query.worker = req.user.id;
    }

    if (status) {
      query.status = status;
    }

    if (repairType) {
      query.repairType = repairType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * pageSize;

    const orders = await RepairOrder.find(query)
      .populate('owner', 'name phone building room')
      .populate('worker', 'name phone skills')
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));

    const total = await RepairOrder.countDocuments(query);

    res.json({
      success: true,
      data: {
        list: orders,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await RepairOrder.findById(id)
      .populate('owner', 'name phone building room avatar')
      .populate('worker', 'name phone skills avatar')
      .populate('assignedBy', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    if (req.user.role === 'owner' && order.owner._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权查看该工单'
      });
    }

    if (req.user.role === 'worker' && order.worker?._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权查看该工单'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const assignOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { workerId, remark } = req.body;

    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: '请选择维修师傅'
      });
    }

    const order = await RepairOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该工单状态不允许派单'
      });
    }

    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker' || worker.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: '无效的维修师傅'
      });
    }

    const assignedBy = await User.findById(req.user.id);

    order.worker = workerId;
    order.status = 'assigned';
    order.assignedAt = new Date();
    order.assignedBy = req.user.id;
    order.remark = remark;
    order.responseTime = calculateDuration(order.createdAt, order.assignedAt);

    order.timeline.push({
      status: 'assigned',
      title: '工单已派单',
      description: `已派单给维修师傅：${worker.name}`,
      operator: req.user.id,
      operatorName: assignedBy.name
    });

    worker.currentOrderCount = (worker.currentOrderCount || 0) + 1;
    worker.workStatus = worker.currentOrderCount >= 3 ? 'busy' : 'free';
    await worker.save();

    await order.save();

    if (worker.openid) {
      await wechatService.sendRepairStatusNotification(
        worker.openid,
        order.orderNo,
        '已派单',
        order.repairTypeName,
        assignedBy.name,
        moment(order.assignedAt).format('YYYY-MM-DD HH:mm')
      );
    }

    const owner = await User.findById(order.owner);
    if (owner.openid) {
      await wechatService.sendRepairStatusNotification(
        owner.openid,
        order.orderNo,
        '已派单',
        order.repairTypeName,
        worker.name,
        moment(order.assignedAt).format('YYYY-MM-DD HH:mm')
      );
    }

    res.json({
      success: true,
      message: '派单成功',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const startProcessing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await RepairOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    if (order.worker.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权处理该工单'
      });
    }

    if (order.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: '该工单状态不允许开始处理'
      });
    }

    const worker = await User.findById(req.user.id);

    order.status = 'processing';
    order.startedAt = new Date();

    order.timeline.push({
      status: 'processing',
      title: '开始维修',
      description: '维修师傅已开始处理',
      operator: req.user.id,
      operatorName: worker.name
    });

    await order.save();

    const owner = await User.findById(order.owner);
    if (owner.openid) {
      await wechatService.sendRepairStatusNotification(
        owner.openid,
        order.orderNo,
        '处理中',
        order.repairTypeName,
        worker.name,
        moment(order.startedAt).format('YYYY-MM-DD HH:mm')
      );
    }

    res.json({
      success: true,
      message: '已开始处理',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const completeOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: '请填写维修说明'
      });
    }

    const order = await RepairOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    if (order.worker.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权处理该工单'
      });
    }

    if (order.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: '该工单状态不允许完成'
      });
    }

    const images = req.files?.map(file => `/uploads/${file.fieldname}/${file.filename}`) || [];
    const worker = await User.findById(req.user.id);

    order.status = 'completed';
    order.completedAt = new Date();
    order.repairResult = {
      description,
      images
    };

    if (order.startedAt) {
      order.completionTime = calculateDuration(order.startedAt, order.completedAt);
    }
    order.totalTime = calculateDuration(order.createdAt, order.completedAt);

    order.timeline.push({
      status: 'completed',
      title: '维修完成',
      description: '维修已完成，等待业主确认',
      operator: req.user.id,
      operatorName: worker.name
    });

    worker.currentOrderCount = Math.max(0, (worker.currentOrderCount || 0) - 1);
    worker.workStatus = worker.currentOrderCount === 0 ? 'free' : (worker.currentOrderCount >= 3 ? 'busy' : 'free');
    await worker.save();

    await order.save();

    const owner = await User.findById(order.owner);
    if (owner.openid) {
      await wechatService.sendRepairStatusNotification(
        owner.openid,
        order.orderNo,
        '已完成',
        order.repairTypeName,
        worker.name,
        moment(order.completedAt).format('YYYY-MM-DD HH:mm')
      );
    }

    res.json({
      success: true,
      message: '工单已完成',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const rateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { score, comment } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: '评分必须在1-5之间'
      });
    }

    const order = await RepairOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    if (order.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权评价该工单'
      });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '该工单状态不允许评价'
      });
    }

    const owner = await User.findById(req.user.id);

    order.rating = {
      score,
      comment,
      ratedAt: new Date()
    };

    order.timeline.push({
      status: 'closed',
      title: '业主已评价',
      description: `评分：${score}星${comment ? '，评价：' + comment : ''}`,
      operator: req.user.id,
      operatorName: owner.name
    });

    order.status = 'closed';
    order.closedAt = new Date();

    await order.save();

    res.json({
      success: true,
      message: '评价成功',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await RepairOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    if (order.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权取消该工单'
      });
    }

    if (!['pending', 'assigned'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: '该工单状态不允许取消'
      });
    }

    if (order.worker) {
      const worker = await User.findById(order.worker);
      if (worker) {
        worker.currentOrderCount = Math.max(0, (worker.currentOrderCount || 0) - 1);
        worker.workStatus = worker.currentOrderCount === 0 ? 'free' : (worker.currentOrderCount >= 3 ? 'busy' : 'free');
        await worker.save();
      }
    }

    const user = await User.findById(req.user.id);

    order.status = 'cancelled';
    order.remark = reason || '用户取消';

    order.timeline.push({
      status: 'cancelled',
      title: '工单已取消',
      description: reason || '用户取消',
      operator: req.user.id,
      operatorName: user.name
    });

    await order.save();

    res.json({
      success: true,
      message: '工单已取消',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const getWorkerWorkload = async (req, res, next) => {
  try {
    const workers = await User.aggregate([
      {
        $match: { role: 'worker', status: 'active' }
      },
      {
        $lookup: {
          from: 'repairorders',
          localField: '_id',
          foreignField: 'worker',
          as: 'orders'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          skills: 1,
          workStatus: 1,
          currentOrderCount: 1,
          totalOrders: { $size: '$orders' },
          pendingOrders: {
            $size: {
              $filter: {
                input: '$orders',
                as: 'order',
                cond: { $in: ['$$order.status', ['assigned', 'processing']] }
              }
            }
          },
          completedOrders: {
            $size: {
              $filter: {
                input: '$orders',
                as: 'order',
                cond: { $in: ['$$order.status', ['completed', 'closed']] }
              }
            }
          },
          avgRating: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: '$orders',
                    as: 'order',
                    cond: { $ne: ['$$order.rating.score', undefined] }
                  }
                },
                as: 'order',
                in: '$$order.rating.score'
              }
            }
          }
        }
      },
      {
        $sort: { currentOrderCount: 1, totalOrders: -1 }
      }
    ]);

    res.json({
      success: true,
      data: workers
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrderList,
  getOrderDetail,
  assignOrder,
  startProcessing,
  completeOrder,
  rateOrder,
  cancelOrder,
  getWorkerWorkload
};
