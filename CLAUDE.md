# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A collection of independent AI experimentation projects. Each subdirectory is a self-contained app with its own dependencies, tests, and tooling. Not intended for production use.

## Projects

### `goapp/` — Go Stock Data Fetcher
Fetches intraday stock data from Alpha Vantage API and prints the latest closing price.

**Run:**
```bash
cd goapp
export ALPHA_VANTAGE_API_KEY='your_key'
go run main.go
```

**Test:**
```bash
cd goapp
go test ./...
```

### `javascriptapp/` — Node.js Weather App
Express server + vanilla frontend that shows current weather via the OpenWeather API. Requires a `.env` file with `OPENWEATHER_API_KEY=<key>`.

**Run:** `npm start` (serves at http://localhost:3000)

**Test / lint:**
```bash
cd javascriptapp
npm test               # Jest with coverage (80% threshold enforced on push)
npm run test:security  # Injection-focused security test suite
npm run lint
npm run lint:fix
npm run format
```

CI runs on push/PR for any change under `javascriptapp/**` (see `.github/workflows/checks.yml`).

### `document-enhancer/` — AI Image Enhancement App
Express server + vanilla frontend that upscales document images 2× or 4× using Real-ESRGAN (Python subprocess). Sharp.js handles metadata; Multer handles uploads.

**First-time setup:**
```bash
cd document-enhancer
./setup.sh   # installs Node deps, creates Python 3.10 venv, installs torch/realesrgan
```

**Run:** `npm start` (serves at http://localhost:3001)  
**Dev mode:** `npm run dev`  
**Test:** `npm test`  
**Lint:** `npm run lint` / `npm run lint:fix`

Key architecture: `server.js` exposes REST endpoints (`/api/upload`, `/api/enhance/:fileId`, `/api/status/:fileId`, etc.); `utils/imageProcessor.js` spawns the Python Real-ESRGAN subprocess. The ~67MB model downloads automatically on first enhancement.

### `mermaid_diagrams/`
Static `.mmd` files — Mermaid diagram source for various architecture and workflow diagrams.

## Git Hooks

Hooks live in `.git-hooks/` and must be enabled once per clone:
```bash
git config core.hooksPath .git-hooks
```

- **pre-commit**: ESLint, Prettier, and related tests (JavaScript files only)
- **pre-push**: Full test suite with coverage check (80% minimum) and skipped-test detection

## Branch Policy

Do not commit directly to `main`. All changes must go through a pull request.

## CI / Security Scanning

- **GitHub Actions** (`checks.yml`): runs `javascriptapp` tests on push/PR
- **Zizmor**: scans GitHub Actions workflows for security issues — run with `zizmor .`; results can be saved as `zizmor . --format sarif > zizmor.sarif`
- **Gitleaks**: pre-commit secret scanning — install via `brew install gitleaks` (macOS) before enabling hooks
