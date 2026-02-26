#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v nvm >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
  fi
fi

if ! command -v nvm >/dev/null 2>&1; then
  echo "nvm is not available. Install nvm or run from a shell with nvm loaded."
  exit 1
fi

if [ ! -f ".nvmrc" ]; then
  echo ".nvmrc not found in $SCRIPT_DIR"
  exit 1
fi

nvm use >/dev/null
echo "Using Node $(node --version)"

GRID_SIZE_PROFILE=large VITE_GRID_SIZE_PROFILE=large npm run dev
