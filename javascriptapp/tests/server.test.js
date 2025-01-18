const request = require('supertest');
const app = require('../server');

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

describe('Weather API error handling', () => {
  // Before each test, spy on the global fetch (Node 18+) or require('node-fetch') if using that
  beforeEach(() => {
    jest.spyOn(global, 'fetch'); // if on Node 18+, 'global.fetch' is the built-in
  });

  afterEach(() => {
    global.fetch.mockRestore(); // restore original fetch
  });

  it('handles non-OK response from OpenWeather', async () => {
    // Force fetch to return { ok: false, status: 404, ... }
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({}),
    });

    const response = await request(app).get('/api/weather?city=FakeCity');
    // The code sets status to response.status => 404 in this case
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error', 'Failed to fetch weather data');
  });

  it('handles fetch throw (network error, etc.)', async () => {
    // Force fetch to throw an error
    global.fetch.mockRejectedValue(new Error('Network error'));

    const response = await request(app).get('/api/weather?city=FakeCity2');
    // The code should catch and return status 500, { error: 'Server error' }
    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty('error', 'Server error');
  });
});
