// /home/rob/repos/example-projects/javascriptapp/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000; // Ensure PORT is defined before use
const API_KEY = process.env.OPENWEATHER_API_KEY;

// --- Load Available Cities ---
let availableCities = [];
try {
  const citiesJsonPath = path.join(__dirname, 'cities.json');
  const citiesJsonData = fs.readFileSync(citiesJsonPath, 'utf8');
  availableCities = JSON.parse(citiesJsonData);
  console.log(`Successfully loaded ${availableCities.length} cities from cities.json`);
} catch (err) { // Branch 1 (covered by 'Server Startup Error Handling' tests)
  console.error("Error reading or parsing cities.json:", err);
  availableCities = ['London', 'New York'];
  console.warn("Using fallback city list.");
} // End Branch 1

// --- Middleware and Routes ---
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/cities', (req, res) => {
  res.json(availableCities);
});

app.get('/api/weather', async (req, res) => {
  try { // Branch 2 (covered by successful weather tests)
    const city = req.query.city;
    if (!city) { // Branch 3 (covered by missing city param test)
      return res.status(400).json({ error: 'Missing city parameter' });
    } // End Branch 3

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=imperial`;
    console.log(`Fetching weather for ${city} from: ${url}`);
    const response = await fetch(url);

    if (!response.ok) { // Branch 4 (covered by fetch mocking tests for non-OK)
       let errorData = { message: 'Failed to fetch weather data' };
       try { // Branch 5 (covered by 404 fetch mock test)
           const owmError = await response.json();
           errorData.message = owmError.message || errorData.message; // Branch 6 (short-circuit logic)
       } catch (parseError) { // Branch 7 (covered by 503 JSON parse fail test)
           errorData.message = response.statusText || errorData.message; // Branch 8 (short-circuit logic)
       } // End Branch 7 & 5
       console.error(`Error fetching from OpenWeatherMap: ${response.status} - ${errorData.message}`);
       return res.status(response.status).json({ error: errorData.message });
    } // End Branch 4

    const data = await response.json();
    // Optional chaining provides implicit branches, usually covered if the properties exist/don't exist
    res.json({
      name: data.name,
      description: data.weather?.[0]?.description || '', // Branch 9 & 10 (short-circuit)
      temp: data.main?.temp,
      feels_like: data.main?.feels_like,
      wind_speed: data.wind?.speed,
      icon: data.weather?.[0]?.icon
    });
  } catch (err) { // Branch 11 (covered by fetch network error test)
    console.error('Server error in /api/weather:', err);
    res.status(500).json({ error: 'Server error' });
  } // End Branch 11 & 2
});

// --- START: Refactored Server Start Logic ---
// Function to start the server listening
function startServer(port) {
  // Make sure to use the 'app' instance defined above
  const server = app.listen(port, () => { // Callback is Branch 12 (covered by 'Server Starting Function' test)
    console.log(`Server running on http://localhost:${port}`); // Line inside Branch 12
  }); // End Branch 12
  return server; // Return the server instance (useful for closing in tests if needed)
}

// If this file is run directly, call the start function.
// Keep the ignore comment for the condition itself if desired.
/* istanbul ignore if */ // Ignores the 'if' condition itself (Branch 13)
if (require.main === module) { // Branch 13 (ignored)
  startServer(PORT); // Call the extracted function
} // End Branch 13
// --- END: Refactored Server Start Logic ---


// Export the app for testing AND the startServer function
module.exports = { app, startServer, PORT }; // Export PORT as well for convenience in tests
