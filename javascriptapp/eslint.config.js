// This file configures ESLint, which is a tool for identifying and reporting on patterns
// found in JavaScript code, with the goal of making code more consistent and avoiding bugs

const jestPlugin = require('eslint-plugin-jest');

module.exports = [
  // Apply to all JavaScript files
  {
    // The environment in which your code runs
    languageOptions: {
      // Use ECMAScript 2021 syntax
      ecmaVersion: 2021,
      // Use ECMAScript modules
      sourceType: 'module',
      // Global variables
      globals: {
        // Node.js global variables
        process: 'readonly',
        // Browser global variables
        document: 'readonly',
        window: 'readonly',
        // Jest global variables
        jest: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        it: 'readonly',
      },
    },

    // Use ESLint's recommended rules
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },

    // Custom rules
    rules: {
      // Disallow the use of console (error level)
      // This helps catch debugging statements that might have been left in the code
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Require semicolons at the end of statements (error level)
      semi: ['error', 'always'],

      // Use single quotes for strings (warning level)
      quotes: ['warn', 'single', { avoidEscape: true }],

      // Disallow unused variables (warning level)
      'no-unused-vars': ['warn'],

      // Require consistent return statements in functions (error level)
      'consistent-return': 'error',

      // Require === and !== instead of == and != (error level)
      eqeqeq: ['error', 'always'],

      // Disallow the use of eval() (error level)
      'no-eval': 'error',

      // Disallow the use of alert, confirm, and prompt (error level)
      'no-alert': 'error',

      // Disallow the use of debugger (error level)
      'no-debugger': 'error',
    },
  },

  // Jest specific configuration
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      // Jest specific rules
      // Disallow focused tests (error level)
      'jest/no-focused-tests': 'error',

      // Disallow disabled tests (warning level)
      'jest/no-disabled-tests': 'warn',

      // Disallow identical test titles (error level)
      'jest/no-identical-title': 'error',
    },
  },
];
