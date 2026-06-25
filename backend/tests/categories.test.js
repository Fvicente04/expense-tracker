process.env.NODE_ENV = 'test';
require('dotenv').config();

const request       = require('supertest');
const app           = require('../server');
const { sequelize } = require('../models');

let token;
let otherToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const auth = await request(app).post('/api/auth/register')
    .send({ name: 'Cat User', email: 'cat@example.com', password: 'password123' });
  token = auth.body.token;

  const other = await request(app).post('/api/auth/register')
    .send({ name: 'Other', email: 'other_cat@example.com', password: 'password123' });
  otherToken = other.body.token;
});

afterAll(() => {});

// ── GET ALL ───────────────────────────────────────────────────────────────────

describe('GET /api/categories', () => {
  it('rejects without token', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no categories', async () => {
    const res = await request(app).get('/api/categories')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── CREATE ────────────────────────────────────────────────────────────────────

describe('POST /api/categories', () => {
  it('rejects missing name', async () => {
    const res = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense' });
    expect(res.status).toBe(422);
  });

  it('rejects invalid type', async () => {
    const res = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Test', type: 'other' });
    expect(res.status).toBe(422);
  });

  it('creates an expense category', async () => {
    const res = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Food', type: 'expense', icon: '🍕', color: '#e53935' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Food');
    expect(res.body.type).toBe('expense');
    expect(res.body.icon).toBe('🍕');
    expect(res.body.color).toBe('#e53935');
  });

  it('creates an income category', async () => {
    const res = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Salary', type: 'income' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('income');
  });

  it('uses defaults for icon and color when omitted', async () => {
    const res = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Other', type: 'expense' });
    expect(res.status).toBe(201);
    expect(res.body.icon).toBeDefined();
    expect(res.body.color).toBeDefined();
  });

  it('rejects duplicate name+type combination', async () => {
    const res = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Food', type: 'expense' });
    expect(res.status).toBe(409);
  });

  it('allows same name with different type', async () => {
    const res = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Food', type: 'income' });
    expect(res.status).toBe(201);
  });

  it('returns list sorted by name', async () => {
    const res = await request(app).get('/api/categories')
      .set('Authorization', 'Bearer ' + token);
    const names = res.body.map(c => c.name);
    expect(names).toEqual([...names].sort());
  });
});

// ── GET BY ID ─────────────────────────────────────────────────────────────────

describe('GET /api/categories/:id', () => {
  let catId;

  beforeAll(async () => {
    const res = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Transport', type: 'expense', icon: '🚌', color: '#1565c0' });
    catId = res.body.id;
  });

  it('returns category by id', async () => {
    const res = await request(app).get('/api/categories/' + catId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(catId);
    expect(res.body.name).toBe('Transport');
  });

  it('returns 404 for another user\'s category', async () => {
    const res = await request(app).get('/api/categories/' + catId)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .get('/api/categories/00000000-0000-0000-0000-000000000000')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(404);
  });
});

// ── UPDATE ────────────────────────────────────────────────────────────────────

describe('PUT /api/categories/:id', () => {
  let catId;

  beforeAll(async () => {
    const res = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Health', type: 'expense', icon: '💊', color: '#43a047' });
    catId = res.body.id;
  });

  it('updates name, icon and color', async () => {
    const res = await request(app).put('/api/categories/' + catId)
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Healthcare', icon: '🏥', color: '#00897b' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Healthcare');
    expect(res.body.icon).toBe('🏥');
    expect(res.body.color).toBe('#00897b');
  });

  it('cannot update another user\'s category', async () => {
    const res = await request(app).put('/api/categories/' + catId)
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ name: 'Stolen' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE /api/categories/:id', () => {
  let catId;
  let catWithTxId;

  beforeAll(async () => {
    const c1 = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Deletable', type: 'expense' });
    catId = c1.body.id;

    const c2 = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'HasTransactions', type: 'expense' });
    catWithTxId = c2.body.id;

    // Attach a transaction to c2
    await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', amount: 1, description: 'Linked', categoryId: catWithTxId, date: '2026-01-01' });
  });

  it('cannot delete another user\'s category', async () => {
    const res = await request(app).delete('/api/categories/' + catId)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });

  it('rejects deletion when transactions exist (FK constraint)', async () => {
    const res = await request(app).delete('/api/categories/' + catWithTxId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(409);
  });

  it('deletes successfully when no transactions', async () => {
    const res = await request(app).delete('/api/categories/' + catId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);

    const get = await request(app).get('/api/categories/' + catId)
      .set('Authorization', 'Bearer ' + token);
    expect(get.status).toBe(404);
  });
});
