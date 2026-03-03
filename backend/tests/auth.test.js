process.env.NODE_ENV = 'test';
require('dotenv').config();

const request       = require('supertest');
const app           = require('../server');
const { sequelize } = require('../models');

const testUser = {
  name:     'Test User',
  email:    `test_${Date.now()}@test.com`,
  password: 'password123'
};

let authToken = '';

beforeAll(async () => { await sequelize.authenticate(); });
afterAll(async ()  => { await sequelize.close(); });

describe('POST /api/auth/register', () => {
  it('should register a new user and return a token', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    authToken = res.body.token;
  });

  it('should reject a duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('should reject registration without a password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'No Pass', email: 'nopass@test.com'
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email, password: testUser.password
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    authToken = res.body.token;
  });

  it('should reject wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email, password: 'wrongpassword'
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('should reject a non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com', password: 'password123'
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('should return current user when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUser.email);
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});