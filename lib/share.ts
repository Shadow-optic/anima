/**
 * Share helpers: build the link, draw the image, hand both to the browser.
 */

import { Platform } from "react-native";
import { getScoreColor, getScoreLabel } from "@/config/theme";
import { FACTOR_LABELS } from "@/shared/score/longevity";
import { encodeShareCard, FACTOR_ORDER, type ShareCard } from "@/shared/share/card";
import type { LongevityScore, Pet } from "@/shared/types";

export function buildShareCard(pet: Pet, score: LongevityScore, foodGrade?: string): ShareCard {
  return {
    v: 1,
    name: pet.name.slice(0, 40),
    species: pet.species,
    breed: pet.breed.slice(0, 60),
    score: score.score,
    factors: FACTOR_ORDER.map((k) => Math.round(score.factors[k] * 100)),
    foodGrade,
    day: new Date().toISOString().slice(0, 10),
  };
}

export function siteOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (Platform.OS === "web" && typeof window !== "undefined") return window.location.origin;
  return "";
}

export function shareUrl(card: ShareCard): string {
  return `${siteOrigin()}/share?d=${encodeShareCard(card)}`;
}

export function shareText(card: ShareCard): string {
  return `${card.name} scored ${card.score} on the ANIMA Longevity Score. What does your ${card.species === "DOG" ? "dog" : "cat"} score?`;
}

/** Draw the card as a 1200×630 PNG (the size link previews use). Web only. */
export async function renderShareImage(card: ShareCard): Promise<Blob | null> {
  if (Platform.OS !== "web" || typeof document === "undefined") return null;
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const color = getScoreColor(card.score);
  const font = (weight: number, size: number) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  ctx.fillStyle = "#0A0A0F";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(300, 300, 20, 300, 300, 520);
  glow.addColorStop(0, `${color}33`);
  glow.addColorStop(1, "#0A0A0F00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#A8A6A3";
  ctx.font = font(700, 26);
  ctx.fillText("ANIMA  ·  LONGEVITY SCORE", 72, 92);

  ctx.fillStyle = "#E8E6E3";
  ctx.font = font(800, 60);
  ctx.fillText(fit(ctx, card.name, 480), 72, 180);
  ctx.fillStyle = "#A8A6A3";
  ctx.font = font(500, 28);
  ctx.fillText(fit(ctx, card.breed, 480), 72, 224);

  ctx.fillStyle = color;
  ctx.font = font(800, 220);
  ctx.fillText(String(card.score), 62, 440);
  ctx.font = font(700, 44);
  ctx.fillText(getScoreLabel(card.score), 72, 506);

  ctx.fillStyle = "#7C7A78";
  ctx.font = font(500, 24);
  ctx.fillText(`out of 999  ·  ${card.day}`, 72, 560);

  // Factor bars
  const x = 640;
  const barW = 488;
  FACTOR_ORDER.forEach((key, i) => {
    const y = 150 + i * 68;
    const v = card.factors[i];
    ctx.fillStyle = "#E8E6E3";
    ctx.font = font(600, 24);
    ctx.fillText(FACTOR_LABELS[key], x, y);
    ctx.textAlign = "right";
    ctx.fillText(String(v), x + barW, y);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, x, y + 14, barW, 12, 6);
    ctx.fillStyle = v >= 70 ? "#10B981" : v >= 45 ? "#FBBF24" : "#EF4444";
    roundRect(ctx, x, y + 14, Math.max(12, (barW * v) / 100), 12, 6);
  });

  ctx.fillStyle = "#A8A6A3";
  ctx.font = font(600, 24);
  const host = siteOrigin().replace(/^https?:\/\//, "");
  ctx.fillText(host ? `Get your pet's score free at ${host}` : "Get your pet's score free", x, 580);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Use the device share sheet when there is one. Returns false if unavailable or dismissed. */
export async function nativeShare(card: ShareCard, image: Blob | null): Promise<boolean> {
  const nav: any = typeof navigator !== "undefined" ? navigator : null;
  if (!nav?.share) return false;
  const data: any = { title: `${card.name}'s Longevity Score`, text: shareText(card), url: shareUrl(card) };
  if (image) {
    const file = new File([image], "anima-score.png", { type: "image/png" });
    if (nav.canShare?.({ files: [file] })) data.files = [file];
  }
  try {
    await nav.share(data);
    return true;
  } catch {
    return false;
  }
}
