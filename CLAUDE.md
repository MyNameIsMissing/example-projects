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

### `security-response-generator/` — Local RAG Security Control Response Generator
Python CLI that drafts Markdown security control responses (e.g. NIST 800-53 "SI-5") via local RAG over three tiers: the NIST 800-53 rev5 baseline (`knowledge_base/`, committed), engagement-specific customer/state standards (`customer_standards/`, gitignored), and non-public system details (`private_context/`, gitignored). If a material gap remains, it asks a clarifying question interactively (up to `SRG_MAX_FOLLOWUP_TURNS`, default 2) rather than guessing, falling back to a best-effort response with `[PLACEHOLDER: ...]` markers if the gap is never filled. Runs entirely locally via Ollama (Gemma 4 E4B generation, EmbeddingGemma embeddings) and an embedded ChromaDB store.

**First-time setup:**
```bash
cd security-response-generator
./setup.sh   # creates venv, installs deps, pulls gemma4:e4b + embeddinggemma via Ollama
```

**Ingest documents:**
```bash
srg ingest                    # all three source tiers, incremental
srg ingest --rebuild          # wipe and re-ingest, e.g. when switching customer engagements
```

**Generate a response:**
```bash
srg generate SI-5 --context "our environment uses a SaaS SIEM for continuous monitoring"
srg generate SI-5 --format text -o response.txt   # plain ASCII for GRC systems that reject Markdown
```

**Test:** `pytest`
**Lint:** `ruff check .` / `ruff format .`

Key architecture: `src/security_response_generator/ingest/` handles loading (PDF/MD/TXT), chunking, and incremental Chroma upserts; `generation/retrieval.py` and `generation/prompt.py` merge per-tier retrieval results (customer standards treated as authoritative) into a prompt, format-aware via `--format markdown|text`; `generation/formatting.py` normalizes `text`-format output to plain ASCII in code (not just via prompt instruction); `llm/ollama_client.py` wraps the local Ollama calls. Refuses to answer if the control ID has no match in the NIST baseline rather than letting the model guess.

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
