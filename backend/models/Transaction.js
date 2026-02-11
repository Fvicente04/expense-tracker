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
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'category_id',
    references: {
      model: 'categories',
      key: 'id'
    },
    onDelete: 'RESTRICT', // Prevent deleting category if transactions exist
    onUpdate: 'CASCADE'
  },
  type: {
    type: DataTypes.ENUM('income', 'expense'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['income', 'expense']],
        msg: 'Type must be either income or expense'
      }
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Amount cannot be negative'
      },
      isDecimal: {
        msg: 'Amount must be a valid number'
      }
    }
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Please provide a description'
      },
      len: {
        args: [1, 200],
        msg: 'Description must be between 1 and 200 characters'
      }
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
      len: {
        args: [0, 500],
        msg: 'Notes cannot be more than 500 characters'
      }
    }
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  indexes: [
    // Index for faster queries by user
    {
      fields: ['user_id'],
      name: 'transactions_user_id_idx'
    },
    // Index for date-based queries
    {
      fields: ['user_id', 'date'],
      name: 'transactions_user_date_idx'
    },
    // Index for type-based queries
    {
      fields: ['user_id', 'type'],
      name: 'transactions_user_type_idx'
    },
    // Index for category-based queries
    {
      fields: ['user_id', 'category_id'],
      name: 'transactions_user_category_idx'
    }
  ]
});

module.exports = Transaction;
