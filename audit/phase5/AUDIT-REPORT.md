# Vidora Phase 5 audit report

Run: 2026-11-26T01:38:41.515Z
Result: 39/39 checks passed, 0 failed.

- PASS [N-ASSETS] assets/manifest.json has 1102 entries (676 Phase 5/8 + 426 Phase 6 AI rows) — entries: 1102
- PASS [N-ASSETS] manifest counts meet every floor — {"aiClips":100,"aiImages":110,"aiSfx":100,"aiTracks":100,"backgrounds":30,"captionPresets":23,"cssEffects":14,"fonts":40,"glslEffects":62,"loops":30,"luts":32,"sfx":200,"shapes":10,"stickers":232,"templates":35,"textAnimations":37,"textPresets":50,"total":1253,"transitions":32,"voices":16}
- PASS [N-ASSETS] 32 .cube files generated — files: 32
- PASS [N-ASSETS] 28 animated sticker JSON files generated — files: 28
- PASS [N-ASSETS] 40 woff2 fonts downloaded — files: 41
- PASS [N-ASSETS] OFL-1.1 and Apache-2.0 license texts are real (not stubs) — OFL 4377 chars, Apache 11358 chars
- PASS [N-GLSL] video clip on timeline (GLSL target) — clips: 1
- PASS [BUG-P5-001] text clip added over the video clip — clips: 2
- PASS [BUG-P5-001] video pixels visible under the text overlay — colourful pixels: 24569 of 32400 sampled
- PASS [BUG-P5-001] text is drawn on top of the video — near-white pixels: 3457
- PASS [N-GLSL] Effects panel opens
- PASS [N-GLSL] Trending view lists 12 GLSL cards (full 62 in manifest) — cards: 12
- PASS [N-GLSL] WebGL2 available — GLSL cards enabled
- PASS [N-GLSL] search "glow" narrows the list
- PASS [N-GLSL] Warm Glow appears in Applied effects with intensity slider
- PASS [N-LUTS] Filters panel lists 32 looks
- PASS [N-LUTS] Golden Hour LUT applies (intensity slider appears)
- PASS [E-TRANS] Transitions panel opens
- PASS [E-TRANS] Transitions panel lists 32 transitions (+ None) — cards: 32, none: 1
- PASS [E-TRANS] Heart transition applies (duration control appears)
- PASS [N-TEXTPRESETS] Text styles section lists 50 presets — buttons: 50
- PASS [N-FONTS] font dropdown lists 44 stacks (40 open-license + 4 system) — options: 44
- PASS [N-FONTS] Inter is offered as a font
- PASS [N-TEXTANIM] loop animation list has 36 kinds — options: 36
- PASS [N-TEXTANIM] motion-heart is offered as a loop animation
- PASS [N-CAPTIONPRESETS] Captions panel opens
- PASS [N-CAPTIONPRESETS] Caption styles total 23 across 5 categories — total: 23
- PASS [N-MUSIC] Music tab lists 30 original loops — cards: 30
- PASS [N-MUSIC] Sound effects tab lists 100 original SFX — cards: 100
- PASS [N-BACKGROUNDS] Backgrounds section present
- PASS [N-BACKGROUNDS] Backgrounds section shows 8 backgrounds (catalog has 30) — buttons: 8
- PASS [N-BACKGROUNDS] clicking Violet Dusk adds a 5 s background clip — clips: 2 -> 3
- PASS [H-STICKER] Stickers panel lists 232 stickers — note: Click a sticker (or its +) to add it as a 3-second clip at the playhead, or drag
- PASS [H-STICKER] sticker clip added to the timeline — clips: 4
- PASS [H-STICKER] Motion select offers 28 motion presets + None — options: 29
- PASS [H-STICKER] motion-heart applies to the sticker clip
- PASS [N-TEMPLATES] Templates panel opens
- PASS [N-TEMPLATES] Templates panel lists 35 templates — cards: 35
- PASS [N-TEMPLATES] Use template starts a new project with clips — clips: 3

Zero open bugs.
