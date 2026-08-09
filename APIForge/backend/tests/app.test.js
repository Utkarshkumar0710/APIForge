const request = require('supertest');
const app = require('../server');

describe('Basic app', () => {
  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  test('GET /login.html allows the inline frontend scripts', async () => {
    const res = await request(app).get('/login.html');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-security-policy']).toContain("script-src 'self' 'unsafe-inline'");
  });
});
