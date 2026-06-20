const User = require('../models/User');

const getWorkerList = async (req, res, next) => {
  try {
    const { skills, workStatus } = req.query;
    
    const query = { role: 'worker', status: 'active' };
    
    if (skills) {
      query.skills = { $in: Array.isArray(skills) ? skills : [skills] };
    }
    
    if (workStatus) {
      query.workStatus = workStatus;
    }

    const workers = await User.find(query)
      .select('-password')
      .sort({ currentOrderCount: 1, createdAt: 1 });

    res.json({
      success: true,
      data: workers
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

    const worker = new User({
      name,
      phone,
      password: hashedPassword,
      role: 'worker',
      skills: skills || [],
      workStatus: 'free',
      currentOrderCount: 0
    });

    await worker.save();

    res.status(201).json({
      success: true,
      message: '维修师傅创建成功',
      data: worker
    });
  } catch (error) {
    next(error);
  }
};

const updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, skills, status } = req.body;

    const worker = await User.findByIdAndUpdate(
      id,
      { name, phone, skills, status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: '维修师傅不存在'
      });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: worker
    });
  } catch (error) {
    next(error);
  }
};

const getUserList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, role, keyword } = req.query;

    const query = {};
    
    if (role) {
      query.role = role;
    }

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * pageSize;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        list: users,
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

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { status: 'inactive' },
      { new: true }
    );

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
