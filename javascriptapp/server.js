require('dotenv').config();
const express = require('express');
// const fetch = require('node-fetch'); // If on Node <=17; on Node 18+ you can use the built-in fetch
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/weather?city=London
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
    res.json({
      name: data.name,
      description: data.weather?.[0]?.description || '',
      temp: data.main?.temp,
      feels_like: data.main?.feels_like,
      wind_speed: data.wind?.speed,
      icon: data.weather?.[0]?.icon
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// If this file is run directly, start the server.  
/* istanbul ignore next */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export app for testing
module.exports = app;