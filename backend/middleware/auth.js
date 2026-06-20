require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'property-repair-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      phone: user.phone
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: '认证令牌无效或已过期'
    });
  }

  req.user = decoded;
  next();
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    next();
  };
};

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  requireRole
};
