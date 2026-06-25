'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('income', 'expense'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_recurring: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      recurring_frequency: {
        type: Sequelize.ENUM('weekly', 'biweekly', 'monthly'),
        allowNull: true
      },
      recurring_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      recurring_group_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('transactions', ['user_id'],                 { name: 'transactions_user_id_idx' });
    await queryInterface.addIndex('transactions', ['user_id', 'date'],         { name: 'transactions_user_date_idx' });
    await queryInterface.addIndex('transactions', ['user_id', 'type'],         { name: 'transactions_user_type_idx' });
    await queryInterface.addIndex('transactions', ['user_id', 'category_id'],  { name: 'transactions_user_category_idx' });
    await queryInterface.addIndex('transactions', ['recurring_group_id'],       { name: 'transactions_recurring_group_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('transactions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_transactions_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_transactions_recurring_frequency"');
  }
};
