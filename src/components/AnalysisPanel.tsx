"use client";

import { motion } from "framer-motion";
import { Activity, Heart, Gauge, Waves, Zap, Music2 } from "lucide-react";
import { AudioFeatures } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AnalysisPanelProps {
  features: AudioFeatures | null;
  mood: string;
  styleLabel: string;
  modeLabel: string;
  generationStatus: string;
  className?: string;
}

function Meter({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number; // 0..1
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className="tabular-nums text-foreground/80">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.08, ease: "linear" }}
        />
      </div>
    </div>
  );
}

export function AnalysisPanel({
  features,
  mood,
  styleLabel,
  modeLabel,
  generationStatus,
  className,
}: AnalysisPanelProps) {
  const f = features;
  const bass = f?.smoothBass ?? 0;
  const mid = f?.smoothMid ?? 0;
  const treble = f?.smoothTreble ?? 0;
  const energy = f?.energy ?? 0;
  const volume = f?.volume ?? 0;
  const bpm = f?.bpm ?? 0;

  // mini spectrum
  const spectrum = f?.spectrum;

  return (
    <div className={cn("glass rounded-2xl border border-border/60 p-4 space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-[var(--sonora-accent)]" />
        <h3 className="text-sm font-semibold">Music Analysis</h3>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              f ? "bg-emerald-400 animate-pulse-soft" : "bg-muted-foreground/40"
            )}
          />
          {f ? "Live" : "Idle"}
        </div>
      </div>

      {/* Mood */}
      <div className="rounded-xl bg-foreground/5 p-3 border border-border/40">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
          <Heart className="h-3 w-3" />
          Detected Mood
        </div>
        <div className="text-sm font-medium">{mood || "—"}</div>
      </div>

      {/* BPM + Energy grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-foreground/5 p-3 border border-border/40">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <Gauge className="h-3 w-3" />
            BPM
          </div>
          <div className="text-xl font-semibold tabular-nums">
            {bpm > 0 ? bpm : "—"}
          </div>
        </div>
        <div className="rounded-xl bg-foreground/5 p-3 border border-border/40">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <Zap className="h-3 w-3" />
            Energy
          </div>
          <div className="text-xl font-semibold tabular-nums">
            {Math.round(energy * 100)}
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Meters */}
      <div className="space-y-3">
        <Meter
          label="Bass"
          value={bass}
          icon={Waves}
          color="linear-gradient(90deg,#a855f7,#7c3aed)"
        />
        <Meter
          label="Mid"
          value={mid}
          icon={Music2}
          color="linear-gradient(90deg,#3b82f6,#06b6d4)"
        />
        <Meter
          label="Treble"
          value={treble}
          icon={Activity}
          color="linear-gradient(90deg,#22d3ee,#84cc16)"
        />
        <Meter
          label="Volume"
          value={volume}
          icon={Gauge}
          color="linear-gradient(90deg,#f59e0b,#ef4444)"
        />
      </div>

      {/* Spectrum mini */}
      {spectrum && (
        <div className="rounded-xl bg-background/60 border border-border/40 p-2">
          <SpectrumBars spectrum={spectrum} beat={f?.beat ?? false} />
        </div>
      )}

      {/* Selected style + mode */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Art Style</span>
          <span className="font-medium">{styleLabel}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Mode</span>
          <span className="font-medium">{modeLabel}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Status</span>
          <span className="font-medium text-[var(--sonora-accent)]">
            {generationStatus}
          </span>
        </div>
      </div>
    </div>
  );
}

function SpectrumBars({
  spectrum,
  beat,
}: {
  spectrum: Uint8Array;
  beat: boolean;
}) {
  // Show ~48 bars by downsampling
  const bars = 48;
  const items: number[] = [];
  const step = Math.floor(spectrum.length / bars);
  for (let i = 0; i < bars; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) sum += spectrum[i * step + j] || 0;
    items.push(sum / (step * 255));
  }
  return (
    <div
      className={cn(
        "flex items-end gap-[2px] h-16 transition-opacity",
        beat && "scale-y-105"
      )}
    >
      {items.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-sonora-gradient origin-bottom"
          style={{
            height: `${Math.max(2, v * 100)}%`,
            opacity: 0.4 + v * 0.6,
            transition: "height 60ms linear",
          }}
        />
      ))}
    </div>
  );
}
