import {createFakeBackend, FAKE_LEARNER_PIN, FAKE_TEACHER_PIN} from './fakeBackend';
import {InvalidSession} from './backend';

async function token(b: ReturnType<typeof createFakeBackend>, user: string, pin: string) {
  const r = await b.login(user, pin);
  if (!r.ok) throw new Error(`login failed: ${r.reason}`);
  return r.token;
}

describe('fake backend follows the server rules', () => {
  it('counts down wrong PINs and locks after 5, even for the right PIN', async () => {
    const b = createFakeBackend();
    const tries: unknown[] = [];
    for (let i = 0; i < 5; i++) tries.push(await b.login('said-ali', '0000'));
    expect(tries[0]).toEqual({ok: false, reason: 'wrong_pin', triesLeft: 4});
    expect(tries[4]).toMatchObject({ok: false, reason: 'locked'});
    expect(await b.login('said-ali', FAKE_LEARNER_PIN)).toMatchObject({ok: false, reason: 'locked'});
    // Other learners are not affected.
    expect((await b.login('said-amir', FAKE_LEARNER_PIN)).ok).toBe(true);
  });

  it('unlocks after 15 minutes', async () => {
    let t = 1_000_000;
    const b = createFakeBackend({now: () => t});
    for (let i = 0; i < 5; i++) await b.login('abdulloh', '9999');
    t += 15 * 60 * 1000 + 1;
    expect((await b.login('abdulloh', FAKE_LEARNER_PIN)).ok).toBe(true);
  });

  it('refuses a save made on top of an old version and returns the newer copy', async () => {
    const b = createFakeBackend();
    const tk = await token(b, 'abdulloh', FAKE_LEARNER_PIN);
    const doc = {learnerId: 'abdulloh', xp: 1};
    expect(await b.saveProgress(tk, doc, 0)).toEqual({ok: true, version: 1});
    expect(await b.saveProgress(tk, {...doc, xp: 2}, 1)).toEqual({ok: true, version: 2});
    const stale = await b.saveProgress(tk, {...doc, xp: 99}, 1);
    expect(stale).toEqual({ok: false, version: 2, doc: {learnerId: 'abdulloh', xp: 2}});
    expect(await b.getProgress(tk)).toEqual({doc: {learnerId: 'abdulloh', xp: 2}, version: 2});
  });

  it("won't save another learner's progress", async () => {
    const b = createFakeBackend();
    const tk = await token(b, 'abdulloh', FAKE_LEARNER_PIN);
    await expect(b.saveProgress(tk, {learnerId: 'said-ali'}, 0)).rejects.toThrow();
  });

  it('only the teacher sees the overview', async () => {
    const b = createFakeBackend();
    const learner = await token(b, 'said-ali', FAKE_LEARNER_PIN);
    await expect(b.teacherOverview(learner)).rejects.toThrow();
    const teacher = await token(b, 'teacher', FAKE_TEACHER_PIN);
    const rows = await b.teacherOverview(teacher);
    expect(rows.map(r => r.userId).sort()).toEqual(['abdulloh', 'said-ali', 'said-amir', 'said-umar']);
  });

  it('an unknown or expired token is an InvalidSession', async () => {
    let t = 1_000_000;
    const b = createFakeBackend({now: () => t});
    await expect(b.getProgress('nope')).rejects.toBeInstanceOf(InvalidSession);
    const tk = await token(b, 'said-amir', FAKE_LEARNER_PIN);
    t += 61 * 24 * 3600 * 1000;
    await expect(b.getProgress(tk)).rejects.toBeInstanceOf(InvalidSession);
  });

  it('changing a PIN logs that learner out and the old PIN stops working', async () => {
    const b = createFakeBackend();
    const learner = await token(b, 'said-ali', FAKE_LEARNER_PIN);
    const teacher = await token(b, 'teacher', FAKE_TEACHER_PIN);
    await expect(b.setPin(teacher, 'said-ali', '12')).rejects.toThrow();
    await b.setPin(teacher, 'said-ali', '4821');
    await expect(b.getProgress(learner)).rejects.toBeInstanceOf(InvalidSession);
    expect(await b.login('said-ali', FAKE_LEARNER_PIN)).toMatchObject({ok: false, reason: 'wrong_pin'});
    expect((await b.login('said-ali', '4821')).ok).toBe(true);
  });
});
