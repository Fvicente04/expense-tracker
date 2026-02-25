
const request = require('supertest');
const app     = require('../server');
const { sequelize } = require('../models');

let token;
let categoryId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  const authRes = await request(app).post('/api/auth/register')
    .send({ name: 'TX User', email: 'tx@example.com', password: 'password123' });
  token = authRes.body.token;
  const catRes = await request(app).post('/api/categories')
    .set('Authorization', 'Bearer ' + token)
    .send({ name: 'Food', type: 'expense', icon: '🍔', color: '#ff0000' });
  categoryId = catRes.body.id;
});

afterAll(async () => { await sequelize.close(); });

describe('GET /api/transactions', () => {
  it('should return transactions list', async () => {
    const res = await request(app).get('/api/transactions')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
  });
  it('should reject without token', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/transactions', () => {
  it('should create a valid expense', async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', amount: 50, description: 'Tesco', categoryId, date: '2026-02-19' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('expense');
  });
  it('should create a valid income', async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'income', amount: 2000, description: 'Salary', categoryId, date: '2026-02-01' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('income');
  });
  it('should reject without amount', async () => {
    const res = await request(app).post('/api/transactions')
      .set('Authorization', 'Bearer ' + token)
      .send({ type: 'expense', categoryId, date: '2026-02-19' });
    expect(res.status).toBe(400);
  });
  it('should reject without token', async () => {
    const res = await request(app).post('/api/transactions')
      .send({ type: 'expense', amount: 50, categoryId, date: '2026-02-19' });
    expect(res.status).toBe(401);
  });
});