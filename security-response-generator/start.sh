#!/bin/bash
# Gets everything ready to run `srg`: activates the venv and makes sure the
# Ollama daemon is up, starting it in the background if needed.
#
# Source this, don't execute it, so the venv activation lands in your
# current shell instead of a throwaway subshell:
#   source start.sh

if ! (return 0 2>/dev/null); then
  echo "Run this as 'source start.sh' (or '. start.sh'), not './start.sh' --"
  echo "otherwise the virtual environment this activates won't stick around"
  echo "in your shell once the script exits." >&2
  exit 1
fi

cd "$(dirname "${BASH_SOURCE[0]:-$0}")" || { return 1; }

if [ ! -f .venv/bin/activate ]; then
  echo "No .venv found. Run ./setup.sh first."
  return 1
fi

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama isn't installed. Install it from https://ollama.com/download, then run ./setup.sh."
  return 1
fi

source .venv/bin/activate
echo "Virtual environment active."

if ollama list >/dev/null 2>&1; then
  echo "Ollama daemon already running."
else
  echo "Starting Ollama daemon in the background (log: /tmp/srg-ollama-serve.log)..."
  OLLAMA_NO_CLOUD=1 nohup ollama serve >/tmp/srg-ollama-serve.log 2>&1 &
  disown

  ready=0
  for _ in $(seq 1 15); do
    if ollama list >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done

  if [ "$ready" = "1" ]; then
    echo "Ollama daemon is up."
  else
    echo "Ollama didn't come up after 15s -- check /tmp/srg-ollama-serve.log"
    return 1
  fi
fi

missing_models=""
installed_models="$(ollama list 2>/dev/null | awk 'NR>1 {print $1}')"
for m in "${SRG_GEN_MODEL:-llama3.1:8b}" "${SRG_EMBED_MODEL:-embeddinggemma}"; do
  if ! grep -qxE "${m}(:latest)?" <<<"$installed_models"; then
    missing_models="$missing_models $m"
  fi
done

if [ -n "$missing_models" ]; then
  echo "Missing model(s):$missing_models -- run ./setup.sh to pull them."
fi

echo ""
echo "Ready. Try:"
echo " srg generate \"AC-2\" --context \"...\""
