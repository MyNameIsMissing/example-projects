# Git Hooks

This directory contains Git hooks for the project. These hooks help maintain code quality and ensure that only properly tested code gets committed and pushed to the repository.

## Available Hooks

### Pre-commit Hook
This hook runs automatically before each commit and:
- Lints JavaScript files with ESLint to catch code quality issues
- Formats code with Prettier to ensure consistent style
- Runs tests related to the changed files

### Pre-push Hook
This hook runs automatically before each push and:
- Runs all tests with coverage
- Ensures code coverage meets minimum thresholds (80%)
- Checks for skipped tests (tests marked with .skip or .only)

## How to Enable These Hooks

To use these hooks, you need to configure Git to look for hooks in this directory instead of the default `.git/hooks` directory. Run the following command from the root of the repository:

```bash
git config core.hooksPath .git-hooks
```

This is a one-time setup per clone of the repository.

## Bypassing Hooks

In emergency situations, you can bypass the hooks using the `--no-verify` flag:

```bash
git commit --no-verify
git push --no-verify
```

However, this is not recommended as it bypasses the quality checks.
