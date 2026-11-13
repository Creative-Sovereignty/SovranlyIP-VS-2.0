import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { verifyAuthToken } from '@/lib/auth-server';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const user = await verifyAuthToken(authHeader);

    // In sandbox or dev mode, allow authenticated or sandbox requests
    if (!user && process.env.NODE_ENV === 'production' && authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, voice = 'Kore' } = await req.json().catch(() => ({}));

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required for TTS' }, { status: 400 });
    }

    // Clean markdown symbols, urls, brackets for natural audio reading
    const cleanText = text
      .replace(/[#*_`~]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 1500)
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: 'Text content empty after sanitization' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        audio: null,
        fallbackToWebSpeech: true,
        reason: 'Using client speech synthesis fallback',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: cleanText,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return NextResponse.json({
        audio: null,
        fallbackToWebSpeech: true,
        reason: 'No audio stream returned; falling back to browser speech',
      });
    }

    return NextResponse.json({
      audio: base64Audio,
      mimeType: 'audio/wav',
      format: 'wav',
    });
  } catch (err: any) {
    console.warn('Gemini TTS fallback to Web Speech:', err?.message || err);
    return NextResponse.json({
      audio: null,
      fallbackToWebSpeech: true,
      reason: 'TTS generation unavailable; using Web Speech synthesis',
    });
  }
}
