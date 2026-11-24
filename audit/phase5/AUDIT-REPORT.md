# Vidora Phase 5 audit report

Run: 2026-11-23T08:46:56.084Z
Result: 38/38 checks passed, 0 failed.

- PASS [N-ASSETS] assets/manifest.json has 1089 entries (663 Phase 5 + 426 Phase 6 AI rows) — entries: 1089
- PASS [N-ASSETS] manifest counts meet every floor — {"aiClips":100,"aiImages":110,"aiSfx":100,"aiTracks":100,"backgrounds":30,"captionPresets":20,"cssEffects":14,"fonts":40,"glslEffects":62,"loops":30,"luts":32,"sfx":200,"shapes":10,"stickers":232,"templates":25,"textAnimations":37,"textPresets":50,"total":1240,"transitions":32,"voices":16}
- PASS [N-ASSETS] 32 .cube files generated — files: 32
- PASS [N-ASSETS] 28 animated sticker JSON files generated — files: 28
- PASS [N-ASSETS] 40 woff2 fonts downloaded — files: 41
- PASS [N-ASSETS] OFL-1.1 and Apache-2.0 license texts are real (not stubs) — OFL 4377 chars, Apache 11358 chars
- PASS [N-GLSL] video clip on timeline (GLSL target) — clips: 1
- PASS [BUG-P5-001] text clip added over the video clip — clips: 2
- PASS [BUG-P5-001] video pixels visible under the text overlay — colourful pixels: 24569 of 32400 sampled
- PASS [BUG-P5-001] text is drawn on top of the video — near-white pixels: 3457
- PASS [N-GLSL] Effects panel opens
- PASS [N-GLSL] GLSL section lists 62 effects — heading: 62
- PASS [N-GLSL] WebGL2 available — GLSL cards enabled
- PASS [N-GLSL] search "glow" narrows the list
- PASS [N-GLSL] Warm Glow appears in Applied effects with intensity slider
- PASS [N-LUTS] LUT section lists 32 looks — heading: 32
- PASS [N-LUTS] Golden Hour LUT applies (intensity slider appears)
- PASS [E-TRANS] Transitions panel opens
- PASS [E-TRANS] Transitions panel lists 32 transitions (+ None) — grid buttons: 33
- PASS [E-TRANS] Heart transition applies (duration control appears)
- PASS [N-TEXTPRESETS] Text styles section lists 50 presets — buttons: 50
- PASS [N-FONTS] font dropdown lists 44 stacks (40 open-license + 4 system) — options: 44
- PASS [N-FONTS] Inter is offered as a font
- PASS [N-TEXTANIM] loop animation list has 36 kinds — options: 36
- PASS [N-TEXTANIM] motion-heart is offered as a loop animation
- PASS [N-CAPTIONPRESETS] Captions panel opens
- PASS [N-CAPTIONPRESETS] Caption styles section lists 20 presets — heading: 20
- PASS [N-MUSIC] Music tab lists 30 original loops — cards: 30
- PASS [N-MUSIC] Sound effects tab lists 100 original SFX — cards: 100
- PASS [N-BACKGROUNDS] Backgrounds section lists 30 items — heading: 30
- PASS [N-BACKGROUNDS] clicking Violet Dusk adds a 5 s background clip — clips: 2 -> 3
- PASS [H-STICKER] Stickers panel lists 232 stickers — heading: 232
- PASS [H-STICKER] sticker clip added to the timeline — clips: 4
- PASS [H-STICKER] Motion select offers 28 motion presets + None — options: 29
- PASS [H-STICKER] motion-heart applies to the sticker clip
- PASS [N-TEMPLATES] Templates panel opens
- PASS [N-TEMPLATES] Templates panel lists 25 templates — heading: 25
- PASS [N-TEMPLATES] Use template starts a new project with clips — clips: 3

Zero open bugs.
