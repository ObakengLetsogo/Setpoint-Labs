"""Contactor K1: three pole, 24 V DC coil, aux block, indicator window.

Run: <blender-python> scripts/blender/contactor.py
Writes public/models/contactor.glb. Layout matches MotorStarterRig so the
wiring, decals and the animated indicator flag line up without changes.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from common import add_bevel, bake_ao, box, cut, export_glb, finalize_mesh, material, reset, screw  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "models", "contactor.glb")


def zf(our_z):
    """Our scene +Z (front) is Blender -Y."""
    return -our_z


def build():
    reset()
    m_housing = material("Housing", "#dfe2e5", 0.5)
    m_shell = material("Shell", "#eceef0", 0.42)
    m_aux = material("Aux", "#d3d7db", 0.45)
    m_brass = material("Brass", "#c9a55e", 0.32, 1.0)
    m_zinc = material("Zinc", "#c9cfd5", 0.3, 0.9)
    m_blue = material("Blue", "#2457a6", 0.4)
    m_dark = material("Dark", "#2c3036", 0.55)

    objs = []
    housing = box("Housing", (1.0, 1.72, 0.95), (0, 0, 0.475), m_housing, bevel=0.035)
    objs.append(housing)

    line_x = [-0.42, -0.22, 0.0, 0.22, 0.42]
    load_x = [-0.22, 0.0, 0.22]
    for i, x in enumerate(line_x):
        cut(housing, box(f"cut_line{i}", (0.17, 0.17, 0.2), (x, zf(-0.68), 0.95), None, 0))
    for i, x in enumerate(load_x):
        cut(housing, box(f"cut_load{i}", (0.17, 0.17, 0.2), (x, zf(0.66), 0.95), None, 0))
    for i in range(6):
        cut(housing, box(f"cut_vent{i}", (0.08, 0.06, 0.3), (0.5, -0.5 + i * 0.2, 0.55), None, 0))
    cut(housing, box("cut_groove", (0.05, 1.5, 0.035), (0.5, 0, 0.25), None, 0))
    cut(housing, box("cut_label", (0.62, 0.04, 0.2), (0, zf(0.86), 0.56), None, 0))

    for i, x in enumerate(line_x):
        mat = m_zinc if abs(x) > 0.3 else m_brass
        objs.append(box(f"plate_l{i}", (0.13, 0.13, 0.016), (x, zf(-0.68), 0.818), m_zinc, bevel=0.004, segments=1))
        objs.append(screw(f"screw_l{i}", (x, zf(-0.68), 0.84), mat, 0.05))
    for i, x in enumerate(load_x):
        objs.append(box(f"plate_t{i}", (0.13, 0.13, 0.016), (x, zf(0.66), 0.818), m_zinc, bevel=0.004, segments=1))
        objs.append(screw(f"screw_t{i}", (x, zf(0.66), 0.84), m_brass, 0.05))

    for x in (-0.42, 0.42):
        objs.append(box(f"coil_tab{x}", (0.13, 0.05, 0.02), (x, zf(-0.83), 0.955), m_blue, bevel=0.006, segments=1))

    shell = box("Shell", (0.84, 1.02, 0.3), (0, 0, 1.08), m_shell, bevel=0.06, segments=4)
    cut(shell, box("cut_window", (0.36, 0.22, 0.06), (0, zf(-0.24), 1.23), None, 0))
    cut(shell, box("cut_rating", (0.62, 0.17, 0.02), (0.04, zf(0.4), 1.233), None, 0))
    objs.append(shell)
    objs.append(box("window_floor", (0.34, 0.2, 0.01), (0, zf(-0.24), 1.208), m_dark, bevel=0.004, segments=1))

    aux = box("Aux", (0.56, 0.42, 0.16), (0, zf(0.24), 1.31), m_aux, bevel=0.03)
    for i, x in enumerate((-0.14, 0.14)):
        cut(aux, box(f"cut_aux{i}", (0.11, 0.11, 0.12), (x, zf(0.29), 1.39), None, 0))
        objs.append(screw(f"screw_aux{i}", (x, zf(0.29), 1.355), m_brass, 0.042))
    objs.append(aux)

    clip = box("DinClip", (0.34, 0.08, 0.1), (0, zf(0.88), 0.07), m_dark, bevel=0.015)
    objs.append(clip)
    rail_slot = box("cut_rail", (1.2, 0.36, 0.06), (0, 0, 0.0), None, 0)
    cut(housing, rail_slot)
    add_bevel(clip, 0.01, 1)

    joined = finalize_mesh(objs)
    joined.name = "Contactor"
    bake_ao(joined, size=1024, samples=96, out_dir=os.path.join(ROOT, "scripts", "blender", "out"))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    export_glb(OUT)
    print("wrote", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "scripts", "blender", "out"), exist_ok=True)
    build()
