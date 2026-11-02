#!/usr/bin/env bash
# Approved voice: Kokoro ONNX (af_heart). Installs the python package and downloads the
# ~350MB model files into KOKORO_DIR (default /root/kokoro, or pass a path as $1).
set -euo pipefail
dir="${1:-/root/kokoro}"
mkdir -p "$dir"
pip install --quiet kokoro-onnx soundfile numpy
base="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -f "$dir/$f" ] || curl -sSfL -o "$dir/$f" "$base/$f"
done
echo "kokoro ready in $dir (set KOKORO_DIR=$dir)"
