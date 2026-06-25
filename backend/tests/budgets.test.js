process.env.NODE_ENV = 'test';
require('dotenv').config();

const request       = require('supertest');
const app           = require('../server');
const { sequelize } = require('../models');

let token;
let otherToken;
let categoryId;
let budgetId;

const NOW   = new Date();
const MONTH = NOW.getMonth() + 1;
const YEAR  = NOW.getFullYear();
const PREV_MONTH = MONTH === 1 ? 12 : MONTH - 1;
const PREV_YEAR  = MONTH === 1 ? YEAR - 1 : YEAR;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const auth = await request(app).post('/api/auth/register')
    .send({ name: 'Budget User', email: 'budget@example.com', password: 'password123' });
  token = auth.body.token;

  const other = await request(app).post('/api/auth/register')
    .send({ name: 'Other', email: 'other_budget@example.com', password: 'password123' });
  otherToken = other.body.token;

  const cat = await request(app).post('/api/categories')
    .set('Authorization', 'Bearer ' + token)
    .send({ name: 'Groceries', type: 'expense', icon: '🛒', color: '#4caf50' });
  categoryId = cat.body.id;
});

afterAll(() => {});

// ── GET ALL ───────────────────────────────────────────────────────────────────

describe('GET /api/budgets', () => {
  it('rejects without token', async () => {
    const res = await request(app).get('/api/budgets');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no budgets', async () => {
    const res = await request(app).get('/api/budgets')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── CREATE ────────────────────────────────────────────────────────────────────

describe('POST /api/budgets', () => {
  it('creates a budget and returns spent=0', async () => {
    const res = await request(app).post('/api/budgets')
      .set('Authorization', 'Bearer ' + token)
      .send({ categoryId, amount: 300, month: MONTH, year: YEAR });
    expect(res.status).toBe(201);
    expect(parseFloat(res.body.amount)).toBe(300);
    expect(res.body.spent).toBe(0);
    expect(res.body.category).toBeDefined();
    budgetId = res.body.id;
  });

  it('appears in list after creation', async () => {
    const res = await request(app).get('/api/budgets')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.some(b => b.id === budgetId)).toBe(true);
  });
});

// ── SPENT CALCULATION ─────────────────────────────────────────────────────────

describe('Budget spent calculation', () => {
  it('reflects actual spending in the budget period', async () => {
    const dateInMonth = `${YEAR}-${String(MONTH).padStart(2,'0')}-05`;
    await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', amount: 80, description: 'Tesco', categoryId, date: dateInMonth });
    await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', amount: 40, description: 'Lidl', categoryId, date: dateInMonth });

    const res = await request(app).get('/api/budgets/' + budgetId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.spent).toBeCloseTo(120, 1);
  });

  it('getAll also reflects spending', async () => {
    const res = await request(app).get('/api/budgets')
      .set('Authorization', 'Bearer ' + token);
    const b = res.body.find(b => b.id === budgetId);
    expect(b.spent).toBeCloseTo(120, 1);
  });
});

// ── GET BY ID ─────────────────────────────────────────────────────────────────

describe('GET /api/budgets/:id', () => {
  it('returns budget by id with category', async () => {
    const res = await request(app).get('/api/budgets/' + budgetId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(budgetId);
    expect(res.body.category.name).toBe('Groceries');
  });

  it('returns 404 for another user', async () => {
    const res = await request(app).get('/api/budgets/' + budgetId)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .get('/api/budgets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(404);
  });
});

// ── UPDATE ────────────────────────────────────────────────────────────────────

describe('PUT /api/budgets/:id', () => {
  it('updates budget amount', async () => {
    const res = await request(app).put('/api/budgets/' + budgetId)
      .set('Authorization', 'Bearer ' + token)
      .send({ amount: 500 });
    expect(res.status).toBe(200);
    expect(parseFloat(res.body.amount)).toBe(500);
  });

  it('cannot update another user\'s budget', async () => {
    const res = await request(app).put('/api/budgets/' + budgetId)
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ amount: 9999 });
    expect(res.status).toBe(404);
  });
});

// ── ROLLOVER ──────────────────────────────────────────────────────────────────

describe('POST /api/budgets/rollover', () => {
  let rolloverCategoryId;

  beforeAll(async () => {
    // Use a separate category so it has no existing budget for MONTH/YEAR
    const cat = await request(app).post('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Utilities', type: 'expense', icon: '💡', color: '#1565c0' });
    rolloverCategoryId = cat.body.id;

    // Create a recurring budget for the PREVIOUS month with this category
    await request(app).post('/api/budgets')
      .set('Authorization', 'Bearer ' + token)
      .send({ categoryId: rolloverCategoryId, amount: 200, month: PREV_MONTH, year: PREV_YEAR, recurring: true });
  });

  it('rolls over recurring budget to current month', async () => {
    const res = await request(app).post('/api/budgets/rollover')
      .set('Authorization', 'Bearer ' + token)
      .send({ month: MONTH, year: YEAR });
    expect(res.status).toBe(201);
    expect(Array.isArray(res.body)).toBe(true);
    // At least one budget copied (the recurring one from prev month)
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].month).toBe(MONTH);
    expect(res.body[0].year).toBe(YEAR);
    expect(res.body[0].spent).toBe(0);
  });

  it('does not roll over again if budget already exists', async () => {
    const res = await request(app).post('/api/budgets/rollover')
      .set('Authorization', 'Bearer ' + token)
      .send({ month: MONTH, year: YEAR });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('rejects rollover without month and year', async () => {
    const res = await request(app).post('/api/budgets/rollover')
      .set('Authorization', 'Bearer ' + token)
      .send({});
    expect(res.status).toBe(422);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE /api/budgets/:id', () => {
  it('cannot delete another user\'s budget', async () => {
    const res = await request(app).delete('/api/budgets/' + budgetId)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });

  it('deletes budget successfully', async () => {
    const res = await request(app).delete('/api/budgets/' + budgetId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);

    const get = await request(app).get('/api/budgets/' + budgetId)
      .set('Authorization', 'Bearer ' + token);
    expect(get.status).toBe(404);
  });
});
