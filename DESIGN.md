# Design direction: "Grammar in colour"

**Concept.** A bright classroom marker set where every colour has a grammar job. *I* (green) + *played* (red) + *football* (blue) + *yesterday* (yellow) looks the same on formula cards, word tiles and the lesson path, so S + V + O becomes visual memory.

**Colours (light mode only).**
| Name | Hex | Role | Contrast |
|---|---|---|---|
| Pale sky | #F3F7FF | page | — |
| Paper white | #FFFFFF | raised surface | — |
| Ink | #172033 | text | 16:1 on white |
| Slate | #475069 | muted text | 7.5:1 on page |
| Marker blue | #1D5FD1 | accent, focus ring, Group 1 | white label 5.8:1 |
| Flame | #E0620F | streak icon (number in Ink) | 3.5:1 icon |
| Subject | bg #DDF5E5 · border #1E8C4E · text #1C6B3A | subject tiles, "correct" | 5.7:1 |
| Verb | bg #FFE4DF · border #D93A2B · text #B3261E | verb tiles, "wrong" | 5.4:1 |
| Object | bg #DDEBFF · border #1A73C9 · text #0B4F94 | object tiles | 6.8:1 |
| Time | bg #FFF0B8 · border #C98F00 · text #6B4A00 | time words | 7.1:1 |
| Sunny / Coral | #FFC83D / #FF6F59 | Group 2 surfaces, Ink text only | 10.6:1 / 6.0:1 |

Status always pairs colour with an icon and words.

**Type.** Display "Baloo 2" 700–800; body "Lexend" 400/500/600 (built for reading fluency). Group 1: base 17, ratio 1.2, prompt 40 px. Group 2: base 20, ratio 1.25, prompt 56 px, body never below 18. Teacher: base 15. Tabular numbers for stats. Sentence case; no all-caps eyebrows.

**Space.** 4 px base, 8 px rhythm (4, 8, 12, 16, 24, 32, 48, 64). Learner app in a 560 px column; teacher panel full desktop width.

**Shape.** Tiles 16 px radius, cards 24, buttons from the theme. Elevation only on the lesson's bottom action bar and the tab bar (translucent ring shadow). Inputs and dividers use solid borders.

**Motion.** Event-driven only: tile press scale .97 + ripple (150 ms), feedback panel slides up (300 ms), tab indicator slides (300 ms), flashcard flip (300 ms), finish screen count-up (800 ms) and word-card fan (80 ms stagger), audio bars only while sound plays. Easing cubic-bezier(0.22, 1, 0.36, 1). Reduced motion: no translate, scale or rotate.

**Avoid.** A Duolingo clone (owl, mascot, that green); purple gradients, glow blobs, glass; cream paper + serif + terracotta; emoji as UI icons (emoji only as a word's picture); confetti and bouncy easing; cards inside cards; Inter / system-ui; hover-only or swipe-only controls; phone UI stretched across a desktop.

## Tenses lab and PIN login

**Tenses lab.** The formula is the screen's one bold element: a sticky row of slots in the grammar colours, **Who?** (Subject green) + **does what?** (Verb red; *don't / doesn't / didn't* and *Do / Does / Did* are verb red too) + **what?** (Object blue) + **when?** (Time yellow). An empty slot is a dashed 2 px border in its role colour on white, with its label in the role's text colour. A filled slot takes the role's tint. Tiles in the tray below use the same colours, so the colour rule is the thing they play with.

- Guidance line (aria-live): a right pick uses the Subject set with a check icon; a hint uses the Time set with a light-bulb icon. It is never red, so it reads as help, not failure. After 2 misses the right tile gets an outline.
- Built sentence: heading face, 28 px (Group 1) / 34 px (Group 2). Slot labels Lexend 600, 14 / 16 px. Guidance 17 / 20 px.
- Group 2: positive sentences only, bigger slots and tiles (the `[data-track='g2']` sizes).

**PIN pad.** A phone keypad from the same marker set, not a bank login. A row of dots, then a 3 × 4 grid (1–9, a gap, 0, Delete), max 320 px wide. Keys are at least 64 px (72 px for Group 2) with 12 px gaps; digits in Baloo 2 700, 28 / 32 px. No `<input>`, so no system keyboard; on desktop the number keys work too. A wrong PIN turns the dots Verb red for 600 ms, then clears (a colour change, no shake). The message names the tries left.

**Sync status** (Me): one quiet line in Slate with a static icon ("Saved to the server", "Saving…", "No internet — saved on this phone"). The error state uses the Verb text colour. Nothing spins.

**Motion.** Slot fill fades its background over 150 ms; tiles scale to 0.97 on press; the guidance line crossfades over 150 ms; the Rules card opens over 300 ms. Under reduced motion: no transforms, fades ≤ 150 ms, Rules opens instantly.
