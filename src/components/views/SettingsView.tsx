"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Palette,
  Monitor,
  Type,
  Gauge,
  Brush,
  Volume2,
  Download,
  Database,
  Trash2,
  Check,
} from "lucide-react";
import { useSonoraStore } from "@/lib/store";
import {
  ACCENT_PRESETS,
  AccentPreset,
  ART_STYLES,
  COLOR_PALETTES,
  GenerationMode,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  clearAllArtworkImages,
  getStorageEstimate,
} from "@/lib/storage";

export function SettingsView() {
  const {
    settings,
    updateSettings,
    setAccent,
    removeProject,
    projects,
  } = useSonoraStore();

  const [usage, setUsage] = useState<{ usage: number; quota: number }>({
    usage: 0,
    quota: 0,
  });

  useEffect(() => {
    getStorageEstimate().then(setUsage);
  }, [projects.length]);

  // Apply accent CSS variables live
  useEffect(() => {
    const preset = ACCENT_PRESETS[settings.accent];
    const root = document.documentElement;
    root.style.setProperty("--sonora-accent", preset.accent);
    root.style.setProperty("--sonora-accent-2", preset.accent2);
    root.style.setProperty(
      "--sonora-accent-soft",
      `${preset.accent.replace("oklch(", "oklch(").replace(")", " / 0.18)")}`
    );
  }, [settings.accent]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [settings.theme]);

  // Apply font scale
  useEffect(() => {
    const root = document.documentElement;
    const scale =
      settings.fontScale === "sm" ? "14px" : settings.fontScale === "lg" ? "18px" : "16px";
    root.style.fontSize = scale;
  }, [settings.fontScale]);

  const handleClearAll = async () => {
    if (
      !confirm(
        `Delete all ${projects.length} saved artworks? This cannot be undone.`
      )
    )
      return;
    await clearAllArtworkImages();
    projects.forEach((p) => removeProject(p.id));
    toast.success("All artwork cleared");
    getStorageEstimate().then(setUsage);
  };

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          <span className="text-gradient">Settings</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the appearance and behavior of SONORA. Changes apply
          instantly and persist across sessions.
        </p>
      </div>

      <SettingsCard icon={Palette} title="Appearance">
        <Row label="Theme" desc="Switch between dark and light interface">
          <ToggleGroup
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v as "dark" | "light" })}
          />
        </Row>
        <Row label="Accent color" desc="Used throughout the interface">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACCENT_PRESETS) as AccentPreset[]).map((key) => (
              <button
                key={key}
                onClick={() => setAccent(key)}
                className={cn(
                  "h-8 w-8 rounded-full border-2 grid place-items-center transition-all",
                  settings.accent === key
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105"
                )}
                style={{
                  background: `linear-gradient(135deg, ${ACCENT_PRESETS[key].accent}, ${ACCENT_PRESETS[key].accent2})`,
                }}
                title={ACCENT_PRESETS[key].name}
              >
                {settings.accent === key && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Font size" desc="Base interface font size">
          <ToggleGroup
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
            value={settings.fontScale}
            onChange={(v) =>
              updateSettings({ fontScale: v as "sm" | "md" | "lg" })
            }
          />
        </Row>
      </SettingsCard>

      <SettingsCard icon={Gauge} title="Performance">
        <Row
          label="Canvas quality"
          desc="Higher quality uses more GPU/CPU"
        >
          <ToggleGroup
            options={[
              { value: "standard", label: "Standard" },
              { value: "high", label: "High" },
              { value: "ultra", label: "Ultra" },
            ]}
            value={settings.canvasQuality}
            onChange={(v) =>
              updateSettings({
                canvasQuality: v as "standard" | "high" | "ultra",
              })
            }
          />
        </Row>
        <Row
          label="Animation performance"
          desc="Eco reduces particles and effects for slower devices"
        >
          <ToggleGroup
            options={[
              { value: "eco", label: "Eco" },
              { value: "balanced", label: "Balanced" },
              { value: "performance", label: "Performance" },
            ]}
            value={settings.animationPerformance}
            onChange={(v) =>
              updateSettings({
                animationPerformance: v as "eco" | "balanced" | "performance",
              })
            }
          />
        </Row>
      </SettingsCard>

      <SettingsCard icon={Brush} title="Defaults">
        <Row label="Default generation mode" desc="Used when starting a new creation">
          <ToggleGroup
            options={[
              { value: "procedural", label: "Procedural" },
              { value: "ai", label: "AI" },
            ]}
            value={settings.defaultMode}
            onChange={(v) =>
              updateSettings({ defaultMode: v as GenerationMode })
            }
          />
        </Row>
        <Row label="Default art style" desc="Selected when you open the studio">
          <select
            value={settings.defaultStyle}
            onChange={(e) =>
              updateSettings({ defaultStyle: e.target.value as typeof settings.defaultStyle })
            }
            className="bg-background/60 border border-border/70 rounded-lg px-3 py-2 text-sm"
          >
            {ART_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Default palette" desc="Color palette for new creations">
          <select
            value={settings.defaultPalette}
            onChange={(e) =>
              updateSettings({
                defaultPalette: e.target.value as typeof settings.defaultPalette,
              })
            }
            className="bg-background/60 border border-border/70 rounded-lg px-3 py-2 text-sm"
          >
            {COLOR_PALETTES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Row>
      </SettingsCard>

      <SettingsCard icon={Volume2} title="Audio">
        <Row label="Default volume" desc="Initial playback volume">
          <div className="w-48">
            <Slider
              value={[settings.defaultVolume * 100]}
              max={100}
              step={1}
              onValueChange={(v) =>
                updateSettings({ defaultVolume: v[0] / 100 })
              }
            />
            <div className="text-xs text-muted-foreground mt-1 tabular-nums">
              {Math.round(settings.defaultVolume * 100)}%
            </div>
          </div>
        </Row>
        <Row
          label="Auto-start on play"
          desc="Begin AI generation when playback starts (AI mode only)"
        >
          <Switch
            checked={settings.autoStartOnPlay}
            onCheckedChange={(c) => updateSettings({ autoStartOnPlay: c })}
          />
        </Row>
      </SettingsCard>

      <SettingsCard icon={Download} title="Export">
        <Row
          label="PNG export scale"
          desc="Multiplier for exported image resolution"
        >
          <ToggleGroup
            options={[
              { value: "1", label: "1×" },
              { value: "2", label: "2×" },
              { value: "3", label: "3×" },
            ]}
            value={String(settings.exportScale)}
            onChange={(v) => updateSettings({ exportScale: Number(v) })}
          />
        </Row>
      </SettingsCard>

      <SettingsCard icon={Database} title="Storage">
        <Row
          label="Browser storage"
          desc="Used by your saved artworks (IndexedDB + localStorage)"
        >
          <div className="text-right">
            <div className="text-sm tabular-nums">
              {formatBytes(usage.usage)}{" "}
              <span className="text-muted-foreground">
                / {formatBytes(usage.quota)}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {projects.length} saved creation
              {projects.length === 1 ? "" : "s"}
            </div>
          </div>
        </Row>
        <Row
          label="Clear all data"
          desc="Permanently delete all saved artworks"
        >
          <Button
            variant="outline"
            onClick={handleClearAll}
            disabled={projects.length === 0}
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </Button>
        </Row>
      </SettingsCard>

      <SettingsCard icon={SettingsIcon} title="About">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">SONORA</strong> · Music-to-Art
            AI Studio · v1.0
          </p>
          <p>
            A premium creative application that transforms music into living
            artwork using real-time Web Audio API analysis, procedural
            generative rendering, and optional AI image generation.
          </p>
          <p className="text-xs">
            Cross-platform: works in any modern browser (Chrome, Edge, Firefox,
            Safari 14+) on macOS, Windows, and Linux. Audio analysis runs
            entirely in your browser.
          </p>
          <div className="pt-3 border-t border-border/60">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              AI Provider setup
            </div>
            <p className="text-xs leading-relaxed">
              To enable AI artwork generation, create a{" "}
              <code className="text-[var(--sonora-accent)]">.env</code> file in
              the project root with your{" "}
              <code className="text-[var(--sonora-accent)]">ZAI_API_KEY</code>.
              Without it, SONORA falls back to a server-side procedural image
              so the workflow still works end-to-end. API keys are read only on
              the server and never exposed to the browser.
            </p>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl border border-border/60 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border/60 bg-foreground/[0.02]">
        <Icon className="h-4 w-4 text-[var(--sonora-accent)]" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-border/40">{children}</div>
    </motion.div>
  );
}

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc && (
          <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex p-1 rounded-lg bg-foreground/5 border border-border/40">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            value === o.value
              ? "bg-sonora-gradient text-white shadow-sonora"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
