const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CardPayment = sequelize.define('CardPayment', {
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
  creditCardId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'credit_card_id',
    references: { model: 'credit_cards', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: { args: [0.01], msg: 'Payment amount must be positive' } }
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'payment_date'
  },
  billingMonth: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'billing_month',
    validate: { min: { args: [1] }, max: { args: [12] } }
  },
  billingYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'billing_year'
  },
  paymentType: {
    type: DataTypes.ENUM('minimum', 'full', 'partial'),
    allowNull: false,
    defaultValue: 'full',
    field: 'payment_type'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'card_payments',
  timestamps: true,
  indexes: [
    { fields: ['credit_card_id'], name: 'card_payments_card_idx' },
    { fields: ['user_id'],        name: 'card_payments_user_idx' },
    { fields: ['credit_card_id', 'billing_year', 'billing_month'], name: 'card_payments_billing_idx' }
  ]
});

module.exports = CardPayment;
