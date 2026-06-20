const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/workers', authMiddleware, userController.getWorkerList);

router.post('/workers',
  authMiddleware,
  requireRole('admin', 'manager'),
  [
    body('name').notEmpty().withMessage('姓名不能为空'),
    body('phone').notEmpty().withMessage('手机号不能为空'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位')
  ],
  userController.createWorker
);

router.put('/workers/:id',
  authMiddleware,
  requireRole('admin', 'manager'),
  userController.updateWorker
);

router.get('/',
  authMiddleware,
  requireRole('admin', 'manager'),
  userController.getUserList
);

router.delete('/:id',
  authMiddleware,
  requireRole('admin', 'manager'),
  userController.deleteUser
);

module.exports = router;
