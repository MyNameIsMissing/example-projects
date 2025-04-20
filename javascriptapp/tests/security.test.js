const request = require('supertest');
const app = require('../server');

describe('Security Tests - Injection Attacks', () => {
  // Test for basic injection attempt in city parameter
  it('should handle SQL injection-like input safely', async () => {
    const injectionPayload = "'; DROP TABLE cities; --";
    const response = await request(app).get('/api/weather').query({ city: injectionPayload });
    // Expect the server to respond with 404 or 200 but not crash or expose sensitive info
    expect([200, 404]).toContain(response.status);
    expect(response.body).not.toHaveProperty('error', expect.stringContaining('SQL'));
  });

  // Test for script injection attempt in city parameter
  it('should handle script injection input safely', async () => {
    const injectionPayload = "<script>alert('xss')</script>";
    const response = await request(app).get('/api/weather').query({ city: injectionPayload });
    // Expect the server to respond with 404 or 200 but not execute or reflect script
    expect([200, 404]).toContain(response.status);
    expect(response.body).not.toHaveProperty('error', expect.stringContaining('script'));
  });

  // Test for command injection-like input
  it('should handle command injection-like input safely', async () => {
    const injectionPayload = 'London; rm -rf /';
    const response = await request(app).get('/api/weather').query({ city: injectionPayload });
    expect([200, 404]).toContain(response.status);
    expect(response.body).not.toHaveProperty('error', expect.stringContaining('command'));
  });

  // Test missing city parameter returns 400
  it('should return 400 if city parameter is missing', async () => {
    const response = await request(app).get('/api/weather');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Missing city parameter');
  });
});
