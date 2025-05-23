# Example Projects for AI Experimentation

This repository contains various projects and examples used for AI experimentation. The projects are not intended for production use and are primarily for testing and learning purposes.

## Structure

- **javascriptapp/**: A simple JavaScript application with tests and coverage reports.
- **mermaid_diagrams/**: Examples of using Mermaid to create diagrams for various architectures and workflows.
- **.git-hooks/**: Git hooks for code quality and testing. See [Git Hooks](#git-hooks) section below.

## Git Hooks

This repository includes Git hooks to ensure code quality and proper testing. The hooks are located in the `.git-hooks` directory.

To enable these hooks, run the following command from the root of the repository:

```bash
git config core.hooksPath .git-hooks
```

For more information about the available hooks and how to use them, see the [.git-hooks/README.md](.git-hooks/README.md) file.

### Secret Scanning with Gitleaks

A pre-commit hook has been added to scan for secrets using [gitleaks](https://github.com/gitleaks/gitleaks). To use this hook, please install gitleaks on your system.

If you are using macOS, you can install gitleaks via Homebrew:

```bash
brew install gitleaks
```

The pre-commit hook will block commits if any secrets are detected in the staged files.

## Note

This repository is part of an AI experimentation project and is not actively maintained. Contributions are not being accepted at this time.
