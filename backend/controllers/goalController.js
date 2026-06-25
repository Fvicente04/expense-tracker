const { Goal } = require('../models');
const { validationResult } = require('express-validator');

const normalize = (g) => ({
  id:           g.id,
  userId:       g.user_id || g.userId,
  name:         g.name,
  icon:         g.icon,
  targetAmount: parseFloat(g.targetAmount  || g.target_amount  || 0),
  savedAmount:  parseFloat(g.savedAmount   || g.saved_amount   || 0),
  deadline:     g.deadline || null,
  createdAt:    g.createdAt,
  updatedAt:    g.updatedAt
});

exports.getAll = async (req, res) => {
  try {
    const goals = await Goal.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'ASC']]
    });
    res.json(goals.map(normalize));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load goals' });
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, icon, targetAmount, savedAmount, deadline } = req.body;
  try {
    const goal = await Goal.create({
      userId:       req.user.id,
      name:         name.trim(),
      icon:         icon || '💰',
      targetAmount: parseFloat(targetAmount),
      savedAmount:  parseFloat(savedAmount || 0),
      deadline:     deadline || null
    });
    res.status(201).json(normalize(goal));
  } catch (err) {
    res.status(500).json({ message: 'Failed to create goal' });
  }
};

exports.update = async (req, res) => {
  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const { name, icon, targetAmount, savedAmount, deadline } = req.body;
    if (name         !== undefined) goal.name         = name.trim();
    if (icon         !== undefined) goal.icon         = icon;
    if (targetAmount !== undefined) goal.targetAmount = parseFloat(targetAmount);
    if (savedAmount  !== undefined) goal.savedAmount  = parseFloat(savedAmount);
    if (deadline     !== undefined) goal.deadline     = deadline || null;

    await goal.save();
    res.json(normalize(goal));
  } catch (err) {
    res.status(500).json({ message: 'Failed to update goal' });
  }
};

exports.deposit = async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
    return res.status(400).json({ message: 'Amount must be positive' });

  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    goal.savedAmount = parseFloat(goal.savedAmount) + parseFloat(amount);
    await goal.save();
    res.json(normalize(goal));
  } catch (err) {
    res.status(500).json({ message: 'Failed to deposit' });
  }
};

exports.remove = async (req, res) => {
  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    await goal.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete goal' });
  }
};
