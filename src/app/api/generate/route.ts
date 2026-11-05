// SONORA AI Art Generation API
// --------------------------------
// Uses the z-ai-web-dev-sdk image generation API to create unique artwork
// inspired by detected musical characteristics. Returns a base64 PNG.
//
// Security: API key is read from environment on the server. The frontend
// never sees the key — it only calls this route.
//
// If no API key is configured, the route returns a 200 with `fallback: true`
// and a server-side procedural placeholder so the UI can still show art.

import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

interface GenerateBody {
  prompt: string;
  style: string; // painterly | abstract | sketch
  palette: string; // palette id
  width?: number;
  height?: number;
}

const STYLE_PROMPTS: Record<string, string> = {
  painterly:
    "rich oil painting, visible brush strokes, cinematic lighting, painterly textures, atmospheric depth, fine art masterpiece",
  abstract:
    "abstract generative art, fluid geometric shapes, dynamic color fields, particle formations, experimental composition",
  sketch:
    "watercolor and ink illustration, hand-drawn pencil textures, soft color washes, delicate ink lines, mixed media",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateBody;
    const {
      prompt,
      style = "painterly",
      palette = "violet",
      width = 1024,
      height = 1024,
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 }
      );
    }

    const styleHint = STYLE_PROMPTS[style] || STYLE_PROMPTS.painterly;
    const fullPrompt = `${prompt}. ${styleHint}. Color palette: ${palette}. Highly detailed, premium quality artwork, no text, no watermark, no faces.`;

    // Try AI generation
    try {
      const zai = await ZAI.create();
      // Use the SDK's images.generations.create() API.
      // Supported sizes: 1024x1024, 768x1344, 864x1152, 1344x768, 1152x864, 1440x720, 720x1440
      const supportedSizes = [
        "1024x1024",
        "768x1344",
        "864x1152",
        "1344x768",
        "1152x864",
        "1440x720",
        "720x1440",
      ];
      const sizeStr = supportedSizes.includes(`${width}x${height}`)
        ? `${width}x${height}`
        : "1024x1024";

      // Race the SDK call against a 15s timeout — if no API key is configured,
      // the SDK may hang indefinitely waiting for auth. We fail fast to fallback.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("AI generation timed out (15s)")),
          15000
        )
      );
      const result = (await Promise.race([
        zai.images.generations.create({
          prompt: fullPrompt,
          size: sizeStr,
        }),
        timeout,
      ])) as unknown as {
        data?: Array<{ base64?: string; url?: string }>;
      };

      // The SDK returns base64 data in result.data[0].base64
      const data = result.data || [];
      const img = data[0];
      if (img) {
        if (img.base64) {
          return NextResponse.json({
            ok: true,
            image: `data:image/png;base64,${img.base64}`,
            fallback: false,
          });
        }
        if (img.url) {
          try {
            const r = await fetch(img.url);
            const buf = Buffer.from(await r.arrayBuffer());
            const b64 = buf.toString("base64");
            const mime = r.headers.get("content-type") || "image/png";
            return NextResponse.json({
              ok: true,
              image: `data:${mime};base64,${b64}`,
              fallback: false,
            });
          } catch {
            return NextResponse.json({
              ok: true,
              image: img.url,
              fallback: false,
            });
          }
        }
      }
      // No image returned — fall through to fallback
    } catch (err) {
      console.warn("[SONORA] AI generation failed, using fallback:", err);
    }

    // ===== Procedural fallback (server-side SVG, no API key needed)
    const fallbackImage = generateFallbackSVG(
      prompt,
      style,
      palette,
      width,
      height
    );
    return NextResponse.json({
      ok: true,
      image: fallbackImage,
      fallback: true,
      note: "AI provider unavailable or unconfigured. Showing procedural fallback. Configure ZAI_API_KEY in .env to enable AI generation.",
    });
  } catch (e) {
    console.error("[SONORA] /api/generate error:", e);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}

function generateFallbackSVG(
  prompt: string,
  style: string,
  palette: string,
  w: number,
  h: number
): string {
  // Build an attractive SVG poster based on palette + style.
  // This is a deterministic, hash-based generative image.
  const palettes: Record<string, string[]> = {
    violet: ["#7c3aed", "#a855f7", "#c084fc", "#4c1d95", "#1e1b4b"],
    sunset: ["#f97316", "#ef4444", "#ec4899", "#fb7185", "#7c2d12"],
    ocean: ["#06b6d4", "#3b82f6", "#0ea5e9", "#1e40af", "#082f49"],
    forest: ["#10b981", "#22c55e", "#84cc16", "#064e3b", "#022c22"],
    ember: ["#dc2626", "#ea580c", "#f59e0b", "#7f1d1d", "#450a0a"],
    monochrome: ["#f5f5f5", "#a3a3a3", "#525252", "#262626", "#0a0a0a"],
    neon: ["#22d3ee", "#a855f7", "#ec4899", "#84cc16", "#facc15"],
    aurora: ["#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#22d3ee"],
  };
  const colors = palettes[palette] || palettes.violet;
  // Simple deterministic hash from prompt for stable shapes
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = (hash * 31 + prompt.charCodeAt(i)) | 0;
  }
  const rng = mulberry32(Math.abs(hash) || 1);

  const bg = colors[colors.length - 1];
  let shapes = "";
  const count = style === "abstract" ? 18 : style === "sketch" ? 24 : 14;
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = 30 + rng() * 200;
    const c = colors[Math.floor(rng() * (colors.length - 1))];
    const a = 0.1 + rng() * 0.4;
    if (style === "sketch") {
      // line hatches
      const len = 40 + rng() * 120;
      const ang = rng() * Math.PI * 2;
      shapes += `<line x1="${x}" y1="${y}" x2="${
        x + Math.cos(ang) * len
      }" y2="${y + Math.sin(ang) * len}" stroke="${c}" stroke-width="${
        1 + rng() * 3
      }" stroke-opacity="${a}" stroke-linecap="round"/>`;
    } else if (style === "abstract") {
      // polygons
      const sides = 3 + Math.floor(rng() * 5);
      let pts = "";
      for (let k = 0; k < sides; k++) {
        const a2 = (k / sides) * Math.PI * 2;
        pts += `${x + Math.cos(a2) * r},${y + Math.sin(a2) * r} `;
      }
      shapes += `<polygon points="${pts.trim()}" fill="${c}" fill-opacity="${a}"/>`;
    } else {
      // painterly blobs
      shapes += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity="${a}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <radialGradient id="g" cx="50%" cy="40%" r="75%">
        <stop offset="0%" stop-color="${colors[0]}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    ${shapes}
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
