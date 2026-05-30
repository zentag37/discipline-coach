import { synthesizeSpeech } from './tts.functions';

export type VoiceStyle = 'marcus' | 'sophia' | 'rex' | 'aria';

// stability mapping for speaking rate
const RATE_TO_STABILITY: Record<string, number> = {
  Slow: 0.7,
  Normal: 0.5,
  Fast: 0.3,
};

let currentAudio: HTMLAudioElement | null = null;
const listeners = new Set<(playing: boolean) => void>();

function emit(playing: boolean) {
  listeners.forEach((l) => l(playing));
}

export function subscribeVoice(cb: (playing: boolean) => void) {
  listeners.add(cb);
  cb(currentAudio !== null);
  return () => listeners.delete(cb);
}

export function stopVoice() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
    emit(false);
  }
}

export async function speakAsACE(
  text: string,
  voiceStyle: string = 'marcus',
  opts: { rate?: string } = {},
) {
  stopVoice();
  const style = (voiceStyle || 'marcus').toLowerCase() as VoiceStyle;
  try {
    const { audio } = await synthesizeSpeech({
      data: { text, voice_style: style },
    });
    if (!audio) return;
    const el = new Audio(`data:audio/mpeg;base64,${audio}`);
    currentAudio = el;
    emit(true);
    el.onended = () => {
      if (currentAudio === el) {
        currentAudio = null;
        emit(false);
      }
    };
    el.onerror = () => {
      if (currentAudio === el) {
        currentAudio = null;
        emit(false);
      }
    };
    await el.play();
    void opts; // rate mapping is applied server-side in future; kept for API stability
    return el;
  } catch (e) {
    stopVoice();
    throw e;
  }
}

export function rateToStability(rate?: string) {
  return RATE_TO_STABILITY[rate || 'Normal'] ?? 0.5;
}
