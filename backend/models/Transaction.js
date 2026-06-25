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
    allowNull: true,
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
    type: DataTypes.ENUM('weekly', 'biweekly', 'monthly'),
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
  },
  creditCardId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'credit_card_id',
    references: { model: 'credit_cards', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  externalId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'external_id'
  },
  source: {
    type: DataTypes.ENUM('manual', 'bank_sync'),
    allowNull: false,
    defaultValue: 'manual'
  },
  bankConnectionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'bank_connection_id',
    references: { model: 'bank_connections', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  indexes: [
    { fields: ['user_id'],                name: 'transactions_user_id_idx'        },
    { fields: ['user_id', 'date'],        name: 'transactions_user_date_idx'      },
    { fields: ['user_id', 'type'],        name: 'transactions_user_type_idx'      },
    { fields: ['user_id', 'category_id'], name: 'transactions_user_category_idx'  },
    { fields: ['recurring_group_id'],     name: 'transactions_recurring_group_idx'},
    { fields: ['credit_card_id'],         name: 'transactions_credit_card_idx'    },
    { fields: ['bank_connection_id'],     name: 'transactions_bank_connection_idx'},
    { fields: ['user_id', 'external_id'], name: 'transactions_user_external_idx', unique: true }
  ]
});

module.exports = Transaction;