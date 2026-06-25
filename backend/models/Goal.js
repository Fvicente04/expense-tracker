const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Goal = sequelize.define('Goal', {
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
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: true, len: [1, 100] }
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '💰'
  },
  targetAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'target_amount',
    validate: { min: { args: [0.01], msg: 'Target amount must be positive' } }
  },
  savedAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'saved_amount',
    validate: { min: { args: [0], msg: 'Saved amount cannot be negative' } }
  },
  deadline: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'goals',
  timestamps: true
});

module.exports = Goal;
