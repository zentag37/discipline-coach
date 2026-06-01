import { synthesizeSpeech } from './tts.functions';

export type VoiceStyle = 'marcus' | 'sophia' | 'rex' | 'aria';

const RATE_TO_STABILITY: Record<string, number> = {
  Slow: 0.7,
  Normal: 0.5,
  Fast: 0.3,
};

let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let provider: 'elevenlabs' | 'browser' = 'elevenlabs';
const listeners = new Set<(playing: boolean) => void>();

function emit(playing: boolean) {
  listeners.forEach((l) => l(playing));
}

export function subscribeVoice(cb: (playing: boolean) => void) {
  listeners.add(cb);
  cb(currentAudio !== null || currentUtterance !== null);
  return () => listeners.delete(cb);
}

export function stopVoice() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch {/*noop*/}
  }
  currentUtterance = null;
  emit(false);
}

function speakWithBrowser(text: string, voiceStyle?: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('[ace-voice] Web Speech API not available');
      resolve();
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 1;
      u.pitch = 1;
      // Try to match a voice by gender hint from style
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        const femaleHint = voiceStyle === 'sophia' || voiceStyle === 'aria';
        const match = voices.find((v) =>
          femaleHint ? /female|samantha|victoria|zira|google us english/i.test(v.name)
                     : /male|daniel|alex|david/i.test(v.name),
        );
        if (match) u.voice = match;
      }
      currentUtterance = u;
      emit(true);
      u.onend = () => { currentUtterance = null; emit(false); resolve(); };
      u.onerror = (e) => {
        console.warn('[ace-voice] Browser TTS error:', e);
        currentUtterance = null;
        emit(false);
        resolve();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.error('[ace-voice] speakWithBrowser failed:', e);
      emit(false);
      resolve();
    }
  });
}

export async function speakAsACE(
  text: string,
  voiceStyle: string = 'marcus',
  opts: { rate?: string } = {},
) {
  stopVoice();
  const style = (voiceStyle || 'marcus').toLowerCase() as VoiceStyle;

  // Once we've fallen back to browser this session, stay there.
  if (provider === 'browser') {
    void opts;
    return speakWithBrowser(text, style);
  }

  try {
    const { audio } = await synthesizeSpeech({
      data: { text, voice_style: style },
    });
    if (!audio) {
      console.warn('[ace-voice] ElevenLabs returned no audio, falling back to browser TTS');
      provider = 'browser';
      return speakWithBrowser(text, style);
    }
    const el = new Audio(`data:audio/mpeg;base64,${audio}`);
    currentAudio = el;
    emit(true);
    el.onended = () => {
      if (currentAudio === el) { currentAudio = null; emit(false); }
    };
    el.onerror = (e) => {
      console.error('[ace-voice] HTMLAudio playback error:', e);
      if (currentAudio === el) { currentAudio = null; emit(false); }
    };
    try {
      await el.play();
    } catch (playErr) {
      console.error('[ace-voice] Audio.play() blocked or failed:', playErr);
      currentAudio = null;
      emit(false);
      provider = 'browser';
      return speakWithBrowser(text, style);
    }
    return el;
  } catch (e) {
    console.error('[ace-voice] ElevenLabs TTS failed, falling back to browser:', e);
    provider = 'browser';
    return speakWithBrowser(text, style);
  }
}

export function rateToStability(rate?: string) {
  return RATE_TO_STABILITY[rate || 'Normal'] ?? 0.5;
}
