# Vidora Phase 7 audit report

Run: 2026-11-25T15:57:19.567Z
Result: 60/60 checks passed, 0 failed.

- PASS [K-STT] behaviour card docs/behavior/K-STT.md exists
- PASS [K-TTS] behaviour card docs/behavior/K-TTS.md exists
- PASS [K-SMARTCUT] behaviour card docs/behavior/K-SMARTCUT.md exists
- PASS [K-REFRAME] behaviour card docs/behavior/K-REFRAME.md exists
- PASS [K-BGREMOVE] behaviour card docs/behavior/K-BGREMOVE.md exists
- PASS [K-TRACK] behaviour card docs/behavior/K-TRACK.md exists
- PASS [K-STABILIZE] behaviour card docs/behavior/K-STABILIZE.md exists
- PASS [K-ENHANCE] behaviour card docs/behavior/K-ENHANCE.md exists
- PASS [K-MOVEMENT] behaviour card docs/behavior/K-MOVEMENT.md exists
- PASS [K-OPTFLOW] behaviour card docs/behavior/K-OPTFLOW.md exists
- PASS [K-VOCAL] behaviour card docs/behavior/K-VOCAL.md exists
- PASS [K-HIGHLIGHTS] behaviour card docs/behavior/K-HIGHLIGHTS.md exists
- PASS [K-SCRIPT] behaviour card docs/behavior/K-SCRIPT.md exists
- PASS [K-UPSCALE] behaviour card docs/behavior/K-UPSCALE.md exists
- PASS [K-PROVIDERS] behaviour card docs/behavior/K-PROVIDERS.md exists
- PASS [K-STT] tools/transcribe.py exists
- PASS [K-STT] tools/narrate.py exists
- PASS [K-STT] tools/download-models.sh exists
- PASS [K-STT] tools/test_pipeline.sh exists
- PASS [K-STT] tools/README.md exists
- PASS [K-STT] Vosk model downloaded locally (tools/models/vosk-en-small)
- PASS [K-TTS] Piper voice downloaded locally (tools/models/en_US-lessac-medium.onnx)
- PASS [K-SMARTCUT] video + audio + shaky fixtures on the timeline — clips: 3
- PASS [K-PROVIDERS] AI Tools overlay opens
- PASS [K-PROVIDERS] AI Tools section "AI Captions — speech to text" renders
- PASS [K-PROVIDERS] AI Tools section "Narration — render to audio" renders
- PASS [K-PROVIDERS] AI Tools section "Smart Cut — silence & filler removal" renders
- PASS [K-PROVIDERS] AI Tools section "Auto Reframe" renders
- PASS [K-PROVIDERS] AI Tools section "Background Removal" renders
- PASS [K-PROVIDERS] AI Tools section "Camera Tracking — automatic" renders
- PASS [K-PROVIDERS] AI Tools section "Stabilize — real motion correction" renders
- PASS [K-PROVIDERS] AI Tools section "Enhance — Low-light, Retouch, Relight" renders
- PASS [K-PROVIDERS] AI Tools section "AI Movement — camera moves" renders
- PASS [K-PROVIDERS] AI Tools section "Optical Flow — smooth slow motion" renders
- PASS [K-PROVIDERS] AI Tools section "Vocal Isolation — stems" renders
- PASS [K-PROVIDERS] AI Tools section "Auto Highlights" renders
- PASS [K-PROVIDERS] AI Tools section "Script-to-Video" renders
- PASS [K-PROVIDERS] AI Tools section "Upscale to 4K" renders
- PASS [K-PROVIDERS] AI Tools section "AI Providers" renders
- PASS [K-STT] dictation button (supported browser) or honest not-supported note — dictation button shown
- PASS [K-STT] Vosk offline path is named (tools/transcribe.py)
- PASS [K-TTS] Piper offline command is shown (tools/narrate.py)
- PASS [K-SMARTCUT] finds the 2 s silence (2.00s – 4.00s) — Smart Cut — silence & filler removalAnalyses the selected clip's real audio (RMS per 50 ms) and the project captions for filler words. Nothi
- PASS [K-SMARTCUT] cutting the silence splits the audio clip (1 -> 2 pieces) — clips: 3 -> 4
- PASS [K-VOCAL] voice stem renders as a new audio clip on the timeline — clips: 4 -> 5
- PASS [K-REFRAME] 9:16 analysis returns a crop window — Auto ReframeMotion + saliency heuristic finds the subject and keeps it in frame. A static subject with a busy background may drift — re-run 
- PASS [K-STABILIZE] motion analysis completes with an honest reading — Stabilize — real motion correctionTranslation-only phase correlation. Rotation, scale and rolling-shutter wobble are NOT corrected.Analyse m
- PASS [K-STABILIZE] Stabilize toggle turns on after analysis
- PASS [K-BGREMOVE] Remove background toggle turns on
- PASS [K-ENHANCE] Low light slider sets to 0.5 (range is 0–1)
- PASS [K-ENHANCE] Relight slider sets to 0.3 (range is 0–1)
- PASS [K-TRACK] Track button is disabled until a target clip is chosen
- PASS [K-TRACK] panel explains what tracking needs (pick a text/sticker clip + a video to follow)
- PASS [K-MOVEMENT] zoom-in applies keyframes to the clip — AI Movement — camera movesKeyframed camera path, not an ML camera. The move becomes ordinary scale/position keyframes — edit them afterwards
- PASS [K-OPTFLOW] 2x slow-motion copy renders as a new clip — clips: 5 -> 6
- PASS [K-HIGHLIGHTS] highlights are scored and listed — Auto HighlightsScores 2-second segments by loudness + motion + speech, then builds a reel of the best moments. Nothing is deleted without co
- PASS [K-UPSCALE] upscaled copy renders as a new clip — clips: 6 -> 7
- PASS [K-PROVIDERS] Local provider shows Ready
- PASS [K-PROVIDERS] cloud providers are shown as Not configured
- PASS [K-SCRIPT] 3-line script builds a 3-scene project (3 images + 3 text overlays) — clips: 6

Zero open bugs.
