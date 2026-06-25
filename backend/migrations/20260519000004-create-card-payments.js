'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('card_payments', {
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
      credit_card_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'credit_cards', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      payment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      billing_month: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      billing_year: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      payment_type: {
        type: Sequelize.ENUM('minimum', 'full', 'partial'),
        allowNull: false,
        defaultValue: 'full'
      },
      notes: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('card_payments', ['credit_card_id'], { name: 'card_payments_card_idx' });
    await queryInterface.addIndex('card_payments', ['user_id'],        { name: 'card_payments_user_idx' });
    await queryInterface.addIndex('card_payments', ['credit_card_id', 'billing_year', 'billing_month'], { name: 'card_payments_billing_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('card_payments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_card_payments_payment_type"');
  }
};
