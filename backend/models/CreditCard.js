const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CreditCard = sequelize.define('CreditCard', {
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
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Card name cannot be empty' },
      len: { args: [1, 50], msg: 'Card name must be between 1 and 50 characters' }
    }
  },
  lastFourDigits: {
    type: DataTypes.STRING(4),
    allowNull: true,
    field: 'last_four_digits',
    validate: {
      is: { args: /^\d{4}$/, msg: 'Last four digits must be exactly 4 numeric digits' }
    }
  },
  creditLimit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'credit_limit',
    validate: {
      min: { args: [0], msg: 'Credit limit cannot be negative' }
    }
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#667eea',
    validate: {
      is: { args: /^#[0-9A-Fa-f]{6}$/, msg: 'Color must be a valid hex color' }
    }
  },
  icon: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: '💳'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  statementDay: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'statement_day',
    validate: { min: { args: [1], msg: 'Statement day must be between 1 and 31' }, max: { args: [31], msg: 'Statement day must be between 1 and 31' } }
  },
  dueDay: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'due_day',
    validate: { min: { args: [1], msg: 'Due day must be between 1 and 31' }, max: { args: [31], msg: 'Due day must be between 1 and 31' } }
  },
  utilizationAlertPct: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 80,
    field: 'utilization_alert_pct',
    validate: { min: { args: [1] }, max: { args: [100] } }
  }
}, {
  tableName: 'credit_cards',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id'],
      name: 'credit_cards_user_idx'
    }
  ]
});

module.exports = CreditCard;
