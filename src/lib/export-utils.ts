"use client";

import { ProceduralEngine } from "./procedural-engine";

/**
 * Export utilities for SONORA.
 *
 * PNG: simply renders the current canvas at higher scale via the engine.
 * Video: uses MediaRecorder on canvas.captureStream(fps) combined with the
 *   audio track from the MediaElementAudioSourceNode's stream. This works
 *   in Chrome, Edge, and Firefox (with webm/vp9 or vp8). Safari has limited
 *   MediaRecorder support — see notes in startVideoRecording.
 */

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportPNG(
  engine: ProceduralEngine | null,
  scale: number,
  filename: string
): void {
  if (!engine) return;
  // Use paint layer (artwork only, no particles/atmosphere) for a clean image
  const dataUrl = engine.exportPaintLayer(scale);
  downloadDataUrl(dataUrl, filename);
}

export function exportFullCanvasPNG(
  canvas: HTMLCanvasElement | null,
  scale: number,
  filename: string
): void {
  if (!canvas) return;
  const tmp = document.createElement("canvas");
  tmp.width = canvas.clientWidth * scale;
  tmp.height = canvas.clientHeight * scale;
  const ctx = tmp.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
  downloadDataUrl(tmp.toDataURL("image/png"), filename);
}

export interface VideoRecorderHandle {
  stop: () => Promise<Blob | null>;
  cancel: () => void;
}

/**
 * Begin recording the canvas + the audio element's audio track.
 * Returns a handle to stop and retrieve the Blob.
 *
 * @param canvas The visual canvas (already running its own animation loop)
 * @param audioEl The HTMLAudioElement whose output we also want to capture
 * @param fps Frames per second for video
 */
export function startVideoRecording(
  canvas: HTMLCanvasElement,
  audioEl: HTMLAudioElement | null,
  fps = 30
): VideoRecorderHandle | null {
  // captureStream may need vendor prefix on some browsers
  const anyCanvas = canvas as HTMLCanvasElement & {
    captureStream?: (fps?: number) => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  let videoStream: MediaStream | null = null;
  try {
    videoStream = anyCanvas.captureStream
      ? anyCanvas.captureStream(fps)
      : anyCanvas.mozCaptureStream
      ? anyCanvas.mozCaptureStream()
      : null;
  } catch (e) {
    console.warn("captureStream not available", e);
    return null;
  }
  if (!videoStream) {
    return null;
  }

  // Try to also capture the audio element's audio output.
  // We use captureStream on the audio element if available.
  if (audioEl) {
    const anyAudio = audioEl as HTMLAudioElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    try {
      const audioStream =
        anyAudio.captureStream?.() || anyAudio.mozCaptureStream?.();
      if (audioStream) {
        audioStream.getAudioTracks().forEach((t) => videoStream!.addTrack(t));
      }
    } catch {
      /* Some browsers (notably Safari) don't support audio element captureStream. */
    }
  }

  // Pick the best supported mime type
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  let mimeType = "";
  for (const c of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(c)
    ) {
      mimeType = c;
      break;
    }
  }
  if (typeof MediaRecorder === "undefined") {
    console.warn("MediaRecorder not available in this browser");
    return null;
  }

  let recorder: MediaRecorder;
  try {
    recorder = mimeType
      ? new MediaRecorder(videoStream, { mimeType, videoBitsPerSecond: 6_000_000 })
      : new MediaRecorder(videoStream);
  } catch (e) {
    console.warn("MediaRecorder construction failed", e);
    return null;
  }

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  recorder.start(100); // collect chunks every 100ms

  return {
    stop: () =>
      new Promise<Blob | null>((resolve) => {
        if (recorder.state === "inactive") {
          resolve(null);
          return;
        }
        recorder.onstop = () => {
          const type = mimeType || "video/webm";
          const blob = new Blob(chunks, { type });
          resolve(blob);
        };
        try {
          recorder.stop();
        } catch {
          resolve(null);
        }
      }),
    cancel: () => {
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
    },
  };
}

export function getVideoExtension(): string {
  if (typeof MediaRecorder === "undefined") return "webm";
  for (const c of ["video/mp4", "video/webm;codecs=vp9", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(c)) {
      return c.includes("mp4") ? "mp4" : "webm";
    }
  }
  return "webm";
}
