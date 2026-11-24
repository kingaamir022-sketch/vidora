# O-AI-GENERATE — In-editor AI generation (Phase 6, Section O)
- **Phase:** 6 (Section O)
- **Reference behaviour:** CapCut's Media panel Generate section has Prompt + Showcase tabs, AI image / AI video / AI dialogue scene options, a prompt box ("Describe your image and how many results to generate (1–10)"), a model dropdown (Seedream 4.3 shown) and a Generate button; the result flow was never observed (O-MEDIA-GENERATE, UNKNOWN). Vidora's Generate tab follows that observed shape with original models and local generation: prompt box, type options (AI image / AI video / AI music / AI dialogue scene), result count 1–10, model select (Vidora Canvas for images, Vidora Motion for video, Vidora Synth for music), Generate button. Generation runs IN THE BROWSER, locally, with no sign-in and no credits: images render procedurally on canvas → PNG; music renders from a seeded pattern via OfflineAudioContext → WAV; video renders an animated procedural scene on canvas → WebM (MediaRecorder canvas capture, 3 s, 720p); dialogue scene creates an image + two caption lines + a narration clip with a voice preset. Results appear in a grid with Add buttons. ASSUMED — the reference result flow was never observed, so the local result grid is Vidora's own.
- **Where it lives:** `src/lib/aiGenerate.ts` (prompt → seeded pattern/scene, renderers) + Generate sub-tab in `src/components/AILibraryPanel.tsx`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Prompt box | — | — | — | — | "Describe what to generate…" |
| Radio | Type: AI image / AI video / AI music / AI dialogue scene | — | — | AI image | — | Dialogue scene = image + captions + voice |
| Number | Result count | 1 | 10 | 3 | 1 | Same range as the reference |
| Select | Model | — | — | Vidora Canvas | — | Vidora Canvas (image), Vidora Motion (video), Vidora Synth (music) — model follows the type |
| Button | Generate | — | — | — | — | Disabled while generating or with an empty prompt |
| Text | Note | — | — | — | — | "Generated locally in your browser — no sign-in, no credits." |
| Cards | Results grid | — | — | — | — | Thumbnail/name + Add button per result |

## Interactions
- Type a prompt, pick a type and count, click Generate: a progress line shows ("Generating 2 of 3…"), then the results grid fills. Each result has Play (music/video) or a thumbnail (image) and an Add button.
- Add (music): creates a MediaItem (kind audio, WAV blob URL) and an audio clip. Add (image): MediaItem (kind image, PNG data URL) + timeline clip. Add (video): MediaItem (kind video, WebM blob URL, 720p, 3 s) + timeline clip. Add (dialogue scene): image + two text clips with captions + a narration clip using the chosen voice preset.
- Same prompt always generates the same results (seeded from the prompt text) — re-running a prompt is deterministic.
- Keywords steer the result: "calm", "happy", "dark", "fast", "ocean", "sunset", "neon", "forest", "city", "space" map to style palettes/tempos (see `aiGenerate.ts`).

## States
- Empty prompt: Generate is disabled; hint "Describe what to generate first."
- Generating: progress line + Generate disabled.
- Done: results grid; a "Generate more" button re-runs with the same prompt.
- Error (e.g. MediaRecorder unavailable for video): a readable error appears and the other types still work.

## Result
Generated media appears in the project media list and on the timeline, editable like any imported media. Nothing is uploaded anywhere.

## Edge cases
- Prompt with no recognised keywords: the default style for the type is used (calm image gradient, mid-tempo music, slow-pan clip).
- Count 10 video: each clip renders 3 s in real time — generation takes ~30 s total; the progress line counts each finished clip.
- Headless/test environment without OfflineAudioContext or MediaRecorder: Generate shows the honest error and the library tabs still work.

## Evidence
`src/lib/aiGenerate.ts`, `src/test/phase6.test.ts` (prompt→seed determinism, keyword mapping). Reference shape: O-MEDIA-GENERATE (UNKNOWN — result flow never observed).

## Status
ASSUMED
