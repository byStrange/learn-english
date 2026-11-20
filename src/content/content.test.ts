import {describe, expect, it} from 'vitest';
import {words} from './words';
import {verbs} from './verbs';
import {tracks} from './tracks';
import {allLessons, getItem, hasItem, trackItemIds} from './index';
import {roadmaps} from './teacher/roadmap';
import type {Exercise} from './types';

const exerciseRefs = (e: Exercise): string[] => {
  switch (e.type) {
    case 'pick-word':
    case 'listen-pick':
    case 'listen-type':
    case 'flashcard':
      return [e.itemId];
    case 'verb-form':
      return [e.verbId];
    case 'fill-gap':
      return e.reviewId ? [e.reviewId] : [];
    default:
      return [];
  }
};

describe('course content', () => {
  it('has unique ids for words, verbs, units and lessons', () => {
    const ids = [
      ...words.map(w => w.id),
      ...verbs.map(v => v.id),
      ...tracks.flatMap(t => t.units.map(u => u.id)),
      ...tracks.flatMap(t => t.units.flatMap(u => u.lessons.map(l => l.id))),
    ];
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it('has unique learner ids across tracks', () => {
    const ids = tracks.flatMap(t => t.learners.map(l => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const track of tracks) {
    describe(track.name, () => {
      const lessons = allLessons(track);

      it('has ready lessons', () => {
        expect(lessons.length).toBeGreaterThan(3);
      });

      for (const lesson of lessons) {
        describe(lesson.id, () => {
          it('only uses words and verbs that exist', () => {
            const refs = [...lesson.newItems, ...lesson.exercises.flatMap(exerciseRefs)];
            expect(refs.filter(id => !hasItem(id))).toEqual([]);
          });

          it('has at least one listening exercise', () => {
            expect(lesson.exercises.some(e => e.type === 'listen-pick' || e.type === 'listen-sentence' || e.type === 'listen-type')).toBe(true);
          });

          it('uses only verbs for verb-form tasks, with real forms', () => {
            for (const e of lesson.exercises) {
              if (e.type !== 'verb-form') continue;
              const item = getItem(e.verbId);
              expect(item?.kind).toBe('verb');
            }
          });

          it('builds sentences only from the given tiles', () => {
            for (const e of lesson.exercises) {
              if (e.type !== 'build-sentence') continue;
              const bank = e.tiles.map(t => t.text);
              for (const word of e.answer) {
                const i = bank.indexOf(word);
                expect(i, `"${word}" missing from tiles`).toBeGreaterThanOrEqual(0);
                bank.splice(i, 1);
              }
            }
          });

          it('puts each answer among its options', () => {
            for (const e of lesson.exercises) {
              if (e.type === 'fill-gap' || e.type === 'listen-sentence') {
                expect(e.options).toContain(e.answer);
                expect(new Set(e.options).size).toBe(e.options.length);
              }
              if (e.type === 'fill-gap') expect(e.sentence).toContain('___');
            }
          });

          if (track.mode === 'kids') {
            it('stays short for kids (≤ 6 exercises, ≤ 4 options)', () => {
              expect(lesson.exercises.length).toBeLessThanOrEqual(6);
              for (const e of lesson.exercises) {
                if (e.type === 'fill-gap' || e.type === 'listen-sentence') expect(e.options.length).toBeLessThanOrEqual(4);
                if (e.type === 'listen-type') throw new Error('Typing tasks are for Group 1 only');
              }
            });

            it('has a picture on every picture-word task', () => {
              for (const e of lesson.exercises) {
                if (e.type === 'pick-word') expect(getItem(e.itemId)?.picture, e.itemId).toBeTruthy();
              }
            });
          } else {
            it('has about 10 exercises', () => {
              expect(lesson.exercises.length).toBeGreaterThanOrEqual(8);
              expect(lesson.exercises.length).toBeLessThanOrEqual(12);
            });
          }
        });
      }

      it('pick-word tasks have a picture or a hint to show', () => {
        for (const e of lessons.flatMap(l => l.exercises)) {
          if (e.type === 'pick-word') {
            const item = getItem(e.itemId)!;
            expect(item.picture || item.hint?.uz, e.itemId).toBeTruthy();
          }
        }
      });

      it('grows the word bank across lessons', () => {
        expect(trackItemIds(track).length).toBeGreaterThanOrEqual(track.mode === 'kids' ? 60 : 80);
      });
    });
  }

  it('links roadmap homework only to real lessons', () => {
    for (const r of roadmaps) {
      const track = tracks.find(t => t.id === r.trackId)!;
      const ids = new Set(allLessons(track).map(l => l.id));
      for (const w of r.weeks) for (const id of w.homeworkLessonIds) expect(ids.has(id), id).toBe(true);
      expect(r.weeks.length).toBe(12);
    }
  });
});
