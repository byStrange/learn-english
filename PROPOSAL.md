# Learn English — proposal

A small app that sits next to your live lessons: the boys practise between classes, and you see how they are doing. It does not replace your teaching.

## 1. Platform

- **A mobile-first web app.** It opens in any phone browser (Android or iPhone) from a link, and can be added to the home screen so it looks like an app. It also works in a desktop browser.
- **No app store.** Progress is saved on **your own small server** (a free Supabase project), so you see it in the teacher panel. Each boy logs in with a **4-digit PIN** that you set.
- **Hosted free on GitHub Pages** at `https://bystrange.github.io/learn-english/` from the `byStrange/learn-english` repository. Every push to `main` publishes a new version automatically.

## 2. Who it is for

| Track | Learners | Feel |
|---|---|---|
| **Group 1** | Abdulloh (10), Said Umar | Clear and confident, not babyish. About 10 tasks, ~7 minutes a lesson. |
| **Group 2 · Kids** | Said Ali / Alixon (~8), Said Amir / Amirxon (12) | Colourful, big text and big buttons, pictures on every word. About 6 tasks, 3–4 minutes a lesson. |

The two tracks have their own lessons. **Each of the four boys has his own progress, streak and review schedule**, even when brothers share a phone.

## 3. Main screens

1. **Home — "Who's learning today?"**: two track cards; each boy is a big button with his streak. Tapping a name asks for his **PIN on an on-screen number pad**.
2. **Learner home**: streak and daily goal at the top, one big **Continue lesson** button, then the lesson path (units and lessons, done / next / locked).
3. **Lesson player**: a progress bar, the streak counter, one task at a time, a big Check / Continue button at the bottom.
4. **Review**: today's spaced-review words and verbs only.
5. **Words**: the word bank that grows with each lesson, with flashcards and a "Practise 10 words" button.
6. **Tenses**: a sentence lab. The formula stays on screen as coloured slots, and they build new sentences from the words they have learned, with a hint at every step.
7. **Me**: activity calendar, longest streak, words learned, hint language, whether everything is saved to the server, and **Log out**.
8. **Teacher panel (desktop, for you)**: overview of all four boys, a page per learner (weak words, history, the sentences they made, **Change PIN**), the 12-week roadmap for both tracks, lesson plans per week, resources, the app voice samples, your notes and ticks.

## 4. Lesson structure

Every lesson has the same five steps:

1. **Warm-up review**: words and verbs that are due today (marked "Review").
2. **Formula card**: the grammar as coloured blocks, e.g. **He / She / It** + **V1 + s** + **object** + **every day**, with examples you can listen to.
3. **Practice**: pick the word for a picture, build the sentence from coloured tiles (S + V + O), verb forms V1 → V2 → V3, fill the gap with *yesterday / every day / two hours ago*.
4. **Listening**: hear a word and pick it; hear a sentence and choose *every day / now / yesterday*; Group 1 also types what they hear.
5. **Finish**: streak up, words learned, and "words to practise again".

**Grammar in colour.** Every part of a sentence keeps one colour everywhere in the app: **Subject = green**, **Verb = red**, **Object = blue**, **Time = yellow**. *I + played + football + yesterday* looks the same on the formula card, the tiles and the path, so the S + V + O pattern you teach becomes something they can see.

**Repetition until comfortable.**
- A wrong answer comes back later **in the same lesson** (after 3 misses the answer is shown, and the word is marked for review).
- Every word and verb also returns on a **spaced schedule: 1, 2, 4, 7, 14, 30 days**. A right answer moves it up one step (only once a day); a wrong answer sends it back to tomorrow.
- A word is **"comfortable"** after 4 correct reviews on different days.

## 5. Course outline (12 weeks per track)

**Group 1** starts with a **Quick check** lesson on what you have already taught, so we can find Abdulloh's gaps instead of continuing from his book.

| Week | Group 1 | Group 2 · Kids |
|---|---|---|
| 1 | Quick check + S + V + O *(review)* | Hello & me: *I am…*, colours |
| 2 | Pronouns, am / is / are *(review)* | Numbers and my family |
| 3 | Present simple I / you / we / they *(review)* | My day: *I get up, I eat breakfast* |
| 4 | Present simple he / she / it + s, do / does | My day: *you / we / they*, every day |
| 5 | Past simple regular -ed + yesterday, two hours ago *(review)* | He and she + s |
| 6 | Irregular verbs V1 / V2 / V3, batch 1–2 *(review)* | He and she: food and school |
| 7 | Irregular verbs batch 3, present vs past | Yesterday: *played, watched* (-ed) |
| 8 | Past simple: didn't + V1, Did you…? | Yesterday: *was / were* |
| 9 | Present continuous: am / is / are + -ing | Yesterday: *went, ate, saw* |
| 10 | Present continuous vs present simple | My week: days of the week |
| 11 | Future: going to / will | Questions: *Do you…? Did you…?* |
| 12 | Review + "tell a story" checkpoint | **Goal week**: tell about my day and yesterday |

Weeks 1–7 (Group 1) and 1–7 (Group 2) are written as lessons in the first version; later weeks are on the roadmap and marked "Coming soon" in the app until we add them.

## 6. The Group 2 goal

> **"Tell about my day — and about yesterday."**
> By week 12, Ali and Amir can each say **5 sentences in present simple about their day** and **5 sentences in past simple about yesterday**, and **recognise 200 everyday words by ear**.

The goal and a progress meter (words x / 200, sentences y / 10) are shown on the Group 2 home, at the start of each lesson and on the finish screen. You check the spoken sentences in class and tick them in your panel.

## 7. Stack

- **Vite + React + TypeScript**, built on **Curialy UI** (accessible buttons, cards, tables and themes).
- **Server: Supabase** (a hosted Postgres database with a free tier). It's your own project, used only by this app. The app talks to it only through a few server functions (log in, save progress, read the overview), and nobody can read the tables directly.
- The web pages themselves are still free on GitHub Pages.
- Lessons are **plain TypeScript data files**: you add a word or a lesson by copying an example. A test catches typos (a missing word, an answer that isn't among the options).
- Everyday commands: `npm install`, `npm run dev`, `npm test`. Plus `npm run set-pin` to set a PIN and `npm run audio` to record new words.

## 8. Audio

Phone voices sound robotic on many phones, so every word and sentence is **recorded once with a natural voice model, Kokoro**, and the app plays those recordings. Every listening task has **Play** and **Slow** (0.75×).

| Option | Sound | Cost | Notes |
|---|---|---|---|
| The phone's own voice | Robotic on many Androids, different on every phone | Free | Kept only as the last fallback |
| Piper | Clear but flatter | Free | Faster, less natural than Kokoro in comparisons |
| **Kokoro-82M (chosen)** | **Natural, native-sounding US and UK voices** | **Free (Apache-2.0)** | Recorded once on your computer (`npm run audio`); the phones just play small mp3s, so it costs nothing to run |
| Cloud voices (Google, Azure, ElevenLabs) | Excellent | Needs a key and billing | A possible later upgrade for free-form sentences |

Sources: [kokoro.js](https://github.com/hexgrad/kokoro/blob/main/kokoro.js/README.md), [micdrop: Kokoro](https://micdrop.dev/docs/text-to-speech/kokoro), [Inferless TTS comparison](https://www.inferless.com/learn/comparing-different-text-to-speech---tts--models-part-2), [Piper vs Kokoro](https://bthek1.github.io/DL_tasks/Frameworks/piper_vs_kokoro.html).

- All 436 words, verb forms and sentences take about 2 MB. Sentences the boys build on the Tenses screen play as recorded pieces back to back.
- **Order:** your own mp3 for a word (if you add one), then the Kokoro recording, then the phone's voice. If there's no sound at all, "Show the word" keeps the lesson going.
- Five sample voices are in the teacher panel (Resources → App voice). The current one is *Heart* (American).

## 9. Teacher panel: how it knows what the boys did

**The phones save to your server, and the panel reads it live.** After every lesson, review, flashcard or saved sentence, the phone sends that boy's progress to the server. The panel shows it, refreshing every minute and with a **Refresh** button. Without internet the phone keeps everything and sends it as soon as it's back online. If one boy uses two phones, the two copies are combined, so nothing is lost.

- The panel (`…/#/teacher`, your **6-digit PIN**) is laid out for a desktop: a table of all four boys (streak, last active, lessons done, accuracy, due words, comfortable words), "needs attention" words, minutes per day, the roadmap with **lesson plans and resources** for each week, and **your notes and "taught in class" ticks**. Ticks and notes are saved on the server too, so you see them on any computer.
- Each boy's page shows his weak words, his recent sessions, **the sentences he made on the Tenses screen**, and a **Change PIN** button.

## 10. PIN login

- Home shows all four boys. Tapping a name opens a **number pad drawn on the page**, so the phone keyboard never opens. A wrong PIN says how many tries are left; after 5 wrong tries that name is locked for 15 minutes.
- Choosing a name on Home always asks for the PIN, so brothers sharing a phone can't open each other's progress. Inside the app a reload keeps you logged in.
- You set the PINs before you hand the phones over: in the panel (**Change PIN**) or with `npm run set-pin -- said-ali 4821`.
- This is family-level protection, not bank-level: 4 digits are easy to guess, so the lock-out after 5 tries is what keeps it safe.

## 11. Tenses lab

- The formula is always on screen as coloured slots: **Who?** (green) + **does what?** (red) + **what?** (blue) + **when?** (yellow). Group 1 also does negatives (*doesn't / didn't*) and questions (*Does… ? Did… ?*).
- They fill the slots with tiles from **the words they have learned**, plus I / you / he / she / we / they and their own names, so the lab grows with their vocabulary.
- Every pick gets help in plain words: *"He, she, it → add -s: play → plays"*, *"After didn't, use V1: go"*, *"Yesterday is past. Switch to Past simple?"*. A wrong tile stays out of the slot; after two misses the right one is outlined.
- A tense opens once they've done a lesson of the unit that teaches it. A finished sentence can be played back and saved. Saved sentences show in your panel, three a day keep the streak going, and they count towards the Group 2 goal.

## 12. Questions for you

1. How old is **Said Umar**?
2. **Hint language**: Uzbek (Latin), Arabic, or no hints? The first version has Uzbek hints that you should check.
3. **Which voice** do you like? Listen in the teacher panel → Resources → App voice (Heart, Bella, Emma, George or Michael).
4. **PINs**: the temporary ones I set are in my message. Change them with **Change PIN** before handing the phones over.
5. Do you **approve the Group 2 goal**, or would you like a different one?
6. Your repository now has its first commit (plan.txt). After you approve, I'll push the app to a new branch and open a pull request for you to merge (or straight to main if you prefer).
