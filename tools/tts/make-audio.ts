/**
 * Makes the app's natural voice clips with Kokoro-82M (Apache-2.0), on your
 * computer, once. Phones then just download small mp3 files: no model, no key,
 * no running cost.
 *
 *   npm run audio                 new / changed texts only (resumes after a stop)
 *   npm run audio -- --force      everything again (e.g. after changing the voice)
 *   npm run audio -- --voice bf_emma
 *   npm run audio -- --samples    5 voices saying one sentence, to choose from
 *
 * The model (~90 MB, q8) downloads on the first run.
 */
import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import {KokoroTTS} from 'kokoro-js';
import {spokenTexts} from '../../src/content/spoken';
import {fnv1a32Hex, normalize} from '../../src/lib/clipKey';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(root, 'public', 'audio', 'tts');
const samplesDir = join(root, 'public', 'audio', 'samples');
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const SAMPLE_VOICES = ['af_heart', 'af_bella', 'bf_emma', 'bm_george', 'am_michael'] as const;
const SAMPLE_TEXT = 'Yesterday I played football with my brother.';

interface Config {
  voice: string;
  speed: number;
  dtype: 'fp32' | 'fp16' | 'q8' | 'q4';
}
interface Manifest {
  voice: string;
  model: string;
  clips: Record<string, string>;
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const config: Config = {voice: 'af_heart', speed: 1, dtype: 'q8', ...JSON.parse(readFileSync(join(here, 'config.json'), 'utf8'))};
const voice = opt('voice') ?? config.voice;
if (!ffmpegPath) throw new Error('ffmpeg-static has no binary for this computer.');

/** wav → trimmed mono 24 kHz mp3 (silence cut from both ends). */
function encode(wav: string, mp3: string) {
  execFileSync(ffmpegPath as unknown as string, [
    '-y', '-loglevel', 'error', '-i', wav,
    '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
    '-ac', '1', '-ar', '24000', '-b:a', '48k', mp3,
  ]);
}

async function main() {
  const t0 = Date.now();
  console.log(`Loading ${MODEL} (${config.dtype})…`);
  const tts = await KokoroTTS.from_pretrained(MODEL, {dtype: config.dtype, device: 'cpu'});
  const tmp = join(tmpdir(), `le-tts-${process.pid}.wav`);

  if (flag('samples')) {
    mkdirSync(samplesDir, {recursive: true});
    for (const v of SAMPLE_VOICES) {
      const audio = await tts.generate(SAMPLE_TEXT, {voice: v as never, speed: config.speed});
      await audio.save(tmp);
      encode(tmp, join(samplesDir, `${v}.mp3`));
      console.log(`sample ${v}`);
    }
    rmSync(tmp, {force: true});
    return;
  }

  mkdirSync(outDir, {recursive: true});
  const manifestPath = join(outDir, 'manifest.json');
  const old: Manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {voice, model: MODEL, clips: {}};
  const force = flag('force') || old.voice !== voice;
  const manifest: Manifest = {voice, model: MODEL, clips: force ? {} : {...old.clips}};

  const texts = spokenTexts();
  const wanted = new Map<string, {text: string; file: string}>();
  const byFile = new Map<string, string>();
  for (const text of texts) {
    const key = normalize(text);
    const file = `${fnv1a32Hex(key)}.mp3`;
    const other = byFile.get(file);
    if (other && other !== key) throw new Error(`Clip name collision: "${key}" and "${other}". Change one text slightly.`);
    byFile.set(file, key);
    wanted.set(key, {text, file});
  }
  // Drop entries for texts that are gone.
  for (const key of Object.keys(manifest.clips)) if (!wanted.has(key)) delete manifest.clips[key];

  const save = () => writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  let made = 0;
  let i = 0;
  for (const [key, {text, file}] of wanted) {
    i++;
    const path = join(outDir, file);
    if (!force && manifest.clips[key] === file && existsSync(path)) continue;
    const audio = await tts.generate(text, {voice: voice as never, speed: config.speed});
    await audio.save(tmp);
    encode(tmp, path);
    manifest.clips[key] = file;
    made++;
    if (made % 20 === 0) {
      save();
      console.log(`${i} / ${wanted.size}  (${made} new)`);
    }
  }
  save();
  rmSync(tmp, {force: true});

  // Remove clips no text uses any more.
  const keep = new Set(Object.values(manifest.clips));
  let pruned = 0;
  for (const f of readdirSync(outDir)) {
    if (f.endsWith('.mp3') && !keep.has(f)) {
      rmSync(join(outDir, f));
      pruned++;
    }
  }
  const bytes = readdirSync(outDir).reduce((n, f) => n + statSync(join(outDir, f)).size, 0);
  console.log(
    `Done: ${wanted.size} clips (${made} new, ${pruned} removed), ${(bytes / 1048576).toFixed(1)} MB, voice ${voice}, ${Math.round((Date.now() - t0) / 1000)} s.`,
  );
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
