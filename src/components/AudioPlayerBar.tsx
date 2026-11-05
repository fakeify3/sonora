"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Volume1,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioPlayerBarProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  title?: string;
  artist?: string;
  coverUrl?: string;
  onPlayStateChange?: (playing: boolean) => void;
  defaultVolume?: number;
  className?: string;
}

function formatTime(t: number): string {
  if (!isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayerBar({
  audioRef,
  title,
  artist,
  coverUrl,
  onPlayStateChange,
  defaultVolume = 0.8,
  className,
}: AudioPlayerBarProps) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(defaultVolume);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);

  // Wire up audio events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onDur = () => setDuration(el.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      onPlayStateChange?.(true);
    };
    const onPause = () => {
      setPlaying(false);
      onPlayStateChange?.(false);
    };
    const onLoaded = () => {
      setReady(true);
      setDuration(el.duration || 0);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("durationchange", onDur);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.volume = defaultVolume;
    // Check if metadata already loaded (HMTLMediaElement readyState >= 1)
    if (el.readyState >= 1) {
      setReady(true);
      if (isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
      }
    }
    if (!el.paused) {
      setPlaying(true);
      onPlayStateChange?.(true);
    }
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", onDur);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (el.paused) {
        await el.play();
      } else {
        el.pause();
      }
    } catch (e) {
      console.warn("play failed", e);
    }
  };

  const stop = () => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  };

  const seek = (val: number[]) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = (val[0] / 100) * duration;
    setCurrent(el.currentTime);
  };

  const setVolume = (val: number[]) => {
    const el = audioRef.current;
    if (!el) return;
    const v = val[0] / 100;
    el.volume = v;
    el.muted = false;
    setVolumeState(v);
    setMuted(false);
  };

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={cn(
        "glass-strong rounded-2xl border border-border/60 px-4 py-3",
        "flex items-center gap-4 flex-wrap",
        className
      )}
    >
      {/* Cover + meta */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden bg-sonora-gradient grid place-items-center">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title || "track"}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate max-w-[200px] sm:max-w-[280px]">
            {title || "No track loaded"}
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[280px]">
            {artist || "—"}
          </div>
        </div>
      </div>

      {/* Transport + seek */}
      <div className="flex items-center gap-3 flex-[2] min-w-[260px]">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-foreground/10"
            onClick={togglePlay}
            disabled={!ready}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 translate-x-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-foreground/10"
            onClick={stop}
            disabled={!ready}
            aria-label="Stop"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="text-xs tabular-nums text-muted-foreground w-12 text-right">
          {formatTime(current)}
        </div>
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={seek}
          className="flex-1"
          disabled={!ready || duration === 0}
        />
        <div className="text-xs tabular-nums text-muted-foreground w-12">
          {formatTime(duration)}
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-[140px]">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-foreground/10"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          <VolIcon className="h-4 w-4" />
        </Button>
        <Slider
          value={[muted ? 0 : volume * 100]}
          max={100}
          step={1}
          onValueChange={setVolume}
          className="flex-1"
        />
      </div>
    </div>
  );
}
