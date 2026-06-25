const { BankConnection, Transaction, CategoryRule } = require('../models');
const truelayer = require('../services/truelayer');

function callbackUrl() {
  return `${process.env.APP_URL}/api/bank/callback`;
}

async function ensureFreshToken(connection) {
  const now = new Date();
  const expired = !connection.tokenExpiresAt || now >= new Date(connection.tokenExpiresAt);
  if (!expired) return connection.accessToken;

  const tokens = await truelayer.refreshAccessToken(connection.refreshToken);
  const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000);

  await connection.update({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || connection.refreshToken,
    tokenExpiresAt: expiresAt,
    status: 'active'
  });

  return tokens.access_token;
}

exports.listConnections = async (req, res) => {
  try {
    const connections = await BankConnection.findAll({
      where: { userId: req.user.id },
      attributes: { exclude: ['accessToken', 'refreshToken'] },
      order: [['createdAt', 'ASC']]
    });
    res.json(connections);
  } catch (err) {
    console.error('listConnections:', err);
    res.status(500).json({ message: 'Error fetching bank connections' });
  }
};

exports.initiateConnection = async (req, res) => {
  try {
    const { displayName } = req.body;
    if (!displayName) return res.status(400).json({ message: 'Display name is required' });

    const connection = await BankConnection.create({
      userId: req.user.id,
      displayName,
      status: 'pending'
    });

    const authUrl = truelayer.getAuthUrl(callbackUrl(), connection.id);
    res.json({ authUrl });
  } catch (err) {
    console.error('initiateConnection:', err);
    res.status(500).json({ message: 'Error initiating bank connection' });
  }
};

exports.handleCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.CLIENT_URL}/bank-connections?error=${error}`);
    }

    if (!code || !state) return res.status(400).send('Missing code or state');

    const connection = await BankConnection.findByPk(state);
    if (!connection) return res.status(404).send('Connection not found');

    const tokens = await truelayer.exchangeCode(code, callbackUrl());
    const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000);

    const accounts = await truelayer.getAccounts(tokens.access_token);
    // Prefer a transaction/current account over savings
    const primary = accounts.find(a => a.account_type === 'TRANSACTION') || accounts[0];

    await connection.update({
      accountId: primary?.account_id ?? null,
      institutionId: primary?.provider?.display_name ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
      status: primary ? 'active' : 'pending'
    });

    res.redirect(`${process.env.CLIENT_URL}/bank-connections?connected=true`);
  } catch (err) {
    console.error('handleCallback:', err);
    res.redirect(`${process.env.CLIENT_URL}/bank-connections?error=callback_failed`);
  }
};

exports.syncTransactions = async (req, res) => {
  try {
    const connection = await BankConnection.findOne({
      where: { id: req.params.id, userId: req.user.id, status: 'active' }
    });
    if (!connection) return res.status(404).json({ message: 'Active connection not found' });

    const accessToken = await ensureFreshToken(connection);

    const from = connection.lastSyncedAt
      ? new Date(connection.lastSyncedAt).toISOString()
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const txList = await truelayer.getTransactions(accessToken, connection.accountId, from);

    const rules = await CategoryRule.findAll({ where: { userId: req.user.id } });

    function matchCategory(description) {
      const lower = description.toLowerCase();
      const match = rules.find(r => lower.includes(r.keyword));
      return match ? match.categoryId : null;
    }

    let imported = 0;
    let skipped = 0;

    for (const tx of txList) {
      const externalId = tx.transaction_id;
      if (!externalId) continue;

      const exists = await Transaction.findOne({
        where: { externalId, userId: req.user.id }
      });
      if (exists) { skipped++; continue; }

      const amount = parseFloat(tx.amount);
      const description = (tx.description || tx.merchant_name || 'Bank transaction').substring(0, 200);
      const date = tx.timestamp
        ? tx.timestamp.split('T')[0]
        : tx.booking_date;

      await Transaction.create({
        userId: req.user.id,
        externalId,
        source: 'bank_sync',
        bankConnectionId: connection.id,
        type: amount >= 0 ? 'income' : 'expense',
        amount: Math.abs(amount),
        description,
        date,
        categoryId: matchCategory(description)
      });

      imported++;
    }

    await connection.update({ lastSyncedAt: new Date() });
    res.json({ imported, skipped });
  } catch (err) {
    console.error('syncTransactions:', err);
    res.status(500).json({ message: 'Error syncing transactions' });
  }
};

exports.deleteConnection = async (req, res) => {
  try {
    const connection = await BankConnection.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!connection) return res.status(404).json({ message: 'Connection not found' });

    await connection.destroy();
    res.json({ message: 'Bank connection removed' });
  } catch (err) {
    console.error('deleteConnection:', err);
    res.status(500).json({ message: 'Error removing connection' });
  }
};
