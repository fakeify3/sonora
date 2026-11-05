"use client";

import { AudioFeatures, TrackInfo } from "./types";

/**
 * SONORA Audio Engine
 * --------------------
 * Wraps the Web Audio API: AudioContext, AnalyserNode, MediaElementSource.
 * Provides real-time frequency band analysis, beat detection, BPM estimation,
 * and a smoothed features object suitable for driving visual art.
 *
 * Cross-platform: works in every modern browser that supports Web Audio API
 * (Chrome, Edge, Firefox, Safari 14+). On Safari, AudioContext may need to
 * be resumed after a user gesture — we handle that automatically.
 */

const FFT_SIZE = 1024; // 512 frequency bins
const SMOOTHING = 0.78;

// Frequency band boundaries (in Hz) — used to split spectrum into bass/mid/treble
const BASS_MAX_HZ = 250;
const MID_MAX_HZ = 2000;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioEl: HTMLAudioElement | null = null;

  private spectrum: Uint8Array = new Uint8Array(FFT_SIZE / 2);
  private waveform: Uint8Array = new Uint8Array(FFT_SIZE / 2);

  // Beat detection state
  private bassHistory: number[] = [];
  private lastBeatTime = 0;
  private beatPeriods: number[] = []; // ms between beats
  private bpmEstimate = 0;
  private beatFlash = 0; // 0..1, decays each frame
  private beatStrength = 0;

  // Smoothed values
  private smoothBass = 0;
  private smoothMid = 0;
  private smoothTreble = 0;

  private rafId: number | null = null;
  private onFrame: ((f: AudioFeatures) => void) | null = null;
  private onEnded: (() => void) | null = null;
  private onTimeUpdate: ((t: number, d: number) => void) | null = null;

  // Track currently loaded
  private currentBlobUrl: string | null = null;

  /** Initialize (or re-init) the audio graph for a given audio element. */
  async attach(audioEl: HTMLAudioElement): Promise<void> {
    this.audioEl = audioEl;
    // Create context if needed
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = SMOOTHING;
      this.gainNode = this.ctx.createGain();
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
    }
    // Safari requires resume on user gesture
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
    // Disconnect old source if any
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        /* ignore */
      }
      this.source = null;
    }
    try {
      this.source = this.ctx.createMediaElementSource(audioEl);
      this.source.connect(this.analyser);
    } catch {
      // Already connected — fine
    }
  }

  /** Load an audio file (Blob or File) into the audio element. */
  async loadFile(
    file: File | Blob,
    audioEl: HTMLAudioElement,
    info: Partial<TrackInfo> = {}
  ): Promise<TrackInfo> {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    const url = URL.createObjectURL(file);
    this.currentBlobUrl = url;
    audioEl.src = url;
    audioEl.load();

    // Wait for metadata
    await new Promise<void>((resolve) => {
      const onMeta = () => {
        audioEl.removeEventListener("loadedmetadata", onMeta);
        resolve();
      };
      audioEl.addEventListener("loadedmetadata", onMeta);
      // Safety timeout
      setTimeout(() => {
        audioEl.removeEventListener("loadedmetadata", onMeta);
        resolve();
      }, 3000);
    });

    const duration = isFinite(audioEl.duration)
      ? audioEl.duration
      : info.duration || 0;

    // Try to read ID3 tags for MP3s (title/artist) — basic parsing
    let title = info.title || file.name.replace(/\.[^.]+$/, "");
    let artist = info.artist || "Unknown Artist";
    const fmt = (info.format || file.type || file.name.split(".").pop() || "audio")
      .toString()
      .replace(/^audio\//, "")
      .toLowerCase();

    // Attempt lightweight ID3v2 parse for MP3s
    if (fmt === "mp3" || file.type === "audio/mpeg") {
      try {
        const buf = await file.slice(0, 256 * 1024).arrayBuffer();
        const tags = parseId3v2(buf);
        if (tags.title) title = tags.title;
        if (tags.artist) artist = tags.artist;
      } catch {
        /* ignore — keep defaults */
      }
    }

    return {
      title,
      artist,
      album: info.album,
      duration,
      format: fmt,
      coverUrl: info.coverUrl,
      source: "upload",
      fileName: file.name,
    };
  }

  /** Begin the per-frame analysis loop. */
  start(onFrame: (f: AudioFeatures) => void): void {
    this.onFrame = onFrame;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    const loop = () => {
      this.tick();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setOnEnded(cb: () => void): void {
    this.onEnded = cb;
    if (this.audioEl) {
      this.audioEl.onended = cb;
    }
  }

  setOnTimeUpdate(cb: (t: number, d: number) => void): void {
    this.onTimeUpdate = cb;
    if (this.audioEl) {
      this.audioEl.ontimeupdate = () => {
        cb(this.audioEl!.currentTime, this.audioEl!.duration);
      };
    }
  }

  setVolume(v: number): void {
    if (this.gainNode) this.gainNode.gain.value = v;
    if (this.audioEl) this.audioEl.volume = v;
  }

  /** One analysis tick — computes features from current spectrum. */
  private tick(): void {
    if (!this.analyser || !this.onFrame) return;
    this.analyser.getByteFrequencyData(this.spectrum);
    this.analyser.getByteTimeDomainData(this.waveform);

    const sr = this.ctx?.sampleRate || 44100;
    const binHz = sr / FFT_SIZE;
    const bassBinEnd = Math.max(1, Math.floor(BASS_MAX_HZ / binHz));
    const midBinEnd = Math.max(
      bassBinEnd + 1,
      Math.floor(MID_MAX_HZ / binHz)
    );
    const trebleBinEnd = this.spectrum.length;

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;
    for (let i = 0; i < bassBinEnd; i++) bassSum += this.spectrum[i];
    for (let i = bassBinEnd; i < midBinEnd; i++) midSum += this.spectrum[i];
    for (let i = midBinEnd; i < trebleBinEnd; i++) trebleSum += this.spectrum[i];

    const bass = bassSum / (bassBinEnd * 255);
    const mid = midSum / ((midBinEnd - bassBinEnd) * 255);
    const treble = trebleSum / ((trebleBinEnd - midBinEnd) * 255);
    const volume = (bass + mid + treble) / 3;
    const energy = Math.min(
      1,
      bass * 1.2 + mid * 0.9 + treble * 0.7
    );

    // Smooth values (low-pass)
    this.smoothBass = this.smoothBass * 0.85 + bass * 0.15;
    this.smoothMid = this.smoothMid * 0.8 + mid * 0.2;
    this.smoothTreble = this.smoothTreble * 0.75 + treble * 0.25;

    // ---- Beat detection: track bass energy history, detect spikes
    const now = performance.now();
    this.bassHistory.push(this.smoothBass);
    if (this.bassHistory.length > 43) this.bassHistory.shift(); // ~1s at 60fps
    const avg =
      this.bassHistory.reduce((a, b) => a + b, 0) / this.bassHistory.length;
    const variance =
      this.bassHistory.reduce((a, b) => a + (b - avg) * (b - avg), 0) /
      this.bassHistory.length;
    const threshold = avg + Math.sqrt(variance) * 1.5 + 0.04;

    let beat = false;
    if (
      this.smoothBass > threshold &&
      this.smoothBass > 0.18 &&
      now - this.lastBeatTime > 220 // min 220ms between beats (~270 BPM cap)
    ) {
      beat = true;
      this.beatStrength = Math.min(1, this.smoothBass);
      const elapsed = now - this.lastBeatTime;
      if (elapsed < 1500) {
        // Track periods for BPM
        this.beatPeriods.push(elapsed);
        if (this.beatPeriods.length > 8) this.beatPeriods.shift();
        // Median BPM
        const sorted = [...this.beatPeriods].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const bpm = (60 * 1000) / median;
        // Smooth BPM
        if (this.bpmEstimate === 0) this.bpmEstimate = bpm;
        else this.bpmEstimate = this.bpmEstimate * 0.7 + bpm * 0.3;
      }
      this.lastBeatTime = now;
      this.beatFlash = 1;
    }
    // Decay flash
    this.beatFlash = Math.max(0, this.beatFlash - 0.08);
    if (this.beatFlash <= 0) this.beatStrength = 0;

    const features: AudioFeatures = {
      bass,
      mid,
      treble,
      volume,
      energy,
      spectrum: this.spectrum,
      waveform: this.waveform,
      beat,
      beatStrength: this.beatStrength,
      bpm: Math.round(this.bpmEstimate),
      smoothBass: this.smoothBass,
      smoothMid: this.smoothMid,
      smoothTreble: this.smoothTreble,
    };
    this.onFrame(features);
  }

  /** Estimate mood from running features. */
  estimateMood(f: AudioFeatures): string {
    const { smoothBass, smoothMid, smoothTreble, bpm, energy } = f;
    if (energy < 0.12) return "Calm / Ambient";
    if (smoothBass > 0.45 && bpm > 120) return "Energetic / Driving";
    if (smoothTreble > 0.4 && smoothMid < 0.25) return "Airy / Ethereal";
    if (bpm > 130 && smoothBass > 0.3) return "Intense / Powerful";
    if (bpm > 90 && bpm < 130 && smoothMid > 0.3) return "Warm / Grooving";
    if (smoothBass < 0.2 && smoothTreble > 0.3) return "Dreamy / Reflective";
    if (bpm < 80 && energy < 0.3) return "Melancholic / Soulful";
    return "Balanced / Melodic";
  }

  /** Cleanup — release everything. */
  dispose(): void {
    this.stop();
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        /* ignore */
      }
      this.source = null;
    }
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.analyser = null;
    this.audioEl = null;
  }
}

// ===== Minimal ID3v2 parser (title/artist only) =====
function parseId3v2(buf: ArrayBuffer): {
  title?: string;
  artist?: string;
} {
  const view = new Uint8Array(buf);
  if (
    view.length < 10 ||
    view[0] !== 0x49 ||
    view[1] !== 0x44 ||
    view[2] !== 0x33 // "ID3"
  ) {
    return {};
  }
  const major = view[3];
  // synchsafe size
  const size =
    ((view[6] & 0x7f) << 21) |
    ((view[7] & 0x7f) << 14) |
    ((view[8] & 0x7f) << 7) |
    (view[9] & 0x7f);
  const end = Math.min(view.length, 10 + size);
  let offset = 10;
  const result: { title?: string; artist?: string } = {};

  // v2.2 has 3-byte frame ids; v2.3+ has 4-byte
  const idLen = major < 3 ? 3 : 4;
  const sizeLen = major < 3 ? 3 : 4;

  while (offset + idLen + sizeLen <= end) {
    let id = "";
    for (let i = 0; i < idLen; i++) {
      const c = view[offset + i];
      if (c === 0) {
        id = "";
        break;
      }
      id += String.fromCharCode(c);
    }
    if (!id || view[offset] === 0) break;
    offset += idLen;
    let frameSize = 0;
    if (major < 3) {
      frameSize =
        (view[offset] << 16) | (view[offset + 1] << 8) | view[offset + 2];
    } else if (major === 3) {
      frameSize =
        (view[offset] << 24) |
        (view[offset + 1] << 16) |
        (view[offset + 2] << 8) |
        view[offset + 3];
    } else {
      // v2.4 synchsafe
      frameSize =
        ((view[offset] & 0x7f) << 21) |
        ((view[offset + 1] & 0x7f) << 14) |
        ((view[offset + 2] & 0x7f) << 7) |
        (view[offset + 3] & 0x7f);
    }
    offset += sizeLen;
    if (major >= 3) offset += 2; // flags
    if (frameSize <= 0 || offset + frameSize > end) break;

    const data = view.subarray(offset, offset + frameSize);
    // Encoding byte at data[0]; 0=ISO-8859-1, 1=UTF-16, 2=UTF-16BE, 3=UTF-8
    const enc = data[0];
    const textBytes = data.subarray(1);
    let text = "";
    try {
      if (enc === 1 || enc === 2) {
        // UTF-16 — strip BOM, decode
        text = new TextDecoder("utf-16").decode(textBytes).replace(/\0+$/, "");
      } else if (enc === 3) {
        text = new TextDecoder("utf-8").decode(textBytes).replace(/\0+$/, "");
      } else {
        text = new TextDecoder("latin1").decode(textBytes).replace(/\0+$/, "");
      }
    } catch {
      text = "";
    }

    if (id === "TT2" || id === "TIT2") result.title = text.trim();
    if (id === "TP1" || id === "TPE1") result.artist = text.trim();

    offset += frameSize;
  }
  return result;
}
