# Vidora offline AI pipelines (Phase 7, Section K)

Two CPU-only, fully offline pipelines. Both run on this machine with no
cloud service, no API key and no account. Models are downloaded once
(`bash tools/download-models.sh`) and live in `tools/models/` — they are
NOT part of the GitHub snapshot (text-only pushes) or the Drive zip;
download them again on a fresh machine.

## 1. Speech-to-text — `tools/transcribe.py` (Vosk)

```bash
.venv/bin/python tools/transcribe.py clip.mp3
# -> clip.srt + clip.words.json (word timings from the recogniser)
```

- Engine: Vosk `vosk-model-small-en-us-0.15` (Apache-2.0), 16 kHz mono.
- Input: any ffmpeg-readable audio/video file (converted to 16 kHz WAV).
- Output: `.srt` (import in Vidora's Captions tab) + `.words.json`
  (per-word start/end, for Smart Cut filler detection).
- Accuracy: small-model English; check the cues after import.

## 2. Narration render — `tools/narrate.py` (Piper)

```bash
.venv/bin/python tools/narrate.py "Hello, welcome to Vidora." --out narration.wav
.venv/bin/python tools/narrate.py --file script.txt --out narration.wav
```

- Engine: Piper (MIT), voice `en_US-lessac-medium` (CC-BY 4.0).
- Output: 22050 Hz WAV. Import it in Vidora's Media tab — it becomes a
  normal audio clip (volume, fades, EQ, ducking all work).
- Long text is split into sentences and concatenated.
- More voices: download any `.onnx` + `.onnx.json` pair from
  `rhasspy/piper-voices` on Hugging Face and pass `--voice <path>`.

## 3. Loop test — `tools/test_pipeline.sh`

Piper speaks a known sentence, Vosk transcribes it back, and the script
asserts the key words are in the transcript:

```bash
bash tools/test_pipeline.sh   # expect: PIPELINE LOOP OK
```

## Setup

```bash
bash tools/download-models.sh   # models + venv + pip deps (vosk, piper-tts)
```

## Licences / provenance

| Asset | Source | Licence |
|---|---|---|
| Vosk model `vosk-model-small-en-us-0.15` | alphacephei.com/vosk/models | Apache-2.0 |
| Vosk library | pypi.org/project/vosk | Apache-2.0 |
| Piper | pypi.org/project/piper-tts | MIT |
| Voice `en_US-lessac-medium` | huggingface.co/rhasspy/piper-voices | CC-BY 4.0 |

See also `LICENSES/PROVENANCE.md` (Phase 7 section).
