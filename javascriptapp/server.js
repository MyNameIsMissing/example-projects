require('dotenv').config();
const express = require('express');
// const fetch = require('node-fetch'); // If on Node <=17; on Node 18+ you can use the built-in fetch
const path = require('path');

const app = express();
// PORT is used when starting the server at the bottom of the file
const API_KEY = process.env.OPENWEATHER_API_KEY;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/weather?city=London - Endpoint to fetch weather data
app.get('/api/weather', async (req, res) => {
  try {
    const city = req.query.city;
    if (!city) {
      return res.status(400).json({ error: 'Missing city parameter' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=imperial`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch weather data' });
    }

    const data = await response.json();
    // Return relevant fields (including icon, feels_like, wind speed)
    return res.json({
      name: data.name,
      description: data.weather?.[0]?.description || '',
      temp: data.main?.temp,
      feels_like: data.main?.feels_like,
      wind_speed: data.wind?.speed,
      icon: data.weather?.[0]?.icon,
    });
  } catch (err) {
    // Log error and return error response
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// If this file is run directly, start the server.
/* istanbul ignore next */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    // Using console.error is allowed by our ESLint config
    console.error(`Server running on http://localhost:${PORT}`);
  });
}

// Export app for testing
module.exports = app;
