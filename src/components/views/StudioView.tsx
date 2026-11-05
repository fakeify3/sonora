"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Wand2,
  Brush,
  Cpu,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  Loader2,
  Sparkles,
  Save,
  Info,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useSonoraStore } from "@/lib/store";
import {
  ART_STYLES,
  ArtStyleId,
  AudioFeatures,
  ColorPaletteId,
  ColorPalette,
  COLOR_PALETTES,
  GenerationMode,
  TrackInfo,
} from "@/lib/types";
import { AudioEngine } from "@/lib/audio-engine";
import { ArtCanvas, ArtCanvasHandle } from "@/components/ArtCanvas";
import { AudioPlayerBar } from "@/components/AudioPlayerBar";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  exportPNG,
  downloadBlob,
  startVideoRecording,
  getVideoExtension,
  VideoRecorderHandle,
} from "@/lib/export-utils";
import { saveArtworkImage } from "@/lib/storage";

interface StreamingEmbed {
  platform: "spotify" | "youtube" | "soundcloud";
  embedUrl?: string;
  trackId?: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  note?: string;
}

interface StudioViewProps {
  onSavedProject?: () => void;
}

export function StudioView({ onSavedProject }: StudioViewProps) {
  const {
    settings,
    selectedMode,
    setMode,
    selectedStyle,
    setStyle,
    selectedPalette,
    setPalette,
    intensity,
    setIntensity,
    animSpeed,
    setAnimSpeed,
    upsertProject,
  } = useSonoraStore();

  // Audio element + engine
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const canvasHandleRef = useRef<ArtCanvasHandle>(null);
  const featuresRef = useRef<AudioFeatures | null>(null);
  const recorderRef = useRef<VideoRecorderHandle | null>(null);

  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [streaming, setStreaming] = useState<StreamingEmbed | null>(null);
  const [playing, setPlaying] = useState(false);
  const [featuresTick, setFeaturesTick] = useState(0);
  const [mood, setMood] = useState("—");
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("Idle");
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [aiFallback, setAiFallback] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [embedNoteOpen, setEmbedNoteOpen] = useState(true);

  // Init AudioEngine once
  useEffect(() => {
    engineRef.current = new AudioEngine();
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Per-frame analysis loop
  useEffect(() => {
    if (!engineRef.current) return;
    let lastTick = 0;
    engineRef.current.start((f) => {
      featuresRef.current = f;
      const now = performance.now();
      if (now - lastTick > 66) {
        lastTick = now;
        setFeaturesTick((t) => (t + 1) % 1_000_000);
        const m = engineRef.current?.estimateMood(f);
        if (m) setMood(m);
      }
    });
  }, []);

  // Sync volume
  useEffect(() => {
    engineRef.current?.setVolume(settings.defaultVolume);
  }, [settings.defaultVolume]);

  const handleFileLoaded = useCallback(
    async (file: File, info: TrackInfo) => {
      setAudioFile(file);
      setTrack(info);
      setStreaming(null);
      setAiImageUrl(null);
      setGenStatus("Ready — press play");
      canvasHandleRef.current?.clear();
      if (audioRef.current && engineRef.current) {
        await engineRef.current.attach(audioRef.current);
      }
    },
    []
  );

  const handleLinkResolved = useCallback(
    (platform: StreamingEmbed["platform"], data: StreamingEmbed) => {
      setStreaming({ ...data, platform });
      setTrack({
        title: data.title || "Streaming Track",
        artist:
          data.artist ||
          platform.charAt(0).toUpperCase() + platform.slice(1),
        duration: 0,
        format: platform,
        source: platform,
        sourceUrl: data.embedUrl,
        coverUrl: data.thumbnail,
      });
      setAudioFile(null);
      setAiImageUrl(null);
      setGenStatus("Streaming — preview mode");
      setEmbedNoteOpen(true);
    },
    []
  );

  const runAIGeneration = useCallback(async () => {
    if (!track) {
      toast.error("Load a track first");
      return;
    }
    setGenerating(true);
    setGenStatus("Analyzing music…");
    try {
      const f = featuresRef.current;
      const prompt = buildAIPrompt(track, mood, f);
      setGenStatus("Requesting artwork from AI…");
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
          palette: selectedPalette,
          width: 1024,
          height: 1024,
        }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || "Generation failed");
      setAiImageUrl(data.image);
      setAiFallback(!!data.fallback);
      if (data.fallback) {
        setGenStatus("Procedural fallback");
        toast.info(
          data.note ||
            "AI provider unavailable — showing procedural fallback. Configure ZAI_API_KEY in .env to enable AI generation."
        );
      } else {
        setGenStatus("Artwork ready");
        toast.success("AI artwork generated");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      toast.error(msg);
      setGenStatus("Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [track, mood, selectedStyle, selectedPalette]);

  const handlePlayState = useCallback(
    (isPlaying: boolean) => {
      setPlaying(isPlaying);
      if (
        isPlaying &&
        settings.autoStartOnPlay &&
        selectedMode === "ai" &&
        !aiImageUrl
      ) {
        void runAIGeneration();
      }
    },
    [settings.autoStartOnPlay, selectedMode, aiImageUrl]
  );

  const handleExportPNG = useCallback(() => {
    if (selectedMode === "procedural") {
      const engine = canvasHandleRef.current?.getEngine();
      if (!engine) return;
      exportPNG(engine, settings.exportScale, `sonora-${Date.now()}.png`);
      toast.success("PNG exported");
    } else if (aiImageUrl) {
      const a = document.createElement("a");
      a.href = aiImageUrl;
      a.download = `sonora-ai-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Artwork downloaded");
    } else {
      toast.error("Generate artwork first");
    }
  }, [selectedMode, aiImageUrl, settings.exportScale]);

  const handleStartVideo = useCallback(async () => {
    const canvas = canvasHandleRef.current?.getCanvas();
    if (!canvas) {
      toast.error("Canvas not ready");
      return;
    }
    if (recording) {
      const blob = await recorderRef.current?.stop();
      recorderRef.current = null;
      setRecording(false);
      if (blob) {
        const ext = getVideoExtension();
        downloadBlob(blob, `sonora-video-${Date.now()}.${ext}`);
        toast.success(`Video exported (${ext.toUpperCase()})`);
      }
      return;
    }
    if (selectedMode === "ai" && !aiImageUrl) {
      toast.error("Generate AI artwork first");
      return;
    }
    const handle = startVideoRecording(canvas, audioRef.current, 30);
    if (!handle) {
      toast.error(
        "Video recording is not supported in this browser. Try Chrome, Edge, or Firefox on desktop."
      );
      return;
    }
    recorderRef.current = handle;
    setRecording(true);
    toast.info(
      "Recording started — click Stop when you're done (max ~3 minutes recommended)."
    );
  }, [recording, selectedMode, aiImageUrl]);

  const handleSave = useCallback(async () => {
    const engine = canvasHandleRef.current?.getEngine();
    if (!engine || !track) {
      toast.error("Nothing to save yet — create some art first");
      return;
    }
    const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const thumbnail = engine.exportPaintLayer(0.4);
    const fullImage = engine.exportPaintLayer(settings.exportScale);
    await saveArtworkImage(id, fullImage);
    const f = featuresRef.current;
    upsertProject({
      id,
      title: `${track.title} — ${selectedStyle}`,
      trackTitle: track.title,
      trackArtist: track.artist,
      styleId: selectedStyle,
      paletteId: selectedPalette,
      mode: selectedMode,
      thumbnail,
      durationSec: track.duration,
      createdAt: Date.now(),
      bpm: f?.bpm,
      mood,
    });
    toast.success("Saved to your gallery");
    onSavedProject?.();
  }, [
    track,
    selectedStyle,
    selectedPalette,
    selectedMode,
    settings.exportScale,
    mood,
    upsertProject,
    onSavedProject,
  ]);

  const handleClear = useCallback(() => {
    canvasHandleRef.current?.clear();
    setAiImageUrl(null);
    setGenStatus("Idle");
    toast.info("Canvas cleared");
  }, []);

  const currentFeatures = featuresRef.current;
  void featuresTick;

  const styleDef = ART_STYLES.find((s) => s.id === selectedStyle)!;

  const embedIframe = useMemo(() => {
    if (!streaming?.embedUrl) return null;
    const src = streaming.embedUrl;
    if (streaming.platform === "spotify") {
      return (
        <iframe
          src={src}
          width="100%"
          height="152"
          frameBorder={0}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
          title="Spotify Player"
        />
      );
    }
    if (streaming.platform === "youtube") {
      return (
        <iframe
          src={src}
          width="100%"
          height="200"
          frameBorder={0}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="rounded-xl"
          title="YouTube Player"
        />
      );
    }
    if (streaming.platform === "soundcloud") {
      return (
        <iframe
          src={src}
          width="100%"
          height="166"
          frameBorder={0}
          allow="autoplay"
          loading="lazy"
          className="rounded-xl"
          title="SoundCloud Player"
        />
      );
    }
    return null;
  }, [streaming]);

  return (
    <div className="flex flex-col h-full min-h-0 gap-3 p-3 md:p-4 lg:p-5">
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" />

      {!track && (
        <div className="flex-1 flex items-center justify-center min-h-0 overflow-y-auto">
          <div className="w-full max-w-2xl py-6">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex h-14 w-14 rounded-2xl bg-sonora-gradient items-center justify-center shadow-sonora mb-4"
              >
                <Wand2 className="h-6 w-6 text-white" />
              </motion.div>
              <h2 className="text-2xl md:text-3xl font-semibold">
                Begin your <span className="text-gradient">creation</span>
              </h2>
              <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
                Upload an audio file or paste a streaming link. SONORA analyzes
                the music in real time and transforms it into living artwork.
              </p>
            </div>
            <UploadZone
              onFileLoaded={handleFileLoaded}
              onLinkResolved={handleLinkResolved}
              audioEngineRef={engineRef}
              audioRef={audioRef}
            />
            <div className="mt-6 grid sm:grid-cols-3 gap-3 text-xs">
              <FeatureNote
                icon={Cpu}
                title="Real analysis"
                desc="Web Audio API extracts BPM, beats, frequency bands, and mood from your actual audio."
              />
              <FeatureNote
                icon={Brush}
                title="Two engines"
                desc="Procedural generative art reacts live; AI mode composes a unique artwork inspired by the music."
              />
              <FeatureNote
                icon={Sparkles}
                title="Three styles"
                desc="Painterly, Abstract, and Sketch/Watercolor — each with distinct visual behavior."
              />
            </div>
          </div>
        </div>
      )}

      {track && (
        <>
          <div className="flex items-center gap-3 glass rounded-xl border border-border/60 px-3 py-2 flex-wrap">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="h-9 w-9 rounded-lg overflow-hidden bg-sonora-gradient grid place-items-center shrink-0">
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">
                  {track.title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {track.artist} · {track.format.toUpperCase()}
                  {track.duration > 0 &&
                    ` · ${Math.floor(track.duration / 60)}:${Math.floor(
                      track.duration % 60
                    )
                      .toString()
                      .padStart(2, "0")}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setTrack(null);
                  setAudioFile(null);
                  setStreaming(null);
                  setAiImageUrl(null);
                  canvasHandleRef.current?.clear();
                  if (audioRef.current) audioRef.current.pause();
                }}
              >
                Change track
              </Button>
            </div>
          </div>

          {streaming && embedNoteOpen && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--sonora-accent)]/10 border border-[var(--sonora-accent)]/30 text-xs">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-[var(--sonora-accent)]" />
              <div className="flex-1">
                <strong>Streaming preview mode:</strong>{" "}
                {streaming.note ||
                  "Use the embedded player to listen. Raw audio is not exposed by streaming platforms, so SONORA's procedural engine runs in preview mode. For full reactivity, upload the audio file directly."}
              </div>
              <button
                onClick={() => setEmbedNoteOpen(false)}
                className="p-1 hover:bg-foreground/10 rounded"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex-1 flex gap-3 min-h-0">
            <aside
              className={`hidden md:flex flex-col w-[280px] shrink-0 overflow-hidden transition-opacity duration-200 ${
                showLeftPanel ? "opacity-100" : "opacity-0 w-0 !w-0 pointer-events-none"
              }`}
            >
              <div className="glass rounded-2xl border border-border/60 p-4 space-y-4 flex-1 overflow-y-auto no-scrollbar">
                    <div>
                      <SectionLabel>Generation Mode</SectionLabel>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <ModeButton
                          active={selectedMode === "procedural"}
                          onClick={() => setMode("procedural")}
                          icon={Brush}
                          label="Procedural"
                          desc="Live generative"
                        />
                        <ModeButton
                          active={selectedMode === "ai"}
                          onClick={() => setMode("ai")}
                          icon={Cpu}
                          label="AI"
                          desc="Generated artwork"
                        />
                      </div>
                    </div>

                    <div>
                      <SectionLabel>Art Style</SectionLabel>
                      <div className="space-y-1.5 mt-2">
                        {ART_STYLES.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setStyle(s.id as ArtStyleId)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg border text-sm transition-all",
                              selectedStyle === s.id
                                ? "border-[var(--sonora-accent)] bg-sonora-accent-soft"
                                : "border-border/60 hover:bg-foreground/5"
                            )}
                          >
                            <div className="font-medium">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {s.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <SectionLabel>Color Palette</SectionLabel>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {COLOR_PALETTES.map((p) => (
                          <PaletteButton
                            key={p.id}
                            palette={p}
                            active={selectedPalette === p.id}
                            onClick={() => setPalette(p.id as ColorPaletteId)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <SectionLabel className="mb-0">Intensity</SectionLabel>
                          <span className="text-muted-foreground tabular-nums">
                            {Math.round(intensity * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[intensity * 100]}
                          max={100}
                          step={1}
                          onValueChange={(v) => setIntensity(v[0] / 100)}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <SectionLabel className="mb-0">
                            Animation Speed
                          </SectionLabel>
                          <span className="text-muted-foreground tabular-nums">
                            {Math.round(animSpeed * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[animSpeed * 100]}
                          max={100}
                          step={1}
                          onValueChange={(v) => setAnimSpeed(v[0] / 100)}
                        />
                      </div>
                    </div>

                    {selectedMode === "ai" && (
                      <div className="pt-2 border-t border-border/60">
                        <Button
                          className="w-full bg-sonora-gradient text-white hover:brightness-110 shadow-sonora"
                          onClick={runAIGeneration}
                          disabled={generating || !track}
                        >
                          {generating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          {generating ? "Generating…" : "Generate Artwork"}
                        </Button>
                        {aiFallback && (
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Using procedural fallback. Configure{" "}
                            <code className="text-[var(--sonora-accent)]">
                              ZAI_API_KEY
                            </code>{" "}
                            in{" "}
                            <code className="text-[var(--sonora-accent)]">
                              .env
                            </code>{" "}
                            for full AI mode.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
            </aside>

            <main className="flex-1 min-w-0 flex flex-col gap-3">
              <div className="relative flex-1 min-h-[300px] rounded-2xl overflow-hidden glass border border-border/60">
                <button
                  onClick={() => setShowLeftPanel((v) => !v)}
                  className="hidden md:flex absolute top-3 left-3 z-20 h-7 w-7 rounded-lg glass items-center justify-center hover:bg-foreground/10 transition-colors"
                  aria-label="Toggle controls"
                >
                  <ChevronLeft
                    className={cn(
                      "h-4 w-4 transition-transform",
                      !showLeftPanel && "rotate-180"
                    )}
                  />
                </button>
                <button
                  onClick={() => setShowRightPanel((v) => !v)}
                  className="hidden md:flex absolute top-3 right-3 z-20 h-7 w-7 rounded-lg glass items-center justify-center hover:bg-foreground/10 transition-colors"
                  aria-label="Toggle analysis"
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      !showRightPanel && "rotate-180"
                    )}
                  />
                </button>

                {selectedMode === "ai" ? (
                  <AIArtworkDisplay
                    imageUrl={aiImageUrl}
                    generating={generating}
                    playing={playing}
                    featuresRef={featuresRef}
                  />
                ) : (
                  <ArtCanvas
                    ref={canvasHandleRef}
                    features={featuresRef}
                    styleId={selectedStyle}
                    paletteId={selectedPalette}
                    intensity={intensity}
                    animSpeed={animSpeed}
                    performance={settings.animationPerformance}
                    active={playing || !!featuresRef.current}
                    className="absolute inset-0"
                  />
                )}

                {recording && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full glass-strong text-xs font-medium">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Recording…
                  </div>
                )}

                {!playing &&
                  !aiImageUrl &&
                  selectedMode === "procedural" && (
                    <div className="absolute inset-0 pointer-events-none grid place-items-center">
                      <div className="text-center text-muted-foreground/70 text-sm">
                        <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-60" />
                        Press play to begin painting
                      </div>
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPNG}
                  className="gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartVideo}
                  className={cn(
                    "gap-2",
                    recording && "border-red-500/60 text-red-500"
                  )}
                >
                  {recording ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      Stop & Save
                    </>
                  ) : (
                    <>
                      <VideoIcon className="h-4 w-4" />
                      Video
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="gap-2 text-muted-foreground ml-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>

              <AudioPlayerBar
                audioRef={audioRef}
                title={track.title}
                artist={track.artist}
                coverUrl={track.coverUrl}
                onPlayStateChange={handlePlayState}
                defaultVolume={settings.defaultVolume}
              />

              {streaming && embedIframe && (
                <div className="glass rounded-2xl border border-border/60 p-3">
                  {embedIframe}
                </div>
              )}
            </main>

            <aside
              className={`hidden lg:flex flex-col w-[280px] shrink-0 overflow-hidden transition-opacity duration-200 ${
                showRightPanel ? "opacity-100" : "opacity-0 w-0 !w-0 pointer-events-none"
              }`}
            >
              <AnalysisPanel
                features={currentFeatures}
                mood={mood}
                styleLabel={styleDef.name}
                modeLabel={
                  selectedMode === "ai"
                    ? "AI Generation"
                    : "Procedural"
                }
                generationStatus={genStatus}
                className="flex-1 overflow-y-auto no-scrollbar"
              />
            </aside>
          </div>

          <MobileStudioControls
            selectedMode={selectedMode}
            setMode={setMode}
            selectedStyle={selectedStyle}
            setStyle={setStyle}
            selectedPalette={selectedPalette}
            setPalette={setPalette}
            intensity={intensity}
            setIntensity={setIntensity}
            animSpeed={animSpeed}
            setAnimSpeed={setAnimSpeed}
            onGenerate={runAIGeneration}
            generating={generating}
          />
        </>
      )}
    </div>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium",
        className
      )}
    >
      {children}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-all",
        active
          ? "border-[var(--sonora-accent)] bg-sonora-accent-soft"
          : "border-border/60 hover:bg-foreground/5"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          active ? "text-[var(--sonora-accent)]" : "text-muted-foreground"
        )}
      />
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[10px] text-muted-foreground">{desc}</div>
    </button>
  );
}

function PaletteButton({
  palette,
  active,
  onClick,
}: {
  palette: ColorPalette;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1.5 p-2 rounded-lg border text-left transition-all",
        active
          ? "border-[var(--sonora-accent)] bg-sonora-accent-soft"
          : "border-border/60 hover:bg-foreground/5"
      )}
      title={palette.description}
    >
      <div className="flex h-5 w-full overflow-hidden rounded">
        {palette.colors.map((c) => (
          <div key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="text-[11px] font-medium leading-tight">
        {palette.name}
      </div>
    </button>
  );
}

function FeatureNote({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass rounded-xl p-3 border border-border/60">
      <Icon className="h-4 w-4 text-[var(--sonora-accent)] mb-1.5" />
      <div className="font-medium mb-0.5">{title}</div>
      <p className="text-muted-foreground leading-snug">{desc}</p>
    </div>
  );
}

function AIArtworkDisplay({
  imageUrl,
  generating,
  playing,
  featuresRef,
}: {
  imageUrl: string | null;
  generating: boolean;
  playing: boolean;
  audioFile: File | null;
  featuresRef: React.MutableRefObject<AudioFeatures | null>;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageUrl || !overlayRef.current || !imgRef.current) return;
    const canvas = overlayRef.current;
    const ctx = canvas.getContext("2d")!;
    let rafId: number;
    let revealed = 0;
    const loop = () => {
      const img = imgRef.current;
      if (!img) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      const w = img.clientWidth;
      const h = img.clientHeight;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      if (playing) {
        const f = featuresRef.current;
        const pace = 0.0018 + (f?.energy ?? 0) * 0.004;
        revealed = Math.min(1, revealed + pace);
      }
      if (revealed < 1) {
        ctx.fillStyle = "rgba(8, 8, 14, 0.92)";
        ctx.fillRect(0, 0, w, h * (1 - revealed));
        const grad = ctx.createLinearGradient(
          0,
          h * (1 - revealed) - 30,
          0,
          h * (1 - revealed) + 30
        );
        grad.addColorStop(0, "rgba(8,8,14,0)");
        grad.addColorStop(1, "rgba(8,8,14,0.92)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, h * (1 - revealed) - 30, w, 60);
        const f = featuresRef.current;
        if (f?.beat) {
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(0, h * (1 - revealed) - 4, w, 8);
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [imageUrl, playing, featuresRef]);

  if (generating) {
    return (
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="relative h-20 w-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-foreground/10" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--sonora-accent)] animate-spin" />
            <Sparkles className="absolute inset-0 m-auto h-7 w-7 text-[var(--sonora-accent)] animate-pulse-soft" />
          </div>
          <div className="text-sm font-medium">Composing your artwork…</div>
          <div className="text-xs text-muted-foreground mt-1">
            The AI is interpreting the music's mood, energy, and tempo.
          </div>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center max-w-sm px-6">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-sonora-gradient grid place-items-center shadow-sonora mb-3">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold">AI Generation Mode</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Click <strong>Generate Artwork</strong> to create a unique piece
            inspired by your music. Press play to reveal it stroke by stroke.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 grid place-items-center bg-black/40">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="AI generated artwork"
        className="max-h-full max-w-full object-contain"
      />
      <canvas
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none"
      />
    </div>
  );
}

function MobileStudioControls({
  selectedMode,
  setMode,
  selectedStyle,
  setStyle,
  selectedPalette,
  setPalette,
  intensity,
  setIntensity,
  animSpeed,
  setAnimSpeed,
  onGenerate,
  generating,
}: {
  selectedMode: GenerationMode;
  setMode: (m: GenerationMode) => void;
  selectedStyle: ArtStyleId;
  setStyle: (s: ArtStyleId) => void;
  selectedPalette: ColorPaletteId;
  setPalette: (p: ColorPaletteId) => void;
  intensity: number;
  setIntensity: (n: number) => void;
  animSpeed: number;
  setAnimSpeed: (n: number) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide controls" : "Show controls"}
      </Button>
      {open && (
        <div className="mt-2 glass rounded-2xl border border-border/60 p-4 space-y-4">
          <div>
            <SectionLabel>Mode</SectionLabel>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ModeButton
                active={selectedMode === "procedural"}
                onClick={() => setMode("procedural")}
                icon={Brush}
                label="Procedural"
                desc="Live"
              />
              <ModeButton
                active={selectedMode === "ai"}
                onClick={() => setMode("ai")}
                icon={Cpu}
                label="AI"
                desc="Generated"
              />
            </div>
          </div>
          <div>
            <SectionLabel>Style</SectionLabel>
            <select
              value={selectedStyle}
              onChange={(e) => setStyle(e.target.value as ArtStyleId)}
              className="mt-2 w-full bg-background/60 border border-border/70 rounded-lg px-3 py-2 text-sm"
            >
              {ART_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <SectionLabel>Palette</SectionLabel>
            <select
              value={selectedPalette}
              onChange={(e) => setPalette(e.target.value as ColorPaletteId)}
              className="mt-2 w-full bg-background/60 border border-border/70 rounded-lg px-3 py-2 text-sm"
            >
              {COLOR_PALETTES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <SectionLabel className="mb-0">Intensity</SectionLabel>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(intensity * 100)}%
              </span>
            </div>
            <Slider
              value={[intensity * 100]}
              max={100}
              step={1}
              onValueChange={(v) => setIntensity(v[0] / 100)}
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <SectionLabel className="mb-0">Animation Speed</SectionLabel>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(animSpeed * 100)}%
              </span>
            </div>
            <Slider
              value={[animSpeed * 100]}
              max={100}
              step={1}
              onValueChange={(v) => setAnimSpeed(v[0] / 100)}
            />
          </div>
          {selectedMode === "ai" && (
            <Button
              className="w-full bg-sonora-gradient text-white"
              onClick={onGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {generating ? "Generating…" : "Generate Artwork"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function buildAIPrompt(
  track: TrackInfo,
  mood: string,
  f: AudioFeatures | null
): string {
  const parts: string[] = [];
  parts.push(
    `A music-inspired artwork for the song "${track.title}" by ${track.artist}.`
  );
  if (mood && mood !== "—") parts.push(`Mood: ${mood}.`);
  if (f) {
    if (f.bpm > 0) parts.push(`Tempo: ${f.bpm} BPM.`);
    parts.push(
      `Energy: ${Math.round(f.energy * 100)}%. Bass-heavy: ${
        f.smoothBass > 0.4 ? "yes" : "no"
      }. Treble detail: ${Math.round(f.smoothTreble * 100)}%.`
    );
  }
  parts.push(
    "Create a single evocative visual artwork that captures the emotional essence of this music."
  );
  return parts.join(" ");
}
