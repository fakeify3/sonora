// ===== SONORA Core Types =====

export type ViewId =
  | "dashboard"
  | "studio"
  | "gallery"
  | "explore"
  | "settings";

export type GenerationMode = "procedural" | "ai";

export type ArtStyleId = "painterly" | "abstract" | "sketch";

export type ColorPaletteId =
  | "violet"
  | "sunset"
  | "ocean"
  | "forest"
  | "ember"
  | "monochrome"
  | "neon"
  | "aurora";

export interface ColorPalette {
  id: ColorPaletteId;
  name: string;
  colors: string[]; // hex
  description: string;
}

export interface AudioFeatures {
  // 0..1 normalized
  bass: number;
  mid: number;
  treble: number;
  volume: number;
  energy: number;
  // raw spectral data
  spectrum: Uint8Array;
  waveform: Uint8Array;
  // beat info
  beat: boolean;
  beatStrength: number; // 0..1
  bpm: number;
  // running smoothed values
  smoothBass: number;
  smoothMid: number;
  smoothTreble: number;
}

export interface TrackInfo {
  title: string;
  artist: string;
  album?: string;
  duration: number; // seconds
  format: string; // e.g. "mp3"
  coverUrl?: string;
  source: "upload" | "spotify" | "youtube" | "soundcloud";
  sourceUrl?: string;
  fileName?: string;
}

export interface ArtworkProject {
  id: string;
  title: string;
  trackTitle: string;
  trackArtist: string;
  styleId: ArtStyleId;
  paletteId: ColorPaletteId;
  mode: GenerationMode;
  // thumbnail is a small PNG data URL stored in IndexedDB
  thumbnail: string; // data URL
  fullImage?: string; // data URL (optional high-res)
  durationSec: number;
  createdAt: number; // epoch ms
  bpm?: number;
  mood?: string;
}

export interface AppSettings {
  theme: "dark" | "light";
  accent: AccentPreset;
  fontScale: "sm" | "md" | "lg";
  canvasQuality: "standard" | "high" | "ultra";
  animationPerformance: "eco" | "balanced" | "performance";
  defaultMode: GenerationMode;
  defaultStyle: ArtStyleId;
  defaultPalette: ColorPaletteId;
  defaultVolume: number; // 0..1
  exportScale: number; // 1, 2, 3
  autoStartOnPlay: boolean;
}

export type AccentPreset =
  | "violet"
  | "electric"
  | "magenta"
  | "cyan"
  | "amber"
  | "emerald";

export const ACCENT_PRESETS: Record<
  AccentPreset,
  { name: string; accent: string; accent2: string }
> = {
  violet: {
    name: "Violet",
    accent: "oklch(0.62 0.27 295)",
    accent2: "oklch(0.65 0.22 245)",
  },
  electric: {
    name: "Electric Blue",
    accent: "oklch(0.68 0.22 240)",
    accent2: "oklch(0.7 0.2 200)",
  },
  magenta: {
    name: "Magenta",
    accent: "oklch(0.65 0.28 340)",
    accent2: "oklch(0.62 0.25 300)",
  },
  cyan: {
    name: "Cyan",
    accent: "oklch(0.75 0.18 190)",
    accent2: "oklch(0.72 0.2 220)",
  },
  amber: {
    name: "Amber",
    accent: "oklch(0.75 0.18 70)",
    accent2: "oklch(0.7 0.22 30)",
  },
  emerald: {
    name: "Emerald",
    accent: "oklch(0.7 0.2 160)",
    accent2: "oklch(0.72 0.18 180)",
  },
};

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "violet",
    name: "Violet Dream",
    colors: ["#7c3aed", "#a855f7", "#c084fc", "#4c1d95", "#1e1b4b"],
    description: "Deep purple cinematic night",
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: ["#f97316", "#ef4444", "#ec4899", "#fb7185", "#7c2d12"],
    description: "Warm orange and pink",
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: ["#06b6d4", "#3b82f6", "#0ea5e9", "#1e40af", "#082f49"],
    description: "Cool blues and teals",
  },
  {
    id: "forest",
    name: "Forest",
    colors: ["#10b981", "#22c55e", "#84cc16", "#064e3b", "#022c22"],
    description: "Organic greens",
  },
  {
    id: "ember",
    name: "Ember",
    colors: ["#dc2626", "#ea580c", "#f59e0b", "#7f1d1d", "#450a0a"],
    description: "Fire and ember",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    colors: ["#f5f5f5", "#a3a3a3", "#525252", "#262626", "#0a0a0a"],
    description: "Black and white",
  },
  {
    id: "neon",
    name: "Neon",
    colors: ["#22d3ee", "#a855f7", "#ec4899", "#84cc16", "#facc15"],
    description: "Bright neon spectrum",
  },
  {
    id: "aurora",
    name: "Aurora",
    colors: ["#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#22d3ee"],
    description: "Northern lights",
  },
];

export interface ArtStyleDef {
  id: ArtStyleId;
  name: string;
  description: string;
  brushBehavior: string;
}

export const ART_STYLES: ArtStyleDef[] = [
  {
    id: "painterly",
    name: "Painterly",
    description:
      "Oil painting aesthetics with rich textures, organic brush strokes, and cinematic lighting.",
    brushBehavior:
      "Large layered strokes, soft blending, atmospheric depth, warm cinematic light.",
  },
  {
    id: "abstract",
    name: "Abstract",
    description:
      "Fluid geometric shapes, dynamic color fields, and beautiful particle formations.",
    brushBehavior:
      "Bold color blocks, fluid ribbons, particle bursts, experimental compositions.",
  },
  {
    id: "sketch",
    name: "Sketch & Watercolor",
    description:
      "Hand-drawn lines, pencil textures, watercolor blending, and soft color washes.",
    brushBehavior:
      "Ink lines, pencil hatching, watercolor blooms, delicate washes.",
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  accent: "violet",
  fontScale: "md",
  canvasQuality: "high",
  animationPerformance: "balanced",
  defaultMode: "procedural",
  defaultStyle: "painterly",
  defaultPalette: "violet",
  defaultVolume: 0.8,
  exportScale: 2,
  autoStartOnPlay: true,
};
