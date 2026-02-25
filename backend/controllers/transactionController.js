const { Transaction, Category } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

function recurringDates(startDate, frequency, endDate) {
  const dates = [];
  const end = endDate ? new Date(endDate) : null;
  const cur = new Date(startDate);

  for (let i = 0; i < 60; i++) {
    if (frequency === 'weekly')       cur.setDate(cur.getDate() + 7);
    else if (frequency === 'monthly') cur.setMonth(cur.getMonth() + 1);
    else if (frequency === 'yearly')  cur.setFullYear(cur.getFullYear() + 1);

    if (end && cur > end) break;
    dates.push(cur.toISOString().split('T')[0]);
  }

  return dates;
}

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { userId: req.user.id },
      include: [{ model: Category, as: 'category', attributes: ['name', 'icon', 'color'] }],
      order: [['date', 'DESC']]
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Category, as: 'category', attributes: ['name', 'icon', 'color'] }]
    });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching transaction' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const {
      type, amount, description, date, notes,
      categoryId, category_id, category,
      isRecurring, recurringFrequency, recurringEndDate
    } = req.body;

    const catId = categoryId || category_id || category?.id || category?._id;

    if (!catId)                                        return res.status(400).json({ message: 'Category is required' });
    if (!type || !['income','expense'].includes(type)) return res.status(400).json({ message: 'Invalid type (income/expense)' });
    if (amount == null || isNaN(Number(amount)))       return res.status(400).json({ message: 'Invalid amount' });
    if (!description)                                  return res.status(400).json({ message: 'Description is required' });
    if (!date)                                         return res.status(400).json({ message: 'Date is required' });
    if (isRecurring && !recurringFrequency)            return res.status(400).json({ message: 'Frequency is required for recurring transactions' });

    const cat = await Category.findOne({ where: { id: catId, userId: req.user.id } });
    if (!cat) return res.status(400).json({ message: 'Invalid category' });

    const groupId = isRecurring ? uuidv4() : null;

    const transaction = await Transaction.create({
      userId: req.user.id,
      categoryId: catId,
      type, amount, description, date,
      notes: notes ?? null,
      isRecurring: !!isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : null,
      recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate : null,
      recurringGroupId: groupId
    });

    if (isRecurring) {
      const dates = recurringDates(date, recurringFrequency, recurringEndDate);
      if (dates.length > 0) {
        await Transaction.bulkCreate(dates.map(d => ({
          id: uuidv4(),
          userId: req.user.id,
          categoryId: catId,
          type, amount, description,
          date: d,
          notes: notes ?? null,
          isRecurring: true,
          recurringFrequency,
          recurringEndDate: recurringEndDate || null,
          recurringGroupId: groupId,
          createdAt: new Date(),
          updatedAt: new Date()
        })));
      }
    }

    const created = await Transaction.findByPk(transaction.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }]
    });

    return res.status(201).json(created);
  } catch (err) {
    if (err?.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: err.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    return res.status(500).json({ message: 'Error creating transaction' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    const { amount, description, categoryId, category_id, date, notes } = req.body;
    await transaction.update({
      amount:      amount      || transaction.amount,
      description: description || transaction.description,
      categoryId:  categoryId  || category_id || transaction.categoryId,
      date:        date        || transaction.date,
      notes:       notes !== undefined ? notes : transaction.notes
    });

    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: 'Error updating transaction' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    if (req.query.deleteSeries === 'true' && transaction.recurringGroupId) {
      await Transaction.destroy({
        where: {
          recurringGroupId: transaction.recurringGroupId,
          userId: req.user.id,
          date: { [Op.gte]: transaction.date }
        }
      });
      return res.json({ message: 'Recurring series deleted successfully' });
    }

    await transaction.destroy();
    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting transaction' });
  }
};

exports.bulkDeleteTransactions = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: 'No transaction IDs provided' });

    const count = await Transaction.destroy({ where: { id: ids, userId: req.user.id } });
    res.json({ message: `${count} transactions deleted` });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting transactions' });
  }
};