/**
 * Sound for listening tasks and the Tenses lab, best first:
 *   1. the teacher's own recording (`audio` on a word, an mp3 in public/audio/)
 *   2. the natural Kokoro clip made by `npm run audio` (public/audio/tts/)
 *   3. the phone's own English voice (Web Speech API)
 * Nothing ever blocks a lesson: with no sound at all, the task shows a
 * "Show the word" fallback.
 */
import {normalize} from './clipKey';

export interface VoiceLike {
  lang: string;
  localService: boolean;
  name: string;
  default?: boolean;
}

const GOOD = /natural|neural|enhanced|premium|google|siri|samantha|daniel/i;
const BAD = /espeak|compact/i;

/** Best device voice: a natural-sounding en-GB / en-US one, then any English voice; never eSpeak if avoidable. */
export function pickVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  const en = voices.filter(v => /^en([-_]|$)/i.test(v.lang));
  const ok = en.filter(v => !BAD.test(v.name));
  const pool = ok.length ? ok : en;
  const main = (v: T) => /^en[-_](GB|US)$/i.test(v.lang);
  return (
    pool.find(v => main(v) && GOOD.test(v.name)) ??
    pool.find(v => GOOD.test(v.name)) ??
    pool.find(v => main(v) && v.localService) ??
    pool.find(v => main(v)) ??
    pool.find(v => v.localService) ??
    pool[0] ??
    null
  );
}

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis ? window.speechSynthesis : null;
}

export function isSpeechAvailable(): boolean {
  return synth() !== null && typeof window.SpeechSynthesisUtterance === 'function';
}

export function audioUrl(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}

// ---------- Kokoro clips ----------

let clips: Record<string, string> | null = null;
let manifestPromise: Promise<Record<string, string>> | null = null;

/** Loads public/audio/tts/manifest.json once. Fails soft: no manifest = no clips. */
export function loadManifest(): Promise<Record<string, string>> {
  if (clips) return Promise.resolve(clips);
  if (!manifestPromise) {
    manifestPromise = (async () => {
      try {
        const res = await fetch(audioUrl('audio/tts/manifest.json'));
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {clips?: Record<string, string>};
        clips = data.clips ?? {};
      } catch {
        clips = {};
      }
      return clips;
    })();
  }
  return manifestPromise;
}

/** The clip URL for a text, when `npm run audio` made one. */
export function clipUrl(text: string): string | null {
  const file = clips?.[normalize(text)];
  return file ? audioUrl(`audio/tts/${file}`) : null;
}

/** True when this text can make a sound: a file, a clip, or a voice to read it. */
export function isAudioAvailable(audio?: string, text?: string): boolean {
  const canPlayFiles = typeof Audio !== 'undefined';
  return Boolean(audio && canPlayFiles) || Boolean(text && canPlayFiles && clipUrl(text)) || isSpeechAvailable();
}

let current: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let playingSources: AudioBufferSourceNode[] = [];

/** Tests: pretend the manifest has these clips (null = forget it). */
export function _setManifestForTests(value: Record<string, string> | null): void {
  clips = value;
  manifestPromise = null;
  buffers.clear();
}

export function stopSpeaking(): void {
  synth()?.cancel();
  if (current) {
    current.pause();
    current = null;
  }
  for (const s of playingSources) {
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  }
  playingSources = [];
}

/** The "Slow" button asks for rate 0.6: a clip then plays at 0.75× with the pitch kept. */
export const SLOW_RATE = 0.6;
const isSlow = (rate?: number) => rate !== undefined && rate < 0.7;

function playFile(url: string, slow: boolean): Promise<boolean> {
  const el = new Audio(url);
  el.playbackRate = slow ? 0.75 : 1;
  (el as HTMLAudioElement & {preservesPitch?: boolean}).preservesPitch = true;
  current = el;
  return new Promise<boolean>(resolve => {
    el.onended = () => resolve(true);
    el.onerror = () => resolve(false);
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => resolve(false));
  });
}

let voicePromise: Promise<SpeechSynthesisVoice | null> | null = null;

/** Voices arrive late on some browsers: wait for 'voiceschanged', at most 1.5 s. */
export function loadVoice(): Promise<SpeechSynthesisVoice | null> {
  const s = synth();
  if (!s) return Promise.resolve(null);
  if (voicePromise) return voicePromise;
  voicePromise = new Promise(resolve => {
    const now = s.getVoices();
    if (now.length) return resolve(pickVoice(now));
    const done = () => {
      s.removeEventListener?.('voiceschanged', done);
      resolve(pickVoice(s.getVoices()));
    };
    s.addEventListener?.('voiceschanged', done);
    setTimeout(done, 1500);
  });
  return voicePromise;
}

async function deviceVoice(text: string, rate?: number): Promise<void> {
  const s = synth();
  if (!s || !isSpeechAvailable()) return;
  const voice = await loadVoice();
  await new Promise<void>(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? 'en-GB';
    if (voice) u.voice = voice;
    u.rate = rate ?? 0.9;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    // Chrome can stall a long queue: cancel() first, then speak.
    s.cancel();
    s.speak(u);
    // Safety net if the browser never fires end.
    setTimeout(resolve, 2000 + text.length * 150);
  });
}

/** Speaks (or plays) once; resolves when it ends or fails, never rejects. */
export async function speak(text: string, opts: {rate?: number; audio?: string} = {}): Promise<void> {
  stopSpeaking();
  const slow = isSlow(opts.rate);
  const canPlayFiles = typeof Audio !== 'undefined';
  if (opts.audio && canPlayFiles && (await playFile(audioUrl(opts.audio), slow))) return;
  if (canPlayFiles) {
    await loadManifest();
    const url = clipUrl(text);
    if (url && (await playFile(url, slow))) return;
  }
  await deviceVoice(text, opts.rate);
}

// ---------- Sentences from chunks (Tenses lab) ----------

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

function bufferFor(url: string, c: AudioContext): Promise<AudioBuffer | null> {
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(b => c.decodeAudioData(b))
      .catch(() => null);
    buffers.set(url, p);
  }
  return p;
}

/**
 * Plays a built sentence as natural clips back to back ("He" "played"
 * "football" "yesterday"), 80 ms apart. A whole-sentence clip wins when there
 * is one; if any piece has no clip, the sentence goes to speak() instead.
 * Call it from the tap, so iOS lets the sound start.
 */
export async function speakSequence(chunks: string[], fullText: string, opts: {rate?: number} = {}): Promise<void> {
  stopSpeaking();
  await loadManifest();
  if (clipUrl(fullText)) return speak(fullText, opts);
  const urls = chunks.map(clipUrl);
  const c = audioContext();
  if (!c || urls.some(u => !u)) return speak(fullText, opts);
  try {
    await c.resume();
    const list = await Promise.all(urls.map(u => bufferFor(u!, c)));
    if (list.some(b => !b)) return speak(fullText, opts);
    const rate = isSlow(opts.rate) ? 0.75 : 1;
    const GAP = 0.08;
    let at = c.currentTime + 0.05;
    await new Promise<void>(resolve => {
      list.forEach((buf, i) => {
        const src = c.createBufferSource();
        src.buffer = buf!;
        src.playbackRate.value = rate;
        src.connect(c.destination);
        src.start(at);
        at += buf!.duration / rate + GAP;
        playingSources.push(src);
        if (i === list.length - 1) src.onended = () => resolve();
      });
    });
  } catch {
    await speak(fullText, opts);
  }
}

/** Warms the clips a lesson will use, so the first tap plays at once. */
export async function prefetch(texts: string[]): Promise<void> {
  if (typeof fetch === 'undefined') return;
  await loadManifest();
  const urls = [...new Set(texts.map(clipUrl).filter((u): u is string => Boolean(u)))];
  await Promise.all(urls.slice(0, 40).map(u => fetch(u).catch(() => null)));
}

/** Called from the "Start lesson" / "Listen" tap: iOS only allows sound after a gesture. */
export function primeAudio(): void {
  void loadManifest();
  void audioContext()?.resume().catch(() => {});
  const s = synth();
  if (!s || !isSpeechAvailable()) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    s.speak(u);
  } catch {
    /* ignore */
  }
  void loadVoice();
}
