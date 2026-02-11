const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
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
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Please provide a category name'
      },
      len: {
        args: [1, 50],
        msg: 'Category name must be between 1 and 50 characters'
      }
    }
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
  icon: {
    type: DataTypes.STRING(10),
    defaultValue: '💰'
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#3498db',
    validate: {
      is: {
        args: /^#[0-9A-F]{6}$/i,
        msg: 'Color must be a valid hex color code'
      }
    }
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default'
  }
}, {
  tableName: 'categories',
  timestamps: true,
  indexes: [
    // Compound index for user, name, and type (prevent duplicates)
    {
      unique: true,
      fields: ['user_id', 'name', 'type'],
      name: 'categories_user_name_type_unique'
    },
    // Index for faster queries by user
    {
      fields: ['user_id'],
      name: 'categories_user_id_idx'
    }
  ]
});

module.exports = Category;
