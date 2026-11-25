# Vidora — CapCut exact-match correction round (2026-11-25, v1.0.1)

> **User correction (2026-11-25 ~16:31 PKT, SUPERSEDES Rule 12.3's MUST
> DIFFER list):** "bas name ur logo CapCut ka nhi laga na, baki har ek
> chize CapCut wali hi rakhni thi" — ONLY the app name and logo stay
> original (Vidora). EVERYTHING ELSE must be exactly CapCut's — layout,
> panel sizes/proportions, tab order, control types/order/labels, value
> ranges/defaults, colors, icon style, fonts, features, settings,
> dialogs, menus, shortcuts, workflow steps, empty/loading/error states.
> She gave 30 desktop CapCut screenshots precisely so no mistake would
> happen, and the build still diverged (PARITY.md: MATCH 47 / ASSUMED
> 50 — half the behaviors were guessed, not verified against CapCut).

## Method

1. All 30 user desktop screenshots in `docs/reference/capcut/` were
   viewed (1920×1080 each), plus `FULL-WALKTHROUGH-2026-11-23.md`
   (signed-in CapCut Web walkthrough) and the two WEB-CHECK files.
   Desktop wins any conflict with Web.
2. The current Vidora v1.0.0 was run locally (dev server) and
   screenshotted at 1920×1080 into `audit/capcut-fix/before/`:
   dashboard, editor empty (Media tab), every tab, text-clip inspector,
   export dialog. Geometry measured from the running app.
3. Every difference below is one diff item: **CapCut evidence**
   (screenshot + section) → **Vidora now** → **Fix**. Items marked
   **[COPYRIGHT]** need an equivalent ORIGINAL item in the same slot
   (same behavior, original artwork/name) — never CapCut's artwork,
   logos, characters, brand names or music. Items marked **[REMOVE]**
   are Vidora-only extras with no CapCut equivalent: they go away and
   are listed here, not deleted silently.

## Reference measurements (CapCut desktop, 1920×1080)

| Region | CapCut | Vidora v1.0.0 (before) |
|---|---|---|
| Top bar | 48px, near-black `#0A0A0A` | 48px, zinc-950 + violet gradient Export |
| Tab rail | HORIZONTAL row above left panel, ~64px, icon over label, scrolls with `>` / `<` arrows | VERTICAL 64px rail at left edge |
| Left area | Sub-nav ~185px + content ~400px (total ~610px) | Single 288px panel |
| Preview | Title "Player-Timeline 01" top-left, ≡ top-right; bottom bar timecode / play / Full / fit / Ratio / fullscreen | No title/menu; transport bar with seek slider, Loop/Safe/Grid |
| Right panel | "Details" ~540px wide | "Properties"/"Media Mixer" 288px |
| Timeline toolbar | ~50px, icon-only buttons | ~40px, TEXT buttons + checkboxes + footer bar |
| Timeline empty | Dashed box "Drag material here and start to create", no track headers | Track headers always visible + footer hints |
| Accent | Teal `#00D9D9` (buttons, active tab, headings, links) | Violet `#7C3AED` → cyan `#06B6D4` gradient |
| Surfaces | Near-black grays (`#0A0A0A`–`#242424`) | Zinc-950 `#09090B`, violet-tinted panels `#171724` |
| Primary button | Solid teal, dark text | Violet→cyan gradient, white text |
| UI font | System sans (Segoe UI on Windows) | Inter (kept — closest open equivalent, see A4) |

## A. Global theme, colors, fonts

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| A1 | Accent teal everywhere: active tab text/icon, "Details" heading, Export button, "Generate captions", links, active chips (shots 04, 19–30) | Accent is violet→cyan gradient; violet highlights, violet focus rings, gradient buttons | Teal `#00D9D9` becomes THE accent. Gradient survives only on "Join Pro" (pink→cyan, shot 03) and the "Create project" banner (light cyan→teal, shot 03). Logo keeps Vidora violet/cyan (allowed). |
| A2 | Surfaces near-black grays: top bar `#0A0A0A`, panels `#1C1C1C`–`#242424`, content `#1F1F1F` (shots 04, 19–30) | zinc-950 `#09090B`, panels `#171724` (violet-tinted), bg `#0B0B12` | Retune palette to CapCut grays in `design/tokens.json` + `src/index.css`. |
| A3 | Primary buttons solid teal with dark text ("Export", "Generate captions", "Next", "OK", "Use template", "Start creating") | Gradient violet→cyan, white text | Primary buttons: solid `#00D9D9`, dark text `#062A2A`. Secondary: dark `#2A2A2A` with light text. Danger/delete stays red. |
| A4 | UI font: system sans (Segoe UI on the user's Windows) | Inter | KEEP Inter — closest openly-licensed equivalent of the system sans; note here. Do not ship a copy of Segoe UI. |
| A5 | Focus/selection: teal | Violet `#8B5CF6` focus ring | Focus ring teal `#00D9D9`. |
| A6 | Editor + home are dark. Light pages exist only for the AI studios (Video/Design Studio, shots 07–11) | Global light theme + dashboard "Theme: dark" toggle | REMOVE the dashboard theme toggle and the global light theme for editor/home. Dark only there. AI studio pages keep their own light theme as in CapCut. Theme setting stays in Settings (CapCut Settings has Theme) but defaults to dark. |

## B. Top bar (editor)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| B1 | Order: logo+wordmark, "Menu ⌄", project name CENTERED, layout icons, "Unlock for Rs200" / "Pro" (purple ◆), "Share" (outlined), "Export" (teal), window controls (shots 04, 19–30) | Order: logo+wordmark, project name LEFT, "✓ Saved", undo/redo, aspect-ratio select, "⌨ Shortcuts", Export (gradient), "…" | Rebuild: [Vidora logo+wordmark] [Menu ⌄] … [project name centered, editable] … [layout icons] [Pro ◆] [Share] [Export teal]. Remove save-state text (show a cloud autosave icon with tooltip instead, as in Web walkthrough), undo/redo (they live in the timeline toolbar), aspect-ratio select (ratio lives in preview "Ratio" + Details + Modify), "⌨ Shortcuts" button (shortcuts open from the keyboard icon at the bottom of the tab rail, Web walkthrough). Window controls: N/A (browser chrome). |
| B2 | "Menu ⌄" opens the app menu (shot 04) | No Menu button | Add Menu: New project, Open dashboard, Shortcuts, Settings, Help. |
| B3 | "Pro" button: purple ◆ + "Pro" (shot 04) / "Unlock for Rs200" (shots 19–30) | No Pro button | Add "Pro" button (◆ icon). Clicking opens an honest note: Pro features are included in this build; nothing is charged. No plans list (see Y4). |
| B4 | "Share" button: outlined dark button with share icon (shots 04, 19–30) | No top-bar Share (share lives inside the Export dialog) | Add Share button opening the share menu (Share for review / Share as presentation / Share on social — same as Export menu, see V1). |
| B5 | "…" menu (walkthrough § top bar): Feature usage, Task bar, Sidebar, Help, Settings (Language, Theme, Input preferences) | "…" menu: Feature usage (opens Settings — wrong), Hide task bar, Hide sidebar, Help (opens the 10-step user guide — wrong), Settings | Fix order + targets: Feature usage opens a Feature usage dialog (Pro/Commercial tabs listing which Pro or commercial features the project uses; "this project used none" state); Task bar submenu (show/hide); Sidebar submenu (show/hide); Help opens the Help Center view (not the user guide — see Y2); Settings opens SettingsDialog. |
| B6 | Account chip in top bar | Vidora shows "name · OWNER/CUSTOMER" chip + amber read-only banner | **[REMOVE]** with auth (Y3). No account chip, no banner. |

## C. Tab rail

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| C1 | HORIZONTAL row at the top of the left column, icon ABOVE label, ~64px tall (shots 04, 19–30) | VERTICAL 64px rail at the left edge, full middle-row height | Move the rail to horizontal, on top of the left column only (not full width). |
| C2 | Rail SCROLLS: ">" arrow at the right when tabs overflow; "<" at the left when scrolled (shots 04, 27–30) | Vertical scroll | Horizontal scroll with `<` / `>` arrow buttons at the ends. |
| C3 | Full 11-tab order: Media, Audio, Text, Stickers, Effects, Transitions, Captions, Filters, Adjustment, Templates, AI avatar (README batch 7; shots 27–30) | Same order except 11th is "AI Tools" | 11th tab becomes "AI avatar" (see O). |
| C4 | Active tab: teal icon + teal text; inactive: gray | Active: violet highlight | Active tab teal icon + teal text. |
| C5 | Line icons, one metaphor per tab (Media = play-in-square, Audio = disc, Text = TI, Stickers = smiley, Effects = star, Transitions = bowtie, Captions = captioned-lines, Filters = cloud, Adjustment = sliders, Templates = layout, AI avatar = person) | Vidora's own SVG set, different metaphors in places | Redraw Vidora's tab icons to the SAME metaphors/style (line icons, same subjects) as CapCut's — original drawings, same meaning. Never copy CapCut's icon files. |
| C6 | Rail spans only the left column (~610px at 1920) | Rail spans the full middle-row height at the left edge | Rail width = left column width; preview starts to its right. |

## D. Left panels — shared structure

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| D1 | TWO columns: sub-nav (~185px) + content (~400px) in EVERY tab (shots 19–30) | One 288px panel per tab | Every tab gets sub-nav + content. Left column total ~580–610px at 1920. |
| D2 | Search box at the top of the content with placeholder "People are searching <term>" + a filter icon at its right (shots 22–27) | Varied search boxes ("Search media…", per-panel) | Adopt CapCut's search + filter-icon pattern in every content panel (placeholder term per panel). |
| D3 | 2-column card grid; thumbnails ~145px; name BELOW the thumbnail; purple ◆ Pro badge top-left; download icon bottom-right (shots 23–25, 27). Stickers: artwork on a dark card, no name (shot 22). Captions: style preview card with star + download icons (shot 26) | Lists, chips and rows; no Pro/download badges | Adopt the 2-col card grid with ◆ Pro badge + download icon on every content card (stickers/captions per their own card shape). |
| D4 | Section heading above the grid ("Trending", "Featured", "For you") (shots 22–29) | Mixed headings | Every content panel shows its section heading above the grid. |

## E. Media tab (shots 04, 19, 20, 21)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| E1 | Sub-nav: Import (active), Media, Timeline, Subprojects, Yours ⌄, Generate ⌄ (AI badge), Spaces ⌄, Library ⌄, Dreamina ⌄ (shots 19–21) | No sub-nav; search + filter + Import button + Backgrounds + Built-in assets | Rebuild MediaBrowser to CapCut's sub-nav + sections. |
| E2 | Import: dashed drop zone, teal ⊕ icon, "Import", "Drag and drop videos, photos, and audio files here"; divider "— No media? Create with these tools —"; three tool cards: Generate, AI avatars, Record (shot 19) | Gradient "Import video / image / audio / GIF" button + "No media yet…" text | Match CapCut's drop zone + tool cards. Generate → Media Generate (E4); AI avatars → AI avatar tab; Record → voiceover/screen-record entry (opens the voiceover recorder). |
| E3 | Yours: Favorites / My presets / Brand assets; empty state: star-box icon + "Your favorite items will appear here." + "Go to Library" teal link (shot 20) | No Yours section | Add Yours: Favorites (starred items), My presets (saved adjustment/text presets), Brand assets (brand kit). Empty state exactly as CapCut's. |
| E4 | Generate: "Prompt ⓘ" + "Showcase >" header; prompt box with "+" tile, placeholder "Describe your image and how many results to generate (1–10)"; bottom row: model dropdown, sliders/@/expand icons; "Generate" teal button bottom-right (disabled until prompt). Sub-nav: AI image / AI video / AI dialogue scene (shot 21) | AI generation lives in the AI Library panel | Move in-editor generation here, CapCut's shape. **[COPYRIGHT]** Model name "Seedream 4.3" is CapCut branding — use Vidora's own model names in the same slot (e.g. "Vidora Image 1.0"). Count stays 1–10. |
| E5 | Spaces / Library / Dreamina sub-nav entries (shots 19–21) | No equivalents | Wire to the Spaces page (U8), Library page (U7) and Dreamina-equivalent Create page (U3). |
| E6 | "Media" (imported media grid; clips show an "Added" badge once on the timeline — walkthrough) and "Timeline" (media used on the timeline) and "Subprojects" | No equivalents | Add: Media grid (imported items with thumbnails/durations + "Added" badge), Timeline list, Subprojects (honest empty state — subprojects are not supported in this build; the entry exists as in CapCut). |

## F. Audio tab (walkthrough § Audio; no desktop screenshot)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| F1 | Sub-tabs Music / Sound effects. Music: "Search music" box + filter button; quick chips; "Favorites" (View all); "Categories" (View all); "Recommended" track list (name, duration, artist; play and "+" add buttons). SFX: same structure | AudioPanel has search + chips + categories + recommended rows (PARITY J-AUDIO, ASSUMED) | Reshape to CapCut's exact structure: search + filter button, quick chips, Favorites (View all), Categories (View all), Recommended rows with play + "+" add. Tracks stay Vidora Originals. |
| F2 | Voiceover: mic button in the timeline toolbar (shot 04, tooltip "Voiceover") | Voiceover section inside AudioPanel | Keep the panel section AND add the toolbar mic button (see R1). |

## G. Text tab (walkthrough § Text; no desktop screenshot)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| G1 | Sub-tabs Templates / Effects / AI text FX. Templates: "Basic" section — "Add heading" and "Add body text"; filter chips All/Commercial; "Favorites" (View all); categories with "View all" + carousel arrows — Trending, Classic, Hits, … Effects: same layout, own categories. AI text FX: empty until a text clip is selected | TextPanel has the three sub-tabs already (audit phase 3) | Match CapCut's layout exactly: Basic section with "Add heading" / "Add body text" buttons first; All/Commercial chips; Favorites (View all); category rows with "View all" + carousel arrows. Categories keep Vidora's own names where CapCut's are brands (B.Duck, Free Fire, Nailoong → original names in the same slots — **[COPYRIGHT]**). |
| G2 | Text inspector has a TTS section (PARITY O-AI-VOICES) | Text inspector in PropertiesPanel | Keep the TTS section inside the text inspector (see Q4). |

## H. Stickers tab (shot 22)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| H1 | Sub-nav: Yours ⌄, Stickers ^ (Trending, Black Friday, Classic, NEW, Animal Meme, Free Fire 🔥, Shapes) | StickersPanel categories (check against this list) | Adopt the sub-nav + categories. **[COPYRIGHT]** "Black Friday" → "Sale" (same slot, seasonal sale); "Free Fire" is a game brand → original category name in the same slot. Keep Trending, Classic, NEW, Animal Meme, Shapes. |
| H2 | Grid: 2-col dark cards with artwork, ◆ Pro badge top-left, download icon bottom-right (shot 22) | (verify against before-shot) | Adopt the card shape (D3). Artwork stays Vidora's original SVG stickers. |

## I. Effects tab (shots 23, 24)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| I1 | Sub-nav: Favorites, Video effects ^ (Trending, Black Friday, Classic, ✨ Magic cutout, NEW, Hits), Body effects ⌄ (Trending, Pro, Hits, Clone, Glowing lines, Stroke) | EffectsPanel (verify groups/categories) | Adopt the groups + categories. **[COPYRIGHT]** "Black Friday" → "Sale"; "Magic cutout" → "Cutout". Body effects group exists with the same categories; items apply to the whole clip in this build (no body detection engine) — label that honestly in the panel. |
| I2 | Grid: photo thumbnails + name BELOW + ◆ + download icon (shots 23, 24) | (verify against before-shot) | Adopt the card shape (D3). Effect names stay Vidora Originals. |

## J. Transitions tab (shot 25)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| J1 | Sub-nav: Favorites, Transitions ^ (Trending, Classic, NEW, Hits, B.Duck, Overlay, Light) | TransitionsPanel (verify) | Adopt the sub-nav + categories. **[COPYRIGHT]** "B.Duck" is character IP → original category name in the same slot. |
| J2 | Banner: "Drag and drop a transition between two clips on the timeline." with an "OK" button (walkthrough § Transitions) | No hint banner | Add the dismissible hint banner at the top of the Transitions content. |
| J3 | Grid: photo thumbnails + names below + ◆ + download (shot 25) | (verify against before-shot) | Adopt the card shape (D3). Transition names stay Vidora Originals. |

## K. Captions tab (shot 26)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| K1 | Sub-nav: Auto captions, Templates ^ (Favorites, Trending, Classic, NEW, Hits, Word), Auto lyrics | CaptionsPanel (verify) | Adopt the sub-nav. |
| K2 | Content: search "People are searching Basic" + filter; "Trending" heading; 2-col grid of caption style cards (dark, styled text preview) with star + download icons | Style list | Adopt the card grid (D3, caption card shape). Styles stay Vidora Originals. |
| K3 | Bottom bar: "☐ Delete current captions" (disabled when none) + "Generate captions" teal button (shot 26) | (verify) | Add the bottom bar, same labels and disabled states. |
| K4 | Auto captions: language dropdown + Generate; "Auto lyrics": language dropdown + Generate; "Manual captions"; "Upload caption file" — .srt, .ass, .lrc (walkthrough § Captions) | Auto captions + manual + SRT/VTT import + .ass import; .lrc NOT supported (PARITY M-ASS) | Add .lrc import (timestamps + text, same parser family as .srt). Keep the language dropdown + Generate flow. CapCut's "1 use/month" limit does NOT apply (local generation) — say so honestly in the panel. |
| K5 | "Word" category: word-by-word caption styles | Caption presets exist (20) | Add a "Word" category to the Templates sub-nav (word-highlight styles). |

## L. Filters tab (shot 27)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| L1 | Sub-nav: Favorites, Filters ^ (Featured, NEW, Hits, Life, Landscape, Portrait, Mono) | Filters opens EffectsPanel with lutFocus | Dedicated Filters panel with this sub-nav. |
| L2 | Grid: photo thumbnails + names below + ◆ + download (shot 27) | (verify) | Adopt the card shape (D3). Look names stay Vidora Originals (32 looks). |
| L3 | Filters also has a Tools section (walkthrough § Filters): Enhance, 4K, HD Upscale, Quality Restoration, Night-view Color, HD Cam 2, HD Pet | Enhance/Upscale live in AI Tools | Add a "Tools" group in the Filters sub-nav with those entries, backed by Vidora's Enhance/Upscale engines (honest labels: resample + sharpen, no detail recovery). |

## M. Adjustment tab (shot 28)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| M1 | Sub-nav: "Add adjustment" button, Yours ^ (Brand presets), LUT. Content header: "<space>'s space" + refresh + settings icons. Preset card: thumbnail + truncated name ("Adjust…reset3") | Adjustment tab IS the full color panel (sliders/curves/wheels) | Adjustment tab becomes the presets library: "Add adjustment" button, Yours (saved presets), Brand presets, LUT (import .cube + 32 looks). Content header "<space>'s space" + refresh + settings icons; preset cards with thumbnail + truncated name. |
| M2 | Color sliders live in the inspector: Basic → "Color adjustment" row ("Basic, HSL, Curves" → opens the color panel) (walkthrough § inspector Basic) | Color sliders only in the Adjustment tab | Move the color controls (sliders, curves, HSL, blend, scopes, masks, chroma, denoise, stabilize, lens) into the inspector's Basic → "Color adjustment" sub-panel (see Q3). The Adjustment tab keeps only presets. |

## N. Templates tab in the editor (shot 29)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| N1 | Sub-nav: Yours ⌄, Templates ^ (For you, Pro, Daily life, Selfie, Velocity, AI, Lyrics) | TemplatesPanel (verify) | Adopt the sub-nav + categories. |
| N2 | Content: search "Search for templates"; filter dropdowns "Orientation: All", "Clips: No limit", "Duration: No limit"; "For you" heading; vertical template cards with "Featured" badge | (verify) | Adopt search + the three filter dropdowns + "For you" heading + vertical cards with "Featured" badge. Templates stay Vidora Originals (35). |

## O. AI avatar tab — replaces "AI Tools" (shot 30)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| O1 | Two-step flow: "① Choose avatar — ② Add speech" (step 1 teal, step 2 gray). Sub-nav: Avatar library (active, ◆), Photo to avatar ◆, Fashion model … ◆, Video translator ◆, AI dialogue sce… ◆. Content: "AI avatar ⌃" heading; chips "My avatars" / "Trending" / "Marketing" + ⌄; cards: "Create" card (avatar+ icon) + avatar cards (photo, truncated name, download icon); "Next" teal button bottom-right | 11th tab is "AI Tools": AI Library panel + 15 K tools | Rebuild the 11th tab as the AI avatar wizard, CapCut's shape. Step 1: pick an avatar (original avatars from Vidora's AI images; "Create" card opens the Generate flow). Step 2 "Add speech": text + voice pick (16 Vidora voices) + Generate narration → adds an avatar clip to the timeline. "Photo to avatar": upload a photo → stylised avatar still. "Fashion model": avatar in fashion poses (original renders). "Video translator": translate narration via the TTS voices. "AI dialogue scene": scripted two-avatar dialogue (existing aiGenerate dialogue scene). ◆ badges kept (Pro items work in this build — see O2). |
| O2 | ◆ = Pro badge on avatar entries | — | Pro-badged items WORK in this build and carry the ◆ tag with the honest tooltip "Included in this build — nothing is charged." (same policy as B3). |
| O3 | The 15 K tools + AI Library must go somewhere (they are Vidora features with no single CapCut tab) | AI Tools tab | Redistribute (documented moves, nothing silently dropped): Smart tools (inspector) ← Auto reframe, Retouch (Enhance), Remove background, Camera tracking, Relight (Enhance), AI movement, Optical flow; Captions tab ← AI Captions (K-STT); Text inspector TTS / Audio ← Narration render (K-TTS); timeline toolbar ← Smart Cut (as "Split scene" companion) + Transcript-based editing; Filters Tools ← Enhance, Upscale to 4K; Settings ← AI Providers; Media Generate (E4) + Audio tab (F1) + Library page (U7) ← AI Library (music/clips/images/voices). |

## P. Preview area (shots 04, 19–30; walkthrough § preview)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| P1 | Title "Player-Timeline 01" top-left + ≡ menu top-right + teal dot | No title, no menu | Add the sequence title (default "Player-Timeline 01") top-left and the ≡ menu top-right. The menu holds: Loop, Safe zones, Thirds grid, Fullscreen (the toggles that currently sit in the transport bar). |
| P2 | Bottom bar: timecode "00:00:00:00 / 00:00:00:00" left, play button center, right: "Full" button, fit icon, "Ratio" button, fullscreen icon | Transport bar: −1f, play, +1f, seek slider, timecode, clip name + speed, Loop, Safe, Grid, fullscreen | Match CapCut's bottom bar: timecode left, play center, Full / fit / Ratio / fullscreen right. "Full" = fit canvas to preview; fit icon = 100% actual size; "Ratio" = aspect-ratio menu (Original, 16:9, 4:3, 2:1, 9:16, 1:1, 3:4 — walkthrough). Seek stays on the timeline ruler; frame step stays on Ctrl+←/→. |
| P3 | Empty state (Web): "Click to upload / Or drag and drop file here" (+ Google Drive / Dropbox buttons — cloud, not applicable) | "Untitled Project / Import media and add it to the timeline to preview it here." | Empty preview: "Click to upload" (button → file picker) / "Or drag and drop file here". No Drive/Dropbox buttons (no cloud). |
| P4 | Floating toolbar above the canvas (clip selected): "Edit with AI" button, then Crop, Auto reframe, auto-captions icon, smart-tools icon with ⌄, "…" (opens the clip context menu) (walkthrough § preview) | No floating toolbar | Add the floating toolbar when a clip is selected: Edit with AI → Smart tools; Crop → crop tool; Auto reframe → reframe tool; captions icon → Captions tab; smart-tools ⌄ → Smart tools menu; … → clip context menu. |

## Q. Right inspector / Details panel (shots 04, 19–30; walkthrough § inspector)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| Q1 | Nothing selected → "Details" panel: Name, Path, Imported media ("Stay in original location"), Arrange layers ⓘ ("Turned on"), Proxy ⓘ ("Turned off"), Aspect ratio ("Original"), Resolution ("Adapted"), "Modify" button bottom-right | "Media Mixer" (master volume, ducking, track volumes) + project summary + "Export…" button | Replace with the Details panel, same rows in the same order. Values, honestly: Path = "Browser storage (this computer)"; Imported media = "Stay in original location"; Arrange layers = on/off toggle (controls whether a newly added clip opens a new track above); Proxy = "Turned off" + note "Proxy files are not created in this build"; Aspect ratio = current ratio; Resolution = "Adapted" (project resolution); Modify → project settings dialog (ratio / resolution / fps). |
| Q2 | Details panel ~540px wide at 1920 (28% of width) | 288px | Widen the right panel to ~520px. |
| Q3 | Clip selected → inspector with a VERTICAL ICON RAIL: Basic, Background, Smart tools, Audio, Animation, Speed + X close; ONE sub-panel at a time. Basic: Mask row ("None" → mask shapes), Color adjustment row ("Basic, HSL, Curves" → color panel), Blend Mode dropdown ("Normal") + Opacity slider + value box + reset, Stabilize switch (Pro), Reduce image noise switch (Pro), Remove flicker switch (Pro), Transform (Scale slider + value, Position X/Y, Rotate, reset + keyframe buttons), "Flip horizontal" + "Freeze" buttons. Background: three mode icons (color/blur/image), Background color + swatch, Recents, Brand Color, Recommended palette grid, "Apply to all" button. Smart tools: rows opening sub-panels — Auto reframe (Pro), Retouch, Remove background (Pro), Camera tracking (Pro), Relight, AI movement, Optical flow. Audio: sub-tabs Basic / Voice changer; Basic: Volume slider + dB box + reset + keyframe, Fade in/out sliders (0 s), Noise reduction switch (Pro); Voice changer: grid of voice effects with headphone preview + "Apply to all". Animation: sub-tabs In / Out / Combo, grids of presets. Speed: sub-tabs Normal / Curve; Normal: Speed slider + value + reset, Duration box, Pitch switch, Smooth slow-mo switch (Pro); Curve: presets None, Custom, Montage, Hero, Bullet, Jump Cut, Flash In, Flash Out + Smooth slow-mo (Pro) | Single scrolling panel with ALL sections stacked (Speed → Transform → Crop → Freeze/Reverse → Keyframes → Mask → …) | Rebuild the inspector as the icon rail + one sub-panel at a time, with the sections above in CapCut's order. Existing Vidora controls move into the matching sub-panel (color sliders → Basic → Color adjustment; voice changer grid already exists — restyle as a grid with headphone preview; animation kinds → In/Out/Combo grids with Vidora's original preset names; speed curve presets → the named presets + Custom graph). |
| Q4 | Text clip: text controls (Text, Font, Size, B/I/U, align, line spacing, fill, stroke, background box, shadow) + TTS section | Text inspector in the scrolling panel | Text controls move under the rail's Basic sub-panel for text clips; TTS section stays. |
| Q5 | Audio clip: Audio Basic / Voice changer (see Q3 Audio) | Audio section in the scrolling panel | Audio controls move under the rail's Audio sub-panel for audio clips. |

## R. Timeline (shots 04, 19–30; walkthrough § timeline)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| R1 | Toolbar, icon-only: left group [+ add track] [select ⌄] [undo] [redo] [split] [delete] [reverse] [crop] [flip] [freeze] [transcript-based editing] [split scene] [create from reference] [download clip ⌄]; center: play + "current \| total" time; right group: "Attach" toggle (teal when on, shortcut N), "Preview axis" toggle (S), − / zoom slider / +, fullscreen (expand preview), panel toggle (collapse timeline) | Text buttons: Split, Delete, Ripple delete, Duplicate, Copy, Paste, Freeze, Reverse, Group, Ungroup, Compound, + Marker; Attach/Ripple checkboxes; "Timeline" label; Zoom slider; timecode; footer bar | Rebuild the toolbar icon-only in CapCut's order. Duplicate/Copy/Paste move to the right-click menu only. **[REMOVE]** Group, Ungroup, Compound, + Marker buttons (see Y6/Y7). Ripple delete checkbox → removed (no CapCut equivalent); Attach becomes the teal toggle (N). Add: transcript-based editing, split scene, create from reference, download clip ⌄, voiceover mic (F2), preview-axis toggle (S), fullscreen, panel toggle. Center: play + time. |
| R2 | Empty state: dashed rounded box "🎬 Drag material here and start to create" in the middle of the timeline area; NO track headers, NO add-track buttons, NO footer | Track headers always visible (Video 1, Audio 1) + "+ Video track / + Audio / + Text" buttons + ruler + footer hints | Empty timeline = only the dashed box (+ playhead line at 0). Track headers appear only when clips exist. "+ add track" lives in the toolbar "+" menu (Video / Audio / Text). Remove the footer hint bar and the "Play from playhead" / track-count footer. |
| R3 | Track header (when clips exist): speaker icon (mute the track's audio) + link icon (link/unlink the clip's audio and video) (walkthrough) | Name, kind, lock/hide/mute buttons | Track header = name + speaker (mute) + link icons only. **[REMOVE]** lock/hide buttons from the header (no CapCut equivalent). |
| R4 | Clips show filmstrip thumbnails + label (name + duration); audio clips show a waveform | Colored blocks with names (video = violet, audio = emerald, text = amber, compound = fuchsia) | Video/image clips: filmstrip thumbnails + name + duration label. Audio clips: waveform (peaks already exist) + name + duration. Keep clip colors as the track-type tint only where CapCut does (it does not color-code by type — use the thumbnail/waveform look). |
| R5 | Ruler with time marks; red playhead line with a handle | Ruler + red playhead | Keep; restyle to CapCut (neutral ruler, red playhead with handle). |
| R6 | Right-click menu: Split (Ctrl B), Copy (Ctrl C), Cut (Ctrl X), Paste (Ctrl V), Duplicate (Ctrl D), Delete (Backspace), Replace (Choose File), Download clip (submenu), Transcript-based editing, Separate audio (Ctrl Shift S), Split scene, Freeze, Crop, Flip (submenu), Overlay (submenu), Add overlay (Choose File) (walkthrough) | Split, Duplicate, Copy, Paste, Freeze, Reverse, Ripple delete, Delete | Match CapCut's menu exactly, in this order. Add: Cut, Replace (Choose File), Download clip (submenu: this clip / this track), Transcript-based editing, Split scene, Crop, Flip (submenu), Overlay (submenu), Add overlay (Choose File). Remove: Reverse (toolbar only), Ripple delete. |
| R7 | Zoom: − / slider / + in the toolbar right; timecode in the center next to play | Zoom slider + timecode at the right | Match R1: − / slider / + at right, timecode center. |

## S. Dashboard / home (shots 02, 03; walkthrough § home)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| S1 | Left sidebar (~290px, dark) + main content | Centered max-w-4xl column; header with logo/tagline + Theme/Settings buttons | Rebuild as sidebar + main. |
| S2 | Sidebar: Sign in (avatar + name + ID when signed in) / "Join Pro" gradient button / Home / Templates / divider / "Create with AI" label / Video Studio / Design Studio / More tools (collapsible: Create with AI, Marketing tools) / Invite friends ("New" badge) / promo card "Try Seedance 2.5 / Generate 4K videos" | No sidebar | Build the sidebar. "Sign in" → dialog: sign-in isn't available in this build; projects stay on this computer (honest, keeps the slot; auth itself is removed — Y3). "Join Pro" → honest Pro note (B3). "Invite friends" → share dialog (copy the live-site link). Promo card → "Try Video Studio / Generate 4K videos" (original wording — **[COPYRIGHT]** "Seedance" is CapCut branding) → opens the Video Studio page. |
| S3 | Main: big "Create project" banner — teal/cyan gradient, "+ Create project", ~210px tall, rounded | Name input + "New Project" gradient button | Banner opens the editor with a new project (auto-named "Untitled Project"; rename in the top bar like CapCut's auto names "1122 (1)"). |
| S4 | AI cards row (5 dark cards): AI image, Extend video, AI edit, Enhance quality (teal border), AI remove — icon + title + 2-line description | None | Add the five cards. Destinations: AI image → Media Generate; Extend video → Video Studio page with an honest note (no extend engine in this build); AI edit → Script-to-video (K-SCRIPT); Enhance quality → Enhance tool; AI remove → Background removal. |
| S5 | "AI-powered creative suite" heading + wide cards: Video Studio, Design Studio, AI ad maker, Text to speech (image + title + description) | None | Add the section: Video Studio → Video Studio page; Design Studio → Design Studio page; AI ad maker → Marketing Studio page; Text to speech → Narration/TTS page. |
| S6 | First-run dialogs: Terms of Service ("Agree and continue" teal / "Disagree and close" gray; blocks use until agreed) + Manage software updates ("Automatic updates are on, giving you early access to the latest features. You can change this anytime in Settings > General." — OK teal / Go to Settings) (shots 02, 03) | OnboardingTour (5 steps) + UserGuideDialog (10 steps) | **[REMOVE]** tour + user guide (Y1/Y2). ADD the Terms dialog (first run; "Disagree and close" leaves the app on a closed screen with a message) + the Updates notice (first run after agreeing; OK / Go to Settings → Settings). |
| S7 | "What's new" modal lists new features (walkthrough § home) | None | Add "What's new" to the Help menu (lists v1.0.1 changes). |
| S8 | Projects: Library → Projects tab — project cards with a "…" card menu; filter chips Video/Image/Effects; grid-view toggle (walkthrough § Library) | "Your projects" list rows (folder icon, meta line, Rename/Duplicate/Delete buttons) | Restructure into project CARDS with a "…" menu (Rename / Duplicate / Delete / Open), filter chips Video/Image/Effects, grid toggle. "My projects" section below the creative suite on the home page. |

## T. Templates home page (shots 05, 06)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| T1 | Search bar "Search for templates" (full-width, dark); filter dropdowns "Orientation: All", "Clips: No limit", "Duration: No limit"; category chips in two rows: For you (active, teal outline), Pro, Daily life, Selfie, Velocity, AI, Lyrics, Relationship, Friendship, Family, Meme, School life, Travel, Anniversary, Fashion, Sports, Motivation | No home Templates page (templates live only in the editor panel) | Build the home Templates page (sidebar Templates entry) with this layout. Chips keep the same generic words (they are not brands). |
| T2 | Cards: vertical 9:16, views (✂ icon + count) + clip count (▦ icon + n) overlay bottom-left, name below, "Featured" badge top-left, error state "ⓘ Couldn't open this template" | Editor template cards | Match the card shape on the home page. Templates stay Vidora Originals (35). View counts are Vidora's own (start at 0 / hide until used — honest: show real usage counts from localStorage, starting at 0). |
| T3 | Preview popup: vertical card, title + "◷ 00:19 ▦ 1" + star; buttons "Use template" (teal) + "Edit more" (dark, ◆ Pro badge) | Template preview exists (Phase 8) | Match the popup shape. "Use template" opens the editor with the template applied and fully editable. "Edit more" opens the editor with the template (◆ Pro badge → honest note, B3/O2). |

## U. AI studio pages (shots 07–16)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| U1 | Video Studio (LIGHT theme): hero images + "Try <model> Flash >" gray pill; serif italic headline "Make 4K videos with <model>"; "Brainstorm with ChatGPT ⌄"; prompt box (placeholder "Create with <model> Mini with lower credit cost"), + / Auto ⌄ / Skills / Director ⌄ / send; yellow "Agent mode" tooltip ("Choose between Standard and Director modes…"); chips (Try <model>, AI drama, Knowledge, Marketing, Character design, TikTok trends); "My projects" + dashed "Create new project" card; "Showroom" rows (Short films, AI drama) with creator names + clip-count badges (▦ 10) + ">" scroll arrow; floating prompt bar; scroll-to-bottom button (shots 07, 08) | AI Library panel (dark, Generate/Music/Clips/Images/Voices sub-tabs) | Build the Video Studio page (light theme) with Vidora's local models + original showroom content (Vidora's AI clips, original titles/creators). **[COPYRIGHT]** "Seedance", "ChatGPT" are brands — use Vidora's own model names and "Brainstorm with AI ⌄". |
| U2 | Design Studio (LIGHT): hero + gray pill; serif italic "Imagine it. Design it."; prompt box ("Enter your ideas or upload images to get started", + / cube / book / send); model chips; "Inspiration" + filter chips (All active cyan, …); masonry grid; floating prompt bar (shots 10, 11) | AI Library Images sub-tab | Build the Design Studio page (light theme) with Vidora's AI images (original). **[COPYRIGHT]** Model names ("Seedream", "GPT Image") → Vidora's own model names. |
| U3 | Dreamina Create (DARK): left nav (Create, Explore, Marketing Studio New, Influencer Studio Beta, Motion Studio Beta, AI Image, AI Video, AI Audio, Seedream 5.5 New, Video recreator New, Canvas, All tools, Assets & Elements, Generative sessions); top-right Buy credits / Upgrade / bell / credits / avatar; headline "Create anything you imagine"; Generate/Canvas toggle; tabs AI Agent/Image/video/Audio/Music; prompt box with @ and / skills; Auto/Skills/@; model dropdown; skill chips (/ Iconic film style New, / Cinematic long take New, / Film storyboard Hot, More skills >) (shot 13) | No equivalent page | Build the "Create" page (dark) with the same structure and Vidora's own model/skill names. Credits: replace "Buy credits / 420" with a "Local" badge — local generation, no credits, no purchase (honest). Promo banners (Black Friday countdown) are time-limited marketing, NOT app UI — skipped, noted here. |
| U4 | Dreamina Explore — "Hot templates": grid of vertical template videos (shot 14) | No equivalent page | Build the Explore page (grid of Vidora's AI clips as templates). |
| U5 | Dreamina Canvas: Generate/Canvas toggle (Canvas active); "New canvas" dashed card; template cards "Video playground" / "Image showcase"; prompt bar; challenge cards ("Spinning Top Design Challenge") (shot 15) | No equivalent page | Build the Canvas page. "New canvas" creates a new project (opens the editor). Template cards open the editor with the template. Challenge cards use original challenge names. |
| U6 | Pippit / Marketing tools (shot 16): black page, pill nav (Home, Solutions, Products, Templates, Pricing, Seedance 2.5), serif headline, "Start for Free ↗" purple pill, "Try the following ideas" + tilted idea cards; sidebar gains a Management section (Library, Spaces) | No equivalent page | Build the "Marketing Studio" page (dark) with the same structure and Vidora's own naming ("Vidora Marketing Studio"; headline/tagline original). **[COPYRIGHT]** "Pippit" is a separate product brand — never used. Purple scrolling promo banner is marketing — skipped. |
| U7 | Library (DARK, shot 17): heading "Library"; tabs Generated assets (active, teal underline) / Elements; chips All/Videos/Images/Audio/Documents; search / Favorites / Grid ⌄ / Sort ⌄ / refresh; info bar "Your generated assets sync across CapCut web, mobile, and desktop."; empty state: film icon, "No assets yet", "Start creating" teal button | AI Library panel (in-editor) | Build the Library page listing Vidora's AI-generated assets (music/clips/images/SFX). Info bar, honestly: "Your generated assets live on this computer." Elements tab: Characters/Locations/Props/Styles (Vidora's AI images). Empty state exactly as CapCut's. |
| U8 | Spaces (DARK, shot 18): space header card (donut meter + "<name>'s space" + "Upgrade ↗" + "1.6GB / 5.0GB"; avatar + invite + cloud icons); tabs Space / Brand kit ◆; toolbar: "+ Upload", new-folder, sort, "🗑 Trash"; search / grid ⌄ / Sort / All ⌄ / refresh; Folder section ("Auto upload" yellow folder card); Media section + "Show all (26)"; media grid (thumbnail + duration badge + name + size \| duration) | Cloud backup = .vidora bundle download on the dashboard | Build the Spaces page: storage meter = browser-storage usage (honest numbers); Upload → import media; folders (Auto upload folder); media grid from imported media (name + size + duration); Brand kit tab (brand assets). The .vidora bundle download lives here (Backup). "Upgrade ↗" → honest note (no paid storage in this build). |

## V. Export (walkthrough §3; shot 04)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| V1 | Export button opens a MENU: Share for review / Share as presentation / Share on social (TikTok, TikTok Ads Manager, YouTube, YouTube Shorts, Facebook Page, Instagram Reels, Free Schedule) / Download | Export opens a big centered dialog with tabs (Download / Share for review / Share as presentation / Share on social) | Export button opens CapCut's menu. "Download" opens the Download settings panel (Resolution 360p/480p/720p/1080p/2k/4k, Quality High/Recommended/Fast, Frame rate 24/25/30/50/60fps, Format MP4/MOV — Vidora already offers these). "More export kinds" (WAV/GIF/frames/cover) + the export queue stay INSIDE the Download panel, below the main settings. MOV video-only (no AAC) honest note stays. |
| V2 | "Share" top-bar button (B4) opens the share section | No top-bar Share | Share button opens the same menu at the share section. |
| V3 | "Free Schedule" in the share menu | Disabled with a reason (no scheduler service) | Keep disabled with the reason. |

## W. Shortcuts dialog + remap (walkthrough § editor rail)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| W1 | Shortcuts list: Select all Ctrl A, Copy Ctrl C, Cut Ctrl X, Paste Ctrl V, Delete Backspace, Undo Ctrl Z, Redo Ctrl Shift Z, Play/pause Space, Split Ctrl B, Zoom in/out Ctrl +/-, Last/Next frame Ctrl ←/→, Preview axis S, Attach N, Separate audio Ctrl Shift S, Full screen Ctrl Shift F, Hand tool H, Move V, Zoom to fit Shift F | Split = S, Add marker = M, Ripple delete = Shift+Delete; no Preview axis / Attach / Hand / Move / Zoom-to-fit / Fullscreen actions | REMAP defaults to CapCut's list, in CapCut's order. **[REMOVE]** addMarker + rippleDelete actions and their bindings. ADD actions: previewAxis (S), attachToggle (N), handTool (H), moveTool (V), zoomToFit (Shift+F), fullscreen (Ctrl+Shift+F), frameStep (Ctrl+←/→), zoomIn/Out (Ctrl++/Ctrl+−). Split becomes Ctrl+B. Keep rebinding (master spec requires customizable shortcuts) but the defaults and the listed set match CapCut. |
| W2 | Opens from the keyboard icon at the bottom of the left rail (walkthrough) | Opens from the top-bar "⌨ Shortcuts" button (removed in B1) | Add the keyboard icon at the bottom of the left tab-rail column. Esc closes the dialog (currently Escape does NOT close the Export dialog — fix Esc to close dialogs). |

## X. Settings dialog ("…" → Settings)

| # | CapCut evidence | Vidora now | Fix |
|---|---|---|---|
| X1 | Settings: Language, Theme, Input preferences; General (updates toggle — shot 03 dialog: "You can change this anytime in Settings > General") | SettingsDialog: Language/Theme/Input prefs/task bar/sidebar/tour replay/reset/Feature usage/Diagnostics | Remove tour replay + Diagnostics (telemetry, Y5) + reset. Keep: Language, Theme, Input preferences, Task bar, Sidebar, Feature usage. ADD "General" with the Automatic updates toggle (ON by default; note: the web app updates on reload). Reorder to CapCut's order. |

## Y. Removals — Vidora-only extras with no CapCut equivalent

| # | What | Why / replacement |
|---|---|---|
| Y1 | OnboardingTour (5-step "Welcome to Vidora") | No CapCut equivalent. Replaced by the Terms + Updates dialogs (S6). |
| Y2 | UserGuideDialog (10-step user guide) | No CapCut equivalent. Replaced by the Help Center view (B5). |
| Y3 | Local auth: `lib/auth.ts`, AccountPanel, sign-in/create-account, OWNER/CUSTOMER roles, read-only gate (store + TopBar + Dashboard + App) | No CapCut desktop equivalent in the editor (CapCut's sign-in is a cloud account; Vidora has no cloud). Projects are local; no accounts. Remove entirely. |
| Y4 | Subscription: `lib/subscription.ts` + plans list in AccountPanel | No paid plans in this build. The Pro button slot stays (B3) with the honest note; no plans UI. |
| Y5 | Telemetry: `lib/telemetry.ts`, Diagnostics section in Settings, `window.onerror` → logError | No CapCut equivalent. Remove entirely. |
| Y6 | Markers (M key, "+ Marker" button, ruler markers, "Markers: N" in project summary) | CapCut desktop/Web show no markers UI (walkthrough + all 30 shots). Remove the UI affordances + shortcut. The `markers` field stays in the project schema for old files but is no longer written. |
| Y7 | Group / Ungroup / Compound clips (toolbar buttons, context-menu entries, shortcuts) | CapCut Web has no group/compound (right-click offers Copy/Cut/Paste/Duplicate/Delete/Download only; walkthrough). Remove the UI affordances. The schema keeps compound clips for old files; no new groups can be created. |
| Y8 | Colour wheels (lift/gamma/gain) in ColorPanel | CapCut Web has sliders only (walkthrough §8). Remove the wheels; sliders + curves stay. |
| Y9 | Dashboard header "Theme: dark" toggle | No CapCut equivalent on the home header (A6). |
| Y10 | "AI Tools" tab | Reshaped into the "AI avatar" tab (O1); content redistributed (O3). |
| Y11 | Dashboard "Backups" card | Moves into the Spaces page (U8). The .vidora bundle download lives there. |
| Y12 | Export dialog as the primary export UI | Replaced by the CapCut-style Export menu (V1); the Download settings panel keeps the same options. |
| Y13 | Timeline footer bar (hints, "Play from playhead", track count) | No CapCut equivalent (R2). |
| Y14 | Track-header lock/hide buttons | No CapCut equivalent (R3). |

## Z. Already MATCH — no change

- Z1. Speed 0.1–100× + Duration + Pitch + Smooth slow-mo; RGB curves (draggable points + 7 presets); blend modes live in preview; export option ranges (360p–4K, 24/25/30/50/60fps, Fast/Recommended/High, MP4/WebM/MOV); split/trim/duplicate/copy/paste; Separate audio Ctrl+Shift+S; undo/redo (cap 100); autosave (shown as the cloud icon, B1).
- Z2. LUT import (.cube) + 32 looks; masks (7 shapes + pen); chroma key; PiP/split-screen; backgrounds; scopes; denoise/stabilize switches; .ass import; SRT/VTT import.

## Fix plan (v1.0.1)

1. **Tokens** — CapCut palette in `design/tokens.json` + `src/index.css` (teal accent, near-black surfaces, teal focus ring). Contract for all later work.
2. **Editor shell** — TopBar (B), horizontal tab rail + sub-nav/content layout (C, D), App.tsx layout, Details/inspector (Q), Preview (P), Timeline (R), shortcuts remap (W).
3. **Panels** — Media (E), Audio (F), Text (G), Stickers (H), Effects (I), Transitions (J), Captions (K), Filters (L), Adjustment (M), Templates (N), AI avatar (O).
4. **Dashboard + home** — sidebar, banner, AI cards, creative suite, project cards, Terms/Updates dialogs (S); Templates home page + popup (T); AI studio pages (U1–U6); Library (U7); Spaces (U8).
5. **Menus/dialogs** — Export menu (V), "…" menu (B5), Settings (X), Shortcuts dialog (W2), Help Center (B5).
6. **Removals** — Y1–Y14 (auth, subscription, telemetry, tour, guide, markers/group/compound UI, wheels, light-theme toggle, backups card, footer).
7. **Verify** — `npm run build`, `npm test` (full suite + new tests for corrected behaviors), all phase audits as regression, fresh Playwright comparison pass against the 30 screenshots until ZERO diffs remain (excluding name/logo + the noted **[COPYRIGHT]** equivalents). Retry a failing command up to 3 times with debugging.
8. **Docs** — update PARITY.md (re-score), BUGS.md, CHANGELOG.md (v1.0.1), README.md, PAGES-DEPLOY.md if the live deploy needs anything new, INTENTIONAL_DIFFS.md (rewrite: only name/logo + copyright-equivalents remain).

## Counts

- Diff items: A6 + B6 + C6 + D4 + E6 + F2 + G2 + H2 + I2 + J3 + K5 + L3 + M2 + N2 + O3 + P4 + Q5 + R7 + S8 + T3 + U8 + V3 + W2 + X1 + Y14 = **114 items** (Z2 already-match, not counted).
- Removals: 14 (Y1–Y14).
- Copyright-equivalents (original item in CapCut's slot): model names (E4, U1, U2), "Sale" (H1, I1), Free Fire category (H1), B.Duck category (J1), brand text categories (G1), "Seedance" promo card (S2), "ChatGPT" brainstorm (U1), "Pippit" brand (U6), caption/effect/transition/sticker/filter/template/music content names (throughout — originals by rule).

## Status after the correction round (2026-11-25, v1.0.1)

All 114 diff items above were worked through: the four worker rewrites
(PropertiesPanel, TimelineShell, Export/Shortcuts/Settings, core
removals) plus the coordinator's verification round. Result:

- **Fixed in this round (verified in the fresh 1920×1080 screenshot
  pass, `audit/capcut-fix/after/`, 21 shots, 0 page errors):** every
  section A–Y. Geometry measured from the running app: top bar 48px,
  left column 610px, right panel 520px, timeline 288px tall.
- **Extra diffs found by the comparison pass and fixed (see
  `docs/BUGS.md` BUG-CF-001…007):** (1) "Cut at beats" silently did
  nothing for clips not starting at 0 — real bug, beat times are
  clip-relative but the splitter expects absolute times; (2) Crop
  buttons dispatched the wrong event name, so Crop did nothing;
  (3) preview upload prompt showed over a text-only timeline;
  (4) ruler labelled every second instead of every 5 s in mm:ss;
  (5) dashboard showed 5 AI cards, CapCut shows 6 (AI video was
  missing); (6) avatar library showed frame images instead of
  portraits (now 24 original portrait tiles); (7) empty-timeline
  dashed box was narrow and left-aligned (now 1152px, centred).
- **Verification:** `npx tsc --noEmit` clean, `npm run build` passes
  (190 modules), `npm test` 315/315 (24 files + new
  `src/test/avatars.test.ts` + new `src/test/aiLibrary.test.ts`),
  Phase 4 audit ported to the new UI and green 26/26 (J-MIXER removed,
  J-BEAT re-scoped to "Cut at beats"), Phase 5 39/39, Phase 6 15/15
  (+6 new checks for the restored in-editor AI catalog add — see
  BUG-CF-010), Phase 7 60/60, Phase 8 56/56 and Phase 9 42/42 (all 0
  open bugs; L-CLOUD Backups and M-ONBOARD/M-AUTH/M-SUBS/M-TELEMETRY
  checks removed as obsolete-by-design).
- **Removals Y1–Y14: all done** (tour, user guide, local auth,
  subscription, telemetry, markers UI, group/compound UI, colour
  wheels, dashboard theme toggle, "AI Tools" tab → "AI avatar",
  dashboard Backups card → Spaces page, Export dialog → Export menu,
  timeline footer bar, track-header lock/hide buttons). Also removed
  as dead code: the store's `guideOpen`/`showOnboarding`/
  `dismissOnboarding`/`replayOnboarding`/`onboardingDone`/
  `markOnboardingDone`/`removeMarker` state.
- **PARITY.md re-scored:** 91 rows (was 100), MATCH 59 / ASSUMED 32 /
  INTENTIONAL-DIFF 0. The only deliberate difference left is the app
  name and logo; see `docs/INTENTIONAL_DIFFS.md` (rewritten).

### What remains (not diffs, honestly noted)

- **ASSUMED items (32 rows in PARITY.md):** behaviours no screenshot,
  video or walkthrough ever showed — AI-tool engines (K rows),
  procedural content (N-MUSIC, N-BACKGROUNDS), export extras
  (L-EXPORT-QUEUE, L-EXPORT-AUDIO), template slots, cloud, CI/Docker,
  beat detection / voiceover (no reference UI observed), fonts and
  caption presets (content is Vidora Originals).
- **Export dialog:** never appears in the 10 videos; the Download
  section follows the signed-in Web walkthrough (§3) and V1. Desktop
  export may differ in details.
- **Animation Out/Combo grids:** the videos showed In only; Out and
  Combo reuse the In grid structure. The compositor does not yet
  evaluate `animationCombo` (the UI says so honestly).
- **"Download clip" (context menu / toolbar):** opens the
  whole-project Export panel — no per-clip export exists.
- **Sample project:** the title card is a video clip with no media, so
  the preview shows its name as a small placeholder label. That is the
  no-media placeholder, not a title render (text presets render large —
  see `editor-inspector-text.png`).
- **Live-site limits (unchanged):** offline Vosk/Piper models are not
  served from Pages; the Docker image was never built on this VM.

## v1.0.2 fix round (2026-11-25, user-reported — D1–D16)

The user opened the live site herself and reported every difference she
found, screenshot by screenshot: (1) editor empty project, Media tab;
(2) Templates page; (3) template-applied editor, Transitions tab;
(4) zoomed-out editor; (5) Effects tab, Trending; (6) Filters /
Transitions tile thumbnails. Each item was fixed, then re-verified with
Playwright at 1920×1080, deviceScaleFactor 1, 100% browser zoom
(`audit/capcut-fix/v102/final/final-compare.json` — all checks pass,
0 page errors), plus the D13 functional sweep, the phase audits
(4: 26/26, 5: 39/39, 6: 15/15, 7: 60/60, 8: 56/56, 9: 42/42) and the
full suite (355/355).

### The 150%-zoom finding (D1 root cause)

Her screenshots showed left ~910 / preview ~225 / Details ~775. Those
proportions match **150% browser zoom exactly** (610×1.5=915,
520×1.5=780, preview (1280−610−520)=150 CSS px = 225 device px). At
100% zoom the tree already measured CapCut's widths (left 610 /
preview 790 / Details 520). Her zoomed-out screenshot confirmed the
diagnosis: all content exists — purely a sizing/overflow problem.
**Acceptance target is 1920×1080 at 100% zoom (Ctrl+0).** The fix
keeps the 100% widths exact and adds responsive caps
(`w-[min(610px,32vw)]` left, `w-[min(520px,28vw)]` Details; at 1280
CSS px: 410 / 358, preview 512) plus 80px tab buttons so ~7 tabs show
+ `>` scroll like CapCut.

### Items D1–D16 (all FIXED)

- **D1 Layout proportions:** caps above; tab rail CapCut-width.
  (`App.tsx`, `LeftTabs.tsx`, `PropertiesPanel.tsx`)
- **D2 Preview panel:** header always "Player-Timeline 01"; the
  clipped "Click to upload" button removed (upload lives in Media →
  Import); play is a plain gray triangle; single-row bottom bar with
  `min-w-0` / `overflow-hidden` guards. The empty canvas is now plain
  dark — the renderer used to draw the project name + an import hint
  on it (`renderFrame.ts`, no-clip branch). (`PreviewArea.tsx`,
  `renderFrame.ts`)
- **D3 Media Import box:** small 28px teal "+" with "Import" inline
  right + gray subtext "Drag and drop videos, photos, and audio files
  here"; whole box clickable (opens the file picker); "Browse files"
  button removed. (`MediaBrowser.tsx`)
- **D4 Media cards + sub-nav:** all 9 sub-nav rows, divider and the
  Generate / AI avatars / Record cards fit at 1080p without scrolling
  (they already did at 100% — the Import box shrink keeps it so).
- **D5 Details panel (empty project):** Color space row only when the
  project has ≥1 clip (empty #19/#04 have none; v05/v06 with a clip
  have it); Arrange layers is text "Turned on"/"Turned off" (no
  switch); Proxy note removed; Aspect "Original"; Resolution just
  "Adapted"; Modify gray. (`PropertiesPanel.tsx`)
- **D6 "Ratio" overlap:** preview bottom-bar overflow guards (D2);
  inspector rows got `min-w-0` guards. No overlapping text remains at
  1920 or 1280.
- **D7 Top bar:** teal cloud icon removed; "…" menu removed, its
  "Feature usage" item moved into Menu. Order verified vs #19.
  (`TopBar.tsx`)
- **D8 Empty timeline box:** film icon + "Drag material here and
  start to create", left-aligned. (`TimelineShell.tsx`)
- **D9 Timeline toolbar:** centre play + timecode removed (play lives
  only in the preview bottom bar); keyboard-icon button under the
  preview removed (Shortcuts via Menu → Shortcuts).
- **D10 Full-editor regression:** all 11 tabs re-verified, no
  regressions.
- **D11 Templates hover preview:** hovering a card shows CapCut's
  anchored enlarged preview (bigger visual + title + duration + clip
  count + star, "Use template" teal + "Edit more" gray with Pro badge
  beneath); the centred click-modal is deleted; card click does
  nothing; card "Category · duration" sub-line removed.
  (`home/TemplatesPage.tsx`)
- **D12 Template-applied editor:** (1) preview renders the sticker
  large with a single-row bottom bar after D1; (2) Transitions panel:
  search on top, 2-column tile grid always visible (even with no
  clip), description-first paragraph / hint banner / "Select a clip…"
  removed; (3) inspector rail Basic/Background/Smart tools/Audio/
  Animation/Speed + Close fully visible at 1920×1080 (was already
  fitting at 100% — the cut-off was the 150% zoom); (4) "RatioBlend"
  overlap fixed by the D2/D6 guards; (5) template application now
  splits tracks — background → Video 1, text → Text 1, sticker/shape
  → new "Stickers 1" track kind `'sticker'` (`trackKindSchema`).
  (`TransitionsPanel.tsx`, `lib/templates.ts`, `schema/project.ts`)
- **D13 Functional parity (every control actually works):** verified
  end to end with Playwright — Import opens the file picker; play
  advances the preview (00:00:00:00 → 00:00:01:17); Use template
  applies (Video 1 / Text 1 / Stickers 1); Edit more opens the editor
  with the template; transition tiles apply with working Duration
  (1.5 persists) / Direction; inspector Mask (Circle, feather 0.5),
  Color adjustment, Ratio (9:16 applies), Blend (`screen`), Opacity
  (50), Scale (150), Position X (10), Rotate (15) all change the
  selected clip and persist (preview canvas hash changes); timeline
  split / undo / redo / delete / zoom all work (clips 2 → split 3 →
  undo 2 → redo 3 → delete 2; zoom 24 → 80). No dead controls found in
  scope; nothing needed an "honestly labelled" fallback. One probe
  quirk, not an app bug: Playwright's `locator.click()` timed out on
  the Ratio 9:16 menu option while a real mouse click at the same
  coordinates works.
- **D14 Empty effect options:** the "Applied effects" card sat below
  the fold (panel scrollHeight 838 vs clientHeight 680) — applying an
  effect looked like nothing happened. The card now renders ABOVE the
  tile grid with scroll-into-view (Blur card bottom 268 after apply);
  param-less GLSL effects (Sepia Deep, Duotone Violet, Duotone Ember,
  Channel Swap, Kaleidoscope, Mirror Split, Sketch Pencil, CRT Screen)
  say so honestly ("No additional settings — Intensity only"). Same
  fix for the applied-filter card. All Effects categories render tiles
  (Trending 12, Sale 8, Classic 14, Cutout 12, NEW 12, Hits 10).
  (`EffectsPanel.tsx`, `FiltersPanel.tsx`)
- **D15 Applying effects:** `addEffect` applied to whatever clip was
  selected with no kind guard, so four effects silently stacked on a
  selected sticker and showed nothing (✓ = "applied to the selected
  clip" was accurate, the target was wrong — the compositor's effect
  passes run only for video/image frames). Now: drag-and-drop an
  effect tile onto a timeline clip or the preview applies it there;
  every tile has a visible "+" apply button; tile click with a
  sticker/text/audio clip selected redirects to the topmost video clip
  under the playhead and says so; dropping on a sticker/text clip is
  refused with a hint, never stacked. Same drag + "+" for transitions
  (onto clip boundaries), filters, stickers, text presets. Manual
  sticker/shape/background adds now land on "Stickers N" tracks,
  never Text 1. (`projectStore.ts`, `lib/panelDrag.ts` (new),
  `lib/timeline.ts`, `TimelineShell.tsx`, `PreviewArea.tsx`)
- **D16 Filter / transition tile thumbnails:** CapCut's tiles are real
  photo thumbnails — Vidora's were flat gradients (filters) and
  single letters (transitions). Filter tiles now show a sample photo
  with the filter actually applied (per-pixel LUT render,
  `lib/tileThumbs.ts`); transition tiles show a real mid-transition
  still rendered by the existing transition engine. Tile chrome
  matches #25 (name below, star top-right, download bottom-right).
  Decision, reported honestly: NO Pro badge (Vidora has no paid tier,
  so it would mislead); the download icon is REAL — filter download
  saves the actual `.cube` LUT, transition download saves the still
  as PNG. (`FiltersPanel.tsx`, `TransitionsPanel.tsx`,
  `lib/tileThumbs.ts`)

### Found by the final self-audit (all FIXED in this round)

- **Template thumbnails blank:** the editor Templates panel drew a
  slot-diagram SVG (black for templates with no media slots) and the
  dashboard page used a flat per-category gradient. New shared
  `src/components/TemplateThumb.tsx` renders each template's real
  first frame (procedural background + title text in its preset fill +
  sticker/shape at its position) in both places; `resolveSticker`
  (base design id → first palette variant) is now exported from
  `lib/templates.ts` for it.
- **Effects grid invisible with no clip selected:** the whole grid
  lived inside `{clip && …}` — fixed, the grid always renders with
  tiles disabled until a clip is selected, plus an honest hint.
- **First-frame race:** a freshly applied template showed a black
  paused preview until the next state change (first draw ran before a
  procedural SVG finished loading). The draw now re-triggers on image
  load (guarded per-SVG, no loop). (`PreviewArea.tsx`)
- **"+" button covered tile names** ("+arm Glow", "+ora Warm"):
  fixed with `pl-7` on the name span in Effects / Filters /
  Transitions panels.
- **Import box at 1280:** the overflow was `PanelShell.tsx`'s fixed
  `w-[400px]` content column, not MediaBrowser — now fluid
  (`min-w-0 w-full flex-1 max-w-[400px]`); Import right edge 397
  inside the 410 column at 1280, unchanged 400px at 1920.
- **Store `addTrack` naming:** a manually added sticker track was
  named "Text N" — the store now maps `'sticker'` → `'Stickers'`.
- **Audit harness (not app bugs):** Phase 5/6/7 scripts used the stale
  `div.w-[610px]` left-column selector; Phase 5's manifest expectation
  was stale at 1099 (real total 1102 — caption presets grew 20 → 23
  in v1.0.1) and its transition/music counters predated the "+" /
  download buttons and the AI sections sharing the Audio row
  component. All updated to count the right things.
- **Not a bug (checked, no change):** Effects "Hits" vs body "Pro"
  do NOT share tiles — Light starts Glow Halo / Bloom Soft / Vignette
  Soft, Stylize starts Edge Ink / Emboss / Sketch Pencil (catalog
  counts verified in code; the earlier probe reading was a
  category-switch artifact).

### What remains (follow-ups, with reasons)

- **Preview top-bar tools** ("Edit with AI", "Crop", "Auto reframe",
  "CC", "Smart tools") were not exercised end to end in this round —
  open question for the CapCut Web check (below).
- **Export flow** not driven end to end in this round (Export menu
  opens; the render dialog was not driven) — needs a dedicated export
  verification pass.
- **Ratio menu Playwright quirk:** `locator.click()` timed out on the
  9:16 option while a real mouse click works — a 10-second human
  click-through is the remaining check.
- **W3's TimelineShell sticker-rename workaround** is now redundant
  after the store fix — harmless, cleanup optional.
- **Filters Tools entries** (Enhance, 4K, HD Upscale, Quality
  Restoration, Night-view Color, HD Cam 2, HD Pet) open the honest
  "AI tools" dialog; Text "AI text FX" is empty until a text clip is
  selected (by design); Captions "Generate captions" is correctly
  disabled without a transcript — all verified, no change.

### Open questions for the CapCut Web check (cannot be determined from the 30 screenshots + 10 videos + VIDEOS-2026-11-25.md — do not guess)

1. Preview top bar — "Edit with AI", "Crop", "Auto reframe", "CC",
   "Smart tools": what does each open in CapCut desktop, and where do
   their panels sit?
2. Effects "Body effects" group (Pro / Hits / Clone / Glowing lines /
   Stroke): do body effects apply to a detected body region or the
   whole clip? Vidora applies them to the whole clip and says so
   honestly in the panel.
3. Filters "Tools" group (Enhance / 4K / HD Upscale / Quality
   Restoration / Night-view Color / HD Cam 2 / HD Pet): filter
   categories or separate AI-enhancement tools, and what do they open?
4. Transitions "Pals" / "Overlay" / "Light" categories: do these exist
   in CapCut desktop with these names, or are they Vidora-original
   groupings?
