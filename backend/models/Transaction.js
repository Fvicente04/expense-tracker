const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'category_id',
    references: { model: 'categories', key: 'id' },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  type: {
    type: DataTypes.ENUM('income', 'expense'),
    allowNull: false,
    validate: {
      isIn: { args: [['income', 'expense']], msg: 'Type must be either income or expense' }
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Amount cannot be negative' },
      isDecimal: { msg: 'Amount must be a valid number' }
    }
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please provide a description' },
      len: { args: [1, 200], msg: 'Description must be between 1 and 200 characters' }
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 500], msg: 'Notes cannot be more than 500 characters' }
    }
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_recurring'
  },
  recurringFrequency: {
    type: DataTypes.ENUM('weekly', 'monthly', 'yearly'),
    allowNull: true,
    field: 'recurring_frequency'
  },
  recurringEndDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'recurring_end_date'
  },
  recurringGroupId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'recurring_group_id'
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  indexes: [
    { fields: ['user_id'],                name: 'transactions_user_id_idx'        },
    { fields: ['user_id', 'date'],        name: 'transactions_user_date_idx'      },
    { fields: ['user_id', 'type'],        name: 'transactions_user_type_idx'      },
    { fields: ['user_id', 'category_id'], name: 'transactions_user_category_idx'  },
    { fields: ['recurring_group_id'],     name: 'transactions_recurring_group_idx'}
  ]
});

module.exports = Transaction;