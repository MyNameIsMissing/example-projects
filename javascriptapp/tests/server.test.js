const request = require('supertest');
const app = require('../server'); // We'll adjust server.js to export 'app'

describe('Weather API', () => {
  it('returns weather data for a valid city', async () => {
    const city = 'London';
    const response = await request(app).get(`/api/weather?city=${city}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('name', 'London');
    expect(response.body).toHaveProperty('description');
    expect(response.body).toHaveProperty('temp');
  });

  it('returns 400 if city is missing', async () => {
    const response = await request(app).get('/api/weather');
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Missing city parameter');
  });
});
