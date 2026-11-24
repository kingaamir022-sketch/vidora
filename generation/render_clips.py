#!/usr/bin/env python3
"""Vidora Phase 6 — AI stock-clip renderer (offline, CPU-only).

Renders the prompts in generation/prompts/clips.json to 1080p MP4 files:
a procedural still is painted with PIL (generation/painters.py), then
ffmpeg animates it (slow pan + drifting overlay + vignette) and encodes
H.264. No filmed footage, no real faces, no stock.

Speed note: the still is decoded ONCE (loop filter duplicates frames in
memory) and motion is a single scale + animated crop — the earlier
zoompan graph re-decoded the PNG per frame and was ~3x slower.

Usage:
  python3 generation/render_clips.py [--only ai-clip-001,...]
  python3 generation/render_clips.py --pilot   # first 5 clips only
Output: public/ai-library/clips/<id>.mp4 + posters/<id>.jpg
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "generation"))
from painters import paint_overlay, paint_scene

PROMPTS = ROOT / "generation" / "prompts" / "clips.json"
OUTDIR = ROOT / "public" / "ai-library" / "clips"
POSTERS = OUTDIR / "posters"
TMP = Path("/tmp/vidora-clip-render")


def _motion_graph(prompt: dict, dur: int, frames: int) -> str:
    """Cheap motion: decode each still once (loop filter), then a single
    scale + animated crop (pan/zoom feel) + drifting overlay."""
    motion = prompt["motion"]
    if motion == "flow":
        crop = f"crop=1920:1080:x='96*(t/{dur})':y='54*(1-t/{dur})'"
        bright = "0.015"
    elif motion == "rise":
        crop = f"crop=1920:1080:x=48:y='108*(1-t/{dur})'"
        bright = "0.015"
    elif motion == "fall":
        crop = f"crop=1920:1080:x=48:y='108*(t/{dur})'"
        bright = "0.015"
    elif motion == "pulse":
        # The crop was STATIC (only the overlay drifted), so Grid/Bloom
        # clips showed no motion (BUG-P6-008): the crop now oscillates,
        # 48 px in x / 27 px in y over one 6 s cycle.
        crop = (f"crop=1920:1080:x='48+48*sin(2*PI*t/{dur})':"
                f"y='54+27*sin(2*PI*t/{dur})'")
        bright = "0.035"
    else:  # drift (and rotate: slow pan + gentle rotation)
        crop = f"crop=1920:1080:x='96*(1-t/{dur})':y='54*(t/{dur})'"
        bright = "0.015"
    base = f"loop=loop={frames - 1}:size=1:start=0,scale=2112:1188,{crop}[base]"
    if motion == "rotate":
        base = (f"loop=loop={frames - 1}:size=1:start=0,scale=2112:1188,"
                f"rotate=a='0.02*sin(2*PI*t/{dur})':fillcolor=black,{crop}[base]")
    return (
        f"[0:v]{base};"
        f"[1:v]loop=loop={frames - 1}:size=1:start=0,format=rgba[ov];"
        f"[base][ov]overlay=x='(W-w)*(1-t/{dur})':y=0,format=yuv420p,"
        f"eq=brightness='{bright}*sin(2*PI*t/{dur})',"
        f"vignette=PI/5[out]"
    )


def render_clip(prompt: dict) -> dict:
    TMP.mkdir(parents=True, exist_ok=True)
    OUTDIR.mkdir(parents=True, exist_ok=True)
    POSTERS.mkdir(parents=True, exist_ok=True)
    still = TMP / f"{prompt['id']}-still.png"
    over = TMP / f"{prompt['id']}-overlay.png"
    paint_scene(prompt, still)
    paint_overlay(prompt, over)
    out = OUTDIR / f"{prompt['id']}.mp4"
    dur = prompt["duration"]
    fps = prompt["fps"]
    frames = dur * fps
    fc = _motion_graph(prompt, dur, frames)
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(still), "-i", str(over),
           "-filter_complex", fc,
           "-map", "[out]", "-t", str(dur), "-r", str(fps),
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg clip failed for {prompt['id']}: {proc.stderr[:400]}")
    poster = POSTERS / f"{prompt['id']}.jpg"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out), "-ss", "1",
                    "-frames:v", "1", "-q:v", "4", str(poster)], check=True)
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                            "format=duration,size", "-show_entries",
                            "stream=width,height,codec_name",
                            "-of", "json", str(out)], capture_output=True, text=True, check=True)
    info = json.loads(probe.stdout)
    assert info["streams"][0]["width"] == 1920 and info["streams"][0]["height"] == 1080
    return {
        "id": prompt["id"], "name": prompt["name"], "kind": "clip",
        "scene": prompt["scene"], "motion": prompt["motion"],
        "duration": prompt["duration"], "width": 1920, "height": 1080, "fps": 30,
        "file": f"/ai-library/clips/{prompt['id']}.mp4",
        "poster": f"/ai-library/clips/posters/{prompt['id']}.jpg",
        "size": out.stat().st_size, "tags": prompt["tags"], "seed": prompt["seed"],
    }



def _merge_state(fname: str, new_entries: list[dict]) -> None:
    """Merge new entries into the per-kind state file by id (never loses
    entries rendered by an earlier --only run)."""
    path = ROOT / "generation" / fname
    old = json.loads(path.read_text()) if path.exists() else []
    by_id = {e["id"]: e for e in old}
    for e in new_entries:
        by_id[e["id"]] = e
    path.write_text(json.dumps(sorted(by_id.values(), key=lambda e: e["id"]), indent=2))

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--pilot", action="store_true")
    args = ap.parse_args()
    prompts = json.loads(PROMPTS.read_text())
    if args.pilot:
        prompts = prompts[:5]
    elif args.only:
        wanted = set(args.only.split(","))
        prompts = [p for p in prompts if p["id"] in wanted]
    entries = []
    for p in prompts:
        e = render_clip(p)
        entries.append(e)
        print(f"{e['id']}: {e['name']} ({e['scene']}, {e['duration']}s) size={e['size']}")
    _merge_state("state-clips.json", entries)
    print(f"rendered {len(entries)} clips")


if __name__ == "__main__":
    main()
