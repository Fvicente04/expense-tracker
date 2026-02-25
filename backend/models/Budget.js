const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Budget = sequelize.define('Budget', {
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
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Budget amount cannot be negative' },
      isDecimal: { msg: 'Amount must be a valid number' }
    }
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [1],  msg: 'Month must be between 1 and 12' },
      max: { args: [12], msg: 'Month must be between 1 and 12' }
    }
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [2020], msg: 'Year must be 2020 or later' }
    }
  },
  spent: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  }
}, {
  tableName: 'budgets',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'category_id', 'month', 'year'],
      name: 'budgets_user_category_month_year_unique'
    },
    {
      fields: ['user_id', 'month', 'year'],
      name: 'budgets_user_period_idx'
    }
  ]
});

Budget.prototype.getRemaining = function() {
  return parseFloat(this.amount) - parseFloat(this.spent);
};

Budget.prototype.getPercentageSpent = function() {
  const amount = parseFloat(this.amount);
  const spent = parseFloat(this.spent);
  return amount > 0 ? Math.round((spent / amount) * 100) : 0;
};

Budget.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  values.remaining = this.getRemaining();
  values.percentageSpent = this.getPercentageSpent();
  return values;
};

module.exports = Budget;