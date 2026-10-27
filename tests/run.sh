#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project="colors-test-$$"
compose=(docker compose -p "$project" -f tests/compose.yaml)
trap '"${compose[@]}" down --volumes --remove-orphans >/dev/null' EXIT
"${compose[@]}" up --build --wait -d
"${compose[@]}" exec -T web sh -c 'find api config tests -name "*.php" -print0 | xargs -0 -n1 php -l'
"${compose[@]}" exec -T web php tests/seed.php
node --check public/js/code.js
address=$("${compose[@]}" port web 8080)
COLORS_TEST_URL="http://$address" node --test tests/api.test.mjs tests/browser.test.mjs
