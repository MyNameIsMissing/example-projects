#!/bin/bash
set -e

# Security Response Generator Setup Script
echo "Setting up Security Response Generator..."

# Resolve a Python interpreter (prefers pyenv, falls back to python3 on PATH).
# Re-running this script (e.g. after installing Ollama) must not try to
# recreate an already-valid .venv: Python's venv module marks activation
# scripts read-only, so a second `python -m venv .venv` over the same
# directory fails with Permission denied instead of silently succeeding.
if [ -d .venv ] && [ -f .venv/bin/activate ]; then
  echo "Using existing virtual environment (.venv)"
else
  if [ -d .venv ]; then
    echo "Found an incomplete .venv, removing it and starting fresh..."
    rm -rf .venv
  fi

  echo "Setting up Python virtual environment..."
  if command -v pyenv >/dev/null 2>&1; then
    pyenv install -s 3.12.7
    pyenv local 3.12.7
    PYTHON_BIN="$(pyenv which python)"
  else
    PYTHON_BIN="$(command -v python3)"
  fi

  if [ -z "$PYTHON_BIN" ]; then
    echo "No Python interpreter found."
    echo "Recommended (no system change):"
    echo "  curl https://pyenv.run | bash"
    echo "  # restart shell, then:"
    echo "  pyenv install 3.12.7"
    echo "  pyenv local 3.12.7"
    echo "Then re-run: ./setup.sh"
    exit 1
  fi

  "$PYTHON_BIN" -m venv .venv
fi

source .venv/bin/activate

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -e ".[dev]"

echo "Checking for Ollama..."
if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed. Install it from https://ollama.com/download, then re-run: ./setup.sh"
  exit 1
fi

echo "Checking that the Ollama daemon is running..."
if ! ollama list >/dev/null 2>&1; then
  echo "Ollama is installed but the daemon doesn't seem to be running."
  echo "Start it with: ollama serve  (or launch the Ollama desktop app)"
  echo "Then re-run: ./setup.sh"
  exit 1
fi

echo "Pulling models..."
ollama pull gemma4:e4b
ollama pull embeddinggemma

# Guard for a fresh clone where the gitignored folders/subfiles don't exist yet
mkdir -p knowledge_base customer_standards private_context chroma_db

echo ""
echo "Setup complete."
echo ""
echo "This script ran in its own subshell, so the virtual environment it used"
echo "is NOT active in your current terminal. Activate it here first:"
echo "  source .venv/bin/activate"
echo ""
echo "Then:"
echo "  1. Drop the NIST 800-53 rev5 catalog (PDF/MD/TXT) into knowledge_base/"
echo "  2. Drop this engagement's customer/state standards into customer_standards/"
echo "  3. Drop non-public system details into private_context/"
echo "  4. Run: srg ingest"
echo "  5. Run: srg generate SI-5 --context \"...\""
echo ""
echo "When you switch to a different customer engagement, replace the contents"
echo "of customer_standards/ and run: srg ingest --rebuild"
