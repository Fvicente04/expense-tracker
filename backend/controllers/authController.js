const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

exports.register = async (req, res) => {
  try {
    const { name, email, password, currency } = req.body;

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password, currency: currency || 'EUR' });
    const token = signToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email, currency: user.currency }
    });
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors.map(e => e.message).join(', ') });
    }
    console.error('register:', err);
    res.status(500).json({ message: 'Error registering user' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, currency: user.currency }
    });
  } catch (err) {
    console.error('login:', err);
    res.status(500).json({ message: 'Error logging in' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'currency', 'createdAt']
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('getCurrentUser:', err);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, currency } = req.body;
    if (name !== undefined)     user.name     = name;
    if (currency !== undefined) user.currency = currency;
    await user.save();

    res.json({ id: user.id, name: user.name, email: user.email, currency: user.currency });
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors.map(e => e.message).join(', ') });
    }
    console.error('updateProfile:', err);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { currentPassword, newPassword } = req.body;

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    // Old tokens are now revoked; return a fresh one so this session survives
    res.json({ message: 'Password updated successfully', token: signToken(user) });
  } catch (err) {
    console.error('changePassword:', err);
    res.status(500).json({ message: 'Error changing password' });
  }
};