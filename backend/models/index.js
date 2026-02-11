const { sequelize } = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const Transaction = require('./Transaction');
const Budget = require('./Budget');

// Define relationships between models

// User has many Categories
User.hasMany(Category, {
  foreignKey: 'userId',
  as: 'categories',
  onDelete: 'CASCADE'
});
Category.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User has many Transactions
User.hasMany(Transaction, {
  foreignKey: 'userId',
  as: 'transactions',
  onDelete: 'CASCADE'
});
Transaction.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Category has many Transactions
Category.hasMany(Transaction, {
  foreignKey: 'categoryId',
  as: 'transactions',
  onDelete: 'RESTRICT' // Cannot delete category if transactions exist
});
Transaction.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

// User has many Budgets
User.hasMany(Budget, {
  foreignKey: 'userId',
  as: 'budgets',
  onDelete: 'CASCADE'
});
Budget.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Category has many Budgets
Category.hasMany(Budget, {
  foreignKey: 'categoryId',
  as: 'budgets',
  onDelete: 'CASCADE'
});
Budget.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

module.exports = {
  sequelize,
  User,
  Category,
  Transaction,
  Budget
};
