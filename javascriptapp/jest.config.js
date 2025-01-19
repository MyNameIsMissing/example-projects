// jest.config.js
module.exports = {
  // ... other config ...
  coverageThreshold: {
    global: {
      // branches relaxed since online Github Actions will not have a valid API key
      branches: 60,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};