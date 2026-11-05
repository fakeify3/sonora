// SONORA Streaming Link Analyzer
// --------------------------------
// Given a Spotify / YouTube / SoundCloud URL, returns:
//  - platform
//  - embedUrl (iframe src for that platform's official embed)
//  - trackId (the platform-specific resource id)
//  - title/artist (best-effort parse from URL or oEmbed where available)
//
// We do NOT attempt to extract raw audio. We rely on the platform's
// official embeddable player + metadata APIs only.

import { NextRequest, NextResponse } from "next/server";

interface AnalyzeResponse {
  ok: boolean;
  platform?: "spotify" | "youtube" | "soundcloud" | "unknown";
  embedUrl?: string;
  trackId?: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  duration?: number;
  note?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || typeof url !== "string") {
      return NextResponse.json<AnalyzeResponse>(
        { ok: false, note: "Missing URL" },
        { status: 400 }
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return NextResponse.json<AnalyzeResponse>(
        { ok: false, note: "Invalid URL" },
        { status: 400 }
      );
    }

    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    // ===== Spotify =====
    if (host === "open.spotify.com" || host === "spotify.com") {
      // /track/ID or /playlist/ID
      const m = parsed.pathname.match(
        /\/(track|playlist|album|episode)\/([A-Za-z0-9]+)/
      );
      if (!m) {
        return NextResponse.json<AnalyzeResponse>({
          ok: false,
          platform: "spotify",
          note: "Unsupported Spotify URL — use a track, album, or playlist link.",
        });
      }
      const [, kind, id] = m;
      const embedUrl = `https://open.spotify.com/embed/${kind}/${id}?utm=sonora&theme=0`;
      // Try Spotify's oEmbed endpoint for metadata
      let title: string | undefined;
      let artist: string | undefined;
      let thumbnail: string | undefined;
      try {
        const r = await fetch(
          `https://open.spotify.com/oembed?url=https://open.spotify.com/${kind}/${id}`,
          { headers: { Accept: "application/json" } }
        );
        if (r.ok) {
          const data = await r.json();
          title = data.title;
          // Spotify oEmbed puts "Artist — Title" usually; provider_name is Spotify
          const parts = (data.title || "").split(" - ");
          if (parts.length > 1) {
            artist = parts[0];
            title = parts.slice(1).join(" - ");
          }
          thumbnail = data.thumbnail_url;
        }
      } catch {
        /* ignore */
      }
      return NextResponse.json<AnalyzeResponse>({
        ok: true,
        platform: "spotify",
        embedUrl,
        trackId: id,
        title,
        artist,
        thumbnail,
        note: "Spotify embed loaded. Use the embedded player to play the track; SONORA cannot access raw Spotify audio, so the procedural engine will react to your system audio or remain in preview mode.",
      });
    }

    // ===== YouTube =====
    if (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      let videoId: string | null = null;
      if (host === "youtu.be") {
        videoId = parsed.pathname.slice(1).split("/")[0];
      } else if (parsed.pathname.startsWith("/watch")) {
        videoId = parsed.searchParams.get("v");
      } else {
        const m = parsed.pathname.match(/\/(embed|shorts|v)\/([A-Za-z0-9_-]+)/);
        if (m) videoId = m[2];
      }
      if (!videoId) {
        return NextResponse.json<AnalyzeResponse>({
          ok: false,
          platform: "youtube",
          note: "Unsupported YouTube URL.",
        });
      }
      const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`;
      // YouTube oEmbed
      let title: string | undefined;
      let author: string | undefined;
      let thumbnail: string | undefined;
      try {
        const r = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          { headers: { Accept: "application/json" } }
        );
        if (r.ok) {
          const data = await r.json();
          title = data.title;
          author = data.author_name;
          thumbnail = data.thumbnail_url;
        }
      } catch {
        /* ignore */
      }
      return NextResponse.json<AnalyzeResponse>({
        ok: true,
        platform: "youtube",
        embedUrl,
        trackId: videoId,
        title,
        artist: author,
        thumbnail:
          thumbnail ||
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        note: "YouTube embed loaded. YouTube does not expose raw audio to third parties, so the procedural engine will run in preview mode unless you also upload the audio file.",
      });
    }

    // ===== SoundCloud =====
    if (host === "soundcloud.com" || host === "m.soundcloud.com") {
      // SoundCloud oEmbed gives us embed URL + title
      try {
        const r = await fetch(
          `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(
            url
          )}`,
          { headers: { Accept: "application/json" } }
        );
        if (r.ok) {
          const data = await r.json();
          const html: string = data.html || "";
          const srcMatch = html.match(/src="([^"]+)"/);
          const embedUrl = srcMatch
            ? srcMatch[1].replace(/&amp;/g, "&")
            : undefined;
          let title: string | undefined = data.title;
          let author: string | undefined = data.author_name;
          // SoundCloud titles are typically "Artist - Title"
          if (title && title.includes(" - ")) {
            const parts = title.split(" - ");
            author = parts[0];
            title = parts.slice(1).join(" - ");
          }
          return NextResponse.json<AnalyzeResponse>({
            ok: true,
            platform: "soundcloud",
            embedUrl,
            trackId: parsed.pathname,
            title,
            artist: author,
            thumbnail: data.thumbnail_url,
            note: "SoundCloud embed loaded. Like other streaming platforms, raw audio is not exposed; SONORA will use the embedded player for playback.",
          });
        }
      } catch {
        /* fall through */
      }
      return NextResponse.json<AnalyzeResponse>({
        ok: false,
        platform: "soundcloud",
        note: "Could not retrieve SoundCloud embed info. Make sure the URL is a public track.",
      });
    }

    return NextResponse.json<AnalyzeResponse>({
      ok: false,
      platform: "unknown",
      note: "Unsupported URL. Please paste a Spotify, YouTube, or SoundCloud link.",
    });
  } catch (e) {
    console.error("[SONORA] /api/analyze-link error:", e);
    return NextResponse.json<AnalyzeResponse>(
      { ok: false, note: "Server error analyzing link" },
      { status: 500 }
    );
  }
}
