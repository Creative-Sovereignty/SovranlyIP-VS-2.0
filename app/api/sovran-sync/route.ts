import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

function buildSovranSyncFallback(format: string, audience: string, tone: string, focus: string): string {
  return `### Sovran Sync Briefing (${format || 'Editorial Overview'})

**Target Audience:** ${audience || 'Independent Musicians & Film Producers'}  
**Voice & Tone:** ${tone || 'Empowering & Creator-Centric'}  
**Core Focus:** ${focus || 'Instant Clearance & Automated 85/15 Smart Contract Splits'}

Traditional sync licensing forces creators and media buyers through weeks of legal back-and-forth, lost inbox threads, and opaque royalty deductions. **Sovran Sync** replaces that friction with an instant Zero Trust clearance layer built directly on Sovranly IP:

1. **Cryptographic Vault Registration**: Creators anchor master stems, scripts, and visual assets with client-side SHA-256 hashes and machine-readable AI training exclusions.
2. **Pre-Cleared Licensing Shopfront**: Game developers, filmmakers, and commercial brands browse ready-to-clear tracks and download verifiable clearance certificates in seconds.
3. **85/15 Non-Custodial Smart Splits**: License fees route directly through non-custodial escrow contracts—dispatching **85%** straight to creators and co-writers with zero middleman holdbacks.`;
}

export async function POST(req: Request) {
  let format = 'Marketing Blog Post / Article';
  let audience = 'Independent Musicians & Film Producers';
  let tone = 'Innovative, Forward-Thinking, Empowering & Creator-Centric';
  let focus = 'Instant Clearance & Automated Co-Writer Splits';

  try {
    const body = await req.json().catch(() => ({}));
    format = body.format || format;
    audience = body.audience || audience;
    tone = body.tone || tone;
    focus = body.focus || focus;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: true,
        fallback: true,
        content: buildSovranSyncFallback(format, audience, tone, focus),
      });
    }

    const prompt = `You are an expert product marketer, technical copywriter, and brand strategist for Sovranly IP, specializing in "Sovran Sync" — the decentralized sync licensing protocol.

    Generate high-quality, engaging, and clear content based on these exact parameters:
    - Output Format: ${format}
    - Target Audience: ${audience}
    - Tone: ${tone}
    - Special Focus: ${focus}

    Foundational Facts & Knowledge Base to incorporate:
    1. The Problem: Traditional sync licensing (clearing music and media tracks for games, movies, and ads) is a weeks-long nightmare involving bloated legal overhead, lost emails, and delayed payments.
    2. The Solution: Sovranly's "Sovran Sync" decentralized IP platform transforms sync licensing into an instant process.
    3. How it Works for Creators: Creators easily upload their work, tag their rights, and establish clear pricing tiers immediately.
    4. The Buyer Experience: The catalog acts as an "instant clearance" shop where supervisors, game devs, and brands search, discover, and purchase licenses in just a few clicks.
    5. Under the Hood (Smart Contracts): Smart contracts handle all financial math, automatically split fees between co-writers and collaborators instantly (85/15 standard), and issue verifiable digital license certificates.

    Make the content punchy, beautifully structured with Markdown, professional yet bold, capturing the Sovranly IP Zero Trust vision.`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-4-hydrogen",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are Sovranly's master copywriter and brand strategist for Sovran Sync. Write compelling, publication-ready content with absolute precision and visionary flair.",
      },
    });

    const content = response.text || buildSovranSyncFallback(format, audience, tone, focus);
    return NextResponse.json({ success: true, content });
  } catch (error: any) {
    console.warn('Sovran Sync generation fallback triggered:', error?.message || error);
    return NextResponse.json({
      success: true,
      fallback: true,
      content: buildSovranSyncFallback(format, audience, tone, focus),
    });
  }
}
