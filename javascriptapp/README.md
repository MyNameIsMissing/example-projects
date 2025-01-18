# Weather App Example

A simple weather application that displays current weather conditions for any city using the OpenWeather API.

## Features

- Real-time weather data lookup by city name
- Displays temperature, "feels like" temperature, wind speed, and weather conditions
- Weather condition icons
- Error handling for invalid cities or API issues

## Requirements

- Node.js 18 or higher
- OpenWeather API key
- npm (Node Package Manager)

## Setup

1. Clone the repository
2. Install dependencies:  
`npm install`
3. Create a `.env` file in the project root with your OpenWeather API key:  
`OPENWEATHER_API_KEY=<yourKey>`

## Testing
Run the test suite with coverage report:  
`npm test`

## Running Locally
Start the development server:  
`npm start`  
The app will be available at http://localhost:3000

## Project Structure
- server.js - Express backend server
- public/ - Static frontend files
    - index.html - Main web interface
- tests/ - Jest test files

## Technologies Used
Express.js - Backend server  
Jest - Testing framework  
SuperTest - HTTP testing library  
