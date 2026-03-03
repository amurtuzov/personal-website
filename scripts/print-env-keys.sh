#!/usr/bin/env bash
set -euo pipefail

if [ ! -f ".env" ]; then
  echo ".env not found in current directory."
  exit 1
fi

echo "Keys present in .env:"
grep -v '^\s*#' .env | grep -v '^\s*$' | cut -d '=' -f 1 | sort
