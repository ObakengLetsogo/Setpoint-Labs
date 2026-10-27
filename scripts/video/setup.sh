#!/usr/bin/env bash
# Offline narration: installs Piper in scripts/video/.venv and downloads the configured voice.
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
python3 -m venv "$dir/.venv"
"$dir/.venv/bin/pip" install --quiet --upgrade pip piper-tts
voice="${1:-en_GB-alan-medium}"
mkdir -p "$dir/models"
IFS=- read -r locale name quality <<<"$voice"
lang="${locale%%_*}"
base="https://huggingface.co/rhasspy/piper-voices/resolve/main/$lang/$locale/$name/$quality/$voice"
for ext in .onnx .onnx.json; do
  [ -f "$dir/models/$voice$ext" ] || curl -sSfL -o "$dir/models/$voice$ext" "$base$ext"
done
echo "piper ready with $voice"
