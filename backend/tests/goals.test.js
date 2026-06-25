process.env.NODE_ENV = 'test';
require('dotenv').config();

const request       = require('supertest');
const app           = require('../server');
const { sequelize } = require('../models');

let token;
let otherToken;
let goalId;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const auth = await request(app).post('/api/auth/register')
    .send({ name: 'Goals User', email: 'goals@example.com', password: 'password123' });
  token = auth.body.token;

  const other = await request(app).post('/api/auth/register')
    .send({ name: 'Other', email: 'other_goals@example.com', password: 'password123' });
  otherToken = other.body.token;
});

afterAll(() => {});

// ── GET ALL ───────────────────────────────────────────────────────────────────

describe('GET /api/goals', () => {
  it('rejects without token', async () => {
    const res = await request(app).get('/api/goals');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no goals', async () => {
    const res = await request(app).get('/api/goals')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── CREATE ────────────────────────────────────────────────────────────────────

describe('POST /api/goals', () => {
  it('rejects missing name', async () => {
    const res = await request(app).post('/api/goals')
      .set('Authorization', 'Bearer ' + token)
      .send({ targetAmount: 1000 });
    expect(res.status).toBe(422);
  });

  it('rejects zero or negative targetAmount', async () => {
    const res = await request(app).post('/api/goals')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Trip', targetAmount: 0 });
    expect(res.status).toBe(422);
  });

  it('rejects invalid deadline format', async () => {
    const res = await request(app).post('/api/goals')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Trip', targetAmount: 1000, deadline: 'not-a-date' });
    expect(res.status).toBe(422);
  });

  it('creates a goal with all fields', async () => {
    const res = await request(app).post('/api/goals')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Europe Trip', icon: '✈️', targetAmount: 3000, savedAmount: 500, deadline: '2027-06-01' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Europe Trip');
    expect(res.body.targetAmount).toBe(3000);
    expect(res.body.savedAmount).toBe(500);
    expect(res.body.deadline).toBe('2027-06-01');
    expect(res.body.icon).toBe('✈️');
    goalId = res.body.id;
  });

  it('creates a goal without optional fields', async () => {
    const res = await request(app).post('/api/goals')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Emergency Fund', targetAmount: 5000 });
    expect(res.status).toBe(201);
    expect(res.body.savedAmount).toBe(0);
    expect(res.body.deadline).toBeNull();
    expect(res.body.icon).toBe('💰');
  });

  it('appears in list after creation', async () => {
    const res = await request(app).get('/api/goals')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.some(g => g.id === goalId)).toBe(true);
  });
});

// ── UPDATE ────────────────────────────────────────────────────────────────────

describe('PUT /api/goals/:id', () => {
  it('updates name, target and deadline', async () => {
    const res = await request(app).put('/api/goals/' + goalId)
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Asia Trip', targetAmount: 4000, deadline: '2027-09-01' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Asia Trip');
    expect(res.body.targetAmount).toBe(4000);
  });

  it('clears deadline when null is sent', async () => {
    const res = await request(app).put('/api/goals/' + goalId)
      .set('Authorization', 'Bearer ' + token)
      .send({ deadline: null });
    expect(res.status).toBe(200);
    expect(res.body.deadline).toBeNull();
  });

  it('returns 404 for another user\'s goal', async () => {
    const res = await request(app).put('/api/goals/' + goalId)
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ name: 'Stolen' });
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .put('/api/goals/00000000-0000-0000-0000-000000000000')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ── DEPOSIT ───────────────────────────────────────────────────────────────────

describe('PATCH /api/goals/:id/deposit', () => {
  it('rejects zero amount', async () => {
    const res = await request(app).patch('/api/goals/' + goalId + '/deposit')
      .set('Authorization', 'Bearer ' + token)
      .send({ amount: 0 });
    expect(res.status).toBe(422);
  });

  it('rejects negative amount', async () => {
    const res = await request(app).patch('/api/goals/' + goalId + '/deposit')
      .set('Authorization', 'Bearer ' + token)
      .send({ amount: -100 });
    expect(res.status).toBe(422);
  });

  it('rejects missing amount', async () => {
    const res = await request(app).patch('/api/goals/' + goalId + '/deposit')
      .set('Authorization', 'Bearer ' + token)
      .send({});
    expect(res.status).toBe(422);
  });

  it('adds deposit to savedAmount', async () => {
    // Current savedAmount is 500 (set at creation, unchanged after updates)
    const before = await request(app).get('/api/goals')
      .set('Authorization', 'Bearer ' + token);
    const goal = before.body.find(g => g.id === goalId);
    const prevSaved = goal.savedAmount;

    const res = await request(app).patch('/api/goals/' + goalId + '/deposit')
      .set('Authorization', 'Bearer ' + token)
      .send({ amount: 250 });
    expect(res.status).toBe(200);
    expect(res.body.savedAmount).toBeCloseTo(prevSaved + 250, 2);
  });

  it('accumulates multiple deposits', async () => {
    const before = await request(app).get('/api/goals')
      .set('Authorization', 'Bearer ' + token);
    const prevSaved = before.body.find(g => g.id === goalId).savedAmount;

    await request(app).patch('/api/goals/' + goalId + '/deposit')
      .set('Authorization', 'Bearer ' + token).send({ amount: 100 });
    await request(app).patch('/api/goals/' + goalId + '/deposit')
      .set('Authorization', 'Bearer ' + token).send({ amount: 150 });

    const after = await request(app).get('/api/goals')
      .set('Authorization', 'Bearer ' + token);
    const newSaved = after.body.find(g => g.id === goalId).savedAmount;
    expect(newSaved).toBeCloseTo(prevSaved + 250, 2);
  });

  it('returns 404 for another user\'s goal', async () => {
    const res = await request(app).patch('/api/goals/' + goalId + '/deposit')
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ amount: 1 });
    expect(res.status).toBe(404);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE /api/goals/:id', () => {
  it('returns 404 for another user\'s goal', async () => {
    const res = await request(app).delete('/api/goals/' + goalId)
      .set('Authorization', 'Bearer ' + otherToken);
    expect(res.status).toBe(404);
  });

  it('deletes goal successfully (responds 204)', async () => {
    const res = await request(app).delete('/api/goals/' + goalId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(204);
  });

  it('goal no longer appears in list', async () => {
    const res = await request(app).get('/api/goals')
      .set('Authorization', 'Bearer ' + token);
    expect(res.body.every(g => g.id !== goalId)).toBe(true);
  });
});
