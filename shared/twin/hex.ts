/**
 * Hexagonal grid for the health topology — inspired by H3's hex tiling.
 *
 * We use axial coordinates (q, r) to tile the disc with hexagons.
 * Each hex samples the curvature field and is coloured by its value.
 * LOD: fewer, larger hexes when zoomed out; more, smaller when zoomed in.
 */

export interface HexCell {
  q: number;
  r: number;
  cx: number; // centre x in disc coords
  cy: number; // centre y in disc coords
  value: number; // curvature sample
}

/** Axial hex to pixel (flat-top). */
function hexToPixel(q: number, r: number, size: number): [number, number] {
  const x = size * (3 / 2) * q;
  const y = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return [x, y];
}

/** Build hex cells that fit inside a unit disc. */
export function buildHexGrid(
  rings: number,
  curvatureFn: (x: number, y: number) => number
): HexCell[] {
  const size = 0.9 / (rings + 0.5) / 1.75;
  const cells: HexCell[] = [];
  for (let q = -rings; q <= rings; q++) {
    const r1 = Math.max(-rings, -q - rings);
    const r2 = Math.min(rings, -q + rings);
    for (let r = r1; r <= r2; r++) {
      const [cx, cy] = hexToPixel(q, r, size);
      if (cx * cx + cy * cy > 0.92) continue;
      cells.push({ q, r, cx, cy, value: curvatureFn(cx, cy) });
    }
  }
  return cells;
}

/** LOD: more rings when "closer", fewer when "further". */
export function lodRings(zoom: number): number {
  if (zoom >= 1.5) return 12;
  if (zoom >= 1.0) return 9;
  return 6;
}
