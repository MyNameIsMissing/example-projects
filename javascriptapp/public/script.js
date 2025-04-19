const getWeatherBtn = document.getElementById('getWeatherBtn');
const cityInput = document.getElementById('cityInput');

const weatherTitle = document.getElementById('weatherTitle');
const weatherIcon = document.getElementById('weatherIcon');
const weatherDescription = document.getElementById('weatherDescription');
const temperature = document.getElementById('temperature');
const feelsLike = document.getElementById('feelsLike');
const windSpeed = document.getElementById('windSpeed');
const errorMessage = document.getElementById('errorMessage');

getWeatherBtn.addEventListener('click', async () => {
  const city = cityInput.value.trim();
  if (!city) {
    errorMessage.textContent = "Please enter a city!";
    return;
  }

  // Clear previous content
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
  } catch (error) {
    errorMessage.textContent = error.message;
  }
});
