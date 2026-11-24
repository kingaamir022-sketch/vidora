# generation/ — Vidora AI content pipeline (Phase 6, Section O)

Deterministic, offline, CPU-only generation of the AI library. No cloud
calls, no sign-in, no credits, no third-party models, no samples, no
existing melodies, no stock photos/video. Every asset is a Vidora
Original (CC0).

## Layout

- `make_prompts.py` — emits the checked-in prompt files (deterministic,
  seed 20261123). Re-running produces byte-identical JSON.
- `prompts/music.json` — 100 music track prompts (12 styles, 15/30/60 s,
  loopable, BPM/key, pattern spec).
- `prompts/sfx.json` — 100 sound-effect prompts (20 families x 5).
- `prompts/clips.json` — 100 stock-clip prompts (20 scenes x 5, 1080p, 6 s).
- `prompts/images.json` — 110 image prompts (40 textures, 20 frames,
  50 transparent stickers).
- `synth.py` — shared numpy synthesis primitives (oscillators, filtered
  noise, pads, envelopes, MP3 encode via ffmpeg).
- `painters.py` — PIL scene painters for clips + overlay layer, and
  texture/frame/sticker painters live in `render_images.py`.
- `render_music.py` / `render_sfx.py` / `render_clips.py` /
  `render_images.py` — per-kind renderers (also runnable standalone with
  `--only <id>,...` or `--pilot`).
- `providers/local.py` — provider registry. Only `local` is implemented.
  External providers are not configured and never called.
- `quality_filter.py` — gates every rendered file (duration, RMS/peak,
  silence, BPM autocorrelation, resolution, motion, alpha). Writes
  `quality-report.json`; exits non-zero on failure.
- `render_all.py` — orchestrator with resume support (`state.json`
  records finished ids) and the runtime manifest writer.
- `state.json` + `state-*.json` — resume state (which ids are done).
- `quality-report.json` — last quality-filter result.

## Usage

```sh
python3 generation/make_prompts.py     # regenerate prompt JSONs
python3 generation/render_all.py       # render everything + quality filter + manifest
python3 generation/render_all.py --kinds music,sfx
python3 generation/render_all.py --force        # re-render all
python3 generation/render_all.py --gpu-safe     # accepted; CPU-only is the only mode
python3 generation/quality_filter.py            # re-check everything
```

## Outputs

- Media files: `public/ai-library/music/*.mp3`, `sfx/*.mp3`,
  `clips/*.mp4` (+ `clips/posters/*.jpg`), `images/{textures,frames,stickers}/*.png`.
  Binaries ship in the Drive release zip; the GitHub snapshot carries
  only the text files (prompts, scripts, manifest).
- Runtime catalog: `assets/ai-manifest.json` — id, name, kind, file,
  BPM/key/duration, peaks, tags, pattern, license. The app imports it
  via `src/lib/aiLibrary.ts`.

## GPU-safe mode

All rendering is CPU-only by design (numpy, PIL, ffmpeg software
encoders). There is no GPU path to disable; `--gpu-safe` exists so the
pipeline interface matches the spec, and it changes nothing.
