const { Transaction, Category, sequelize } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

function recurringDates(startDate, frequency, endDate) {
  const dates = [];
  const end = endDate ? new Date(endDate) : null;
  const start = new Date(startDate);
  const baseDay = start.getUTCDate();

  for (let i = 1; i <= 60; i++) {
    const cur = new Date(start);
    if (frequency === 'weekly')        cur.setUTCDate(start.getUTCDate() + 7 * i);
    else if (frequency === 'biweekly') cur.setUTCDate(start.getUTCDate() + 14 * i);
    else if (frequency === 'monthly') {
      // anchor to the original day and clamp, otherwise Jan 31 drifts to Mar 3
      cur.setUTCDate(1);
      cur.setUTCMonth(start.getUTCMonth() + i);
      const lastDay = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 0)).getUTCDate();
      cur.setUTCDate(Math.min(baseDay, lastDay));
    }

    if (end && cur > end) break;
    dates.push(cur.toISOString().split('T')[0]);
  }

  return dates;
}

exports.getAllTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, categoryId, bankConnectionId, showFuture, page, limit, search } = req.query;
    const include = [{ model: Category, as: 'category', attributes: ['name', 'icon', 'color'] }];
    const order = [['date', 'DESC']];

    // No pagination params → full dump for reports/forecast/dashboard (backward compat)
    const isPaginated = page || limit;
    if (!isPaginated && !startDate && !endDate && !type && !categoryId && showFuture === undefined) {
      const transactions = await Transaction.findAll({ where: { userId: req.user.id }, include, order });
      return res.json(transactions);
    }

    // Build filtered where
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const where = { userId: req.user.id };
    const dateWhere = {};
    if (startDate) dateWhere[Op.gte] = startDate;
    if (endDate && showFuture === 'false') {
      dateWhere[Op.lte] = endDate > todayStr ? todayStr : endDate;
    } else if (endDate) {
      dateWhere[Op.lte] = endDate;
    } else if (showFuture === 'false') {
      dateWhere[Op.lte] = todayStr;
    }
    if (startDate || endDate || showFuture === 'false') where.date = dateWhere;
    if (type)       where.type = type;
    if (categoryId)       where.categoryId = categoryId;
    if (bankConnectionId) where.bankConnectionId = bankConnectionId;
    if (search)           where.description = { [Op.iLike]: `%${search.replace(/[\\%_]/g, '\\$&')}%` };
    // Filtered but not paginated (e.g. CSV export)
    if (!isPaginated) {
      const transactions = await Transaction.findAll({ where, include, order });
      return res.json(transactions);
    }

    // Paginated + filtered
    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const pageSize = Math.min(100, parseInt(limit) || 10);
    const offset   = (pageNum - 1) * pageSize;

    const whereNoType = { ...where }; delete whereNoType.type;

    const [rows, total, incomeRaw, expenseRaw] = await Promise.all([
      Transaction.findAll({ where, include, order, limit: pageSize, offset }),
      Transaction.count({ where }),
      Transaction.sum('amount', { where: { ...whereNoType, type: 'income'  } }),
      Transaction.sum('amount', { where: { ...whereNoType, type: 'expense' } })
    ]);

    const totalIncome   = parseFloat(incomeRaw  || 0);
    const totalExpenses = parseFloat(expenseRaw || 0);

    res.json({
      data: rows,
      total,
      page: pageNum,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      summary: { totalIncome, totalExpenses, balance: totalIncome - totalExpenses }
    });
  } catch (err) {
    console.error('getAllTransactions:', err);
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
    console.error('getTransactionById:', err);
    res.status(500).json({ message: 'Error fetching transaction' });
  }
};

exports.createTransaction = async (req, res) => {
  const t = await sequelize.transaction();
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

    const cat = await Category.findOne({ where: { id: catId, userId: req.user.id }, transaction: t });
    if (!cat) {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid category' });
    }

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
    }, { transaction: t });

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
        })), { transaction: t });
      }
    }

    await t.commit();

    const created = await Transaction.findByPk(transaction.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }]
    });

    return res.status(201).json(created);
  } catch (err) {
    await t.rollback();
    console.error('createTransaction:', err);
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

    const {
      amount, description, categoryId, category_id, date, notes,
      type, recurringFrequency, recurringEndDate
    } = req.body;

    const updates = {};
    if (amount !== undefined)                                       updates.amount = Number(amount);
    if (description !== undefined && description)                   updates.description = description;
    if (type !== undefined && ['income','expense'].includes(type))  updates.type = type;
    const catId = categoryId || category_id;
    if (catId) {
      const cat = await Category.findOne({ where: { id: catId, userId: req.user.id } });
      if (!cat) return res.status(400).json({ message: 'Invalid category' });
      updates.categoryId = catId;
    }
    if (date !== undefined && date)                                 updates.date = date;
    if (notes !== undefined)                                        updates.notes = notes || null;
    if (recurringFrequency !== undefined)                           updates.recurringFrequency = recurringFrequency || null;
    if (recurringEndDate !== undefined)                             updates.recurringEndDate = recurringEndDate || null;

    if (req.query.updateSeries === 'true' && transaction.recurringGroupId) {
      // date stays per-occurrence — applying one date to the whole series would collapse it
      const seriesUpdates = { ...updates };
      delete seriesUpdates.date;
      await Transaction.update(seriesUpdates, {
        where: {
          recurringGroupId: transaction.recurringGroupId,
          userId: req.user.id,
          date: { [Op.gte]: String(transaction.date).slice(0, 10) }
        }
      });
    } else {
      await transaction.update(updates);
    }

    const updated = await Transaction.findByPk(transaction.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }]
    });
    res.json(updated);
  } catch (err) {
    console.error('updateTransaction:', err);
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
    console.error('deleteTransaction:', err);
    res.status(500).json({ message: 'Error deleting transaction' });
  }
};
