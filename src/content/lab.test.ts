import {words} from './words';
import {verbs} from './verbs';
import {tracks} from './tracks';
import {FAMILY_SUBJECTS, LAB_OBJECTS, LAB_TIMES, LAB_VERBS} from './lab';
import {LAB_VERB_TILES, objectsFor} from './labData';
import {TENSES} from './tenses';
import {spokenTexts} from './spoken';
import {normalize} from '../lib/clipKey';

const wordIds = new Set(words.map(w => w.id));
const verbIds = new Set(verbs.map(v => v.id));

describe('Tenses lab content', () => {
  it('only uses words and verbs from the banks', () => {
    for (const o of LAB_OBJECTS) expect(wordIds.has(o.id), o.id).toBe(true);
    for (const t of LAB_TIMES) expect(wordIds.has(t.id), t.id).toBe(true);
    for (const f of FAMILY_SUBJECTS) expect(wordIds.has(f.id), f.id).toBe(true);
    for (const v of LAB_VERBS) expect(verbIds.has(v.id), v.id).toBe(true);
  });

  it('every verb with an object has at least 3 objects that fit', () => {
    for (const v of LAB_VERB_TILES) {
      if (v.noObject) continue;
      expect(objectsFor(v.id).length, v.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('every time word says whether it is past, present or both', () => {
    for (const t of LAB_TIMES) expect(['past', 'present', 'any']).toContain(t.timeOf);
    const ids = LAB_TIMES.map(t => t.id);
    for (const must of ['w-yesterday', 'w-every-day', 'w-today']) expect(ids).toContain(must);
  });

  it('each tense is taught by a real unit in both tracks', () => {
    for (const tense of TENSES) {
      for (const track of tracks) {
        const unit = track.units.find(u => u.id === tense.unitIds[track.id]);
        expect(unit, `${tense.id} ${track.id}`).toBeDefined();
        expect(unit!.lessons.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('natural voice clips', () => {
  it('cover every text the app can say (run `npm run audio` after adding words)', async () => {
    // Node's fs, loaded at run time so the app's type check needs no Node types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs: any = await import('node:fs' as string);
    const manifestPath = 'public/audio/tts/manifest.json';
    if (!fs.existsSync(manifestPath)) return;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {clips: Record<string, string>};
    const missing = spokenTexts().filter(t => !manifest.clips[normalize(t)]);
    // New words you just added have no clip until you run `npm run audio`: the app
    // uses the phone's voice for them meanwhile, so this only warns. CI sets
    // STRICT_CLIPS=1 so a deploy never ships without the recordings.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proc: any = await import('node:process' as string);
    if (proc.env.STRICT_CLIPS === '1') expect(missing).toEqual([]);
    else if (missing.length > 0) console.warn(`${missing.length} text(s) have no natural-voice clip yet. Run \`npm run audio\` to record: ${missing.slice(0, 5).join(' | ')}`);
    for (const file of Object.values(manifest.clips).slice(0, 50)) expect(fs.existsSync(`public/audio/tts/${file}`), file).toBe(true);
  });
});
