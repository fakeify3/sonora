"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, Music, Link2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrackInfo } from "@/lib/types";
import { toast } from "sonner";

interface UploadZoneProps {
  onFileLoaded: (file: File, info: TrackInfo) => void;
  onLinkResolved?: (
    platform: "spotify" | "youtube" | "soundcloud",
    data: {
      embedUrl?: string;
      trackId?: string;
      title?: string;
      artist?: string;
      thumbnail?: string;
      note?: string;
    }
  ) => void;
  audioEngineRef?: React.RefObject<{
    loadFile: (
      file: File | Blob,
      el: HTMLAudioElement,
      info?: Partial<TrackInfo>
    ) => Promise<TrackInfo>;
  } | null>;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  variant?: "default" | "compact";
  className?: string;
}

const ACCEPTED = ".mp3,.wav,.flac,.m4a,.ogg,audio/*";

export function UploadZone({
  onFileLoaded,
  onLinkResolved,
  audioEngineRef,
  audioRef,
  variant = "default",
  className,
}: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const allowed = [
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/flac",
        "audio/x-flac",
        "audio/mp4",
        "audio/m4a",
        "audio/x-m4a",
        "audio/ogg",
        "audio/vorbis",
      ];
      const ext = file.name.split(".").pop()?.toLowerCase();
      const extOk = ["mp3", "wav", "flac", "m4a", "ogg"].includes(ext || "");
      if (!allowed.includes(file.type) && !extOk) {
        setError(
          `Unsupported file format: ${file.type || ext}. Use MP3, WAV, FLAC, M4A, or OGG.`
        );
        toast.error("Unsupported file format");
        return;
      }
      if (file.size > 80 * 1024 * 1024) {
        setError("File too large. Maximum 80 MB.");
        toast.error("File too large (max 80 MB)");
        return;
      }
      setFileLoading(true);
      toast.info(`Loading "${file.name}"…`);
      try {
        let info: TrackInfo;
        if (
          audioEngineRef?.current &&
          audioRef?.current &&
          audioEngineRef.current.loadFile
        ) {
          info = await audioEngineRef.current.loadFile(
            file,
            audioRef.current
          );
        } else {
          // Fallback: just create object URL + minimal info
          const url = URL.createObjectURL(file);
          info = {
            title: file.name.replace(/\.[^.]+$/, ""),
            artist: "Unknown Artist",
            duration: 0,
            format: ext || "audio",
            source: "upload",
            fileName: file.name,
            coverUrl: url,
          };
        }
        onFileLoaded(file, info);
        toast.success(`Loaded "${info.title}"`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load audio";
        setError(msg);
        toast.error(msg);
      } finally {
        setFileLoading(false);
      }
    },
    [audioEngineRef, audioRef, onFileLoaded]
  );

  const handleLink = useCallback(async () => {
    setError(null);
    if (!linkInput.trim()) return;
    setLinkLoading(true);
    try {
      const r = await fetch("/api/analyze-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkInput.trim() }),
      });
      const data = await r.json();
      if (!data.ok) {
        throw new Error(data.note || "Could not resolve link");
      }
      if (onLinkResolved) {
        onLinkResolved(data.platform, {
          embedUrl: data.embedUrl,
          trackId: data.trackId,
          title: data.title,
          artist: data.artist,
          thumbnail: data.thumbnail,
          note: data.note,
        });
      }
      toast.success(`${data.platform} link loaded`);
      setLinkInput("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to resolve link";
      setError(msg);
      toast.error(msg);
    } finally {
      setLinkLoading(false);
    }
  }, [linkInput, onLinkResolved]);

  const compact = variant === "compact";

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden",
          "group",
          dragOver
            ? "border-[var(--sonora-accent)] bg-sonora-accent-soft ring-sonora"
            : "border-border/70 hover:border-[var(--sonora-accent)]/60 hover:bg-foreground/[0.02]",
          compact ? "p-5" : "p-8 md:p-12"
        )}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute -inset-x-10 -top-20 h-32 opacity-50 blur-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, color-mix(in oklch, var(--sonora-accent) 30%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="relative flex flex-col items-center text-center gap-3">
          <motion.div
            animate={
              dragOver
                ? { y: -4, scale: 1.05 }
                : fileLoading
                ? { rotate: 360 }
                : { y: 0, scale: 1 }
            }
            transition={{ duration: fileLoading ? 1.5 : 0.3, repeat: fileLoading ? Infinity : 0, ease: "linear" }}
            className="h-14 w-14 rounded-2xl bg-sonora-gradient grid place-items-center shadow-sonora"
          >
            {fileLoading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6 text-white" />
            )}
          </motion.div>
          <div>
            <div className={cn("font-semibold", compact ? "text-base" : "text-lg")}>
              {dragOver
                ? "Drop your track to begin"
                : fileLoading
                ? "Loading audio…"
                : "Drop a track or click to upload"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              MP3 · WAV · FLAC · M4A · OGG — up to 80 MB
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
            <Music className="h-3 w-3" />
            <span>Analyzed locally with the Web Audio API</span>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Streaming link input */}
      {onLinkResolved && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <div className="flex-1 h-px bg-border/60" />
            <span className="uppercase tracking-wider">or paste a link</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="url"
                placeholder="https://open.spotify.com/track/… · youtube · soundcloud"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLink()}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-background/60 border border-border/70 text-sm focus:outline-none focus:border-[var(--sonora-accent)] focus:ring-1 focus:ring-[var(--sonora-accent)]/40 transition-colors"
                disabled={linkLoading}
              />
            </div>
            <button
              onClick={handleLink}
              disabled={linkLoading || !linkInput.trim()}
              className="px-4 py-2.5 rounded-lg bg-sonora-gradient text-white text-sm font-medium disabled:opacity-50 hover:brightness-110 transition-all shadow-sonora"
            >
              {linkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Load"
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
