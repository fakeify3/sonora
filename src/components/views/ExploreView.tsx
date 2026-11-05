"use client";

import { motion } from "framer-motion";
import { Compass, Sparkles, ArrowRight, Palette } from "lucide-react";
import { useSonoraStore } from "@/lib/store";
import {
  ART_STYLES,
  COLOR_PALETTES,
  ArtStyleId,
  ColorPaletteId,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ExploreView() {
  const {
    setView,
    setStyle,
    setPalette,
    selectedStyle,
    selectedPalette,
  } = useSonoraStore();

  const handleSelect = (style: ArtStyleId, palette: ColorPaletteId) => {
    setStyle(style);
    setPalette(palette);
    setView("studio");
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <section className="text-center py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3"
        >
          <Compass className="h-3 w-3 text-[var(--sonora-accent)]" />
          Explore
        </motion.div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Find your <span className="text-gradient">aesthetic</span>
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Browse curated combinations of art styles and color palettes. Click
          any combination to jump into the studio and start creating.
        </p>
      </section>

      {/* Styles */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-[var(--sonora-accent)]" />
          <h2 className="text-xl font-semibold">Artistic Styles</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {ART_STYLES.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "glass rounded-2xl border p-5 transition-all",
                selectedStyle === s.id
                  ? "border-[var(--sonora-accent)] ring-sonora"
                  : "border-border/60 hover:border-[var(--sonora-accent)]/40"
              )}
            >
              <h3 className="text-lg font-semibold">{s.name}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">
                {s.description}
              </p>
              <div className="mt-3 p-3 rounded-lg bg-background/40 border border-border/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Visual behavior
                </div>
                <p className="text-xs leading-snug">{s.brushBehavior}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-2"
                onClick={() => {
                  setStyle(s.id);
                  setView("studio");
                }}
              >
                Use this style
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Palettes */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-4 w-4 text-[var(--sonora-accent)]" />
          <h2 className="text-xl font-semibold">Color Palettes</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {COLOR_PALETTES.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                setPalette(p.id);
                setView("studio");
              }}
              className={cn(
                "group text-left rounded-xl border p-3 transition-all",
                selectedPalette === p.id
                  ? "border-[var(--sonora-accent)] ring-sonora"
                  : "border-border/60 hover:border-[var(--sonora-accent)]/40"
              )}
            >
              <div className="flex h-12 w-full overflow-hidden rounded-lg mb-2">
                {p.colors.map((c) => (
                  <div
                    key={c}
                    className="flex-1 transition-transform group-hover:scale-y-110 origin-bottom"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                {p.description}
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Curated combinations */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-[var(--sonora-accent)]" />
          <h2 className="text-xl font-semibold">Curated combinations</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMBOS.map((combo, i) => (
            <motion.button
              key={combo.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleSelect(combo.styleId, combo.paletteId)}
              className="group relative overflow-hidden rounded-2xl aspect-video glass border border-border/60 hover:border-[var(--sonora-accent)]/50 transition-all"
            >
              <ComboPreview palette={combo.paletteId} styleId={combo.styleId} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-left text-white">
                <div className="text-base font-semibold">{combo.name}</div>
                <div className="text-xs text-white/70 mt-0.5">{combo.desc}</div>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--sonora-accent)] group-hover:gap-2 transition-all">
                  Try this
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}

const COMBOS: Array<{
  name: string;
  desc: string;
  styleId: ArtStyleId;
  paletteId: ColorPaletteId;
}> = [
  {
    name: "Midnight Oil",
    desc: "Painterly in violet — classical cinematic mood",
    styleId: "painterly",
    paletteId: "violet",
  },
  {
    name: "Ocean Reverie",
    desc: "Abstract blues — fluid and contemplative",
    styleId: "abstract",
    paletteId: "ocean",
  },
  {
    name: "Field Notes",
    desc: "Sketch + forest greens — organic and delicate",
    styleId: "sketch",
    paletteId: "forest",
  },
  {
    name: "Neon Pulse",
    desc: "Abstract with neon — high-energy electronic",
    styleId: "abstract",
    paletteId: "neon",
  },
  {
    name: "Ember Sketch",
    desc: "Sketch in ember tones — warm hand-drawn",
    styleId: "sketch",
    paletteId: "ember",
  },
  {
    name: "Sunset Canvas",
    desc: "Painterly sunset — warm romantic",
    styleId: "painterly",
    paletteId: "sunset",
  },
  {
    name: "Aurora Drift",
    desc: "Abstract aurora — northern lights vibe",
    styleId: "abstract",
    paletteId: "aurora",
  },
  {
    name: "Monochrome Studies",
    desc: "Sketch monochrome — pure black & white",
    styleId: "sketch",
    paletteId: "monochrome",
  },
  {
    name: "Magenta Bloom",
    desc: "Painterly magenta — bold and expressive",
    styleId: "painterly",
    paletteId: "magenta" as ColorPaletteId,
  },
];

// We don't actually have "magenta" as a palette — map it to violet
// Filter to valid palette ids
const VALID_PALETTES = COLOR_PALETTES.map((p) => p.id);
COMBOS.forEach((c) => {
  if (!VALID_PALETTES.includes(c.paletteId)) {
    c.paletteId = "violet";
  }
});

function ComboPreview({
  palette,
  styleId,
}: {
  palette: ColorPaletteId;
  styleId: ArtStyleId;
}) {
  const p = COLOR_PALETTES.find((x) => x.id === palette)!;
  const bg = p.colors[p.colors.length - 1];
  const shapes: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const x = (i * 37) % 100;
    const y = (i * 53) % 100;
    const r = 12 + ((i * 17) % 30);
    const c = p.colors[i % (p.colors.length - 1)];
    const a = 0.18 + ((i * 13) % 30) / 100;
    if (styleId === "sketch") {
      shapes.push(
        <line
          key={i}
          x1={`${x}%`}
          y1={`${y}%`}
          x2={`${(x + r * 2) % 100}%`}
          y2={`${(y + r) % 100}%`}
          stroke={c}
          strokeWidth={1.5}
          strokeOpacity={a}
          strokeLinecap="round"
        />
      );
    } else if (styleId === "abstract") {
      const sides = 3 + (i % 4);
      const pts: string[] = [];
      for (let k = 0; k < sides; k++) {
        const ang = (k / sides) * Math.PI * 2;
        pts.push(
          `${(x + Math.cos(ang) * r) % 100}%,${(y + Math.sin(ang) * r) % 100}%`
        );
      }
      shapes.push(
        <polygon key={i} points={pts.join(" ")} fill={c} fillOpacity={a} />
      );
    } else {
      shapes.push(
        <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill={c} fillOpacity={a} />
      );
    }
  }
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <radialGradient id={`combo-${palette}-${styleId}`} cx="50%" cy="40%" r="80%">
          <stop offset="0%" stopColor={p.colors[0]} stopOpacity="0.5" />
          <stop offset="100%" stopColor={bg} stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#combo-${palette}-${styleId})`} />
      {shapes}
    </svg>
  );
}
