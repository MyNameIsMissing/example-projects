const request = require('supertest');
const app = require('../server');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Weather API', () => {
  it('returns weather data for a valid city', async () => {
    const city = 'London';
    const response = await request(app).get(`/api/weather?city=${city}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('name', 'London');
    // Branch coverage for description line 31: test with description present
    expect(response.body).toHaveProperty('description');
    expect(typeof response.body.description).toBe('string');
    expect(response.body.description.length).toBeGreaterThan(0);
    expect(response.body).toHaveProperty('temp');
  });

  it('returns weather data with empty description', async () => {
    // Mock fetch to return data with no description
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        name: 'TestCity',
        weather: [{}],
        main: { temp: 70, feels_like: 65 },
        wind: { speed: 5 }
      }),
    });

    const response = await request(app).get('/api/weather?city=TestCity');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('description', '');
    global.fetch.mockRestore();
  });

  it('returns 400 if city is missing', async () => {
    const response = await request(app).get('/api/weather');
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Missing city parameter');
  });
});

describe('Weather API error handling', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    global.fetch.mockRestore();
  });

  it('handles non-OK response from OpenWeather', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({}),
    });

    const response = await request(app).get('/api/weather?city=FakeCity');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error', 'Failed to fetch weather data');
  });

  it('handles fetch throw (network error, etc.)', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    const response = await request(app).get('/api/weather?city=FakeCity2');
    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty('error', 'Server error');
  });
});

describe('Frontend script', () => {
  let window;
  let document;

  beforeEach(() => {
    const dom = new JSDOM(`
      <select id="citySelect">
        <option value="">Select a city...</option>
      </select>
      <button id="getWeatherBtn">Get Weather</button>
      <p id="errorMessage" class="error"></p>
    `, { runScripts: "dangerously", resources: "usable" });

    window = dom.window;
    document = window.document;

    global.document = document;
    global.window = window;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['City1', 'City2']),
      })
    );

    const scriptContent = fs.readFileSync(path.resolve(__dirname, '../public/script.js'), 'utf-8');
    const scriptEl = document.createElement('script');
    scriptEl.textContent = scriptContent;
    document.body.appendChild(scriptEl);
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.fetch;
  });

  it('shows error if no city selected', () => {
    const getWeatherBtn = document.getElementById('getWeatherBtn');
    const errorMessage = document.getElementById('errorMessage');

    getWeatherBtn.click();

    expect(errorMessage.textContent).toBe('Please select a city!');
  });
});
