const { Budget, Category, Transaction } = require('../models');
const { Op } = require('sequelize');

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

    // For each budget, calculate spent dynamically from transactions
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const startDate = new Date(budget.year, budget.month - 1, 1);
        const endDate   = new Date(budget.year, budget.month, 0); // last day of month

        const transactions = await Transaction.findAll({
          where: {
            userId:     req.user.id,
            categoryId: budget.categoryId,
            type:       'expense',
            date: { [Op.between]: [startDate, endDate] }
          },
          attributes: ['amount']
        });

        const spent = transactions.reduce(
          (sum, t) => sum + (Number(t.amount) || 0), 0
        );

        // Return budget as plain object with spent injected
        const budgetJson = budget.toJSON();
        budgetJson.spent = spent;
        return budgetJson;
      })
    );

    res.json(budgetsWithSpent);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBudgetById = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'icon', 'color', 'type']
      }]
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Calculate spent dynamically
    const startDate = new Date(budget.year, budget.month - 1, 1);
    const endDate   = new Date(budget.year, budget.month, 0);

    const transactions = await Transaction.findAll({
      where: {
        userId:     req.user.id,
        categoryId: budget.categoryId,
        type:       'expense',
        date: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['amount']
    });

    const budgetJson = budget.toJSON();
    budgetJson.spent = transactions.reduce(
      (sum, t) => sum + (Number(t.amount) || 0), 0
    );

    res.json(budgetJson);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const { categoryId, amount, month, year } = req.body;

    const budget = await Budget.create({
      userId: req.user.id,
      categoryId,
      amount,
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

    const budgetJson = budgetWithCategory.toJSON();
    budgetJson.spent = 0; // new budget always starts at 0
    res.status(201).json(budgetJson);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const { categoryId, amount, month, year } = req.body;

    const budget = await Budget.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    if (categoryId !== undefined) budget.categoryId = categoryId;
    if (amount     !== undefined) budget.amount      = amount;
    if (month      !== undefined) budget.month       = month;
    if (year       !== undefined) budget.year        = year;

    await budget.save();

    const updatedBudget = await Budget.findByPk(budget.id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'icon', 'color', 'type']
      }]
    });

    // Recalculate spent after update (month/year may have changed)
    const startDate = new Date(updatedBudget.year, updatedBudget.month - 1, 1);
    const endDate   = new Date(updatedBudget.year, updatedBudget.month, 0);

    const transactions = await Transaction.findAll({
      where: {
        userId:     req.user.id,
        categoryId: updatedBudget.categoryId,
        type:       'expense',
        date: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['amount']
    });

    const budgetJson = updatedBudget.toJSON();
    budgetJson.spent = transactions.reduce(
      (sum, t) => sum + (Number(t.amount) || 0), 0
    );

    res.json(budgetJson);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      where: { id: req.params.id, userId: req.user.id }
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