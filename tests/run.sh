#!/bin/bash
# Logic test: every puzzle (featured + full ladder) solvable at par through the
# real engine, and all streak difficulty tiers non-empty.
cd "$(dirname "$0")"
cat ../js/game.js ../js/puzzles.js ../js/solver.js logic_body.js > /tmp/cp_logic_bundle.js
node /tmp/cp_logic_bundle.js
