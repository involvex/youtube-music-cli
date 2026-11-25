#!/usr/bin/env bash
set -euo pipefail

REPO="involvex/youtube-music-cli"
BIN_DIR="${HOME}/.local/bin"
FROM_NPM=0

for arg in "$@"; do
  case "$arg" in
    --from-npm) FROM_NPM=1 ;;
  esac
done

install_from_package_manager() {
  PACKAGE="@involvex/youtube-music-cli"
  if command -v bun >/dev/null 2>&1; then
    bun install -g "$PACKAGE"
    echo "youtube-music-cli installed via bun. Run: youtube-music-cli"
    exit 0
  fi
  if command -v npm >/dev/null 2>&1; then
    npm install -g "$PACKAGE"
    echo "youtube-music-cli installed via npm. Run: youtube-music-cli"
    exit 0
  fi
  echo "Error: could not download a release binary, and bun/npm are not available." >&2
  echo "Install bun from https://bun.sh or node.js from https://nodejs.org" >&2
  exit 1
}

if [[ "$FROM_NPM" -eq 1 ]]; then
  install_from_package_manager
fi

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$OS-$ARCH" in
  linux-x86_64|linux-amd64)
    ASSET_CANDIDATES=("youtube-music-cli-linux-x64" "youtube-music-cli")
    ;;
  linux-aarch64|linux-arm64)
    ASSET_CANDIDATES=("youtube-music-cli-linux-arm64")
    ;;
  darwin-arm64)
    ASSET_CANDIDATES=("youtube-music-cli-darwin-arm64" "youtube-music-cli")
    ;;
  darwin-x86_64)
    ASSET_CANDIDATES=("youtube-music-cli-darwin-x64" "youtube-music-cli")
    ;;
  *)
    echo "Unsupported platform for binary install: ${OS}-${ARCH}" >&2
    echo "Falling back to bun/npm..."
    install_from_package_manager
    ;;
esac

DEST="${BIN_DIR}/youtube-music-cli"
DEST_YMC="${BIN_DIR}/ymc"

echo "Fetching latest release from GitHub (${REPO})..."
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
if ! RELEASE_JSON="$(curl -fsSL \
  -H "Accept: application/vnd.github+json" \
  -H "User-Agent: youtube-music-cli-install" \
  "$API_URL")"; then
  echo "Binary install failed: could not query GitHub releases." >&2
  echo "Falling back to bun/npm..."
  install_from_package_manager
fi

pick_asset_url() {
  local name="$1"
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$RELEASE_JSON" | python3 -c "
import json,sys
name=sys.argv[1]
data=json.load(sys.stdin)
for a in data.get('assets', []):
    if a.get('name') == name:
        print(a.get('browser_download_url', ''))
        break
" "$name"
  elif command -v python >/dev/null 2>&1; then
    printf '%s' "$RELEASE_JSON" | python -c "
import json,sys
name=sys.argv[1]
data=json.load(sys.stdin)
for a in data.get('assets', []):
    if a.get('name') == name:
        print(a.get('browser_download_url', ''))
        break
" "$name"
  else
    printf '%s' "$RELEASE_JSON" | grep -oE "https://[^\"]+/${name}\"" | head -n 1 | tr -d '"'
  fi
}

DOWNLOAD_URL=""
CHOSEN_ASSET=""
for name in "${ASSET_CANDIDATES[@]}"; do
  DOWNLOAD_URL="$(pick_asset_url "$name" || true)"
  if [[ -n "$DOWNLOAD_URL" ]]; then
    CHOSEN_ASSET="$name"
    break
  fi
done

if [[ -z "$DOWNLOAD_URL" ]]; then
  echo "Binary install failed: no matching release asset (tried: ${ASSET_CANDIDATES[*]})." >&2
  echo "Falling back to bun/npm..."
  install_from_package_manager
fi

mkdir -p "$BIN_DIR"
echo "Downloading ${CHOSEN_ASSET} → ${DEST}"
curl -fsSL "$DOWNLOAD_URL" -o "$DEST"
chmod +x "$DEST"
ln -sf "$DEST" "$DEST_YMC"

case ":${PATH}:" in
  *":${BIN_DIR}:"*)
    echo "Installed to ${BIN_DIR} (already on PATH)."
    ;;
  *)
    echo ""
    echo "Installed to ${BIN_DIR}"
    echo "Add this folder to your PATH, then restart the terminal:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "Add that line to ~/.bashrc or ~/.zshrc to make it permanent."
    ;;
esac

echo "Run: youtube-music-cli   (or ymc)"
