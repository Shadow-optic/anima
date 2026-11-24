/**
 * ANIMA Digital Twin — Canvas renderer.
 *
 * Renders the pet's health topology: a hex-grid disc where each cell's
 * colour reflects the Gaussian curvature field, with animated particles
 * flowing along the gradient. Hills glow with the factor's colour;
 * wells are dark. Particles orbit healthy peaks.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import type { ScoreFactors, FactorKey } from "@/shared/types";
import {
  factorsToMasses,
  curvatureAt,
  buildHexGrid,
  lodRings,
  spawnParticle,
  stepParticle,
  orbifoldFlow,
  flowCircularity,
} from "@/shared/twin";
import type { MassPoint, Particle, HexCell } from "@/shared/twin";
import { FACTOR_LABELS, FACTOR_WEIGHTS } from "@/shared/score/longevity";
import { theme, getScoreColor } from "@/config/theme";

const c = theme.colors;

const FACTOR_COLORS: Record<FactorKey, string> = {
  nutritionQuality: "#10B981",
  bodyCondition: "#60A5FA",
  genetic: "#8B5CF6",
  ageHealth: "#F59E0B",
  preventiveCare: "#3B82F6",
  activityLevel: "#EC4899",
};

const MAX_PARTICLES = 120;

function hexColor(value: number): string {
  if (value > 0.02) {
    const t = Math.min(value / 0.6, 1);
    const r = Math.round(16 + t * 0);
    const g = Math.round(185 + t * 70);
    const b = Math.round(129 + t * 50);
    return `rgba(${r},${g},${b},${0.15 + t * 0.5})`;
  }
  if (value < -0.02) {
    const t = Math.min(-value / 0.6, 1);
    const r = Math.round(239 * t);
    const g = Math.round(68 * t);
    const b = Math.round(68 * t);
    return `rgba(${r},${g},${b},${0.15 + t * 0.4})`;
  }
  return "rgba(255,255,255,0.06)";
}

function nearestFactor(x: number, y: number, masses: MassPoint[]): FactorKey {
  let best = masses[0];
  let bestDist = Infinity;
  for (const m of masses) {
    const d = (x - m.x) ** 2 + (y - m.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }
  return best.factor;
}

function drawHex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const hx = cx + size * Math.cos(angle);
    const hy = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

export function TwinRenderer({
  factors,
  score,
  size = 340,
}: {
  factors: ScoreFactors;
  score: number;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<[number, number][]>([]);
  const [harmony, setHarmony] = useState(0);
  const [hoveredFactor, setHoveredFactor] = useState<FactorKey | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const w = size;
    const h = size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const masses = factorsToMasses(factors);
    const half = w / 2;
    const scale = half * 0.9;

    // Convert disc coords to canvas coords
    const toCanvas = (x: number, y: number): [number, number] => [
      half + x * scale,
      half + y * scale,
    ];

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background disc
    ctx.beginPath();
    ctx.arc(half, half, scale + 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fill();

    // Hex grid
    const rings = lodRings(1.2);
    const cells = buildHexGrid(rings, (x, y) => curvatureAt(x, y, masses));
    const hexSize = (scale * 0.9) / (rings + 0.5) / 1.75;
    for (const cell of cells) {
      const [cx, cy] = toCanvas(cell.cx, cell.cy);
      drawHex(ctx, cx, cy, hexSize, hexColor(cell.value));
    }

    // Mass point labels (factor names around the ring)
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const mass of masses) {
      const [mx, my] = toCanvas(mass.x, mass.y);
      const labelR = scale * 0.78;
      const angle = Math.atan2(mass.y, mass.x);
      const lx = half + Math.cos(angle) * labelR;
      const ly = half + Math.sin(angle) * labelR;

      // Glow dot at mass position
      const color = FACTOR_COLORS[mass.factor];
      const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 16);
      glow.addColorStop(0, color + "80");
      glow.addColorStop(1, color + "00");
      ctx.beginPath();
      ctx.arc(mx, my, 16, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Score circle
      ctx.beginPath();
      ctx.arc(mx, my, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label
      ctx.font = "bold 9px 'DM Sans', sans-serif";
      ctx.fillStyle =
        hoveredFactor === mass.factor ? c.textPrimary : c.textSecondary;
      const short = FACTOR_LABELS[mass.factor].split(" ")[0];
      ctx.fillText(short, lx, ly);
      ctx.font = "600 8px 'DM Sans', sans-serif";
      ctx.fillStyle = color;
      ctx.fillText(
        `${Math.round(mass.score * 100)}`,
        lx,
        ly + 11
      );
    }

    // Particles
    const particles = particlesRef.current;
    // Spawn new particles
    while (particles.length < MAX_PARTICLES) {
      const mass = masses[Math.floor(Math.random() * masses.length)];
      particles.push(spawnParticle(mass, Math.random));
    }
    // Step and draw
    const trail: [number, number][] = [];
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      stepParticle(p, masses);
      if (p.age > p.maxAge) {
        particles.splice(i, 1);
        continue;
      }
      trail.push([p.x, p.y]);
      const [px, py] = toCanvas(p.x, p.y);
      const alpha = Math.min(1, (1 - p.age / p.maxAge) * 0.8);
      const pColor = FACTOR_COLORS[p.factor as FactorKey] || c.accent;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = pColor + Math.round(alpha * 255).toString(16).padStart(2, "0");
      ctx.fill();
    }

    // Track trail for orbifold circularity
    trailRef.current = trail;

    // Centre score
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 28px 'DM Sans', sans-serif";
    ctx.fillStyle = getScoreColor(score);
    ctx.fillText(String(score), half, half - 6);
    ctx.font = "500 10px 'DM Sans', sans-serif";
    ctx.fillStyle = c.textSecondary;
    ctx.fillText("LONGEVITY", half, half + 14);

    animRef.current = requestAnimationFrame(render);
  }, [factors, score, size, hoveredFactor]);

  useEffect(() => {
    // Compute harmony (orbifold circularity) periodically
    const interval = setInterval(() => {
      const trail = trailRef.current;
      if (trail.length > 10) {
        const samples = orbifoldFlow(trail.slice(0, 60));
        setHarmony(Math.round(flowCircularity(samples) * 100));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  const handleMove = useCallback(
    (e: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const half = size / 2;
      const scale = half * 0.9;
      const mx = (e.clientX - rect.left - half) / scale;
      const my = (e.clientY - rect.top - half) / scale;
      if (mx * mx + my * my > 1) {
        setHoveredFactor(null);
        return;
      }
      const masses = factorsToMasses(factors);
      setHoveredFactor(nearestFactor(mx, my, masses));
    },
    [factors, size]
  );

  if (Platform.OS !== "web") {
    return (
      <View style={[st.container, { width: size, height: size }]}>
        <Text style={st.fallback}>Digital Twin requires web</Text>
      </View>
    );
  }

  return (
    <View style={st.container}>
      <canvas
        ref={canvasRef as any}
        style={{ borderRadius: size / 2, cursor: "crosshair" }}
        onMouseMove={handleMove as any}
        onMouseLeave={() => setHoveredFactor(null)}
      />
      {harmony > 0 && (
        <View style={st.harmonyBadge}>
          <Text style={st.harmonyLabel}>Harmony</Text>
          <Text style={st.harmonyValue}>{harmony}%</Text>
        </View>
      )}
      {hoveredFactor && (
        <View style={st.tooltip}>
          <View style={[st.tooltipDot, { backgroundColor: FACTOR_COLORS[hoveredFactor] }]} />
          <Text style={st.tooltipText}>
            {FACTOR_LABELS[hoveredFactor]}: {Math.round(factors[hoveredFactor] * 100)}/100
          </Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as any,
  },
  fallback: {
    color: c.textSecondary,
    fontSize: 14,
  },
  harmonyBadge: {
    position: "absolute" as any,
    bottom: -8,
    right: -8,
    backgroundColor: c.surface,
    borderColor: c.surfaceBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  harmonyLabel: {
    fontSize: 10,
    color: c.textTertiary,
    fontWeight: "600",
  },
  harmonyValue: {
    fontSize: 12,
    color: c.accent,
    fontWeight: "700",
  },
  tooltip: {
    position: "absolute" as any,
    top: -32,
    backgroundColor: c.bottomSheet,
    borderColor: c.surfaceBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltipText: {
    fontSize: 12,
    color: c.textPrimary,
    fontWeight: "600",
  },
});
