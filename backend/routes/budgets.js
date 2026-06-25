const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authMiddleware);

router.get('/', budgetController.getAllBudgets);
router.get('/:id', budgetController.getBudgetById);

router.post('/',
  body('categoryId').isUUID().withMessage('Valid category ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2020 }).withMessage('Year must be 2020 or later'),
  validate,
  budgetController.createBudget
);

router.put('/:id',
  body('categoryId').optional().isUUID().withMessage('Valid category ID is required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').optional().isInt({ min: 2020 }).withMessage('Year must be 2020 or later'),
  validate,
  budgetController.updateBudget
);

router.post('/rollover',
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2020 }).withMessage('Year must be 2020 or later'),
  validate,
  budgetController.rolloverBudgets
);

router.delete('/:id', budgetController.deleteBudget);

module.exports = router;
