// /home/rob/repos/example-projects/javascriptapp/tests/server.test.js
const request = require('supertest');
const fs = require('fs');
const path = require('path');

// --- START: Define expected cities based on cities.json or fallback ---
let expectedCitiesList = [];
const fallbackCitiesList = ['London', 'New York'];
try {
  const citiesJsonPath = path.join(__dirname, '../cities.json');
  const citiesJsonData = fs.readFileSync(citiesJsonPath, 'utf8');
  expectedCitiesList = JSON.parse(citiesJsonData);
} catch (err) {
  console.warn('Test setup: Could not read cities.json, using fallback list for tests.');
  expectedCitiesList = fallbackCitiesList;
}
// --- END: Define expected cities ---

// --- Test Suite for Normal Operation ---
describe('Server Normal Operation', () => {
  // Import app for request testing, PORT for startServer testing
  // Use the DESTRUCTURED import based on the refactored server.js export
  const { app, PORT } = require('../server');

  describe('Weather API (/api/weather)', () => {
    const testCity = expectedCitiesList[0] || 'London';

    it('returns weather data for a valid city', async () => {
      const response = await request(app).get(`/api/weather?city=${testCity}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('name');
      expect(response.body.name.toLowerCase()).toEqual(testCity.toLowerCase());
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('temp');
      expect(response.body).toHaveProperty('feels_like');
      expect(response.body).toHaveProperty('wind_speed');
      expect(response.body).toHaveProperty('icon');
    });

    it('returns 400 if city parameter is missing', async () => {
      const response = await request(app).get('/api/weather');
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing city parameter');
    });
  });

  describe('Cities API (/api/cities)', () => {
    it('should return a 200 OK status', async () => {
      const response = await request(app).get('/api/cities');
      expect(response.statusCode).toBe(200);
    });

    it('should return an array', async () => {
      const response = await request(app).get('/api/cities');
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return the list of cities matching cities.json (or fallback if setup failed)', async () => {
      const response = await request(app).get('/api/cities');
      expect(response.body).toEqual(expectedCitiesList);
    });

    it('should contain strings if the list is not empty', async () => {
      const response = await request(app).get('/api/cities');
      if (response.body.length > 0) { // Covers the 'if' branch
        expect(typeof response.body[0]).toBe('string');
      } else { // Covers the 'else' branch (e.g., if cities.json was empty)
        expect(response.body.length).toBe(0);
      }
    });
  });

  describe('Weather API error handling (fetch mocking)', () => {
    let originalFetch;
    beforeEach(() => {
      originalFetch = global.fetch;
      global.fetch = jest.fn();
    });
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('handles non-OK response from OpenWeather (e.g., 404)', async () => {
      // This mock covers the 'try' block inside the 'if (!response.ok)'
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({ message: 'city not found' }), // Successfully parses OWM error
      });
      const response = await request(app).get('/api/weather?city=FakeCity');
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'city not found');
    });

     it('handles non-OK response from OpenWeather with no message fallback', async () => {
      // Specific test to ensure the || errorData.message fallback is hit
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({}), // OWM error has no 'message' property
      });
      const response = await request(app).get('/api/weather?city=FakeCityUnauthorized');
      expect(response.statusCode).toBe(401);
      // Falls back to the initial 'Failed to fetch...' message
      expect(response.body).toHaveProperty('error', 'Failed to fetch weather data');
    });

    it('handles non-OK response from OpenWeather when JSON parsing fails', async () => {
      // This mock covers the 'catch (parseError)' block inside the 'if (!response.ok)'
      global.fetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable', // This should be used as the error message
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });
      const response = await request(app).get('/api/weather?city=AnotherFakeCity');
      expect(response.statusCode).toBe(503);
      expect(response.body).toHaveProperty('error', 'Service Unavailable'); // Uses statusText
    });

     it('handles non-OK response from OpenWeather JSON parsing fails no statusText', async () => {
      // Specific test to ensure the || errorData.message fallback is hit in the catch
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        // statusText: undefined, // No statusText provided
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });
      const response = await request(app).get('/api/weather?city=YetAnotherFakeCity');
      expect(response.statusCode).toBe(500);
      // Falls back to the initial 'Failed to fetch...' message
      expect(response.body).toHaveProperty('error', 'Failed to fetch weather data');
    });


    it('handles fetch throwing a network error', async () => {
      // This mock covers the main 'catch (err)' block of the '/api/weather' route
      global.fetch.mockRejectedValue(new Error('Network error'));
      const response = await request(app).get('/api/weather?city=NetworkErrorCity');
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error', 'Server error');
    });
  });

}); // End of 'Server Normal Operation' describe block


// --- Test Suite for Server Startup Failure ---
describe('Server Startup Error Handling', () => {
  // This suite covers the 'catch (err)' block during city loading
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  beforeEach(() => {
    jest.resetModules(); // IMPORTANT: Ensures server.js runs its top-level code again
  });

  afterEach(() => {
      jest.unmock('fs'); // Ensure fs is unmocked after each test
  });

  it('should use fallback cities and log errors if cities.json is unreadable', async () => {
    jest.mock('fs', () => ({
        ...jest.requireActual('fs'),
        readFileSync: jest.fn((path, encoding) => {
            if (path.endsWith('cities.json')) {
                throw new Error('Mocked file read error');
            }
            return jest.requireActual('fs').readFileSync(path, encoding);
        }),
    }));

    const { app } = require('../server'); // Require app *after* mock
    const response = await request(app).get('/api/cities');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(fallbackCitiesList);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error reading or parsing cities.json:'), expect.any(Error));
    expect(consoleWarnSpy).toHaveBeenCalledWith('Using fallback city list.');
  });

   it('should use fallback cities and log errors if cities.json is invalid JSON', async () => {
    jest.mock('fs', () => ({
        ...jest.requireActual('fs'),
        readFileSync: jest.fn((path, encoding) => {
            if (path.endsWith('cities.json')) {
                return 'This is not valid JSON {'; // Invalid JSON
            }
            return jest.requireActual('fs').readFileSync(path, encoding);
        }),
    }));

    const { app } = require('../server'); // Require app *after* mock
    const response = await request(app).get('/api/cities');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(fallbackCitiesList);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error reading or parsing cities.json:'), expect.any(SyntaxError));
    expect(consoleWarnSpy).toHaveBeenCalledWith('Using fallback city list.');
  });
}); // End of 'Server Startup Error Handling' describe block


// --- Test Suite for Server Starting Logic ---
describe('Server Starting Function', () => {
  // This suite covers the lines inside the 'startServer' function
  let appListenSpy;
  let consoleLogSpy;
  let serverInstance;
  // Import necessary parts *within* this scope using the DESTRUCTURED import
  const { app, startServer, PORT } = require('../server');

  beforeEach(() => {
    // Spy on app.listen and console.log
    // Important: Spy on the 'app' instance imported from the module
    appListenSpy = jest.spyOn(app, 'listen');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress log output
  });

  afterEach(() => {
    // Restore original implementations
    appListenSpy.mockRestore();
    consoleLogSpy.mockRestore();
    // Close the server if listen wasn't fully mocked and the server started
    if (serverInstance && serverInstance.close) {
      serverInstance.close((err) => {
        if (err) console.error('Error closing server in test teardown:', err);
      });
    }
    serverInstance = null;
  });

  it('should call app.listen with the correct port', () => {
    // Mock listen's implementation to avoid actual server start but record calls
    appListenSpy.mockImplementation((port, callback) => {
      // Return a mock server object with a close method
      serverInstance = { close: jest.fn((cb) => { if(cb) cb(); }) }; // Assign to outer scope var
      return serverInstance;
    });

    startServer(PORT); // Call the exported function

    expect(appListenSpy).toHaveBeenCalledTimes(1);
    expect(appListenSpy).toHaveBeenCalledWith(PORT, expect.any(Function));
  });

  it('should log the correct message once listening', () => {
    let capturedCallback;
    // Mock listen to capture the callback
    appListenSpy.mockImplementation((port, callback) => {
      capturedCallback = callback; // Capture the callback
      serverInstance = { close: jest.fn((cb) => { if(cb) cb(); }) }; // Assign to outer scope var
      return serverInstance;
    });

    startServer(PORT); // Call the function

    // Manually execute the captured callback to simulate the 'listening' event
    expect(capturedCallback).toEqual(expect.any(Function)); // Ensure callback was captured
    if (capturedCallback) {
      capturedCallback(); // Execute the callback
    } else {
      throw new Error('app.listen callback was not captured');
    }

    // Check that console.log was called with the expected message
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith(`Server running on http://localhost:${PORT}`);
  });
});
// --- END: New Test Suite for Server Starting Logic ---
