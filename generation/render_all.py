#!/usr/bin/env python3
"""Vidora Phase 6 — AI library render orchestrator (SPEC O pipeline).

Renders every prompt in generation/prompts/*.json with the `local`
provider (generation/providers/local.py), with resume support:
generation/state.json records finished ids, so a re-run only renders
what is missing (or --force to redo). GPU-safe mode: all rendering is
CPU-only by design; --gpu-safe is accepted and documented, it changes
nothing because no GPU path exists.

After rendering it runs the quality filter and writes the runtime
catalog assets/ai-manifest.json (the app's single source of truth for
the AI library: id, name, kind, file, bpm/key/duration, peaks, tags,
pattern, license).

Usage:
  python3 generation/render_all.py [--kinds music,sfx,clips,images]
  python3 generation/render_all.py --force
  python3 generation/render_all.py --gpu-safe
"""
import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "generation"))
sys.path.insert(0, str(ROOT / "generation" / "providers"))
from local import get_provider  # noqa: E402

STATE = ROOT / "generation" / "state.json"
MANIFEST = ROOT / "assets" / "ai-manifest.json"
PROMPT_DIR = ROOT / "generation" / "prompts"


def _load_state() -> dict:
    if STATE.exists():
        return json.loads(STATE.read_text())
    return {"music": [], "sfx": [], "clips": [], "images": []}


def _save_state(state: dict) -> None:
    STATE.write_text(json.dumps(state, indent=2))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kinds", default="music,sfx,clips,images")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--gpu-safe", action="store_true",
                    help="CPU-only rendering (the only mode; accepted for pipeline compatibility)")
    args = ap.parse_args()
    kinds = [k for k in args.kinds.split(",") if k]
    provider = get_provider("local")
    state = _load_state()
    if args.force:
        state = {"music": [], "sfx": [], "clips": [], "images": []}
    entries: dict[str, list[dict]] = {"music": [], "sfx": [], "clips": [], "images": []}
    # Reload already-rendered entries from the per-kind state files so the
    # manifest stays complete across resumed runs.
    for kind, fname in (("music", "state-music.json"), ("sfx", "state-sfx.json"),
                        ("clips", "state-clips.json"), ("images", "state-images.json")):
        f = ROOT / "generation" / fname
        if f.exists():
            for e in json.loads(f.read_text()):
                if e["id"] in state.get(kind, []):
                    entries[kind].append(e)

    for kind in kinds:
        prompts = json.loads((PROMPT_DIR / f"{kind}.json").read_text())
        done = set(state.get(kind, []))
        todo = [p for p in prompts if p["id"] not in done]
        print(f"{kind}: {len(prompts) - len(todo)} already done, {len(todo)} to render")
        for p in todo:
            if kind == "music":
                e = provider.render_music(p)
            elif kind == "sfx":
                e = provider.render_sfx(p)
            elif kind == "clips":
                e = provider.render_clip(p)
            else:
                e = provider.render_image(p)
            entries[kind].append(e)
            state.setdefault(kind, []).append(p["id"])
            _save_state(state)
            # Persist the per-kind state file after every item, so a crash
            # mid-kind still resumes with a complete manifest.
            fname = {"music": "state-music.json", "sfx": "state-sfx.json",
                     "clips": "state-clips.json", "images": "state-images.json"}[kind]
            (ROOT / "generation" / fname).write_text(
                json.dumps(sorted(entries[kind], key=lambda e: e["id"]), indent=2))
            print(f"  {p['id']} done")

    # Quality filter over everything rendered.
    print("running quality filter…")
    proc = subprocess.run([sys.executable, str(ROOT / "generation" / "quality_filter.py"),
                           "--kinds", ",".join(kinds)], capture_output=True, text=True)
    print(proc.stdout)
    if proc.returncode != 0:
        print(proc.stderr)
        raise SystemExit("quality filter failed — see generation/quality-report.json")

    counts = {k: len(v) for k, v in entries.items()}
    manifest = {
        "version": "0.7.0",
        "generated": datetime.now(timezone.utc).isoformat(),
        "generatedBy": "python3 generation/render_all.py (Phase 6, local provider, CPU-only)",
        "license": "CC0 (Vidora original)",
        "counts": counts,
        "entries": entries,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2))
    print(f"manifest written: {MANIFEST} — {counts}")
    print("render_all complete")


if __name__ == "__main__":
    main()
