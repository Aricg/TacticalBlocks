#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  cat <<'EOF'
Usage: ./scripts/convert-maps.sh [input_dir]

Converts source maps to 16-color PNGs, syncs quantized outputs into shared/,
regenerates shared terrain grid data, and ensures discovered map IDs are
present in src/gameplayConfig.ts MAP_IDS.

Arguments:
  input_dir   Directory containing source map files (.jpeg/.jpg/.png).
              Defaults to the shared directory.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  print_usage
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
INPUT_DIR="${1:-${SHARED_DIR}}"
GAMEPLAY_CONFIG_PATH="${SHARED_DIR}/src/gameplayConfig.ts"

if [[ ! -d "${INPUT_DIR}" ]]; then
  echo "Input directory not found: ${INPUT_DIR}" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but not found in PATH." >&2
  exit 1
fi

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick is required but 'magick' is not found in PATH." >&2
  exit 1
fi

echo "Running map conversion pipeline..."
echo "  shared dir: ${SHARED_DIR}"
echo "  input dir:  ${INPUT_DIR}"

cd "${SHARED_DIR}"
node ./scripts/sync-maps.mjs "${INPUT_DIR}"

if [[ ! -f "${GAMEPLAY_CONFIG_PATH}" ]]; then
  echo "Missing gameplay config: ${GAMEPLAY_CONFIG_PATH}" >&2
  exit 1
fi

map_ids=()
while IFS= read -r -d '' source_file; do
  file_name="$(basename "${source_file}")"
  case "${file_name}" in
    *-16c.png|*-16c.PNG)
      continue
      ;;
  esac
  map_ids+=("${file_name%.*}")
done < <(
  find "${INPUT_DIR}" -maxdepth 1 -type f \
    \( -name '*.jpeg' -o -name '*.jpg' -o -name '*.png' -o -name '*.JPEG' -o -name '*.JPG' -o -name '*.PNG' \) \
    -print0
)

if [[ ${#map_ids[@]} -eq 0 ]]; then
  echo "No source maps found to verify in: ${INPUT_DIR}" >&2
  exit 1
fi

missing_ids=()
while IFS= read -r map_id; do
  [[ -z "${map_id}" ]] && continue
  if ! grep -Fq "'${map_id}'" "${GAMEPLAY_CONFIG_PATH}"; then
    missing_ids+=("${map_id}")
  fi
done < <(printf '%s\n' "${map_ids[@]}" | sort -u)

if [[ ${#missing_ids[@]} -gt 0 ]]; then
  echo "MAP_IDS verification failed. Missing IDs in ${GAMEPLAY_CONFIG_PATH}:" >&2
  printf '  - %s\n' "${missing_ids[@]}" >&2
  exit 1
fi

echo "Verified MAP_IDS contains all discovered map IDs."
echo "If the client dev server is already running, restart it so Vite rebundles new map images."
