"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { AudioFeatures, ArtStyleId, ColorPaletteId } from "@/lib/types";
import { ProceduralEngine } from "@/lib/procedural-engine";
import { cn } from "@/lib/utils";

export interface ArtCanvasHandle {
  getEngine: () => ProceduralEngine | null;
  getCanvas: () => HTMLCanvasElement | null;
  clear: () => void;
}

interface ArtCanvasProps {
  features: React.MutableRefObject<AudioFeatures | null>;
  styleId: ArtStyleId;
  paletteId: ColorPaletteId;
  intensity: number;
  animSpeed: number;
  performance: "eco" | "balanced" | "performance";
  active: boolean; // whether to render
  className?: string;
  onReady?: (engine: ProceduralEngine) => void;
}

export const ArtCanvas = forwardRef<ArtCanvasHandle, ArtCanvasProps>(
  function ArtCanvas(
    {
      features,
      styleId,
      paletteId,
      intensity,
      animSpeed,
      performance,
      active,
      className,
      onReady,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<ProceduralEngine | null>(null);
    const rafRef = useRef<number | null>(null);

    // Initialize engine
    useEffect(() => {
      if (!canvasRef.current) return;
      const engine = new ProceduralEngine(canvasRef.current, {
        styleId,
        paletteId,
        intensity,
        animSpeed,
        performance,
      });
      engineRef.current = engine;
      onReady?.(engine);

      const loop = () => {
        const f = features.current;
        if (f && active) {
          engine.update(f);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      // Resize observer
      const ro = new ResizeObserver(() => engine.resize());
      ro.observe(canvasRef.current);

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        ro.disconnect();
        engine.dispose();
        engineRef.current = null;
      };
    }, []);

    // Sync options
    useEffect(() => {
      engineRef.current?.setOptions({
        styleId,
        paletteId,
        intensity,
        animSpeed,
        performance,
      });
    }, [styleId, paletteId, intensity, animSpeed, performance]);

    useImperativeHandle(ref, () => ({
      getEngine: () => engineRef.current,
      getCanvas: () => canvasRef.current,
      clear: () => engineRef.current?.clear(),
    }));

    return (
      <canvas
        ref={canvasRef}
        className={cn(
          "block w-full h-full rounded-2xl",
          className
        )}
        style={{ background: "transparent" }}
      />
    );
  }
);
