# Example Projects for AI Experimentation

This repository contains various projects and examples used for AI experimentation. The projects are not intended for production use and are primarily for testing and learning purposes.

## Structure

- **document-enhancer/**: An AI-powered document image enhancement application using Real-ESRGAN for upscaling and improving the readability of blurry document images.
- **goapp/**: A Go application that fetches and displays stock data using the Alpha Vantage API.
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

### GitHub Actions Security Scanning with Zizmor

This repository uses [zizmor](https://github.com/zizmorcore/zizmor) to scan GitHub Actions workflows for security vulnerabilities and misconfigurations. Zizmor is a security auditing tool that analyzes workflow files and identifies potential security issues such as excessive permissions, unsafe practices, and other workflow-related security concerns.

To use zizmor on your system, you can install it via multiple package managers:

**macOS (Homebrew):**
```bash
brew install zizmor
```

**Rust (Cargo):**
```bash
cargo install zizmor
```

**From GitHub Releases:**
Download the appropriate binary from the [releases page](https://github.com/zizmorcore/zizmor/releases).

To scan the GitHub Actions workflows in this repository:

```bash
zizmor .
```

The tool will output results in SARIF format, which can be viewed in compatible editors or saved to a file:

```bash
zizmor . --format sarif > zizmor.sarif
```

For more information about zizmor and its security audits, see the [official documentation](https://docs.zizmor.sh).

## Note

This repository is part of an AI experimentation project and is not actively maintained. Contributions are not being accepted at this time.
