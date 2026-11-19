#!/usr/bin/env bash
# One-time setup for the animation skills. The work is done by kit/setup.py, which also runs on Windows.
#   bash kit/setup.sh            # enough for every quick skill and the two engines' pictures
#   bash kit/setup.sh --voice    # also the free voice (Kokoro) and word timings (Parakeet v3), ~1.3 GB of models
set -euo pipefail
exec python3 "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/setup.py" "$@"
