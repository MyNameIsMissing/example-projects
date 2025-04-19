const getWeatherBtn = document.getElementById('getWeatherBtn');
const citySelect = document.getElementById('citySelect');

const weatherTitle = document.getElementById('weatherTitle');
const weatherIcon = document.getElementById('weatherIcon');
const weatherDescription = document.getElementById('weatherDescription');
const temperature = document.getElementById('temperature');
const feelsLike = document.getElementById('feelsLike');
const windSpeed = document.getElementById('windSpeed');
const errorMessage = document.getElementById('errorMessage');

async function loadCities() {
  try {
    const response = await fetch('cities.json');
    if (!response.ok) {
      throw new Error('Failed to load cities');
    }
    const cities = await response.json();
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });
  } catch (error) {
    errorMessage.textContent = error.message;
  }
}

getWeatherBtn.addEventListener('click', async () => {
  const city = citySelect.value.trim();
  if (!city) {
    errorMessage.textContent = "Please select a city!";
    return;
  }

  // Clear previous content and error message
  weatherTitle.textContent = "";
  weatherIcon.src = "";
  weatherDescription.textContent = "";
  temperature.textContent = "";
  feelsLike.textContent = "";
  windSpeed.textContent = "";
  errorMessage.textContent = "";

  try {
    // Request weather from our own server endpoint
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error fetching weather');
    }

    const data = await response.json();

    // Display weather data
    weatherTitle.textContent = `Weather in ${data.name}`;
    weatherDescription.textContent = `Condition: ${data.description}`;
    temperature.textContent = `Temperature: ${data.temp} °F`;
    feelsLike.textContent = `Feels like: ${data.feels_like} °F`;
    windSpeed.textContent = `Wind speed: ${data.wind_speed} mph`;

    // Use OpenWeatherMap icon if available
    // Icon base URL: https://openweathermap.org/img/wn/{ICON_CODE}@2x.png
    if (data.icon) {
      weatherIcon.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
      weatherIcon.alt = data.description || "Weather Icon";
      weatherIcon.style.display = "inline-block"; 
    }

    // Clear error message on successful fetch
    errorMessage.textContent = "";
  } catch (error) {
    errorMessage.textContent = error.message;
  }
});

loadCities();
