const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/summary', reportController.getSummary);
router.get('/by-category', reportController.getByCategory);
router.get('/monthly-trend', reportController.getMonthlyTrend);

module.exports = router;