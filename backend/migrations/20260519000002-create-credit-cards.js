'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('credit_cards', {
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
      name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      last_four_digits: {
        type: Sequelize.STRING(4),
        allowNull: true
      },
      credit_limit: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#667eea'
      },
      icon: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: '💳'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      statement_day: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      due_day: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      utilization_alert_pct: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 80
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

    await queryInterface.addIndex('credit_cards', ['user_id'], { name: 'credit_cards_user_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('credit_cards');
  }
};
