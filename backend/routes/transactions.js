const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const importController = require('../controllers/importController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authMiddleware);

router.post('/import/preview', importController.preview);
router.post('/import/confirm', importController.confirm);

router.get('/', transactionController.getAllTransactions);
router.get('/:id', transactionController.getTransactionById);

router.post('/',
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 200 }).withMessage('Description must be at most 200 characters'),
  body('date').isDate().withMessage('Date must be a valid date (YYYY-MM-DD)'),
  body('notes').optional({ nullable: true }).isLength({ max: 500 }).withMessage('Notes must be at most 500 characters'),
  body('isRecurring').optional({ nullable: true }).isBoolean(),
  body('recurringFrequency').optional({ nullable: true }).isIn(['weekly', 'biweekly', 'monthly']).withMessage('Frequency must be weekly, biweekly or monthly'),
  validate,
  transactionController.createTransaction
);

router.put('/:id',
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty').isLength({ max: 200 }),
  body('date').optional().isDate().withMessage('Date must be a valid date (YYYY-MM-DD)'),
  body('notes').optional().isLength({ max: 500 }),
  validate,
  transactionController.updateTransaction
);

router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
