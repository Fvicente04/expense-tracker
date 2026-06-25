const { Category } = require('../models');

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { userId: req.user.id },
      order: [['name', 'ASC']]
    });
    res.json(categories);
  } catch (err) {
    console.error('getAllCategories:', err);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    res.json(category);
  } catch (err) {
    console.error('getCategoryById:', err);
    res.status(500).json({ message: 'Error fetching category' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    const category = await Category.create({
      userId: req.user.id,
      name,
      type,
      icon: icon || '💰',
      color: color || '#3498db'
    });
    res.status(201).json(category);
  } catch (err) {
    console.error('createCategory:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors.map(e => e.message).join(', ') });
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'A category with this name and type already exists' });
    }
    res.status(500).json({ message: 'Error creating category' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const { name, icon, color } = req.body;
    await category.update({
      name:  name  || category.name,
      icon:  icon  || category.icon,
      color: color || category.color
    });

    res.json(category);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'A category with this name and type already exists' });
    }
    console.error('updateCategory:', err);
    res.status(500).json({ message: 'Error updating category' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('deleteCategory:', err);
    const pgCode = err.parent?.code || err.original?.code;
    if (err.name === 'SequelizeForeignKeyConstraintError' || pgCode === '23503' || pgCode === '23001') {
      return res.status(409).json({ message: 'Cannot delete category with existing transactions' });
    }
    res.status(500).json({ message: 'Error deleting category' });
  }
};
