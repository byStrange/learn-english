import {_setManifestForTests, clipUrl, isAudioAvailable, isSpeechAvailable, pickVoice, speak, speakSequence} from './speech';
import {fnv1a32Hex, normalize} from './clipKey';

const v = (lang: string, localService: boolean, name = lang) => ({lang, localService, name});

describe('pickVoice', () => {
  it('prefers a natural-sounding British or American voice', () => {
    const voices = [v('en-US', true, 'eSpeak English'), v('en-GB', true, 'Daniel'), v('en-US', false, 'Google US English')];
    expect(pickVoice(voices)?.name).toBe('Daniel');
  });
  it('avoids eSpeak and compact voices when anything else exists', () => {
    const voices = [v('en-US', true, 'eSpeak English'), v('en-US', true, 'Fred (compact)'), v('en-AU', false, 'Karen')];
    expect(pickVoice(voices)?.name).toBe('Karen');
  });
  it('then takes a local en-GB / en-US voice', () => {
    const voices = [v('ar-EG', true), v('en-AU', true), v('en-US', false, 'cloud'), v('en-GB', true, 'local gb')];
    expect(pickVoice(voices)?.name).toBe('local gb');
  });
  it('falls back to eSpeak rather than nothing, and returns null with no English voice', () => {
    expect(pickVoice([v('en-US', true, 'eSpeak English')])?.name).toBe('eSpeak English');
    expect(pickVoice([v('ar-EG', true), v('uz-UZ', true)])).toBeNull();
  });
});

describe('clip keys', () => {
  it('normalise the same way for the generator and the app', () => {
    expect(normalize('  Yesterday I  played football. ')).toBe('yesterday i played football');
    expect(normalize('Does she drink milk?')).toBe('does she drink milk?');
    expect(normalize('don’t')).toBe("don't");
    expect(fnv1a32Hex('went')).toMatch(/^[0-9a-f]{8}$/);
  });
});

class FakeAudio {
  static played: string[] = [];
  static failing = new Set<string>();
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public src: string) {}
  play() {
    FakeAudio.played.push(this.src);
    setTimeout(() => (FakeAudio.failing.has(this.src) ? this.onerror?.() : this.onended?.()), 0);
    return Promise.resolve();
  }
  pause() {}
}

function mockSynth() {
  const spoken: string[] = [];
  class Utterance {
    text: string;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    lang = '';
    rate = 1;
    voice: unknown = null;
    volume = 1;
    constructor(t: string) {
      this.text = t;
    }
  }
  const synth = {
    cancel: vi.fn(),
    getVoices: () => [v('en-GB', true, 'Daniel')],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    speak: vi.fn((u: Utterance) => {
      spoken.push(u.text);
      setTimeout(() => u.onend?.(), 0);
    }),
  };
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  Object.defineProperty(window, 'speechSynthesis', {value: synth, configurable: true, writable: true});
  return spoken;
}

describe('speak: teacher recording, then Kokoro clip, then the device voice', () => {
  let spoken: string[];
  beforeEach(() => {
    FakeAudio.played = [];
    FakeAudio.failing = new Set();
    vi.stubGlobal('Audio', FakeAudio);
    spoken = mockSynth();
    _setManifestForTests({went: 'aaaa1111.mp3', 'he played football yesterday': 'bbbb2222.mp3'});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    _setManifestForTests(null);
  });

  it("plays the teacher's own mp3 first", async () => {
    await speak('went', {audio: '/audio/went.mp3'});
    expect(FakeAudio.played).toEqual(['/audio/went.mp3']);
    expect(spoken).toEqual([]);
  });

  it('plays the Kokoro clip before the device voice', async () => {
    await speak('Went.');
    expect(FakeAudio.played).toEqual(['/audio/tts/aaaa1111.mp3']);
    expect(spoken).toEqual([]);
  });

  it('uses the device voice when there is no clip', async () => {
    await speak('banana');
    expect(FakeAudio.played).toEqual([]);
    expect(spoken).toEqual(['banana']);
  });

  it('falls through to the clip when the teacher file is missing, and to the voice when the clip fails', async () => {
    FakeAudio.failing.add('/audio/missing.mp3');
    await speak('went', {audio: '/audio/missing.mp3'});
    expect(FakeAudio.played).toEqual(['/audio/missing.mp3', '/audio/tts/aaaa1111.mp3']);
    FakeAudio.played = [];
    FakeAudio.failing.add('/audio/tts/aaaa1111.mp3');
    await speak('went');
    expect(spoken).toEqual(['went']);
  });

  it('plays slow clips at 0.75×', async () => {
    let rate = 0;
    vi.stubGlobal(
      'Audio',
      class extends FakeAudio {
        play() {
          rate = this.playbackRate;
          return super.play();
        }
      },
    );
    await speak('went', {rate: 0.6});
    expect(rate).toBe(0.75);
  });

  it('speakSequence uses a whole-sentence clip, and falls back to speak() when a chunk is missing', async () => {
    await speakSequence(['He', 'played', 'football', 'yesterday'], 'He played football yesterday.');
    expect(FakeAudio.played).toEqual(['/audio/tts/bbbb2222.mp3']);
    FakeAudio.played = [];
    await speakSequence(['She', 'went', 'home'], 'She went home.');
    expect(spoken).toEqual(['She went home.']);
  });

  it('knows which texts have a clip', () => {
    expect(clipUrl('WENT')).toBe('/audio/tts/aaaa1111.mp3');
    expect(clipUrl('ran')).toBeNull();
  });
});

describe('when the device has no speech', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
  beforeEach(() => {
    // @ts-expect-error simulate a browser without the Web Speech API
    delete window.speechSynthesis;
  });
  afterEach(() => {
    if (original) Object.defineProperty(window, 'speechSynthesis', original);
    _setManifestForTests(null);
    vi.unstubAllGlobals();
  });

  it('reports no speech; a file or a clip still counts as sound', () => {
    vi.stubGlobal('Audio', FakeAudio);
    _setManifestForTests({went: 'aaaa1111.mp3'});
    expect(isSpeechAvailable()).toBe(false);
    expect(isAudioAvailable()).toBe(false);
    expect(isAudioAvailable(undefined, 'banana')).toBe(false);
    expect(isAudioAvailable(undefined, 'went')).toBe(true);
    expect(isAudioAvailable('/audio/went.mp3')).toBe(true);
  });

  it('speak() resolves quietly instead of throwing', async () => {
    await expect(speak('went')).resolves.toBeUndefined();
  });
});
