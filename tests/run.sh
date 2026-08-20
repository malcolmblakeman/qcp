#!/bin/bash
# Logic test: all 8 puzzles solvable at par + mid-game hints correct.
# (logic_test.bundle.js = game.js + puzzles.js + solver.js + assertions, pre-concatenated)
cd "$(dirname "$0")"
node logic_test.bundle.js
