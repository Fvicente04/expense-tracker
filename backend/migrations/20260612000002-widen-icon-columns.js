'use strict';

// Icons moved from short emojis to lucide icon names (e.g. "shoppingCart"),
// which overflow the original varchar(10) columns.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('categories', 'icon', {
      type: Sequelize.STRING(50),
      defaultValue: '💰'
    });
    await queryInterface.changeColumn('goals', 'icon', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: '💰'
    });
    await queryInterface.changeColumn('credit_cards', 'icon', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: '💳'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('categories', 'icon', { type: Sequelize.STRING(10), defaultValue: '💰' });
    await queryInterface.changeColumn('goals', 'icon', { type: Sequelize.STRING(10), allowNull: false, defaultValue: '💰' });
    await queryInterface.changeColumn('credit_cards', 'icon', { type: Sequelize.STRING(10), allowNull: false, defaultValue: '💳' });
  }
};
