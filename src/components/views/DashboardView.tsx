"use client";

import { motion } from "framer-motion";
import {
  Wand2,
  Sparkles,
  ArrowRight,
  Music,
  Palette,
  Compass,
  TrendingUp,
  Clock,
  Play,
} from "lucide-react";
import { useSonoraStore } from "@/lib/store";
import { ART_STYLES, COLOR_PALETTES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardViewProps {
  onOpenStudio: () => void;
}

export function DashboardView({ onOpenStudio }: DashboardViewProps) {
  const { projects, setView } = useSonoraStore();
  const recent = projects.slice(0, 6);

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1400px] mx-auto">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl glass border border-border/60 ambient-glow">
        <div className="relative z-10 px-6 py-10 md:px-12 md:py-16 lg:px-16 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-5"
          >
            <Sparkles className="h-3 w-3 text-[var(--sonora-accent)]" />
            Premium Music-to-Art Studio
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]"
          >
            Turn music into
            <br />
            <span className="text-gradient">living artwork</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed"
          >
            Upload a song, press play, and watch SONORA transform it into a
            unique piece of art — painted live in synchronization with the
            music. Real audio analysis. Two generation engines. Three artistic
            styles.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Button
              onClick={onOpenStudio}
              size="lg"
              className="bg-sonora-gradient text-white hover:brightness-110 shadow-sonora gap-2 h-12 px-6"
            >
              <Wand2 className="h-4 w-4" />
              Create Artwork
            </Button>
            <Button
              onClick={() => setView("explore")}
              variant="outline"
              size="lg"
              className="gap-2 h-12 px-6"
            >
              <Compass className="h-4 w-4" />
              Explore Styles
            </Button>
          </motion.div>

          {/* Stats strip */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Music}
              label="Audio formats"
              value="5"
              hint="MP3 · WAV · FLAC · M4A · OGG"
            />
            <StatCard
              icon={Palette}
              label="Art styles"
              value="3"
              hint="Painterly · Abstract · Sketch"
            />
            <StatCard
              icon={Sparkles}
              label="Color palettes"
              value="8"
              hint="Curated cinematic moods"
            />
            <StatCard
              icon={TrendingUp}
              label="Saved creations"
              value={String(projects.length)}
              hint="In your gallery"
            />
          </div>
        </div>
      </section>

      {/* Quick start cards */}
      <section>
        <SectionHeading
          icon={Wand2}
          title="Quick start"
          subtitle="Three ways to begin creating"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <QuickStartCard
            icon={Music}
            title="Upload a track"
            desc="Drop your MP3, WAV, FLAC, M4A, or OGG file. We analyze it locally with the Web Audio API."
            cta="Open studio"
            onClick={onOpenStudio}
            accent
          />
          <QuickStartCard
            icon={Compass}
            title="Pick a style"
            desc="Choose between Painterly, Abstract, and Sketch/Watercolor — each with its own visual behavior."
            cta="Browse styles"
            onClick={() => setView("explore")}
          />
          <QuickStartCard
            icon={Palette}
            title="View your gallery"
            desc="Open previously saved artworks, search by track, and download or rename them."
            cta="Open gallery"
            onClick={() => setView("gallery")}
          />
        </div>
      </section>

      {/* Recent projects */}
      <section>
        <SectionHeading
          icon={Clock}
          title="Recent creations"
          subtitle={
            recent.length
              ? "Your latest saved artworks"
              : "No creations yet — your saved artworks will appear here"
          }
          action={
            recent.length > 0
              ? {
                  label: "View all",
                  onClick: () => setView("gallery"),
                }
              : undefined
          }
        />
        <div className="mt-4">
          {recent.length === 0 ? (
            <EmptyState
              icon={Palette}
              title="Your gallery is empty"
              desc="Once you save an artwork from the studio, it'll appear here. Try creating one now."
              cta="Create artwork"
              onClick={onOpenStudio}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
              {recent.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setView("gallery")}
                  className="group relative aspect-square rounded-xl overflow-hidden glass border border-border/60 hover:border-[var(--sonora-accent)]/50 transition-all"
                >
                  <img
                    src={p.thumbnail}
                    alt={p.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-left text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-[11px] font-medium truncate">
                      {p.trackTitle}
                    </div>
                    <div className="text-[10px] text-white/70 truncate">
                      {p.trackArtist}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 h-7 w-7 rounded-full glass-strong grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-3 w-3 text-white translate-x-0.5" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Inspiration */}
      <section>
        <SectionHeading
          icon={Sparkles}
          title="Find your style"
          subtitle="Each style produces a completely different visual experience"
        />
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          {ART_STYLES.map((s, i) => {
            const palette = COLOR_PALETTES[i % COLOR_PALETTES.length];
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={onOpenStudio}
                className="group relative overflow-hidden rounded-2xl aspect-[4/5] glass border border-border/60 hover:border-[var(--sonora-accent)]/50 transition-all"
              >
                <StylePreview palette={palette.colors} styleId={s.id} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-left text-white">
                  <div className="text-lg font-semibold">{s.name}</div>
                  <p className="text-xs text-white/70 line-clamp-2 mt-0.5">
                    {s.description}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--sonora-accent)] group-hover:gap-2 transition-all">
                    Try it
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* CTA strip */}
      <section className="relative overflow-hidden rounded-2xl glass border border-border/60 p-6 md:p-8 ambient-glow">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
          <div className="h-12 w-12 rounded-xl bg-sonora-gradient grid place-items-center shadow-sonora shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">
              Ready to create something extraordinary?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              The studio is one click away. Bring your favorite track and let
              SONORA paint it for you.
            </p>
          </div>
          <Button
            onClick={onOpenStudio}
            className="bg-sonora-gradient text-white hover:brightness-110 shadow-sonora gap-2"
          >
            Open Studio
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="glass rounded-xl p-3 border border-border/60">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3 w-3 text-[var(--sonora-accent)]" />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
        {hint}
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--sonora-accent)]" />
          <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {action && (
        <Button variant="ghost" size="sm" onClick={action.onClick} className="gap-1 text-muted-foreground hover:text-foreground">
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function QuickStartCard({
  icon: Icon,
  title,
  desc,
  cta,
  onClick,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group text-left rounded-2xl p-5 border transition-all hover:-translate-y-0.5",
        accent
          ? "bg-sonora-gradient/10 border-[var(--sonora-accent)]/40 hover:bg-sonora-gradient/15"
          : "glass border-border/60 hover:border-[var(--sonora-accent)]/40"
      )}
    >
      <div
        className={cn(
          "h-11 w-11 rounded-xl grid place-items-center mb-3",
          accent ? "bg-sonora-gradient shadow-sonora" : "bg-foreground/10"
        )}
      >
        <Icon className={cn("h-5 w-5", accent ? "text-white" : "text-foreground")} />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 leading-snug">{desc}</p>
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--sonora-accent)] group-hover:gap-2 transition-all">
        {cta}
        <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  cta,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="glass rounded-2xl border border-dashed border-border/60 p-10 text-center">
      <div className="inline-flex h-12 w-12 rounded-xl bg-foreground/5 grid place-items-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{desc}</p>
      <Button onClick={onClick} className="mt-4 bg-sonora-gradient text-white gap-2">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Lightweight static SVG-style preview for the inspiration cards
function StylePreview({
  palette,
  styleId,
}: {
  palette: string[];
  styleId: string;
}) {
  // Build a deterministic preview using inline SVG
  const bg = palette[palette.length - 1];
  const shapes: React.ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const x = (i * 37) % 100;
    const y = (i * 53) % 100;
    const r = 20 + ((i * 17) % 40);
    const c = palette[i % (palette.length - 1)];
    const a = 0.15 + ((i * 13) % 30) / 100;
    if (styleId === "sketch") {
      shapes.push(
        <line
          key={i}
          x1={`${x}%`}
          y1={`${y}%`}
          x2={`${(x + r) % 100}%`}
          y2={`${(y + r * 0.6) % 100}%`}
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
        <polygon
          key={i}
          points={pts.join(" ")}
          fill={c}
          fillOpacity={a}
        />
      );
    } else {
      shapes.push(
        <circle
          key={i}
          cx={`${x}%`}
          cy={`${y}%`}
          r={r}
          fill={c}
          fillOpacity={a}
        />
      );
    }
  }
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <radialGradient id={`g-${styleId}`} cx="50%" cy="40%" r="80%">
          <stop offset="0%" stopColor={palette[0]} stopOpacity="0.4" />
          <stop offset="100%" stopColor={bg} stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#g-${styleId})`} />
      {shapes}
    </svg>
  );
}
