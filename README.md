# Learn English

A small mobile-first web app that sits **next to live lessons**: the boys practise between classes, the teacher sees how they are doing. It does not replace the teaching.

- **Group 1:** Abdulloh, Said Umar. Core English: S + V + O, present simple, past simple, V1 · V2 · V3.
- **Group 2 · Kids:** Said Ali (Alixon), Said Amir (Amirxon). The same programme with short, colourful lessons, big text and big buttons. Goal: *Tell about my day — and about yesterday*.
- **Teacher panel** (desktop): open `#/teacher`. Shows all four learners, the 12-week roadmap, lesson plans, notes and resources.

Each learner has his own progress, streak and review schedule. Learners log in with a **4-digit PIN** on an on-screen number pad, and the teacher with a **6-digit PIN**. Progress is saved on the server (Supabase), so the teacher panel shows it live.

## Run it

You need **Node 20 or newer**.

```bash
npm install        # once (Curialy UI comes from curialy.tech, pinned in package-lock.json)
npm run dev        # open the printed URL
npm run dev -- --host   # also open it on a phone on the same Wi-Fi (use the "Network" URL)
npm test           # all checks: streak, spaced review, lesson queue, grammar, sync, PIN pad, content
npm run build      # makes dist/
npm run preview    # serves dist/ like the real site
```

**Without a server (development only):** if `.env.local` is missing, `npm run dev` uses a built-in pretend server that keeps data in the browser. Every learner's PIN is **1234** and the teacher's is **123456**. A real build without the server settings shows "This copy isn't connected to the server".

## Connect the server (Supabase)

1. **Create the tables and functions once:** run `supabase/migrations/20261120000000_learn_english.sql`, either with `psql "<your database URL>" -f supabase/migrations/20261120000000_learn_english.sql` or by pasting it into Supabase → **SQL Editor** → Run. Running it again is safe.
2. **Make `.env.local`** in the project folder (it's git-ignored; see `.env.example`):

   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<the publishable / anon key>
   SUPABASE_SERVICE_ROLE_KEY=<the service_role key, only for set-pin, never commit it>
   ```

   The publishable key is safe in the app: it can only call the login and save functions. The service key can set PINs, so it stays on your computer.
3. **Set the PINs** before handing the phones over:

   ```bash
   npm run set-pin -- said-ali 4821      # learners: abdulloh, said-umar, said-ali, said-amir (4 digits)
   npm run set-pin -- teacher 135790     # the teacher panel (6 digits)
   ```

   You can also change a learner's PIN in the teacher panel (learner page → **Change PIN**). A new PIN logs that person out on their phone.

## Publish on GitHub Pages

1. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Add two secrets, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, with the same values as in `.env.local`. **Don't** add the service key.
2. **Settings → Pages → Source: "GitHub Actions"**.
3. Push to `main`. `.github/workflows/deploy.yml` runs the tests, builds with the two secrets, and publishes.
4. The app is at **https://bystrange.github.io/learn-english/** (teacher panel: `…/learn-english/#/teacher`).

## How to add a lesson

Lessons are plain data. `npm test` checks every id, so a typo fails the test instead of breaking the app.

**1. Add the new words** to `src/content/words.ts` (the list made with `w(english, uzbekHint, picture?, role?, example?)`):

```ts
w('kite', 'varrak', '🪁', 'object', 'I fly a kite.'),
```

The id becomes `w-kite`. Verbs go in `src/content/verbs.ts` the same way (with V1 · V2 · V3).

**2. Add the lesson** to a unit's `lessons: [...]` list in `src/content/g1/units.ts` (Group 1) or `src/content/g2/units.ts` (Group 2). The helpers at the top of the file keep it short:

```ts
{
  id: 'g1-kite-1',
  title: 'I fly a kite',
  minutes: 6,
  newItems: ['w-kite'],
  formula: formula('Subject + verb + object', 'I:s fly:v a_kite:o every_day:t', ['I fly a kite every day.']),
  exercises: [
    pick('w-kite'),                                     // see the picture, pick the word
    listen('w-kite'),                                   // hear the word, pick it
    build('I:s play:v football:o every_day:t'),         // tap the colour tiles in order
    gap('Yesterday I ___ football.', 'played', ['play', 'played', 'plays']),
    hear('I play football every day.', 'When?', 'every day', ['every day', 'now', 'yesterday']),
    card('w-kite'),                                     // flashcard: look, listen, flip
    build('He:s plays:v football:o', {extra: 'play:v'}), // an extra wrong tile in the bank
    gap('He ___ to school every day.', 'goes', ['go', 'goes', 'went']),
  ],
},
```

Tiles are written `text:role`, with `_` for a space inside one tile. Roles: `s` subject (green), `v` verb (red), `o` object (blue), `t` time (yellow). Every lesson needs at least one listening task (`listen`, `typeIt` or `hear`). Group 1 lessons have 8–12 tasks; Group 2 lessons have at most 6.

**3. (Optional) Use the word on the Tenses screen.** Add a line to `LAB_OBJECTS` in `src/content/lab.ts`. `tags` says which verbs it fits (`'toy'` goes with *play*, `'food'` with *eat*), and `asObject` is how it sits in a sentence:

```ts
{id: 'w-kite', tags: ['toy'], asObject: 'a kite'},
```

Time words go in `LAB_TIMES` with `timeOf: 'present' | 'past' | 'any'` (*yesterday* is past; *every day* is present; *today* is both). Frequency words like *usually* get `mid: true`, because they sit between the subject and the verb. Verbs go in `LAB_VERBS` with `takes: [...]`, the tags they accept.

**4. Run `npm test`.** The content test names anything that is wrong. (`npm run check:readme` checks that the example above still passes.)

**5. Record the new words:** `npm run audio`. Only the new texts are recorded (about 3 seconds each). The first run downloads the voice model (about 90 MB) once. Until then the app uses the phone's voice for the new words, and `npm test` prints a reminder.

**6. (Optional) Set it as homework** in `src/content/teacher/roadmap.ts`: add the lesson id to that week's `homeworkLessonIds`.

## Voices and your own audio

The app plays sound in this order:

1. **Your own recording**, if a word has one: put an mp3 in `public/audio/` and add `audio` to the word:

   ```ts
   {...w('went', 'bordi'), audio: '/audio/went.mp3'},
   ```

2. **The natural Kokoro recording** from `public/audio/tts/`, made by `npm run audio` (tools in `tools/tts/`, which has its own install; the app install never downloads the model).
3. **The phone's own voice**, as a last fallback.

To change the voice, listen to the samples (teacher panel → Resources → App voice, or `public/audio/samples/`), put the voice id in `tools/tts/config.json` (e.g. `"voice": "bf_emma"`), then run `npm run audio -- --force` to re-record everything (about 20 minutes). `npm run audio:samples` remakes the five samples.

## How progress is saved

- Each phone sends a learner's progress to **the server** after every lesson, review, flashcard and saved sentence. The teacher panel reads it from there (refreshing every minute, or press **Refresh**).
- The phone also keeps a copy, so lessons work **without internet**; the changes are sent when it's back online. Me shows "Saved to the server" or "Saved on this phone, it'll be sent later".
- If one learner uses two phones, the two copies are **combined** (lessons, words, history and sentences from both are kept, and the streak is rebuilt from all active days), so nothing is lost.
- Choosing a name on Home always asks for the PIN, and **Me → Log out** ends the session on that phone.

## Spaced review rules

- Every word or verb sits in a **box from 0 to 6**. A right answer moves it up one box (at most once a day); a wrong answer puts it back to box 1 and it comes back the same day.
- It comes back after **1, 2, 4, 7, 14 and 30 days**. From **box 4** it counts as **comfortable**.
- In a lesson, a wrong answer comes back a few tasks later; after 3 tries the answer is shown.
- Every lesson starts with words that are due, marked **Review**.

## Testing on another day

In development only, add `?today=YYYY-MM-DD` before the `#`, e.g. `http://localhost:5173/?today=2026-06-02#/learn/said-ali`, to see the next day's review and streak.

## Please check

The Uzbek hints were written for this first version and need checking by the teacher (Me → Hint language can also turn them off).

Built with Vite, React, TypeScript and Curialy UI.
