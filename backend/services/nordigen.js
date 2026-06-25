const axios = require('axios');

const BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';

let cachedToken = null;
let tokenExpiresAt = null;

async function getApiToken() {
  if (cachedToken && tokenExpiresAt && new Date() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!process.env.NORDIGEN_SECRET_ID || !process.env.NORDIGEN_SECRET_KEY) {
    throw new Error('NORDIGEN_SECRET_ID and NORDIGEN_SECRET_KEY must be set');
  }

  const res = await axios.post(`${BASE_URL}/token/new/`, {
    secret_id: process.env.NORDIGEN_SECRET_ID,
    secret_key: process.env.NORDIGEN_SECRET_KEY
  });

  cachedToken = res.data.access;
  // Subtract 60s from expiry to avoid using a token that's about to expire
  tokenExpiresAt = new Date(Date.now() + (res.data.access_expires - 60) * 1000);

  return cachedToken;
}

async function nordigenGet(path) {
  const token = await getApiToken();
  const res = await axios.get(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function nordigenPost(path, body) {
  const token = await getApiToken();
  const res = await axios.post(`${BASE_URL}${path}`, body, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function nordigenDelete(path) {
  const token = await getApiToken();
  await axios.delete(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

module.exports = { nordigenGet, nordigenPost, nordigenDelete };
