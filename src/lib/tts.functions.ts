import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const VOICE_IDS: Record<string, string> = {
  marcus: 'pNInz6obpgDQGcFmaJgB',
  sophia: 'EXAVITQu4vr4xnSDxMaL',
  rex: 'ErXwobaYiN019PkySvjV',
  aria: 'MF3mGyEYCl7XYWbV9V6O',
};

const schema = z.object({
  text: z.string().min(1).max(5000),
  voice_style: z.enum(['marcus', 'sophia', 'rex', 'aria']).optional(),
});

export const synthesizeSpeech = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not configured');

    const voiceId = VOICE_IDS[data.voice_style ?? 'marcus'];

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: data.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs TTS failed (${res.status}): ${err}`);
    }

    const buf = await res.arrayBuffer();
    return { audio: Buffer.from(buf).toString('base64') };
  });
