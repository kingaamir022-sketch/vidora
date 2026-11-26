# Vidora Phase 9 audit report

Run: 2026-11-25T16:06:50.179Z
Result: 42/42 checks passed, 0 failed.

- PASS [M-LOCALE] behaviour card docs/behavior/M-LOCALE.md exists
- PASS [M-SETTINGS] behaviour card docs/behavior/M-SETTINGS.md exists
- PASS [M-ACCESS] behaviour card docs/behavior/M-ACCESS.md exists
- PASS [M-PERF] behaviour card docs/behavior/M-PERF.md exists
- PASS [M-LENS] behaviour card docs/behavior/M-LENS.md exists
- PASS [M-ASS] behaviour card docs/behavior/M-ASS.md exists
- PASS [M-CI] behaviour card docs/behavior/M-CI.md exists
- PASS [M-DOCKER] behaviour card docs/behavior/M-DOCKER.md exists
- PASS [M-CI] package.json version is 1.0.4 — version=1.0.4
- PASS [M-CI] audit:phase9 script exists
- PASS [M-CI] CI workflow runs build + test on Node 20
- PASS [M-CI] CI workflow notes Playwright audits are NOT in CI
- PASS [M-DOCKER] Dockerfile uses a two-stage build (node → nginx)
- PASS [M-DOCKER] Dockerfile copies the built dist folder
- PASS [M-DOCKER] docker-compose.yml maps port 4173
- PASS [M-DOCKER] .dockerignore excludes node_modules and dist
- PASS [M-DOCKER] Docker image build is NOT claimed on this VM (docker not installed — first real build needs Docker) — docker is not installed on this VM
- PASS [M-SETTINGS] Settings dialog opens from the editor
- PASS [M-LOCALE] switching to Urdu translates the Settings title — title=سیٹنگز
- PASS [M-LOCALE] switching to Urdu sets lang=ur — lang=ur
- PASS [M-LOCALE] switching to Arabic sets dir=rtl — dir=rtl
- PASS [M-LOCALE] switching to Arabic translates the Settings title — title=الإعدادات
- PASS [M-SETTINGS] Light theme sets data-theme="light" on the app root — theme=light
- PASS [M-SETTINGS] light theme flips the zinc-950 surface token to near-white — --color-zinc-950=#fafafa
- PASS [M-SETTINGS] task-bar preference is saved — {"inputPreference":"default","showSidebar":true,"showTaskBar":false,"theme":"dark"}
- PASS [M-SETTINGS] sidebar preference is saved — {"inputPreference":"default","showSidebar":false,"showTaskBar":true,"theme":"dark"}
- PASS [M-SETTINGS] input preference is saved — {"inputPreference":"left-handed","showSidebar":true,"showTaskBar":true,"theme":"dark"}
- PASS [M-PERF] test video is on the timeline (1 clip) — clips: 1
- PASS [M-PERF] re-importing the same file works (2 items, thumbnails both present) — items: 2
- PASS [M-PERF] thumbnails render for imported media — imgs: 2
- PASS [M-LENS] Color adjustment section opens in the inspector
- PASS [M-LENS] enabling Lens correction reveals the Strength slider
- PASS [M-LENS] strength slider sets 0.50 — value=0.5
- PASS [M-LENS] lensStrength 0.5 is stored in the project — {"blendMode":"normal","brightness":0,"contrast":0,"curves":{"b":[{"x":0,"y":0},{"x":1,"y":1}],"g":[{"x":0,"y":0},{"x":1,"y":1}],"r":[{"x":0,"y":0},{"x":1,"y":1}]},"denoise":0,"exposure":0,"gain":{"b":0,"g":0,"r":0},"gamma":{"b":0,"g":0,"r":0},"highlights":0,"hslHue":0,"hslLightness":0,"hslSaturation":0,"hue":0,"lensCorrection":true,"lensStrength":0.5,"lift":{"b":0,"g":0,"r":0},"saturation":0,"shadows":0,"sharpen":0,"stabilization":false,"temperature":0,"tint":0}
- PASS [M-ASS] Captions panel opens
- PASS [M-ASS] import confirms the file ("Imported test.ass.")
- PASS [M-ASS] import creates 2 cues ("Manual captions (2)")
- PASS [M-ASS] importing .ass creates the "Hello world" cue — cues=["Hello world","Second line"]
- PASS [M-ASS] second .ass cue is "Second line" — cues=["Hello world","Second line"]
- PASS [M-ACCESS] keyboard focus shows a visible outline — BUTTON outline=solid 2px
- PASS [M-ACCESS] Export dialog has aria-modal="true"
- PASS [M-ACCESS] Shortcuts dialog has aria-modal="true"

Zero open bugs.
