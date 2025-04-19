// This file configures ESLint, which is a tool for identifying and reporting on patterns
// found in JavaScript code, with the goal of making code more consistent and avoiding bugs

module.exports = {
  // The environment in which your code runs
  env: {
    // Node.js global variables and Node.js scoping
    node: true,
    // Browser global variables
    browser: true,
    // Adds all ECMAScript 2021 globals and automatically sets the ecmaVersion parser option to 12
    es2021: true,
    // Jest global variables
    jest: true,
  },
  // Extends these configurations (recommended settings)
  extends: [
    // Use ESLint's recommended rules
    'eslint:recommended',
    // Use Prettier's recommended rules
    'prettier',
    // Use Jest plugin's recommended rules
    'plugin:jest/recommended',
  ],
  // Specifies the JavaScript language options to use
  parserOptions: {
    // Use ECMAScript 2021 syntax
    ecmaVersion: 12,
    // Use ECMAScript modules
    sourceType: 'module',
  },
  // ESLint plugins to use
  plugins: [
    // Use Jest plugin
    'jest',
  ],
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

    // Jest specific rules
    // Disallow focused tests (error level)
    'jest/no-focused-tests': 'error',

    // Disallow disabled tests (warning level)
    'jest/no-disabled-tests': 'warn',

    // Disallow identical test titles (error level)
    'jest/no-identical-title': 'error',
  },
};
