'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('categories', {
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
      type: {
        type: Sequelize.ENUM('income', 'expense'),
        allowNull: false
      },
      icon: {
        type: Sequelize.STRING(10),
        defaultValue: '💰'
      },
      color: {
        type: Sequelize.STRING(7),
        defaultValue: '#3498db'
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

    await queryInterface.addIndex('categories', ['user_id'], {
      name: 'categories_user_id_idx'
    });
    await queryInterface.addIndex('categories', ['user_id', 'name', 'type'], {
      name: 'categories_user_name_type_unique',
      unique: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('categories');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_categories_type"');
  }
};
