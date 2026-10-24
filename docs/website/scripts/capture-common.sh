#!/usr/bin/env bash

ensure_current_web_build() {
  local root="$1"
  (cd "$root" && bun run --filter @mingzhan/web build)
}
