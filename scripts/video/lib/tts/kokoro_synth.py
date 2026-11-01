#!/usr/bin/env python3
"""Synthesise one line of narration with Kokoro ONNX.
Usage: kokoro_synth.py <voice> <speed> <outWav>   (text read from stdin)
Set KOKORO_DIR to the folder holding kokoro-v1.0.onnx and voices-v1.0.bin.
"""
import os
import sys

import soundfile as sf
from kokoro_onnx import Kokoro

voice, speed, out_wav = sys.argv[1], float(sys.argv[2]), sys.argv[3]
text = sys.stdin.read()
model_dir = os.environ.get("KOKORO_DIR", "/root/kokoro")
k = Kokoro(f"{model_dir}/kokoro-v1.0.onnx", f"{model_dir}/voices-v1.0.bin")
audio, sr = k.create(text, voice=voice, speed=speed, lang="en-us")
sf.write(out_wav, audio, sr)
