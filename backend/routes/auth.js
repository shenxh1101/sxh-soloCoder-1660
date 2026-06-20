const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', [
  body('phone').notEmpty().withMessage('手机号不能为空'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  body('name').notEmpty().withMessage('姓名不能为空')
], authController.register);

router.post('/login', [
  body('phone').notEmpty().withMessage('手机号不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
], authController.login);

router.post('/wechat-login', authController.wechatLogin);

router.get('/profile', authMiddleware, authController.getCurrentUser);

router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
