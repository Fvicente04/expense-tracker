const axios = require('axios');

const isSandbox = process.env.TRUELAYER_SANDBOX === 'true';
const AUTH_BASE = isSandbox ? 'https://auth.truelayer-sandbox.com' : 'https://auth.truelayer.com';
const API_BASE  = isSandbox ? 'https://api.truelayer-sandbox.com' : 'https://api.truelayer.com';

function getAuthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TRUELAYER_CLIENT_ID,
    scope: 'info accounts balance transactions offline_access',
    redirect_uri: redirectUri,
    // sandbox only has mock banks; production uses Irish Open Banking providers
    providers: isSandbox ? 'mock' : 'ie-ob-all',
    state
  });
  return `${AUTH_BASE}/?${params.toString()}`;
}

async function exchangeCode(code, redirectUri) {
  const res = await axios.post(
    `${AUTH_BASE}/connect/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.TRUELAYER_CLIENT_ID,
      client_secret: process.env.TRUELAYER_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data; // { access_token, refresh_token, expires_in }
}

async function refreshAccessToken(currentRefreshToken) {
  const res = await axios.post(
    `${AUTH_BASE}/connect/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.TRUELAYER_CLIENT_ID,
      client_secret: process.env.TRUELAYER_CLIENT_SECRET,
      refresh_token: currentRefreshToken
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
}

async function getAccounts(accessToken) {
  const res = await axios.get(`${API_BASE}/data/v1/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return res.data.results;
}

async function getTransactions(accessToken, accountId, fromDate) {
  const params = new URLSearchParams();
  if (fromDate) params.set('from', fromDate.replace(/\.\d{3}Z$/, 'Z')); // strip milliseconds
  const url = `${API_BASE}/data/v1/accounts/${accountId}/transactions?${params.toString()}`;
  try {
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    return res.data.results;
  } catch (err) {
    console.error('[truelayer] transactions error', err.response?.status, JSON.stringify(err.response?.data));
    throw err;
  }
}

module.exports = { getAuthUrl, exchangeCode, refreshAccessToken, getAccounts, getTransactions };
