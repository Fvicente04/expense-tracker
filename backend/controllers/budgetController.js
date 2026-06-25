const { Budget, Category, Transaction } = require('../models');
const { Op } = require('sequelize');

// Budget.toJSON derives remaining/percentageSpent from the DB "spent" column,
// which is never updated — recompute them from the real spent value
function applySpent(budgetJson, spent) {
  budgetJson.spent = spent;
  const amount = parseFloat(budgetJson.amount);
  budgetJson.remaining = amount - spent;
  budgetJson.percentageSpent = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  return budgetJson;
}

function spentEndDate(year, month) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const lastDay = new Date(year, month, 0); // last day of month
  return lastDay > today ? today : lastDay;
}

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

    if (budgets.length === 0) return res.json([]);

    // Deduplicate (year, month) periods and build date ranges, capping at today
    const periodMap = new Map();
    budgets.forEach(b => {
      const key = `${b.year}-${b.month}`;
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          startDate: new Date(b.year, b.month - 1, 1),
          endDate: spentEndDate(b.year, b.month)
        });
      }
    });

    // Single query for all relevant expenses across all periods
    const spentRows = await Transaction.findAll({
      where: {
        userId: req.user.id,
        type: 'expense',
        [Op.or]: Array.from(periodMap.values()).map(p => ({
          date: { [Op.between]: [p.startDate, p.endDate] }
        }))
      },
      attributes: ['categoryId', 'amount', 'date']
    });

    // Aggregate: "year-month-categoryId" → total spent
    const spentMap = {};
    spentRows.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${t.categoryId}`;
      spentMap[key] = (spentMap[key] || 0) + Number(t.amount);
    });

    const budgetsWithSpent = budgets.map(budget => {
      const key = `${budget.year}-${budget.month}-${budget.categoryId}`;
      return applySpent(budget.toJSON(), spentMap[key] || 0);
    });

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

    if (!budget) return res.status(404).json({ message: 'Budget not found' });

    const startDate = new Date(budget.year, budget.month - 1, 1);
    const endDate   = spentEndDate(budget.year, budget.month);

    const transactions = await Transaction.findAll({
      where: { userId: req.user.id, categoryId: budget.categoryId, type: 'expense',
               date: { [Op.between]: [startDate, endDate] } },
      attributes: ['amount']
    });

    const spent = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    res.json(applySpent(budget.toJSON(), spent));
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const { categoryId, amount, month, year, recurring } = req.body;

    const category = await Category.findOne({ where: { id: categoryId, userId: req.user.id } });
    if (!category) return res.status(400).json({ message: 'Invalid category' });

    const budget = await Budget.create({ userId: req.user.id, categoryId, amount, month, year, recurring: !!recurring });

    const budgetWithCategory = await Budget.findByPk(budget.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color', 'type'] }]
    });

    res.status(201).json(applySpent(budgetWithCategory.toJSON(), 0));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'A budget for this category and month already exists' });
    }
    console.error('Error creating budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.rolloverBudgets = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ message: 'month and year are required' });

    let prevMonth = month - 1, prevYear = year;
    if (prevMonth < 1) { prevMonth = 12; prevYear = year - 1; }

    const recurring = await Budget.findAll({
      where: { userId: req.user.id, month: prevMonth, year: prevYear, recurring: true }
    });
    if (!recurring.length) return res.json([]);

    const existing = await Budget.findAll({ where: { userId: req.user.id, month, year } });
    const existingCats = new Set(existing.map(b => b.categoryId));

    const toCreate = recurring
      .filter(b => !existingCats.has(b.categoryId))
      .map(b => ({ userId: req.user.id, categoryId: b.categoryId, amount: b.amount, month, year, recurring: true }));

    if (!toCreate.length) return res.json([]);

    const created = await Budget.bulkCreate(toCreate, { returning: true });
    const withCats = await Budget.findAll({
      where: { id: created.map(b => b.id) },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color', 'type'] }]
    });
    res.status(201).json(withCats.map(b => applySpent(b.toJSON(), 0)));
  } catch (error) {
    console.error('Error rolling over budgets:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const { categoryId, amount, month, year, recurring } = req.body;

    const budget = await Budget.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });

    if (categoryId !== undefined) {
      const category = await Category.findOne({ where: { id: categoryId, userId: req.user.id } });
      if (!category) return res.status(400).json({ message: 'Invalid category' });
      budget.categoryId = categoryId;
    }
    if (amount     !== undefined) budget.amount      = amount;
    if (month      !== undefined) budget.month       = month;
    if (year       !== undefined) budget.year        = year;
    if (recurring  !== undefined) budget.recurring   = !!recurring;

    await budget.save();

    const updatedBudget = await Budget.findByPk(budget.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color', 'type'] }]
    });

    const startDate = new Date(updatedBudget.year, updatedBudget.month - 1, 1);
    const endDate   = spentEndDate(updatedBudget.year, updatedBudget.month);

    const transactions = await Transaction.findAll({
      where: { userId: req.user.id, categoryId: updatedBudget.categoryId, type: 'expense',
               date: { [Op.between]: [startDate, endDate] } },
      attributes: ['amount']
    });

    const spent = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    res.json(applySpent(updatedBudget.toJSON(), spent));
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    await budget.destroy();
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
