const { Category } = require('../models');

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { userId: req.user.id },
      order: [['name', 'ASC']]
    });
    res.json(categories);
  } catch (err) {
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
      icon: icon || '\u{1F4B0}',
      color: color || '#3498db',
      isDefault: false
    });
    res.status(201).json(category);
  } catch (err) {
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
      name: name || category.name,
      icon: icon || category.icon,
      color: color || category.color
    });

    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Error updating category' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    if (category.isDefault) return res.status(400).json({ message: 'Cannot delete default category' });

    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting category' });
  }
};