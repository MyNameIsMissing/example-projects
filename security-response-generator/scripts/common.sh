#!/usr/bin/env bash

# Shared runtime checks for setup.sh and the project-local srg launcher.

# shellcheck disable=SC2034 # These defaults are consumed by scripts that source this file.
SRG_DEFAULT_GEN_MODEL="llama3.1:8b"
SRG_DEFAULT_EMBED_MODEL="embeddinggemma"

srg_info() {
  printf '%s\n' "$*"
}

srg_error() {
  printf 'ERROR: %s\n' "$*" >&2
}

srg_python_version_ok() {
  "$1" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)' \
    >/dev/null 2>&1
}

srg_ollama_ready() {
  ollama list >/dev/null 2>&1
}

srg_start_ollama() {
  local log_file="${TMPDIR:-/tmp}/srg-ollama-serve.log"
  if srg_ollama_ready; then
    return 0
  fi

  srg_info "Starting the Ollama daemon (log: $log_file)..."
  OLLAMA_NO_CLOUD=1 nohup ollama serve >"$log_file" 2>&1 &

  for _ in {1..20}; do
    if srg_ollama_ready; then
      return 0
    fi
    sleep 1
  done

  srg_error "Ollama did not become ready within 20 seconds."
  srg_error "Review its log at $log_file"
  return 1
}

srg_model_installed() {
  local wanted="$1"
  local installed

  installed="$(ollama list 2>/dev/null | awk 'NR > 1 {print $1}')"
  while IFS= read -r model; do
    if [ "$model" = "$wanted" ] || [ "$model" = "${wanted}:latest" ]; then
      return 0
    fi
  done <<<"$installed"
  return 1
}
