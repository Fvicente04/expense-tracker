'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('transactions', 'credit_card_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'credit_cards', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addIndex('transactions', ['credit_card_id'], { name: 'transactions_credit_card_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('transactions', 'transactions_credit_card_idx');
    await queryInterface.removeColumn('transactions', 'credit_card_id');
  }
};
