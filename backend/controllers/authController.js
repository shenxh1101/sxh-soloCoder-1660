const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { generateToken } = require('../middleware/auth');
const wechatService = require('../services/wechatService');

const userToDTO = (user, includeExtra = false) => {
  const dto = {
    id: user._id,
    _id: user._id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    building: user.building,
    room: user.room,
    avatar: user.avatar,
    skills: user.skills || [],
    workStatus: user.workStatus,
    status: user.status
  };
  if (includeExtra) {
    dto.openid = user.openid;
    dto.currentOrderCount = user.currentOrderCount || 0;
  }
  return dto;
};

const register = async (req, res, next) => {
  try {
    const { phone, password, name, role, building, room, skills } = req.body;

    if (!phone || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '手机号、密码和姓名不能为空'
      });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '该手机号已注册'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      phone,
      password: hashedPassword,
      name,
      role: role || 'owner',
      building,
      room,
      skills: skills || []
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: userToDTO(user)
      }
    });
  } catch (error) {
    if (error.message && error.message.includes('unique')) {
      return res.status(400).json({ success: false, message: '该手机号已注册' });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '手机号和密码不能为空'
      });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: '该账号未设置密码，请使用其他方式登录'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: userToDTO(user, true)
      }
    });
  } catch (error) {
    next(error);
  }
};

const wechatLogin = async (req, res, next) => {
  try {
    const { code, userInfo } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少微信授权码'
      });
    }

    const session = await wechatService.code2Session(code);
    if (!session || !session.openid) {
      return res.status(400).json({
        success: false,
        message: '微信登录失败'
      });
    }

    let user = await User.findOne({ openid: session.openid });

    if (!user) {
      user = await User.create({
        openid: session.openid,
        name: userInfo?.nickName || '微信用户',
        avatar: userInfo?.avatarUrl,
        role: 'owner'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: userToDTO(user)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const dto = userToDTO(user, true);
    delete dto.password;

    res.json({
      success: true,
      data: dto
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, building, room, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, building, room, avatar }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const updated = await User.findById(req.user.id);
    const dto = userToDTO(updated);

    res.json({
      success: true,
      message: '更新成功',
      data: dto
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  wechatLogin,
  getCurrentUser,
  updateProfile,
  userToDTO
};
