const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authMiddleware);

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

router.post('/',
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }).withMessage('Name must be at most 50 characters'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex code (e.g. #3498db)'),
  validate,
  categoryController.createCategory
);

router.put('/:id',
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 50 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex code (e.g. #3498db)'),
  validate,
  categoryController.updateCategory
);

router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
