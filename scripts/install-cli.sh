#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/install-cli.sh [install-directory]
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
install_dir="${1:-$HOME/.local/bin}"

(
  cd "$repo_root"
  bun build --compile apps/cli/src/index.ts --outfile dist/mingzhan
)
mkdir -p "$install_dir"
install -m 755 "$repo_root/dist/mingzhan" "$install_dir/mingzhan"
echo "Installed $install_dir/mingzhan. Add $install_dir to PATH, then run mingzhan."
