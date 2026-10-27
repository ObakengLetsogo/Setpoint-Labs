#!/usr/bin/env bash
# Build a part in headless Blender and compress it for the web.
# Usage: BLENDER_PY=/path/to/python-with-bpy scripts/blender/build.sh contactor
set -euo pipefail
part="$1"
root="$(cd "$(dirname "$0")/../.." && pwd)"
"${BLENDER_PY:-python3}" "$root/scripts/blender/$part.py"
npx -y @gltf-transform/cli@4 optimize "$root/public/models/$part.glb" "$root/public/models/$part.glb" \
  --compress meshopt --texture-compress webp --texture-size 512 --simplify false
