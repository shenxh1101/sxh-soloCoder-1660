const moment = require('moment');
const { User, RepairOrder, populateOrder, populateOrderList } = require('../models');
const { generateOrderNo, repairTypeMap, statusMap, calculateDuration, formatDuration } = require('../utils/common');
const wechatService = require('../services/wechatService');
const { userToDTO } = require('./authController');
const { db, findAll, findById, count: countDocs, populateUser } = require('../config/nedb');

const safeNumber = (v, defaultValue = 0) => {
  if (v === null || v === undefined || isNaN(Number(v))) return defaultValue;
  return Number(v);
};

const buildQueryFromParams = (params, user) => {
  const query = {};

  if (user?.role === 'owner') {
    query.owner = user.id;
  } else if (user?.role === 'worker') {
    query.worker = user.id;
  }

  if (params.status) query.status = params.status;
  if (params.repairType) query.repairType = params.repairType;
  if (params.keyword) {
    query.$or = [];
  }

  if (params.startDate) {
    query.createdAt = query.createdAt || {};
    query.createdAt.$gte = new Date(params.startDate);
  }
  if (params.endDate) {
    query.createdAt = query.createdAt || {};
    query.createdAt.$lte = new Date(params.endDate + ' 23:59:59');
  }

  return query;
};

const filterByQuery = (list, query) => {
  return list.filter(item => {
    for (const key in query) {
      if (key === '$or') continue;
      const expected = query[key];
      const actual = item[key];

      if (expected instanceof Object && !Array.isArray(expected)) {
        for (const op in expected) {
          const cv = expected[op];
          if (op === '$gte' && !(new Date(actual) >= new Date(cv))) return false;
          if (op === '$lte' && !(new Date(actual) <= new Date(cv))) return false;
          if (op === '$in' && !cv.includes(actual)) return false;
        }
      } else {
        if (String(actual) !== String(expected)) return false;
      }
    }
    if (query.$or) {
      let anyMatch = false;
      for (const orItem of query.$or) {
        const matched = Object.keys(orItem).every(k => {
          const regex = new RegExp(orItem[k].$regex, orItem[k].$options || '');
          return regex.test(String(item[k] || ''));
        });
        if (matched) { anyMatch = true; break; }
      }
      if (!anyMatch) return false;
    }
    return true;
  });
};

const createOrder = async (req, res, next) => {
  try {
    const { repairType, title, description, building, room, contactName, contactPhone, priority } = req.body;

    if (!repairType || !title || !description) {
      return res.status(400).json({
        success: false,
        message: '报修类型、标题和描述不能为空'
      });
    }

    const imagesFromFiles = req.files?.map(file => `/uploads/${file.fieldname}/${file.filename}`) || [];
    const imagesFromBody = Array.isArray(req.body.images) ? req.body.images.filter(Boolean) : [];
    const images = [...imagesFromFiles, ...imagesFromBody];

    const orderNo = generateOrderNo();

    const owner = await User.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const order = await RepairOrder.create({
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
        operatorName: owner.name,
        createdAt: new Date()
      }]
    });

    const populated = await populateOrder(order);

    res.status(201).json({
      success: true,
      message: '报修提交成功',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

const getOrderList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, keyword, status, repairType, startDate, endDate } = req.query;

    const allOrders = await findAll(db.orders, {});
    let filtered = allOrders;

    if (req.user.role === 'owner') {
      filtered = filtered.filter(o => o.owner === req.user.id);
    } else if (req.user.role === 'worker') {
      filtered = filtered.filter(o => o.worker === req.user.id);
    }

    if (status) filtered = filtered.filter(o => o.status === status);
    if (repairType) filtered = filtered.filter(o => o.repairType === repairType);
    if (startDate) {
      const sd = new Date(startDate);
      filtered = filtered.filter(o => new Date(o.createdAt) >= sd);
    }
    if (endDate) {
      const ed = new Date(endDate + ' 23:59:59');
      filtered = filtered.filter(o => new Date(o.createdAt) <= ed);
    }
    if (keyword) {
      const kw = String(keyword).toLowerCase();
      filtered = filtered.filter(o =>
        String(o.orderNo || '').toLowerCase().includes(kw) ||
        String(o.title || '').toLowerCase().includes(kw) ||
        String(o.description || '').toLowerCase().includes(kw)
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = filtered.length;
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;
    const paged = filtered.slice(skip, skip + pageSizeNum);

    const populatedList = await populateOrderList(paged);

    res.json({
      success: true,
      data: {
        list: populatedList,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages: Math.ceil(total / pageSizeNum)
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

    const order = await RepairOrder.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    if (req.user.role === 'owner' && String(order.owner) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权查看该工单'
      });
    }

    if (req.user.role === 'worker' && String(order.worker) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权查看该工单'
      });
    }

    const populated = await populateOrder(order);

    res.json({
      success: true,
      data: populated
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
    const assignedAt = new Date();

    order.worker = workerId;
    order.status = 'assigned';
    order.assignedAt = assignedAt;
    order.assignedBy = req.user.id;
    order.remark = remark;
    order.responseTime = safeNumber(calculateDuration(order.createdAt, assignedAt));

    order.timeline.push({
      status: 'assigned',
      title: '工单已派单',
      description: `已派单给维修师傅：${worker.name}${remark ? '，备注：' + remark : ''}`,
      operator: req.user.id,
      operatorName: assignedBy?.name || '系统',
      createdAt: assignedAt
    });

    worker.currentOrderCount = (worker.currentOrderCount || 0) + 1;
    worker.workStatus = worker.currentOrderCount >= 3 ? 'busy' : 'free';
    worker.updatedAt = new Date();
    await User.save(worker);

    await RepairOrder.save(order);

    try {
      if (worker.openid) {
        await wechatService.sendRepairStatusNotification(
          worker.openid,
          order.orderNo,
          '已派单',
          order.repairTypeName,
          assignedBy?.name || '系统',
          moment(assignedAt).format('YYYY-MM-DD HH:mm')
        );
      }
      const owner = await User.findById(order.owner);
      if (owner?.openid) {
        await wechatService.sendRepairStatusNotification(
          owner.openid,
          order.orderNo,
          '已派单',
          order.repairTypeName,
          worker.name,
          moment(assignedAt).format('YYYY-MM-DD HH:mm')
        );
      }
    } catch (notifyErr) {
      console.warn('推送通知失败:', notifyErr.message);
    }

    const populated = await populateOrder(order);

    res.json({
      success: true,
      message: '派单成功',
      data: populated
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

    if (String(order.worker) !== req.user.id) {
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
    const startedAt = new Date();

    order.status = 'processing';
    order.startedAt = startedAt;

    order.timeline.push({
      status: 'processing',
      title: '开始维修',
      description: '维修师傅已开始处理',
      operator: req.user.id,
      operatorName: worker?.name || '维修师傅',
      createdAt: startedAt
    });

    await RepairOrder.save(order);

    try {
      const owner = await User.findById(order.owner);
      if (owner?.openid) {
        await wechatService.sendRepairStatusNotification(
          owner.openid,
          order.orderNo,
          '处理中',
          order.repairTypeName,
          worker?.name || '维修师傅',
          moment(startedAt).format('YYYY-MM-DD HH:mm')
        );
      }
    } catch (notifyErr) {
      console.warn('推送通知失败:', notifyErr.message);
    }

    const populated = await populateOrder(order);

    res.json({
      success: true,
      message: '已开始处理',
      data: populated
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

    if (String(order.worker) !== req.user.id) {
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

    const imagesFromFiles = req.files?.map(file => `/uploads/${file.fieldname}/${file.filename}`) || [];
    const imagesFromBody = Array.isArray(req.body.images) ? req.body.images.filter(Boolean) : [];
    const images = [...imagesFromFiles, ...imagesFromBody];
    const worker = await User.findById(req.user.id);
    const completedAt = new Date();

    order.status = 'completed';
    order.completedAt = completedAt;
    order.repairResult = {
      description,
      images
    };

    if (order.startedAt) {
      order.completionTime = safeNumber(calculateDuration(order.startedAt, completedAt));
    }
    order.totalTime = safeNumber(calculateDuration(order.createdAt, completedAt));

    order.timeline.push({
      status: 'completed',
      title: '维修完成',
      description: '维修已完成，等待业主确认',
      operator: req.user.id,
      operatorName: worker?.name || '维修师傅',
      createdAt: completedAt
    });

    worker.currentOrderCount = Math.max(0, (worker.currentOrderCount || 0) - 1);
    worker.workStatus = worker.currentOrderCount === 0 ? 'free' : (worker.currentOrderCount >= 3 ? 'busy' : 'free');
    worker.updatedAt = new Date();
    await User.save(worker);

    await RepairOrder.save(order);

    try {
      const owner = await User.findById(order.owner);
      if (owner?.openid) {
        await wechatService.sendRepairStatusNotification(
          owner.openid,
          order.orderNo,
          '已完成',
          order.repairTypeName,
          worker?.name || '维修师傅',
          moment(completedAt).format('YYYY-MM-DD HH:mm')
        );
      }
    } catch (notifyErr) {
      console.warn('推送通知失败:', notifyErr.message);
    }

    const populated = await populateOrder(order);

    res.json({
      success: true,
      message: '工单已完成',
      data: populated
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

    if (String(order.owner) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权评价该工单'
      });
    }

    if (!['completed', 'closed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: '该工单状态不允许评价'
      });
    }

    const owner = await User.findById(req.user.id);
    const ratedAt = new Date();

    order.rating = {
      score: Number(score),
      comment: comment || '',
      ratedAt
    };

    order.timeline.push({
      status: 'closed',
      title: '业主已评价',
      description: `评分：${score}星${comment ? '，评价：' + comment : ''}`,
      operator: req.user.id,
      operatorName: owner?.name || '业主',
      createdAt: ratedAt
    });

    order.status = 'closed';
    order.closedAt = ratedAt;

    await RepairOrder.save(order);

    const populated = await populateOrder(order);

    res.json({
      success: true,
      message: '评价成功',
      data: populated
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

    if (String(order.owner) !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'manager') {
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
        worker.updatedAt = new Date();
        await User.save(worker);
      }
    }

    const user = await User.findById(req.user.id);
    const cancelledAt = new Date();

    order.status = 'cancelled';
    order.remark = reason || '用户取消';

    order.timeline.push({
      status: 'cancelled',
      title: '工单已取消',
      description: reason || '用户取消',
      operator: req.user.id,
      operatorName: user?.name || '系统',
      createdAt: cancelledAt
    });

    await RepairOrder.save(order);

    const populated = await populateOrder(order);

    res.json({
      success: true,
      message: '工单已取消',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

const getWorkerWorkload = async (req, res, next) => {
  try {
    const allWorkers = await findAll(db.users, { role: 'worker', status: 'active' });
    const allOrders = await findAll(db.orders, {});

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const workers = allWorkers.map(w => {
      const wOrders = allOrders.filter(o => String(o.worker) === String(w._id));
      const pendingOrders = wOrders.filter(o => ['assigned'].includes(o.status)).length;
      const processingOrders = wOrders.filter(o => ['processing'].includes(o.status)).length;
      const completedOrders = wOrders.filter(o => ['completed', 'closed'].includes(o.status)).length;
      const ratedOrders = wOrders.filter(o => o.rating && o.rating.score !== undefined);
      const avgRating = ratedOrders.length > 0
        ? Number((ratedOrders.reduce((s, o) => s + Number(o.rating.score || 0), 0) / ratedOrders.length).toFixed(1))
        : null;

      // 近30天完成的工单
      const completedLast30Days = wOrders.filter(o => {
        if (!['completed', 'closed'].includes(o.status)) return false;
        const completedAt = o.completedAt ? new Date(o.completedAt).getTime() : null;
        if (!completedAt) return false;
        return completedAt >= thirtyDaysAgo;
      });

      // 平均处理时长（基于已完成工单的 completionTime 分钟数）
      const completedWithTime = wOrders.filter(o => 
        ['completed', 'closed'].includes(o.status) && 
        o.completionTime !== undefined && o.completionTime !== null && !isNaN(Number(o.completionTime))
      );
      const totalCompletionTime = completedWithTime.reduce((s, o) => s + Number(o.completionTime), 0);
      const avgCompletionTimeMinutes = completedWithTime.length > 0
        ? Math.round(totalCompletionTime / completedWithTime.length)
        : null;

      return {
        _id: w._id,
        id: w._id,
        name: w.name,
        phone: w.phone,
        skills: w.skills || [],
        workStatus: w.workStatus || 'free',
        currentOrderCount: w.currentOrderCount || 0,
        totalOrders: wOrders.length,
        pendingOrders,
        processingOrders,
        completedOrders,
        completedLast30Days: completedLast30Days.length,
        avgCompletionTimeMinutes,
        avgCompletionTime: formatDuration(avgCompletionTimeMinutes),
        avgRating
      };
    });

    workers.sort((a, b) => a.currentOrderCount - b.currentOrderCount || b.totalOrders - a.totalOrders);

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
