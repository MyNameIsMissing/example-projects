// This file configures lint-staged, which runs linters on staged files before committing
// It helps ensure that only properly formatted and error-free code gets committed

module.exports = {
  // For JavaScript files:
  '*.js': [
    // Run ESLint with auto-fix option
    'eslint --fix',
    // Format with Prettier
    'prettier --write',
    // Run Jest tests that are related to the staged files
    // This ensures that your changes don't break existing tests
    'jest --findRelatedTests --passWithNoTests',
  ],
  // For JSON files:
  '*.json': [
    // Format JSON files with Prettier
    'prettier --write',
  ],
  // For Markdown files:
  '*.md': [
    // Format Markdown files with Prettier
    'prettier --write',
  ],
  // For HTML files:
  '*.html': [
    // Format HTML files with Prettier
    'prettier --write',
  ],
  // For CSS files:
  '*.css': [
    // Format CSS files with Prettier
    'prettier --write',
  ],
};
