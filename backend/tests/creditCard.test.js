process.env.NODE_ENV = 'test';
require('dotenv').config();

const request       = require('supertest');
const app           = require('../server');
const { sequelize } = require('../models');

let token;
let otherToken;
let categoryId;
let cardId;

// Valid AIB credit card CSV with 2 expenses and 1 income
const CC_CSV = [
  'Processed,Description,Paid out,Paid in,Category',
  '15/01/2026,Tesco,50.00,,shopping',
  '16/01/2026,Netflix,15.99,,entertainment',
  '17/01/2026,Salary refund,,2000.00,',
].join('\n');

// CSV without the required AIB columns
const INVALID_CSV = 'Date,Amount\n01/01/2026,50';

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const authRes = await request(app).post('/api/auth/register')
    .send({ name: 'CC User', email: 'cc@example.com', password: 'password123' });
  token = authRes.body.token;

  const expenseRes = await request(app).post('/api/categories')
    .set('Authorization', 'Bearer ' + token)
    .send({ name: 'Shopping', type: 'expense', icon: '🛒', color: '#4caf50' });
  categoryId = expenseRes.body.id;

  await request(app).post('/api/categories')
    .set('Authorization', 'Bearer ' + token)
    .send({ name: 'Income', type: 'income', icon: '💰', color: '#2196f3' });

  const otherRes = await request(app).post('/api/auth/register')
    .send({ name: 'Other', email: 'other@example.com', password: 'password123' });
  otherToken = otherRes.body.token;
});

afterAll(() => {});

// ── CRUD ─────────────────────────────────────────────────────────────────────

describe('GET /api/credit-cards', () => {
  it('returns empty array when no cards exist', async () => {
    const res = await request(app).get('/api/credit-cards')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('rejects request without token', async () => {
    const res = await request(app).get('/api/credit-cards');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/credit-cards', () => {
  it('rejects creation without a name', async () => {
    const res = await request(app).post('/api/credit-cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ creditLimit: 5000 });
    expect(res.status).toBe(400);
  });

  it('creates a card and returns computed stats', async () => {
    const res = await request(app).post('/api/credit-cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Visa Gold', lastFourDigits: '1234', creditLimit: 5000, color: '#1a73e8', statementDay: 15, dueDay: 5 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Visa Gold');
    expect(res.body.currentSpend).toBe(0);
    expect(res.body.utilizationPct).toBe(0);
    expect(res.body.availableCredit).toBe(5000);
    expect(res.body.billingPeriod).toBeDefined();
    cardId = res.body.id;
  });

  it('creates a card without credit limit — null utilization', async () => {
    const res = await request(app).post('/api/credit-cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'No Limit Card' });
    expect(res.status).toBe(201);
    expect(res.body.utilizationPct).toBeNull();
    expect(res.body.availableCredit).toBeNull();
  });

  it('appears in list after creation', async () => {
    const res = await request(app).get('/api/credit-cards')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.some(c => c.id === cardId)).toBe(true);
  });
});

describe('GET /api/credit-cards/:id', () => {
  it('returns the card with billing period', async () => {
    const res = await request(app).get('/api/credit-cards/' + cardId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(cardId);
    expect(res.body.lastFourDigits).toBe('1234');
    // Billing period should start on statementDay (15) regardless of current date
    expect(res.body.billingPeriod.start).toMatch(/-15$/);
    expect(new Date(res.body.billingPeriod.end).getTime())
      .toBeGreaterThan(new Date(res.body.billingPeriod.start).getTime());
  });

  it('returns 404 for another user\'s card', async () => {
    const res = await request(app).get('/api/credit-cards/' + cardId)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .get('/api/credit-cards/00000000-0000-0000-0000-000000000000')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/credit-cards/:id', () => {
  it('updates card name and limit', async () => {
    const res = await request(app).put('/api/credit-cards/' + cardId)
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Visa Platinum', creditLimit: 10000 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Visa Platinum');
    expect(res.body.availableCredit).toBe(10000);
  });

  it('cannot update another user\'s card', async () => {
    const res = await request(app).put('/api/credit-cards/' + cardId)
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ name: 'Stolen' });
    expect(res.status).toBe(404);
  });
});

// ── IMPORT ────────────────────────────────────────────────────────────────────

describe('POST /api/credit-cards/:id/import/preview', () => {
  it('rejects missing csvText', async () => {
    const res = await request(app).post(`/api/credit-cards/${cardId}/import/preview`)
      .set('Authorization', 'Bearer ' + token)
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects CSV without AIB columns', async () => {
    const res = await request(app).post(`/api/credit-cards/${cardId}/import/preview`)
      .set('Authorization', 'Bearer ' + token)
      .send({ csvText: INVALID_CSV });
    expect(res.status).toBe(400);
  });

  it('parses valid AIB credit card CSV', async () => {
    const res = await request(app).post(`/api/credit-cards/${cardId}/import/preview`)
      .set('Authorization', 'Bearer ' + token)
      .send({ csvText: CC_CSV });
    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(3);
    expect(res.body.format).toBe('credit_card');

    const tesco = res.body.transactions.find(t => t.description === 'Tesco');
    expect(tesco.type).toBe('expense');
    expect(tesco.amount).toBe(50);
    expect(tesco.date).toBe('2026-01-15');

    const salary = res.body.transactions.find(t => t.description === 'Salary refund');
    expect(salary.type).toBe('income');
    expect(salary.amount).toBe(2000);
  });
});

describe('POST /api/credit-cards/:id/import/confirm', () => {
  let importTx;

  beforeAll(async () => {
    const preview = await request(app).post(`/api/credit-cards/${cardId}/import/preview`)
      .set('Authorization', 'Bearer ' + token)
      .send({ csvText: CC_CSV });
    const allCats  = preview.body.categories;
    const incomeCat  = allCats.find(c => c.type === 'income');
    const expenseCat = allCats.find(c => c.type === 'expense');
    importTx = preview.body.transactions.map(t => ({
      ...t,
      categoryId: t.type === 'income' ? (incomeCat?.id || expenseCat.id) : expenseCat.id
    }));
  });

  it('rejects transaction without categoryId', async () => {
    const res = await request(app).post(`/api/credit-cards/${cardId}/import/confirm`)
      .set('Authorization', 'Bearer ' + token)
      .send({ transactions: [{ ...importTx[0], categoryId: '' }] });
    expect(res.status).toBe(400);
  });

  it('imports all transactions on first run', async () => {
    const res = await request(app).post(`/api/credit-cards/${cardId}/import/confirm`)
      .set('Authorization', 'Bearer ' + token)
      .send({ transactions: importTx });
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(3);
    expect(res.body.skipped).toBe(0);
  });

  it('skips all duplicates on re-import of same transactions', async () => {
    const res = await request(app).post(`/api/credit-cards/${cardId}/import/confirm`)
      .set('Authorization', 'Bearer ' + token)
      .send({ transactions: importTx });
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(0);
    expect(res.body.skipped).toBe(3);
  });

  it('imports only truly new entries in mixed batch', async () => {
    const newTx = [{
      date: '2026-02-01', description: 'New purchase',
      type: 'expense', amount: 99.99, categoryId
    }];
    const res = await request(app).post(`/api/credit-cards/${cardId}/import/confirm`)
      .set('Authorization', 'Bearer ' + token)
      .send({ transactions: [...importTx.slice(0, 1), ...newTx] });
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.skipped).toBe(1);
  });
});

// ── TRANSACTIONS LIST ─────────────────────────────────────────────────────────

describe('GET /api/credit-cards/:id/transactions', () => {
  it('returns transactions linked to the card', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/transactions`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.summary).toBeDefined();
  });

  it('filters by type=expense', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/transactions?type=expense`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    res.body.data.forEach(tx => expect(tx.type).toBe('expense'));
  });

  it('filters by search term', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/transactions?search=Tesco`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(tx => expect(tx.description).toMatch(/Tesco/i));
  });

  it('includes income and expense totals in summary', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/transactions`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.body.summary.totalExpenses).toBeGreaterThan(0);
    expect(res.body.summary.totalIncome).toBeGreaterThan(0);
  });

  it('respects page and limit params', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/transactions?page=1&limit=1`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.pages).toBeGreaterThanOrEqual(1);
  });
});

// ── MONTHLY HISTORY ───────────────────────────────────────────────────────────

describe('GET /api/credit-cards/:id/history', () => {
  it('returns aggregated monthly rows', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/history`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const jan = res.body.find(m => m.yearMonth === '2026-01');
    expect(jan).toBeDefined();
    expect(jan.expenses).toBeCloseTo(65.99, 1); // Tesco 50 + Netflix 15.99
    expect(jan.income).toBeCloseTo(2000, 1);
    expect(jan.count).toBe(3);
    expect(jan).toHaveProperty('paid');
  });

  it('returns at most 12 months', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/history`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.body.length).toBeLessThanOrEqual(12);
  });

  it('returns 404 for another user', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/history`)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });
});

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────

describe('GET /api/credit-cards/:id/subscriptions', () => {
  let subCardId;

  beforeAll(async () => {
    const cardRes = await request(app).post('/api/credit-cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Sub Card' });
    subCardId = cardRes.body.id;

    // Import the same description across 3 consecutive months
    for (const m of ['01', '02', '03']) {
      await request(app).post(`/api/credit-cards/${subCardId}/import/confirm`)
        .set('Authorization', 'Bearer ' + token)
        .send({
          transactions: [{
            date: `2026-${m}-01`, description: 'Netflix',
            type: 'expense', amount: 15.99, categoryId
          }]
        });
    }
  });

  it('detects recurring charge as subscription', async () => {
    const res = await request(app).get(`/api/credit-cards/${subCardId}/subscriptions`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);

    const netflix = res.body.find(s => s.description.toLowerCase() === 'netflix');
    expect(netflix).toBeDefined();
    expect(netflix.monthsActive).toBeGreaterThanOrEqual(2);
    expect(netflix.avgAmount).toBeCloseTo(15.99, 1);
    expect(netflix.occurrences).toBe(3);
  });

  it('does not flag single-occurrence transactions', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/subscriptions`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    // "New purchase" was imported once — should not appear
    const newPurchase = res.body.find(s => s.description === 'New purchase');
    expect(newPurchase).toBeUndefined();
  });
});

// ── PAYMENTS ─────────────────────────────────────────────────────────────────

describe('Card payments', () => {
  let paymentId;

  it('GET returns empty list before any payments', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/payments`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST rejects payment without amount', async () => {
    const res = await request(app).post(`/api/credit-cards/${cardId}/payments`)
      .set('Authorization', 'Bearer ' + token)
      .send({ paymentDate: '2026-01-31', billingMonth: 1, billingYear: 2026 });
    expect(res.status).toBe(400);
  });

  it('POST rejects payment without paymentDate', async () => {
    const res = await request(app).post(`/api/credit-cards/${cardId}/payments`)
      .set('Authorization', 'Bearer ' + token)
      .send({ amount: 500, billingMonth: 1, billingYear: 2026 });
    expect(res.status).toBe(400);
  });

  it('POST creates a valid payment', async () => {
    const res = await request(app).post(`/api/credit-cards/${cardId}/payments`)
      .set('Authorization', 'Bearer ' + token)
      .send({ amount: 500, paymentDate: '2026-01-31', billingMonth: 1, billingYear: 2026, paymentType: 'partial' });
    expect(res.status).toBe(201);
    expect(parseFloat(res.body.amount)).toBe(500);
    expect(res.body.paymentType).toBe('partial');
    paymentId = res.body.id;
  });

  it('GET lists payments including the new one', async () => {
    const res = await request(app).get(`/api/credit-cards/${cardId}/payments`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.some(p => p.id === paymentId)).toBe(true);
  });

  it('card stats include lastPayment after recording', async () => {
    const res = await request(app).get('/api/credit-cards/' + cardId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('lastPayment');
  });

  it('DELETE removes the payment', async () => {
    const res = await request(app)
      .delete(`/api/credit-cards/${cardId}/payments/${paymentId}`)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);

    const list = await request(app).get(`/api/credit-cards/${cardId}/payments`)
      .set('Authorization', 'Bearer ' + token);
    expect(list.body.every(p => p.id !== paymentId)).toBe(true);
  });

  it('DELETE returns 404 for another user\'s payment', async () => {
    const created = await request(app).post(`/api/credit-cards/${cardId}/payments`)
      .set('Authorization', 'Bearer ' + token)
      .send({ amount: 200, paymentDate: '2026-02-05', billingMonth: 2, billingYear: 2026 });

    const res = await request(app)
      .delete(`/api/credit-cards/${cardId}/payments/${created.body.id}`)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });
});

// ── DELETE CARD ───────────────────────────────────────────────────────────────

describe('DELETE /api/credit-cards/:id', () => {
  it('returns 404 when deleting another user\'s card', async () => {
    const res = await request(app).delete('/api/credit-cards/' + cardId)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });

  it('deletes the card successfully', async () => {
    const res = await request(app).delete('/api/credit-cards/' + cardId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
  });

  it('card no longer accessible after deletion', async () => {
    const res = await request(app).get('/api/credit-cards/' + cardId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(404);
  });

  it('card no longer appears in list', async () => {
    const res = await request(app).get('/api/credit-cards')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.every(c => c.id !== cardId)).toBe(true);
  });
});
