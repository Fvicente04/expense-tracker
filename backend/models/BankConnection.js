const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { encryptToken, decryptToken } = require('../services/tokenCrypto');

const BankConnection = sequelize.define('BankConnection', {
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
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'display_name'
  },
  // Provider name stored after connection (e.g. "AIB" returned by TrueLayer)
  institutionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'institution_id'
  },
  accountId: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'account_id'
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'access_token',
    set(value) { this.setDataValue('accessToken', encryptToken(value)); },
    get() { return decryptToken(this.getDataValue('accessToken')); }
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refresh_token',
    set(value) { this.setDataValue('refreshToken', encryptToken(value)); },
    get() { return decryptToken(this.getDataValue('refreshToken')); }
  },
  tokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'token_expires_at'
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  lastSyncedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_synced_at'
  }
}, {
  tableName: 'bank_connections',
  timestamps: true
});

module.exports = BankConnection;
