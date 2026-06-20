const express = require('express');
const statsController = require('../controllers/statsController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard',
  authMiddleware,
  requireRole('admin', 'manager'),
  statsController.getDashboardStats
);

router.get('/repair-types',
  authMiddleware,
  requireRole('admin', 'manager'),
  statsController.getRepairTypeStats
);

router.get('/workers',
  authMiddleware,
  requireRole('admin', 'manager'),
  statsController.getWorkerStats
);

router.get('/export',
  authMiddleware,
  requireRole('admin', 'manager'),
  statsController.exportOrders
);

module.exports = router;
