const { Transaction, Category } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

exports.getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    const whereClause = { userId };
    
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      attributes: ['type', 'amount']
    });

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: transactions.length
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getByCategory = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const userId = req.user.id;

    const whereClause = { userId, type };
    
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'icon', 'color']
      }]
    });

    const categoryMap = {};
    transactions.forEach(t => {
      const catId = t.categoryId;
      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          categoryId: catId,
          categoryName: t.category.name,
          categoryIcon: t.category.icon,
          categoryColor: t.category.color,
          amount: 0,
          transactionCount: 0
        };
      }
      categoryMap[catId].amount += parseFloat(t.amount);
      categoryMap[catId].transactionCount += 1;
    });

    const categoryReports = Object.values(categoryMap);
    const totalAmount = categoryReports.reduce((sum, c) => sum + c.amount, 0);

    categoryReports.forEach(c => {
      c.percentage = totalAmount > 0 ? (c.amount / totalAmount) * 100 : 0;
    });

    categoryReports.sort((a, b) => b.amount - a.amount);

    res.json(categoryReports);
  } catch (error) {
    console.error('Error fetching category report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMonthlyTrend = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const userId = req.user.id;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const transactions = await Transaction.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['date', 'type', 'amount'],
      order: [['date', 'ASC']]
    });

    const monthlyData = {};
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${year}-${month}`;

      if (!monthlyData[key]) {
        monthlyData[key] = {
          month: getMonthName(month),
          year: year,
          income: 0,
          expense: 0,
          sortKey: year * 100 + month
        };
      }

      if (t.type === 'income') {
        monthlyData[key].income += parseFloat(t.amount);
      } else {
        monthlyData[key].expense += parseFloat(t.amount);
      }
    });

    const result = Object.values(monthlyData)
      .map(m => ({
        month: m.month,
        year: m.year,
        income: m.income,
        expense: m.expense,
        balance: m.income - m.expense
      }))
      .sort((a, b) => {
        const aKey = a.year * 100 + getMonthNumber(a.month);
        const bKey = b.year * 100 + getMonthNumber(b.month);
        return aKey - bKey;
      });

    res.json(result);
  } catch (error) {
    console.error('Error fetching monthly trend:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

function getMonthName(month) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month - 1];
}

function getMonthNumber(monthName) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.indexOf(monthName) + 1;
}