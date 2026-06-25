const { CategoryRule, Category, Transaction } = require('../models');
const { Op } = require('sequelize');

exports.listRules = async (req, res) => {
  try {
    const rules = await CategoryRule.findAll({
      where: { userId: req.user.id },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'color'] }],
      order: [['createdAt', 'ASC']]
    });
    res.json(rules);
  } catch (err) {
    console.error('listRules:', err);
    res.status(500).json({ message: 'Error fetching rules' });
  }
};

exports.createRule = async (req, res) => {
  try {
    const { keyword, categoryId } = req.body;
    if (!keyword?.trim()) return res.status(400).json({ message: 'Keyword is required' });
    if (!categoryId)       return res.status(400).json({ message: 'Category is required' });

    const category = await Category.findOne({ where: { id: categoryId, userId: req.user.id } });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const rule = await CategoryRule.create({
      userId: req.user.id,
      keyword: keyword.trim().toLowerCase(),
      categoryId
    });

    const withCategory = await CategoryRule.findByPk(rule.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'color'] }]
    });

    res.status(201).json(withCategory);
  } catch (err) {
    console.error('createRule:', err);
    res.status(500).json({ message: 'Error creating rule' });
  }
};

exports.applyRules = async (req, res) => {
  try {
    const rules = await CategoryRule.findAll({ where: { userId: req.user.id } });
    if (!rules.length) return res.json({ updated: 0 });

    const uncategorized = await Transaction.findAll({
      where: { userId: req.user.id, source: 'bank_sync', categoryId: { [Op.is]: null } }
    });

    let updated = 0;
    for (const tx of uncategorized) {
      const lower = tx.description.toLowerCase();
      const match = rules.find(r => lower.includes(r.keyword));
      if (match) {
        await tx.update({ categoryId: match.categoryId });
        updated++;
      }
    }

    res.json({ updated });
  } catch (err) {
    console.error('applyRules:', err);
    res.status(500).json({ message: 'Error applying rules' });
  }
};

exports.deleteRule = async (req, res) => {
  try {
    const rule = await CategoryRule.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    await rule.destroy();
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    console.error('deleteRule:', err);
    res.status(500).json({ message: 'Error deleting rule' });
  }
};
