const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CategoryRule = sequelize.define('CategoryRule', {
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
    onDelete: 'CASCADE'
  },
  keyword: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'category_id',
    references: { model: 'categories', key: 'id' },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'category_rules',
  timestamps: true
});

module.exports = CategoryRule;
