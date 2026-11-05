# SONORA — Music to Art AI Studio

> Upload a song, press play, and watch SONORA transform music into living artwork.

A premium creative web application that turns audio into beautiful, dynamically-generated visual art in real time. Built with Next.js, TypeScript, the Web Audio API, and Canvas 2D.

## ✨ Features

- **Real audio analysis** — Web Audio API + AnalyserNode extracts BPM, beats, frequency bands (bass/mid/treble), volume, energy, and a mood estimate from your actual audio file. No fake data.
- **Two art engines**:
  - **Procedural** — Live Canvas 2D generative art that reacts to every beat, every frequency band, every transient.
  - **AI** — Server-side image generation via the Z.AI SDK, with a progressive "stroke-by-stroke" reveal synced to playback.
- **Three artistic styles** — Painterly (oil), Abstract (geometric), Sketch/Watercolor (ink + wash). Each has distinct brush behavior in both engines.
- **8 curated color palettes** — Violet Dream, Sunset, Ocean, Forest, Ember, Monochrome, Neon, Aurora.
- **Live Studio workspace** — Left panel (track + controls), center canvas, bottom player bar, right analysis panel — collapsible on desktop, stacked on mobile.
- **Export**:
  - PNG (1×, 2×, 3× resolution).
  - Video (MediaRecorder + canvas.captureStream + audio track; MP4/WebM depending on browser).
- **Personal Gallery** — Save creations, search by track name, filter by style, sort by date, rename, delete, download. Stored in IndexedDB (large images) + localStorage (metadata).
- **Streaming link support** — Paste a Spotify, YouTube, or SoundCloud URL; we resolve it via each platform's official oEmbed API and render their embedded player. (Raw audio is not accessed — the engine runs in preview mode for streaming links, with a clear on-screen note.)
- **Settings** — Dark/light theme, 6 accent colors, font scale, canvas quality, animation performance, defaults, audio preferences, export scale, storage management. All changes apply live.
- **Cross-platform** — Works on macOS, Windows, and Linux in any modern browser (Chrome, Edge, Firefox, Safari 14+).
- **Offline-first** — All analysis, rendering, and storage happen locally in your browser. No account needed.

## 🚀 Quick start

### Prerequisites

- **Node.js 18+** (or Bun — recommended)
- A modern browser with Web Audio API support

### Install & run

```bash
# 1. Install dependencies
bun install        # or: npm install

# 2. (Optional) Configure AI image generation
#    Create a .z-ai-config file (preferred by the SDK) or set ZAI_API_KEY in .env
echo '{"baseUrl":"https://api.z.ai/api/v1","apiKey":"YOUR_KEY"}' > .z-ai-config

# 3. Start the dev server
bun run dev        # or: npm run dev

# 4. Open the app
#    Navigate to http://localhost:3000
```

Without an API key, SONORA automatically uses a server-side procedural fallback for AI mode so the workflow still works end-to-end.

### Production build

```bash
bun run build
bun run start
```

## 🎨 How to use

1. **Open the Studio** from the dashboard (or sidebar → Live Studio).
2. **Drop an audio file** (MP3, WAV, FLAC, M4A, OGG) or paste a streaming link.
3. **Pick a generation mode** — Procedural (live) or AI (composed artwork).
4. **Choose a style** (Painterly / Abstract / Sketch) and a color palette.
5. **Adjust intensity & animation speed** to taste.
6. **Press play** — watch the artwork paint itself in sync with the music.
7. **Export** to PNG or video, or **Save** to your gallery.

## 🏗 Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts       # AI image generation (server-side, secure)
│   │   └── analyze-link/route.ts   # Spotify/YouTube/SoundCloud oEmbed resolver
│   ├── globals.css                  # Premium dark cinematic theme
│   ├── layout.tsx                   # Root layout, fonts, toasts
│   └── page.tsx                     # View router (dashboard/studio/gallery/explore/settings)
├── components/
│   ├── Sidebar.tsx                  # Premium navigation sidebar
│   ├── TopBar.tsx                   # Mobile hamburger bar
│   ├── UploadZone.tsx               # Drag-drop audio + link input
│   ├── ArtCanvas.tsx                # Procedural canvas wrapper
│   ├── AudioPlayerBar.tsx           # Bottom transport bar
│   ├── AnalysisPanel.tsx            # Right panel: BPM/mood/energy/meters
│   └── views/
│       ├── DashboardView.tsx
│       ├── StudioView.tsx           # The full creation workspace
│       ├── GalleryView.tsx
│       ├── ExploreView.tsx
│       └── SettingsView.tsx
└── lib/
    ├── audio-engine.ts              # Web Audio API wrapper, beat/BPM detection
    ├── procedural-engine.ts         # Canvas 2D generative renderer (3 styles)
    ├── export-utils.ts              # PNG + video (MediaRecorder) helpers
    ├── storage.ts                   # IndexedDB wrapper for full-res artwork
    ├── store.ts                     # Zustand store (persisted)
    ├── types.ts                     # Shared types, palettes, styles, defaults
    └── utils.ts
```

### Audio analysis pipeline

- `AudioEngine` (lib/audio-engine.ts) wraps `AudioContext`, `AnalyserNode`, and `MediaElementAudioSourceNode`.
- FFT size 1024 (512 bins), smoothing 0.78.
- Splits spectrum into bass (<250 Hz), mid (250–2000 Hz), treble (>2000 Hz).
- Beat detection: bass energy spike above the rolling average + variance threshold, with 220 ms minimum spacing.
- BPM estimation: median of the last 8 inter-beat intervals, smoothed.
- Mood inference from smoothed bass/mid/treble/bpm/energy.

### Procedural engine

- Layered architecture: live atmospheric background + persistent paint layer (offscreen canvas, accumulates strokes) + particle system + composite beat-flash overlay.
- Bass → large shapes, motion, atmosphere.
- Mid → brush strokes, complexity.
- Treble → particles, sparks, fine detail.
- Beats → bloom bursts + palette shifts.
- Each style has distinct stroke logic: Painterly uses big soft quadratic strokes; Abstract uses ribbons, polygons, concentric arcs; Sketch uses ink hatching + watercolor blooms.

### AI generation

- The frontend POSTs the analyzed music characteristics (mood, BPM, energy, bass-heavy flag) plus the chosen style/palette to `/api/generate`.
- The route constructs a detailed prompt and calls the Z.AI SDK server-side (`zai.images.generations.create()`).
- API key is read from `.z-ai-config` (or env) on the server only — never exposed to the browser.
- If the SDK call fails or no key is configured, the route returns a deterministic SVG poster (hash-based shapes from the prompt) so the UI still shows art.

### Streaming links

- `/api/analyze-link` accepts a URL and routes to the appropriate platform:
  - **Spotify** — parses `/track/:id`, returns the official embed URL, calls `open.spotify.com/oembed` for title/artist/thumbnail.
  - **YouTube** — parses watch / youtu.be / embed / shorts URLs, calls `youtube.com/oembed` for metadata, returns the embed URL.
  - **SoundCloud** — calls `soundcloud.com/oembed` for the embed HTML + title.
- The frontend renders the platform's official iframe player.
- Raw audio is **never** accessed for streaming links (that would be against platform ToS). The procedural engine runs in "preview mode" for streaming, with a clear on-screen notice.

## 🌐 Browser support

| Feature | Chrome | Edge | Firefox | Safari 14+ |
|---|---|---|---|---|
| Audio analysis | ✅ | ✅ | ✅ | ✅ |
| Procedural art | ✅ | ✅ | ✅ | ✅ |
| AI generation | ✅ | ✅ | ✅ | ✅ |
| PNG export | ✅ | ✅ | ✅ | ✅ |
| Video export | ✅ WebM | ✅ WebM | ✅ WebM | ⚠️ MP4 only on Safari 14.1+ |

## 🔒 Privacy

- Audio is analyzed **entirely in your browser**. No audio data is uploaded anywhere.
- Artwork thumbnails and full-resolution images are stored locally in IndexedDB.
- AI image generation sends only a text prompt (derived from your track's metadata) to the configured provider — never the audio itself.

## 📄 License

MIT — Build amazing things.
