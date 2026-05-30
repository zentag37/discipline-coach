import { synthesizeSpeech } from './tts.functions';

export async function speakAsACE(text: string, voiceStyle: string) {
  const { audio } = await synthesizeSpeech({
    data: { text, voice_style: voiceStyle as 'marcus' | 'sophia' | 'rex' | 'aria' },
  });
  if (!audio) return;

  const el = new Audio(`data:audio/mpeg;base64,${audio}`);
  await el.play();
  return el;
}
