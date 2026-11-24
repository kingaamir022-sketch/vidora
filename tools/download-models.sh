#!/usr/bin/env bash
# Download the Phase 7 offline models (run once per machine).
# Vosk STT model (Apache-2.0) + Piper TTS voice (CC-BY 4.0).
# Models live in tools/models/ and are NOT part of the GitHub snapshot
# or the Drive zip — download them on a fresh machine with this script.
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p models
if [ ! -d models/vosk-en-small ]; then
  echo "--- Vosk small English model (~40 MB) ---"
  curl -sL --max-time 600 -o models/vosk-en-small.zip \
    https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
  (cd models && unzip -q -o vosk-en-small.zip && mv vosk-model-small-en-us-0.15 vosk-en-small)
  rm -f models/vosk-en-small.zip
else
  echo "Vosk model already present."
fi

if [ ! -f models/en_US-lessac-medium.onnx ]; then
  echo "--- Piper voice en_US-lessac-medium (~63 MB) ---"
  curl -sL --max-time 600 -o models/en_US-lessac-medium.onnx \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx
  curl -sL --max-time 120 -o models/en_US-lessac-medium.onnx.json \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
else
  echo "Piper voice already present."
fi

echo "--- Python deps (venv) ---"
if [ ! -d .venv ]; then python3 -m venv .venv; fi
.venv/bin/pip install --quiet vosk piper-tts
.venv/bin/python -c "import vosk, piper; print('VOSK+PIPER OK')"
echo "Models ready. Test the loop: bash tools/test_pipeline.sh"
