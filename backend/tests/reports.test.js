process.env.NODE_ENV = 'test';
require('dotenv').config();

const request       = require('supertest');
const app           = require('../server');
const { sequelize } = require('../models');

let token;
let expCatId;
let incCatId;

const Y = new Date().getFullYear();
const M = String(new Date().getMonth() + 1).padStart(2, '0');

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const auth = await request(app).post('/api/auth/register')
    .send({ name: 'Report User', email: 'report@example.com', password: 'password123' });
  token = auth.body.token;

  const ec = await request(app).post('/api/categories')
    .set('Authorization', 'Bearer ' + token)
    .send({ name: 'Food', type: 'expense', icon: '🍔', color: '#e53935' });
  expCatId = ec.body.id;

  const ic = await request(app).post('/api/categories')
    .set('Authorization', 'Bearer ' + token)
    .send({ name: 'Salary', type: 'income', icon: '💼', color: '#43a047' });
  incCatId = ic.body.id;

  // Seed transactions this month
  const date = `${Y}-${M}-10`;
  await request(app).post('/api/transactions')
    .set('Authorization', 'Bearer ' + token)
    .send({ type: 'expense', amount: 100, description: 'Groceries', categoryId: expCatId, date });
  await request(app).post('/api/transactions')
    .set('Authorization', 'Bearer ' + token)
    .send({ type: 'expense', amount: 50, description: 'Lunch', categoryId: expCatId, date });
  await request(app).post('/api/transactions')
    .set('Authorization', 'Bearer ' + token)
    .send({ type: 'income', amount: 3000, description: 'Monthly salary', categoryId: incCatId, date });
});

afterAll(() => {});

// ── SUMMARY ───────────────────────────────────────────────────────────────────

describe('GET /api/reports/summary', () => {
  it('rejects without token', async () => {
    const res = await request(app).get('/api/reports/summary');
    expect(res.status).toBe(401);
  });

  it('returns totals for all time', async () => {
    const res = await request(app).get('/api/reports/summary')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBeCloseTo(3000, 1);
    expect(res.body.totalExpense).toBeCloseTo(150, 1);
    expect(res.body.balance).toBeCloseTo(2850, 1);
    expect(res.body.transactionCount).toBe(3);
  });

  it('filters by date range', async () => {
    const start = `${Y}-${M}-01`;
    const end   = `${Y}-${M}-09`;
    const res = await request(app)
      .get(`/api/reports/summary?startDate=${start}&endDate=${end}`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    // All transactions are on day 10, outside this range
    expect(res.body.transactionCount).toBe(0);
    expect(res.body.totalIncome).toBe(0);
    expect(res.body.totalExpense).toBe(0);
  });

  it('includes all transactions within range', async () => {
    const start = `${Y}-${M}-01`;
    const end   = `${Y}-${M}-30`;
    const res = await request(app)
      .get(`/api/reports/summary?startDate=${start}&endDate=${end}`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.transactionCount).toBe(3);
  });
});

// ── BY CATEGORY ───────────────────────────────────────────────────────────────

describe('GET /api/reports/by-category', () => {
  it('returns expense breakdown by category', async () => {
    const res = await request(app).get('/api/reports/by-category?type=expense')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const food = res.body.find(c => c.categoryName === 'Food');
    expect(food).toBeDefined();
    expect(food.amount).toBeCloseTo(150, 1);
    expect(food.transactionCount).toBe(2);
    expect(food.percentage).toBeCloseTo(100, 1);
  });

  it('returns income breakdown by category', async () => {
    const res = await request(app).get('/api/reports/by-category?type=income')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    const salary = res.body.find(c => c.categoryName === 'Salary');
    expect(salary).toBeDefined();
    expect(salary.amount).toBeCloseTo(3000, 1);
    expect(salary.percentage).toBeCloseTo(100, 1);
  });

  it('filters by date range', async () => {
    const start = `${Y}-${M}-01`;
    const end   = `${Y}-${M}-09`;
    const res = await request(app)
      .get(`/api/reports/by-category?type=expense&startDate=${start}&endDate=${end}`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('sorts by amount descending', async () => {
    const res = await request(app).get('/api/reports/by-category?type=expense')
      .set('Authorization', 'Bearer ' + token);
    const amounts = res.body.map(c => c.amount);
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i - 1]).toBeGreaterThanOrEqual(amounts[i]);
    }
  });
});

// ── MONTHLY TREND ─────────────────────────────────────────────────────────────

describe('GET /api/reports/monthly-trend', () => {
  it('returns monthly trend data', async () => {
    const res = await request(app).get('/api/reports/monthly-trend')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('current month appears in trend with correct totals', async () => {
    const res = await request(app).get('/api/reports/monthly-trend?months=1')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);

    const currentMonth = res.body.find(m => m.year === Y);
    expect(currentMonth).toBeDefined();
    expect(currentMonth.income).toBeCloseTo(3000, 1);
    expect(currentMonth.expense).toBeCloseTo(150, 1);
    expect(currentMonth.balance).toBeCloseTo(2850, 1);
  });

  it('result is sorted chronologically', async () => {
    const res = await request(app).get('/api/reports/monthly-trend?months=6')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    // Each entry should be >= the previous one by year+month
    for (let i = 1; i < res.body.length; i++) {
      const prev = res.body[i - 1];
      const curr = res.body[i];
      const prevKey = prev.year * 100 + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(prev.month);
      const currKey = curr.year * 100 + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(curr.month);
      expect(currKey).toBeGreaterThan(prevKey);
    }
  });

  it('rejects without token', async () => {
    const res = await request(app).get('/api/reports/monthly-trend');
    expect(res.status).toBe(401);
  });
});
