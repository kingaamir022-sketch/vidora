#!/usr/bin/env bash
# Vidora Phase 7 pipeline loop test (K-STT + K-TTS):
#   Piper speaks a known sentence -> Vosk transcribes it back.
# Passes when the transcript contains the key words.
# Run from the repo root:  bash tools/test_pipeline.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TEXT="Hello, this is a clear test of the speech pipeline."
EXPECT1="clear"
EXPECT2="pipeline"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "--- 1. Piper renders narration ---"
tools/.venv/bin/python tools/narrate.py "$TEXT" --out "$TMP/speech.wav"
ls -la "$TMP/speech.wav"

echo "--- 2. Vosk transcribes it back ---"
tools/.venv/bin/python tools/transcribe.py "$TMP/speech.wav" --out "$TMP/speech.srt"
cat "$TMP/speech.srt"

echo "--- 3. Check key words ---"
TRANSCRIPT="$(tr 'A-Z' 'a-z' < "$TMP/speech.srt")"
case "$TRANSCRIPT" in
  *"$EXPECT1"*) echo "OK: found '$EXPECT1'" ;;
  *) echo "FAIL: '$EXPECT1' missing from transcript"; exit 1 ;;
esac
case "$TRANSCRIPT" in
  *"$EXPECT2"*) echo "OK: found '$EXPECT2'" ;;
  *) echo "FAIL: '$EXPECT2' missing from transcript"; exit 1 ;;
esac
echo "PIPELINE LOOP OK: Piper -> Vosk round-trip works."
