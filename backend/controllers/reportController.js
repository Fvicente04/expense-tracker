const { Transaction, Category } = require('../models');
const { Op } = require('sequelize');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const dateWhere = (userId, startDate, endDate) => {
  const where = { userId };
  if (startDate && endDate) where.date = { [Op.between]: [startDate, endDate] };
  return where;
};

exports.getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const txs = await Transaction.findAll({
      where: dateWhere(req.user.id, startDate, endDate),
      attributes: ['type', 'amount']
    });

    const totalIncome  = txs.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);

    res.json({ totalIncome, totalExpense, balance: totalIncome - totalExpense, transactionCount: txs.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getByCategory = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const txs = await Transaction.findAll({
      where: { ...dateWhere(req.user.id, startDate, endDate), type },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }]
    });

    const map = {};
    txs.forEach(t => {
      if (!map[t.categoryId]) {
        map[t.categoryId] = {
          categoryId: t.categoryId,
          categoryName: t.category.name,
          categoryIcon: t.category.icon,
          categoryColor: t.category.color,
          amount: 0,
          transactionCount: 0
        };
      }
      map[t.categoryId].amount += parseFloat(t.amount);
      map[t.categoryId].transactionCount++;
    });

    const report = Object.values(map);
    const total = report.reduce((s, c) => s + c.amount, 0);
    report.forEach(c => { c.percentage = total > 0 ? (c.amount / total) * 100 : 0; });
    report.sort((a, b) => b.amount - a.amount);

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMonthlyTrend = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - parseInt(months));

    const txs = await Transaction.findAll({
      where: { userId: req.user.id, date: { [Op.between]: [start, end] } },
      attributes: ['date', 'type', 'amount'],
      order: [['date', 'ASC']]
    });

    const data = {};
    txs.forEach(t => {
      const d = new Date(t.date);
      const mo = d.getMonth() + 1;
      const yr = d.getFullYear();
      const key = `${yr}-${mo}`;
      if (!data[key]) data[key] = { month: MONTHS[mo - 1], year: yr, income: 0, expense: 0 };
      data[key][t.type] += parseFloat(t.amount);
    });

    const result = Object.values(data)
      .map(m => ({ ...m, balance: m.income - m.expense }))
      .sort((a, b) => (a.year * 100 + MONTHS.indexOf(a.month)) - (b.year * 100 + MONTHS.indexOf(b.month)));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};