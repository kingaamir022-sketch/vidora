# O-MEDIA-GENERATE — Media panel Generate section (reference card, Phase 5/6)
- **Phase:** 6 — BUILT as the Generate sub-tab of the AI Library (O-AI-GENERATE). The reference behaviour (Media panel Generate section, Prompt/Showcase tabs, AI image / AI video / AI dialogue scene options, prompt box "Describe your image and how many results to generate (1–10)", model dropdown, Generate button) was UNKNOWN when this card was written — the result flow was never observed. Phase 6 follows the observed shape (prompt box, type options, count 1–10, model select, Generate button) with original Vidora models and local in-browser generation; the Showcase tab has no Vidora equivalent (generated results appear in the results grid instead). Model names shown in the reference are CapCut content — Vidora's models are original (Vidora Canvas / Vidora Motion / Vidora Synth).
- **Where it lives:** Phase 6 — Generate sub-tab in `src/components/AILibraryPanel.tsx` (see O-AI-GENERATE).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Tabs | Prompt / Showcase | — | — | Prompt | — | Showcase contents UNKNOWN |
| Options | AI image / AI video / AI dialogue scene | — | — | — | — | |
| Text input | Prompt box | — | — | — | — | "Describe your image and how many results to generate (1–10)" |
| Number | Result count | 1 | 10 | — | 1 | Stated in the prompt-box placeholder |
| Select | Model | — | — | Seedream 4.3 | — | Full list UNKNOWN |
| Button | Generate | — | — | — | — | |

## Interactions
UNKNOWN — full check pending (the generate-to-result flow was not observed).

## States
UNKNOWN — full check pending.

## Result
NOT BUILT — this card is evidence for Phases 5/6 only.

## Edge cases
UNKNOWN — full check pending.

## Evidence
Desktop screenshot 21-editor-media-generate.png (README batch 6)

## Status
UNKNOWN
