Note to the reader.  This example project was 95% constructed by AI as a test to determine viablity on small projects.  Code, testing, GA workflow, even the rest of this readme.

---

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
- .eslintrc.js - ESLint configuration
- .prettierrc.js - Prettier configuration

## Git Hooks

This project uses Git hooks to ensure code quality and test coverage:

### Pre-commit Hook
The pre-commit hook runs automatically before each commit and:
- Lints JavaScript files with ESLint
- Formats code with Prettier
- Runs tests related to changed files

To run these checks manually:
```
npm run lint      # Check for linting issues
npm run lint:fix  # Fix linting issues automatically
npm run format    # Format code with Prettier
```

### Pre-push Hook
The pre-push hook runs automatically before each push and:
- Runs all tests with coverage
- Ensures code coverage meets minimum thresholds (80%)
- Checks for skipped tests

To bypass hooks in emergency situations (not recommended):
```
git commit --no-verify
git push --no-verify
```

### How the Hooks Work
The hooks are implemented as shell scripts in the `.git-hooks` directory at the root of the repository:
- They only run on JavaScript files in the javascriptapp directory
- The pre-commit hook runs ESLint, Prettier, and related tests
- The pre-push hook runs all tests with coverage checks

To enable these hooks, run the following command from the root of the repository:
```
git config core.hooksPath .git-hooks
```

## Technologies Used

Express.js - Backend server  
Jest - Testing framework  
SuperTest - HTTP testing library  
ESLint - Code quality tool  
Prettier - Code formatter
