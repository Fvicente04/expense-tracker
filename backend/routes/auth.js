const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register',
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }).withMessage('Name must be at most 50 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('currency').optional().isIn(['EUR', 'USD', 'GBP', 'BRL']).withMessage('Currency must be EUR, USD, GBP or BRL'),
  validate,
  authController.register
);

router.post('/login',
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
  authController.login
);

router.get('/me', authMiddleware, authController.getCurrentUser);

router.put('/profile',
  authMiddleware,
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 50 }).withMessage('Name must be at most 50 characters'),
  body('currency').optional().isIn(['EUR', 'USD', 'GBP', 'BRL']).withMessage('Currency must be EUR, USD, GBP or BRL'),
  validate,
  authController.updateProfile
);

router.put('/password',
  authMiddleware,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate,
  authController.changePassword
);

module.exports = router;
