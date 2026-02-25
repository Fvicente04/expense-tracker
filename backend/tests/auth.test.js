const request = require('supertest');
const app     = require('../server');
const { sequelize } = require('../models');

beforeAll(async () => { await sequelize.sync({ force: true }); });
afterAll(async ()  => { await sequelize.close(); });

describe('POST /api/auth/register', () => {
  it('should register a new user and return a token', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
  });

  it('should reject duplicate email', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'A', email: 'dup@example.com', password: '123456' });
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'B', email: 'dup@example.com', password: '123456' });
    expect(res.status).toBe(400);
  });

  it('should reject missing fields', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'no@pass.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Login User', email: 'login@example.com', password: 'mypassword' });
  });

  it('should login with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'mypassword' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should reject wrong password', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('should reject non-existent email', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'pass' });
    expect(res.status).toBe(401);
  });
});
