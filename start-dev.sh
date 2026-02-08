#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # Load nvm into this shell session.
  # shellcheck disable=SC1090
  source "${HOME}/.nvm/nvm.sh"
  nvm use 20.18.1 >/dev/null
else
  echo "nvm not found at ${HOME}/.nvm/nvm.sh" >&2
  echo "Install nvm or run with Node 20.18.1 manually." >&2
  exit 1
fi

echo "Using Node $(node -v)"
echo "Starting Vite dev server..."
npm run dev -- "$@"
