const express = require('express');
const { body } = require('express-validator');
const orderController = require('../controllers/orderController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/',
  authMiddleware,
  requireRole('owner', 'admin'),
  upload.array('images', 9),
  [
    body('repairType').notEmpty().withMessage('报修类型不能为空'),
    body('title').notEmpty().withMessage('标题不能为空'),
    body('description').notEmpty().withMessage('描述不能为空')
  ],
  orderController.createOrder
);

router.get('/', authMiddleware, orderController.getOrderList);

router.get('/:id', authMiddleware, orderController.getOrderDetail);

router.put('/:id/assign',
  authMiddleware,
  requireRole('admin', 'manager'),
  orderController.assignOrder
);

router.put('/:id/start',
  authMiddleware,
  requireRole('worker'),
  orderController.startProcessing
);

router.put('/:id/complete',
  authMiddleware,
  requireRole('worker'),
  upload.array('repairImages', 9),
  [
    body('description').notEmpty().withMessage('维修说明不能为空')
  ],
  orderController.completeOrder
);

router.put('/:id/rate',
  authMiddleware,
  requireRole('owner'),
  [
    body('score').isInt({ min: 1, max: 5 }).withMessage('评分必须在1-5之间')
  ],
  orderController.rateOrder
);

router.put('/:id/cancel', authMiddleware, orderController.cancelOrder);

router.get('/workers/workload',
  authMiddleware,
  requireRole('admin', 'manager'),
  orderController.getWorkerWorkload
);

module.exports = router;
