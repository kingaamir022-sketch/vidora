/**
 * Vidora lens correction math (Phase 9, Section M — M-LENS, closes BUG-D2).
 * Generic single-coefficient radial distortion (Brown's model, k1 only):
 * a point at normalized radius r from the centre moves to
 * r' = r * (1 + k * r^2). No camera/lens profiles exist in this build —
 * the user adjusts the strength by eye (the panel says so).
 * k < 0 corrects barrel distortion, k > 0 corrects pincushion.
 * The centre never moves (r = 0 → r' = 0).
 */

/** Distort one normalized point (x, y in -1..1, centre 0,0) by k. */
export function distortPoint(x: number, y: number, k: number): { x: number; y: number } {
  const r2 = x * x + y * y;
  const factor = 1 + k * r2;
  return { x: x * factor, y: y * factor };
}

/**
 * Tile-mesh for remapping a frame: for each grid point in the OUTPUT
 * frame, where in the INPUT frame to sample from. The output grid is
 * `cols+1` × `rows+1` points in pixel coordinates of a W×H frame.
 * Sampling outside the frame clamps to the edge (no transparent holes).
 */
export function lensGrid(width: number, height: number, k: number, cols = 12, rows = 12): { sx: number; sy: number }[][] {
  const grid: { sx: number; sy: number }[][] = [];
  for (let row = 0; row <= rows; row++) {
    const line: { sx: number; sy: number }[] = [];
    for (let col = 0; col <= cols; col++) {
      // Normalized output coords, centre 0,0, half-width 1.
      const nx = (col / cols) * 2 - 1;
      const ny = (row / rows) * 2 - 1;
      const d = distortPoint(nx, ny, k);
      // Back to input pixel coords, clamped to the frame edge.
      const sx = Math.min(width - 1, Math.max(0, ((d.x + 1) / 2) * width));
      const sy = Math.min(height - 1, Math.max(0, ((d.y + 1) / 2) * height));
      line.push({ sx, sy });
    }
    grid.push(line);
  }
  return grid;
}

/** Clamp a lens strength slider value to the supported range. */
export function clampLensStrength(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(-1, value));
}
