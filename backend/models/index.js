const { sequelize } = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const Transaction = require('./Transaction');
const Budget = require('./Budget');
const Goal = require('./Goal');
const CreditCard = require('./CreditCard');
const CardPayment = require('./CardPayment');
const BankConnection = require('./BankConnection');
const CategoryRule = require('./CategoryRule');

User.hasMany(Category, { foreignKey: 'userId', as: 'categories', onDelete: 'CASCADE' });
Category.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions', onDelete: 'CASCADE' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Category.hasMany(Transaction, { foreignKey: 'categoryId', as: 'transactions', onDelete: 'RESTRICT' });
Transaction.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

User.hasMany(Budget, { foreignKey: 'userId', as: 'budgets', onDelete: 'CASCADE' });
Budget.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Category.hasMany(Budget, { foreignKey: 'categoryId', as: 'budgets', onDelete: 'CASCADE' });
Budget.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

User.hasMany(Goal, { foreignKey: 'userId', as: 'goals', onDelete: 'CASCADE' });
Goal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(CreditCard, { foreignKey: 'userId', as: 'creditCards', onDelete: 'CASCADE' });
CreditCard.belongsTo(User, { foreignKey: 'userId', as: 'user' });

CreditCard.hasMany(Transaction, { foreignKey: 'creditCardId', as: 'transactions', onDelete: 'SET NULL' });
Transaction.belongsTo(CreditCard, { foreignKey: 'creditCardId', as: 'creditCard' });

CreditCard.hasMany(CardPayment, { foreignKey: 'creditCardId', as: 'payments', onDelete: 'CASCADE' });
CardPayment.belongsTo(CreditCard, { foreignKey: 'creditCardId', as: 'creditCard' });

User.hasMany(CardPayment, { foreignKey: 'userId', as: 'cardPayments', onDelete: 'CASCADE' });
CardPayment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(BankConnection, { foreignKey: 'userId', as: 'bankConnections', onDelete: 'CASCADE' });
BankConnection.belongsTo(User, { foreignKey: 'userId', as: 'user' });

BankConnection.hasMany(Transaction, { foreignKey: 'bankConnectionId', as: 'transactions', onDelete: 'SET NULL' });
Transaction.belongsTo(BankConnection, { foreignKey: 'bankConnectionId', as: 'bankConnection' });

User.hasMany(CategoryRule, { foreignKey: 'userId', as: 'categoryRules', onDelete: 'CASCADE' });
CategoryRule.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Category.hasMany(CategoryRule, { foreignKey: 'categoryId', as: 'rules', onDelete: 'CASCADE' });
CategoryRule.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

module.exports = { sequelize, User, Category, Transaction, Budget, Goal, CreditCard, CardPayment, BankConnection, CategoryRule };