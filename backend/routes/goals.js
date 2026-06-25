const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const goalController = require('../controllers/goalController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authMiddleware);

router.get('/', goalController.getAll);

router.post('/',
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('targetAmount').isFloat({ min: 0.01 }).withMessage('Target amount must be positive'),
  body('savedAmount').optional().isFloat({ min: 0 }),
  body('deadline').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
  validate,
  goalController.create
);

router.put('/:id',
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('targetAmount').optional().isFloat({ min: 0.01 }),
  body('savedAmount').optional().isFloat({ min: 0 }),
  body('deadline').optional({ nullable: true }).isISO8601(),
  validate,
  goalController.update
);

router.patch('/:id/deposit',
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  validate,
  goalController.deposit
);

router.delete('/:id', goalController.remove);

module.exports = router;
