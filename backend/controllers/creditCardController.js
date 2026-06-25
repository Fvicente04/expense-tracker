const { CreditCard, CardPayment, Transaction, Category, sequelize } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const { parseAIBCSV, suggestCategory } = require('./importController');

// ── helpers ──────────────────────────────────────────────────────────────────

function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(lastDay).padStart(2, '0')}` };
}

function computeDaysUntilDue(dueDay) {
  if (!dueDay) return null;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  let due = new Date(y, m, dueDay);
  if (d >= dueDay) due = new Date(y, m + 1, dueDay);
  return Math.ceil((due - now) / 86400000);
}

function billingPeriod(statementDay) {
  if (!statementDay) return currentMonthRange();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (d >= statementDay) {
    const startY = y, startM = m;
    const endDate = new Date(y, m + 1, statementDay - 1);
    return {
      start: `${startY}-${String(startM + 1).padStart(2, '0')}-${String(statementDay).padStart(2, '0')}`,
      end:   `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    };
  } else {
    const prevDate = new Date(y, m - 1, statementDay);
    const endDate  = new Date(y, m, statementDay - 1);
    return {
      start: `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`,
      end:   `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    };
  }
}

async function attachStats(card) {
  const period = billingPeriod(card.statementDay);

  const [spendRaw, payment] = await Promise.all([
    Transaction.sum('amount', {
      where: { creditCardId: card.id, type: 'expense', date: { [Op.between]: [period.start, period.end] } }
    }),
    CardPayment.findOne({
      where: {
        creditCardId: card.id,
        billingMonth: new Date().getMonth() + 1,
        billingYear:  new Date().getFullYear()
      },
      order: [['paymentDate', 'DESC']]
    })
  ]);

  const currentSpend     = parseFloat(spendRaw || 0);
  const creditLimit      = card.creditLimit ? parseFloat(card.creditLimit) : null;
  const availableCredit  = creditLimit !== null ? creditLimit - currentSpend : null;
  const utilizationPct   = creditLimit && creditLimit > 0 ? Math.round((currentSpend / creditLimit) * 100) : null;
  const alertThreshold   = card.utilizationAlertPct ?? 80;
  const daysUntilDue     = computeDaysUntilDue(card.dueDay);

  return {
    ...card.toJSON(),
    currentSpend,
    availableCredit,
    utilizationPct,
    utilizationAlert: utilizationPct !== null && utilizationPct >= alertThreshold,
    dueAlert:         daysUntilDue !== null && daysUntilDue <= 7,
    daysUntilDue,
    billingPeriod:    period,
    lastPayment:      payment ? { amount: parseFloat(payment.amount), date: payment.paymentDate, type: payment.paymentType } : null
  };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const cards = await CreditCard.findAll({ where: { userId: req.user.id, isActive: true }, order: [['createdAt', 'ASC']] });
    res.json(await Promise.all(cards.map(attachStats)));
  } catch (err) { console.error('creditCard.getAll:', err); res.status(500).json({ message: 'Error fetching credit cards' }); }
};

exports.getById = async (req, res) => {
  try {
    const card = await CreditCard.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!card) return res.status(404).json({ message: 'Credit card not found' });
    res.json(await attachStats(card));
  } catch (err) { console.error('creditCard.getById:', err); res.status(500).json({ message: 'Error fetching credit card' }); }
};

exports.create = async (req, res) => {
  try {
    const { name, lastFourDigits, creditLimit, color, icon, statementDay, dueDay, utilizationAlertPct } = req.body;
    if (!name) return res.status(400).json({ message: 'Card name is required' });
    const card = await CreditCard.create({
      userId: req.user.id,
      name,
      lastFourDigits:      lastFourDigits      || null,
      creditLimit:         creditLimit         || null,
      color:               color               || '#667eea',
      icon:                icon                || '💳',
      statementDay:        statementDay        || null,
      dueDay:              dueDay              || null,
      utilizationAlertPct: utilizationAlertPct ?? 80
    });
    res.status(201).json(await attachStats(card));
  } catch (err) {
    console.error('creditCard.create:', err);
    if (err?.name === 'SequelizeValidationError') return res.status(400).json({ message: err.errors[0]?.message || 'Validation error' });
    res.status(500).json({ message: 'Error creating credit card' });
  }
};

exports.update = async (req, res) => {
  try {
    const card = await CreditCard.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!card) return res.status(404).json({ message: 'Credit card not found' });
    const { name, lastFourDigits, creditLimit, color, icon, isActive, statementDay, dueDay, utilizationAlertPct } = req.body;
    const updates = {};
    if (name               !== undefined) updates.name               = name;
    if (lastFourDigits     !== undefined) updates.lastFourDigits     = lastFourDigits     || null;
    if (creditLimit        !== undefined) updates.creditLimit        = creditLimit        || null;
    if (color              !== undefined) updates.color              = color;
    if (icon               !== undefined) updates.icon               = icon;
    if (isActive           !== undefined) updates.isActive           = isActive;
    if (statementDay       !== undefined) updates.statementDay       = statementDay       || null;
    if (dueDay             !== undefined) updates.dueDay             = dueDay             || null;
    if (utilizationAlertPct !== undefined) updates.utilizationAlertPct = utilizationAlertPct;
    await card.update(updates);
    res.json(await attachStats(card));
  } catch (err) {
    console.error('creditCard.update:', err);
    if (err?.name === 'SequelizeValidationError') return res.status(400).json({ message: err.errors[0]?.message || 'Validation error' });
    res.status(500).json({ message: 'Error updating credit card' });
  }
};

exports.remove = async (req, res) => {
  try {
    const card = await CreditCard.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!card) return res.status(404).json({ message: 'Credit card not found' });
    await card.destroy();
    res.json({ message: 'Credit card deleted successfully' });
  } catch (err) { console.error('creditCard.remove:', err); res.status(500).json({ message: 'Error deleting credit card' }); }
};

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────

exports.getTransactions = async (req, res) => {
  try {
    const card = await CreditCard.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!card) return res.status(404).json({ message: 'Credit card not found' });

    const { startDate, endDate, type, page, limit, search } = req.query;
    const include = [{ model: Category, as: 'category', attributes: ['name', 'icon', 'color'] }];
    const order   = [['date', 'DESC']];
    const where   = { userId: req.user.id, creditCardId: card.id };

    if (startDate) where.date = { ...(where.date || {}), [Op.gte]: startDate };
    if (endDate)   where.date = { ...(where.date || {}), [Op.lte]: endDate   };
    if (type)      where.type = type;
    if (search)    where.description = { [Op.iLike]: `%${search.replace(/[\\%_]/g, '\\$&')}%` };

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

    res.json({
      data: rows, total, page: pageNum,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      summary: {
        totalIncome:   parseFloat(incomeRaw  || 0),
        totalExpenses: parseFloat(expenseRaw || 0),
        balance:       parseFloat(incomeRaw  || 0) - parseFloat(expenseRaw || 0)
      }
    });
  } catch (err) { console.error('creditCard.getTransactions:', err); res.status(500).json({ message: 'Error fetching transactions' }); }
};

// ── MONTHLY HISTORY ───────────────────────────────────────────────────────────

exports.getMonthlyHistory = async (req, res) => {
  try {
    const card = await CreditCard.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!card) return res.status(404).json({ message: 'Credit card not found' });

    const rows = await sequelize.query(`
      SELECT
        TO_CHAR(date::date, 'YYYY-MM') AS "yearMonth",
        ROUND(SUM(CASE WHEN type = 'expense' THEN amount::numeric ELSE 0 END), 2)::float AS expenses,
        ROUND(SUM(CASE WHEN type = 'income'  THEN amount::numeric ELSE 0 END), 2)::float AS income,
        COUNT(*)::int AS count
      FROM transactions
      WHERE credit_card_id = :cardId
        AND user_id = :userId
      GROUP BY TO_CHAR(date::date, 'YYYY-MM')
      ORDER BY "yearMonth" DESC
      LIMIT 12
    `, {
      replacements: { cardId: card.id, userId: req.user.id },
      type: QueryTypes.SELECT
    });

    // Attach payments per month
    const payments = await CardPayment.findAll({
      where: { creditCardId: card.id, userId: req.user.id },
      attributes: ['amount', 'billingMonth', 'billingYear', 'paymentType'],
      raw: true
    });

    const payByMonth = {};
    for (const p of payments) {
      const key = `${p.billingYear}-${String(p.billingMonth).padStart(2, '0')}`;
      if (!payByMonth[key]) payByMonth[key] = 0;
      payByMonth[key] += parseFloat(p.amount);
    }

    const history = rows.map(m => ({
      yearMonth: m.yearMonth,
      expenses:  parseFloat(m.expenses),
      income:    parseFloat(m.income),
      count:     parseInt(m.count),
      paid:      Math.round((payByMonth[m.yearMonth] || 0) * 100) / 100
    }));

    res.json(history);
  } catch (err) { console.error('creditCard.getMonthlyHistory:', err); res.status(500).json({ message: 'Error fetching history' }); }
};

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────

exports.getSubscriptions = async (req, res) => {
  try {
    const card = await CreditCard.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!card) return res.status(404).json({ message: 'Credit card not found' });

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const startStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-${String(sixMonthsAgo.getDate()).padStart(2, '0')}`;

    const transactions = await Transaction.findAll({
      where: { creditCardId: card.id, userId: req.user.id, type: 'expense', date: { [Op.gte]: startStr } },
      attributes: ['description', 'amount', 'date'],
      raw: true
    });

    const groups = {};
    for (const t of transactions) {
      const key = t.description.toLowerCase().trim();
      if (!groups[key]) groups[key] = { description: t.description, amounts: [], months: new Set(), lastDate: t.date };
      groups[key].amounts.push(parseFloat(t.amount));
      groups[key].months.add(String(t.date).slice(0, 7));
      if (String(t.date) > String(groups[key].lastDate)) groups[key].lastDate = t.date;
    }

    const subscriptions = [];
    for (const data of Object.values(groups)) {
      if (data.months.size < 2) continue;
      const avg = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
      const consistent = data.amounts.every(a => avg === 0 || Math.abs(a - avg) / avg < 0.15);
      if (consistent) {
        subscriptions.push({
          description:  data.description,
          avgAmount:    Math.round(avg * 100) / 100,
          occurrences:  data.amounts.length,
          monthsActive: data.months.size,
          lastDate:     data.lastDate
        });
      }
    }

    subscriptions.sort((a, b) => b.monthsActive - a.monthsActive || b.avgAmount - a.avgAmount);
    res.json(subscriptions);
  } catch (err) { console.error('creditCard.getSubscriptions:', err); res.status(500).json({ message: 'Error detecting subscriptions' }); }
};

// ── PAYMENTS ──────────────────────────────────────────────────────────────────

exports.getPayments = async (req, res) => {
  try {
    const card = await CreditCard.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!card) return res.status(404).json({ message: 'Credit card not found' });

    const payments = await CardPayment.findAll({
      where: { creditCardId: card.id, userId: req.user.id },
      order: [['paymentDate', 'DESC']],
      limit: 24
    });
    res.json(payments);
  } catch (err) { console.error('creditCard.getPayments:', err); res.status(500).json({ message: 'Error fetching payments' }); }
};

exports.recordPayment = async (req, res) => {
  try {
    const card = await CreditCard.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!card) return res.status(404).json({ message: 'Credit card not found' });

    const { amount, paymentDate, billingMonth, billingYear, paymentType, notes } = req.body;
    if (!amount || !paymentDate || !billingMonth || !billingYear) {
      return res.status(400).json({ message: 'amount, paymentDate, billingMonth and billingYear are required' });
    }
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    const payment = await CardPayment.create({
      userId:       req.user.id,
      creditCardId: card.id,
      amount:       parseFloat(amount),
      paymentDate,
      billingMonth: parseInt(billingMonth),
      billingYear:  parseInt(billingYear),
      paymentType:  paymentType || 'full',
      notes:        notes || null
    });
    res.status(201).json(payment);
  } catch (err) {
    console.error('creditCard.recordPayment:', err);
    if (err?.name === 'SequelizeValidationError') return res.status(400).json({ message: err.errors[0]?.message });
    res.status(500).json({ message: 'Error recording payment' });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await CardPayment.findOne({
      where: { id: req.params.paymentId, creditCardId: req.params.id, userId: req.user.id }
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    await payment.destroy();
    res.json({ message: 'Payment deleted' });
  } catch (err) { console.error('creditCard.deletePayment:', err); res.status(500).json({ message: 'Error deleting payment' }); }
};

// ── IMPORT ────────────────────────────────────────────────────────────────────

exports.importPreview = async (req, res) => {
  try {
    const card = await CreditCard.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!card) return res.status(404).json({ message: 'Credit card not found' });
    const { csvText } = req.body;
    if (!csvText || typeof csvText !== 'string') return res.status(400).json({ message: 'Nenhum dado CSV recebido' });

    let result;
    try { result = parseAIBCSV(csvText); }
    catch (err) { return res.status(400).json({ message: err.message }); }

    const { transactions: parsed, format } = result;
    if (parsed.length === 0) return res.status(400).json({ message: 'Nenhuma transação encontrada no ficheiro CSV' });

    const categories = await Category.findAll({ where: { userId: req.user.id } });
    const transactions = parsed.map((t, i) => ({
      ...t,
      categoryId: suggestCategory(t.description, t.type, categories, t.aibCategory) || '',
      _row: i
    }));
    res.json({ transactions, categories, format });
  } catch (err) { console.error('creditCard.importPreview:', err); res.status(500).json({ message: 'Falha ao processar o ficheiro CSV' }); }
};

exports.importConfirm = async (req, res) => {
  try {
    const card = await CreditCard.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!card) return res.status(404).json({ message: 'Credit card not found' });
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) return res.status(400).json({ message: 'Nenhuma transação para importar' });

    for (const t of transactions) {
      if (!t.categoryId)                           return res.status(400).json({ message: 'Todas as transações precisam de uma categoria' });
      if (!['income', 'expense'].includes(t.type)) return res.status(400).json({ message: 'Tipo de transação inválido' });
      if (!t.amount || isNaN(Number(t.amount)))    return res.status(400).json({ message: 'Valor inválido' });
      if (!t.date)                                 return res.status(400).json({ message: 'Data é obrigatória' });
      if (!t.description)                          return res.status(400).json({ message: 'Descrição é obrigatória' });
    }

    const catIds = [...new Set(transactions.map(t => t.categoryId))];
    const validCats = await Category.findAll({ where: { id: catIds, userId: req.user.id } });
    if (validCats.length !== catIds.length) return res.status(400).json({ message: 'Uma ou mais categorias são inválidas' });

    const importDates = [...new Set(transactions.map(t => t.date))];
    const existingTxs = await Transaction.findAll({
      where: { userId: req.user.id, creditCardId: card.id, date: { [Op.in]: importDates } },
      attributes: ['date', 'description', 'type', 'amount'],
      raw: true
    });
    const existingKeys = new Set(
      existingTxs.map(t => `${t.date}|${t.description}|${t.type}|${parseFloat(t.amount)}`)
    );

    const toCreate = [];
    let skipped = 0;

    for (const t of transactions) {
      const key = `${t.date}|${t.description}|${t.type}|${parseFloat(t.amount)}`;
      if (existingKeys.has(key)) { skipped++; }
      else {
        toCreate.push({
          userId: req.user.id, creditCardId: card.id, categoryId: t.categoryId,
          type: t.type, amount: parseFloat(t.amount),
          description: String(t.description).slice(0, 200),
          date: t.date, notes: null, isRecurring: false,
          recurringFrequency: null, recurringEndDate: null, recurringGroupId: null
        });
      }
    }

    if (toCreate.length > 0) await Transaction.bulkCreate(toCreate);
    res.json({
      imported: toCreate.length, skipped,
      message: `${toCreate.length} transação(ões) importada(s)` + (skipped > 0 ? `, ${skipped} duplicada(s) ignorada(s)` : '')
    });
  } catch (err) { console.error('creditCard.importConfirm:', err); res.status(500).json({ message: 'Falha ao importar transações' }); }
};
