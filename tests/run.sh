#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project="colors-test-$$"
compose=(docker compose -p "$project" -f tests/compose.yaml)
cleanup() {
    status=$?
    if (( status != 0 )); then
        "${compose[@]}" logs --no-color || true
    fi
    "${compose[@]}" down --volumes --remove-orphans || { (( status != 0 )) || status=1; }
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"${compose[@]}" up --build --wait --wait-timeout 180 -d
"${compose[@]}" exec -T web sh -c 'find api config tests -name "*.php" -print0 | xargs -0 -n1 php -l'
address=$("${compose[@]}" port web 8080)
export COLORS_TEST_URL="http://$address"
export COLORS_TEST_PROJECT="$project"
npm exec -- jest --selectProjects integration --runInBand --testTimeout=20000
"${compose[@]}" exec -T web php tests/seed.php
"${compose[@]}" stop database
npm exec -- jest --selectProjects database-failure --runInBand --testTimeout=20000
