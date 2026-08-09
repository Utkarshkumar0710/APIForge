const request = require('supertest');
const app = require('../server');
const db = require('../config/database');
const bcrypt = require('bcrypt');

jest.mock('../config/database');

describe('Auth routes (mocked DB)', () => {
  beforeEach(() => {
    db.query = jest.fn();
  });

  test('POST /api/auth/login with valid credentials', async () => {
    // prepare user with known password hash
    const password = 'Password123';
    const password_hash = bcrypt.hashSync(password, 10);
    db.query.mockResolvedValueOnce([[{ id: 1, full_name: 'Test', email: 't@example.com', password_hash }]]);

    const res = await request(app).post('/api/auth/login').send({ email: 't@example.com', password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    // cookie should be set
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('POST /api/auth/login wrong password', async () => {
    const password_hash = bcrypt.hashSync('OtherPass', 10);
    db.query.mockResolvedValueOnce([[{ id: 1, full_name: 'Test', email: 't@example.com', password_hash }]]);
    const res = await request(app).post('/api/auth/login').send({ email: 't@example.com', password: 'Wrong' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });
});
