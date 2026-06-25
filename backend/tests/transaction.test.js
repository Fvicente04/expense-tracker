process.env.NODE_ENV = 'test';
require('dotenv').config();

const request       = require('supertest');
const app           = require('../server');
const { sequelize } = require('../models');

let token;
let otherToken;
let categoryId;
let incCategoryId;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const auth = await request(app).post('/api/auth/register')
    .send({ name: 'TX User', email: 'tx@example.com', password: 'password123' });
  token = auth.body.token;

  const other = await request(app).post('/api/auth/register')
    .send({ name: 'Other', email: 'other_tx@example.com', password: 'password123' });
  otherToken = other.body.token;

  const cat = await request(app).post('/api/categories')
    .set('Authorization', 'Bearer ' + token)
    .send({ name: 'Food', type: 'expense', icon: '🍔', color: '#ff0000' });
  categoryId = cat.body.id;

  const inc = await request(app).post('/api/categories')
    .set('Authorization', 'Bearer ' + token)
    .send({ name: 'Salary', type: 'income', icon: '💰', color: '#00ff00' });
  incCategoryId = inc.body.id;
});

afterAll(() => {});

// ── GET ALL ───────────────────────────────────────────────────────────────────

describe('GET /api/transactions', () => {
  it('rejects without token', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('returns empty list initially', async () => {
    const res = await request(app).get('/api/transactions')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});

// ── CREATE ────────────────────────────────────────────────────────────────────

describe('POST /api/transactions', () => {
  it('rejects without amount', async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', description: 'Tesco', categoryId, date: '2026-01-10' });
    expect(res.status).toBe(422);
  });

  it('rejects without categoryId', async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', amount: 50, description: 'Tesco', date: '2026-01-10' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid type', async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'transfer', amount: 50, description: 'X', categoryId, date: '2026-01-10' });
    expect(res.status).toBe(422);
  });

  it('creates a valid expense', async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', amount: 50, description: 'Tesco', categoryId, date: '2026-01-10' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('expense');
    expect(parseFloat(res.body.amount)).toBe(50);
    expect(res.body.category).toBeDefined();
  });

  it('creates a valid income', async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'income', amount: 2000, description: 'Salary Jan', categoryId: incCategoryId, date: '2026-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('income');
  });

  it('rejects category belonging to another user', async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ type: 'expense', amount: 10, description: 'X', categoryId, date: '2026-01-10' });
    expect(res.status).toBe(400);
  });
});

// ── RECURRING ─────────────────────────────────────────────────────────────────

describe('POST /api/transactions — recurring series', () => {
  let groupTxId;

  it('creates a recurring monthly transaction and generates future occurrences', async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({
        type: 'expense', amount: 15, description: 'Netflix',
        categoryId, date: '2026-02-01',
        isRecurring: true, recurringFrequency: 'monthly', recurringEndDate: '2026-05-01'
      });
    expect(res.status).toBe(201);
    expect(res.body.isRecurring).toBe(true);
    expect(res.body.recurringGroupId).toBeTruthy();
    groupTxId = res.body.id;

    // Full dump should include the series
    const list = await request(app).get('/api/transactions')
      .set('Authorization', 'Bearer ' + token);
    const series = list.body.filter(t => t.recurringGroupId === res.body.recurringGroupId);
    // Feb + Mar + Apr + May = 4 extra occurrences beyond the seed
    expect(series.length).toBeGreaterThanOrEqual(4);
  });

  it('deletes a single occurrence without affecting the series', async () => {
    const list = await request(app).get('/api/transactions')
      .set('Authorization', 'Bearer ' + token);
    const series = list.body.filter(t => t.recurringGroupId && t.id !== groupTxId);
    const oneOccurrence = series[0];

    const del = await request(app).delete('/api/transactions/' + oneOccurrence.id)
      .set('Authorization', 'Bearer ' + token);
    expect(del.status).toBe(200);

    const after = await request(app).get('/api/transactions')
      .set('Authorization', 'Bearer ' + token);
    expect(after.body.find(t => t.id === groupTxId)).toBeDefined();
  });

  it('deletes the whole series with deleteSeries=true', async () => {
    const del = await request(app)
      .delete('/api/transactions/' + groupTxId + '?deleteSeries=true')
      .set('Authorization', 'Bearer ' + token);
    expect(del.status).toBe(200);

    const after = await request(app).get('/api/transactions')
      .set('Authorization', 'Bearer ' + token);
    expect(after.body.every(t => !t.recurringGroupId || t.recurringGroupId !== del.body?.recurringGroupId)).toBe(true);
  });
});

// ── GET BY ID ─────────────────────────────────────────────────────────────────

describe('GET /api/transactions/:id', () => {
  let txId;

  beforeAll(async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', amount: 30, description: 'Lidl', categoryId, date: '2026-01-15' });
    txId = res.body.id;
  });

  it('returns the transaction with category', async () => {
    const res = await request(app).get('/api/transactions/' + txId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(txId);
    expect(res.body.category).toBeDefined();
  });

  it('returns 404 for another user', async () => {
    const res = await request(app).get('/api/transactions/' + txId)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .get('/api/transactions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(404);
  });
});

// ── UPDATE ────────────────────────────────────────────────────────────────────

describe('PUT /api/transactions/:id', () => {
  let txId;

  beforeAll(async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', amount: 20, description: 'Coffee', categoryId, date: '2026-01-20' });
    txId = res.body.id;
  });

  it('updates amount and description', async () => {
    const res = await request(app).put('/api/transactions/' + txId)
      .set('Authorization', 'Bearer ' + token)
      .send({ amount: 25, description: 'Starbucks' });
    expect(res.status).toBe(200);
    expect(parseFloat(res.body.amount)).toBe(25);
    expect(res.body.description).toBe('Starbucks');
  });

  it('cannot update another user\'s transaction', async () => {
    const res = await request(app).put('/api/transactions/' + txId)
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ amount: 999 });
    expect(res.status).toBe(404);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE /api/transactions/:id', () => {
  let txId;

  beforeAll(async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', amount: 5, description: 'Chewing gum', categoryId, date: '2026-01-25' });
    txId = res.body.id;
  });

  it('cannot delete another user\'s transaction', async () => {
    const res = await request(app).delete('/api/transactions/' + txId)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });

  it('deletes successfully', async () => {
    const res = await request(app).delete('/api/transactions/' + txId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);

    const get = await request(app).get('/api/transactions/' + txId)
      .set('Authorization', 'Bearer ' + token);
    expect(get.status).toBe(404);
  });
});

// ── PAGINATION & FILTERS ──────────────────────────────────────────────────────

describe('GET /api/transactions — pagination and filters', () => {
  it('returns paginated results with summary', async () => {
    const res = await request(app).get('/api/transactions?page=1&limit=2')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeDefined();
    expect(res.body.summary).toBeDefined();
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it('filters by type=income', async () => {
    const res = await request(app).get('/api/transactions?page=1&limit=50&type=income')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    res.body.data.forEach(t => expect(t.type).toBe('income'));
  });

  it('filters by search term', async () => {
    const res = await request(app).get('/api/transactions?page=1&limit=50&search=Tesco')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    res.body.data.forEach(t => expect(t.description).toMatch(/Tesco/i));
  });

  it('filters by date range', async () => {
    const res = await request(app)
      .get('/api/transactions?page=1&limit=50&startDate=2026-01-01&endDate=2026-01-31')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    res.body.data.forEach(t => {
      expect(t.date >= '2026-01-01').toBe(true);
      expect(t.date <= '2026-01-31').toBe(true);
    });
  });

  it('summary includes correct income and expense totals', async () => {
    const res = await request(app).get('/api/transactions?page=1&limit=100')
      .set('Authorization', 'Bearer ' + token);
    expect(res.body.summary.totalIncome).toBeGreaterThanOrEqual(2000);
    expect(res.body.summary.totalExpenses).toBeGreaterThanOrEqual(50);
    expect(res.body.summary.balance).toBeDefined();
  });
});

// ── IMPORT (standalone) ───────────────────────────────────────────────────────

const CA_CSV = [
  'Posted Transactions Date,Description 1,Description 2,Debit Amount,Credit Amount',
  '10/01/2026,Dunnes Stores,,45.00,',
  '11/01/2026,Payroll,,, 3000.00',
].join('\n');

describe('POST /api/transactions/import/preview', () => {
  it('rejects missing csvText', async () => {
    const res = await request(app).post('/api/transactions/import/preview')
      .set('Authorization', 'Bearer ' + token).send({});
    expect(res.status).toBe(400);
  });

  it('parses a valid current account CSV', async () => {
    const res = await request(app).post('/api/transactions/import/preview')
      .set('Authorization', 'Bearer ' + token).send({ csvText: CA_CSV });
    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(2);
    expect(res.body.format).toBe('current_account');

    const debit = res.body.transactions.find(t => t.description === 'Dunnes Stores');
    expect(debit.type).toBe('expense');
    expect(debit.amount).toBe(45);
  });
});

describe('POST /api/transactions/import/confirm', () => {
  let importTx;

  beforeAll(async () => {
    const preview = await request(app).post('/api/transactions/import/preview')
      .set('Authorization', 'Bearer ' + token).send({ csvText: CA_CSV });
    const allCats = preview.body.categories;
    const expCat = allCats.find(c => c.type === 'expense');
    const incCat = allCats.find(c => c.type === 'income');
    importTx = preview.body.transactions.map(t => ({
      ...t, categoryId: t.type === 'income' ? (incCat?.id || expCat.id) : expCat.id
    }));
  });

  it('imports transactions successfully', async () => {
    const res = await request(app).post('/api/transactions/import/confirm')
      .set('Authorization', 'Bearer ' + token).send({ transactions: importTx });
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(2);
    expect(res.body.skipped).toBe(0);
  });

  it('skips duplicates on re-import', async () => {
    const res = await request(app).post('/api/transactions/import/confirm')
      .set('Authorization', 'Bearer ' + token).send({ transactions: importTx });
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(0);
    expect(res.body.skipped).toBe(2);
  });
});
