const { User } = require('../models');
const { db, findAll, find, count: countDocs, findById } = require('../config/nedb');
const { userToDTO } = require('./authController');

const safeNumber = (v, defaultValue = 0) => {
  if (v === null || v === undefined || isNaN(Number(v))) return defaultValue;
  return Number(v);
};

const getWorkerList = async (req, res, next) => {
  try {
    const { skills, workStatus } = req.query;
    
    let workers = await findAll(db.users, { role: 'worker', status: 'active' });
    
    if (skills) {
      const skillArr = Array.isArray(skills) ? skills : [skills];
      workers = workers.filter(w => w.skills && skillArr.some(s => w.skills.includes(s)));
    }
    
    if (workStatus) {
      workers = workers.filter(w => w.workStatus === workStatus);
    }

    workers.sort((a, b) => safeNumber(a.currentOrderCount) - safeNumber(b.currentOrderCount));

    const result = workers.map(w => ({
      ...userToDTO(w, true),
      id: w._id,
      _id: w._id
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const createWorker = async (req, res, next) => {
  try {
    const { name, phone, password, skills } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: '姓名、手机号和密码不能为空'
      });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '该手机号已存在'
      });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const worker = await User.create({
      name,
      phone,
      password: hashedPassword,
      role: 'worker',
      skills: skills || [],
      status: 'active',
      workStatus: 'free',
      currentOrderCount: 0
    });

    res.status(201).json({
      success: true,
      message: '维修师傅创建成功',
      data: {
        ...userToDTO(worker, true),
        id: worker._id,
        _id: worker._id
      }
    });
  } catch (error) {
    if (error.message && error.message.includes('unique')) {
      return res.status(400).json({ success: false, message: '该手机号已存在' });
    }
    next(error);
  }
};

const updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, skills, status } = req.body;

    const existing = await User.findOne({ phone });
    if (existing && String(existing._id) !== String(id)) {
      return res.status(400).json({
        success: false,
        message: '该手机号已被其他用户使用'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (skills !== undefined) updateData.skills = skills;
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date();

    const worker = await User.findByIdAndUpdate(id, updateData);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: '维修师傅不存在'
      });
    }

    const updated = await User.findById(id);

    res.json({
      success: true,
      message: '更新成功',
      data: {
        ...userToDTO(updated, true),
        id: updated._id,
        _id: updated._id
      }
    });
  } catch (error) {
    if (error.message && error.message.includes('unique')) {
      return res.status(400).json({ success: false, message: '该手机号已被其他用户使用' });
    }
    next(error);
  }
};

const getUserList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, role, keyword } = req.query;

    let users = await findAll(db.users, {});
    
    if (role) {
      users = users.filter(u => u.role === role);
    }

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      users = users.filter(u =>
        String(u.name || '').toLowerCase().includes(kw) ||
        String(u.phone || '').toLowerCase().includes(kw)
      );
    }

    users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const total = users.length;
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;
    const paged = users.slice(skip, skip + pageSizeNum);

    const list = paged.map(u => ({
      ...userToDTO(u, true),
      id: u._id,
      _id: u._id,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));

    res.json({
      success: true,
      data: {
        list,
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

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(id, { status: 'inactive' });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '用户已禁用'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkerList,
  createWorker,
  updateWorker,
  getUserList,
  deleteUser
};
