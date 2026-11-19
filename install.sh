#!/usr/bin/env bash
# Puts every skill in skills/ into ~/.claude/skills/ (read by Claude Code and omp) and runs the one-time kit setup.
# The work is done by install.py, which also runs on Windows. Re-run it after a git pull to pick up new skills.
#   ./install.sh [--voice]
set -euo pipefail
exec python3 "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install.py" "$@"
