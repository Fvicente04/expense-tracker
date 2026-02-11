const { Transaction, Category } = require('../models');

// Get all transactions for the authenticated user
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: {
        userId: req.user.id
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name', 'icon', 'color']
      }],
      order: [['date', 'DESC']]
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name', 'icon', 'color']
      }]
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ message: 'Error fetching transaction' });
  }
};

// Create new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { type, amount, description, category_id, date, notes } = req.body;

    const transaction = await Transaction.create({
      userId: req.user.id,
      categoryId: category_id,
      type,
      amount,
      description,
      date,
      notes
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Error creating transaction' });
  }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
  try {
    const { amount, description, category_id, date, notes } = req.body;

    const transaction = await Transaction.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await transaction.update({
      amount: amount || transaction.amount,
      description: description || transaction.description,
      categoryId: category_id || transaction.categoryId,
      date: date || transaction.date,
      notes: notes !== undefined ? notes : transaction.notes
    });

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Error updating transaction' });
  }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await transaction.destroy();
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Error deleting transaction' });
  }
};