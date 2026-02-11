const { Budget, Category } = require('../models');

exports.getAllBudgets = async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'icon', 'color', 'type']
      }],
      order: [['year', 'DESC'], ['month', 'DESC']]
    });
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBudgetById = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'icon', 'color', 'type']
      }]
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const { category_id, amount, month, year } = req.body;

    const budget = await Budget.create({
      userId: req.user.id,
      categoryId: category_id,
      amount,
      spent: 0,
      month,
      year
    });

    const budgetWithCategory = await Budget.findByPk(budget.id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'icon', 'color', 'type']
      }]
    });

    res.status(201).json(budgetWithCategory);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const { amount } = req.body;

    const budget = await Budget.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    budget.amount = amount;
    await budget.save();

    const updatedBudget = await Budget.findByPk(budget.id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'icon', 'color', 'type']
      }]
    });

    res.json(updatedBudget);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    await budget.destroy();
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};