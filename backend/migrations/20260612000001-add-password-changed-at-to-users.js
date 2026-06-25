'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'passwordChangedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'passwordChangedAt');
  }
};
