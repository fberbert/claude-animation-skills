#!/usr/bin/env bash
# Kept for old instructions: the build lives in make.py (same on Windows, macOS and Linux).
#   make.sh <reel-folder> [kokoro | elevenlabs | falas | path/to/voiceover.mp3]
exec python3 "$(dirname "${BASH_SOURCE[0]}")/make.py" "$@"
