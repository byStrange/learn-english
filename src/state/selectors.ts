import type {Lesson, Track, Unit} from '../content/types';
import {allLessons, trackItemIds} from '../content/index';
import {COMFORTABLE_BOX, dueItems, isComfortable} from '../lib/srs';
import {addDays, diffDays, weekday, type DayKey} from '../lib/dates';
import {displayStreak} from '../lib/streak';
import type {LearnerProgress} from './model';

/** Pure functions over one learner's progress, computed in render. */

export function dueCount(p: LearnerProgress, today: DayKey): number {
  return dueItems(Object.values(p.items), today).length;
}

export function streakNow(p: LearnerProgress, today: DayKey): number {
  return displayStreak(p.streak, today);
}

export type LessonStatus = 'done' | 'current' | 'locked';

/** Lessons open in order; done lessons stay open to replay. */
export function lessonStatuses(track: Track, p: LearnerProgress): Map<string, LessonStatus> {
  const out = new Map<string, LessonStatus>();
  let open = true;
  for (const l of allLessons(track)) {
    if (p.completed[l.id]) out.set(l.id, 'done');
    else if (open) {
      out.set(l.id, 'current');
      open = false;
    } else out.set(l.id, 'locked');
  }
  return out;
}

export function lessonStatus(track: Track, p: LearnerProgress, lessonId: string): LessonStatus | 'coming-soon' {
  return lessonStatuses(track, p).get(lessonId) ?? 'coming-soon';
}

/** The next lesson to do, or (when all are done) the last one. */
export function nextLesson(track: Track, p: LearnerProgress): {lesson: Lesson; allDone: boolean} {
  const lessons = allLessons(track);
  const next = lessons.find(l => !p.completed[l.id]);
  return next ? {lesson: next, allDone: false} : {lesson: lessons[lessons.length - 1], allDone: true};
}

export function previousLesson(track: Track, lessonId: string): Lesson | undefined {
  const lessons = allLessons(track);
  const i = lessons.findIndex(l => l.id === lessonId);
  return i > 0 ? lessons[i - 1] : undefined;
}

/** Ids the learner has met (lessons done), in course order. */
export function learnedItemIds(track: Track, p: LearnerProgress): string[] {
  return trackItemIds(track).filter(id => p.items[id]);
}

/**
 * Items that may appear as wrong options: everything met so far plus the
 * lesson being played, topped up from the start of the course so even the
 * first lesson has enough choices.
 */
export function distractorPool(track: Track, p: LearnerProgress, lesson?: Lesson, min = 12): string[] {
  const met = new Set([...Object.keys(p.items), ...(lesson?.newItems ?? [])]);
  const course = trackItemIds(track);
  const pool = course.filter(id => met.has(id));
  for (const id of course) {
    if (pool.length >= min) break;
    if (!pool.includes(id)) pool.push(id);
  }
  return pool;
}

export function comfortableCount(p: LearnerProgress): number {
  return Object.values(p.items).filter(isComfortable).length;
}

export function lessonsDone(track: Track, p: LearnerProgress): {done: number; total: number} {
  const lessons = allLessons(track);
  return {done: lessons.filter(l => p.completed[l.id]).length, total: lessons.length};
}

/**
 * The Group 2 goal meter. Words: items answered right at least once, capped at
 * the target. Sentences: one per finished "sentence" lesson, at most half the
 * target from present-simple lessons and half from past-simple lessons (the
 * goal is 5 about my day + 5 about yesterday).
 */
export function goalProgress(track: Track, p: LearnerProgress): {words: number; sentences: number; wordsTarget: number; sentencesTarget: number} {
  const words = Object.values(p.items).filter(s => s.correct > 0).length;
  const half = Math.ceil(track.goal.targets.sentences / 2);
  const done = allLessons(track).filter(l => p.completed[l.id]);
  // A sentence lesson finished, or a sentence of their own made in the Tenses lab, both count.
  const labPresent = new Set(p.sentences.filter(s => s.tense === 'present-simple').map(s => s.text.toLowerCase())).size;
  const labPast = new Set(p.sentences.filter(s => s.tense === 'past-simple').map(s => s.text.toLowerCase())).size;
  const present = Math.min(half, done.filter(l => l.sentenceGoal === 'present').length + labPresent);
  const past = Math.min(half, done.filter(l => l.sentenceGoal === 'past').length + labPast);
  const sentences = present + past;
  return {
    words: Math.min(words, track.goal.targets.words),
    sentences: Math.min(sentences, track.goal.targets.sentences),
    wordsTarget: track.goal.targets.words,
    sentencesTarget: track.goal.targets.sentences,
  };
}

export function lessonsToday(p: LearnerProgress, today: DayKey): number {
  return p.history.filter(h => h.date === today && h.kind === 'lesson').length;
}

export function todayGoalDone(track: Track, p: LearnerProgress, today: DayKey): boolean {
  return lessonsToday(p, today) >= track.dailyGoal.lessons;
}

export interface CalendarDay {
  day: DayKey;
  active: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** `weeks` Monday-first rows ending with the current week. */
export function weekCalendar(p: LearnerProgress, today: DayKey, weeks = 5): CalendarDay[][] {
  const active = new Set(p.streak.activeDays);
  const thisMonday = addDays(today, -weekday(today));
  const start = addDays(thisMonday, -(weeks - 1) * 7);
  const rows: CalendarDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      row.push({day, active: active.has(day), isToday: day === today, isFuture: diffDays(today, day) > 0});
    }
    rows.push(row);
  }
  return rows;
}

/** First-try accuracy over the last `days` days, or null with no activity. */
export function recentAccuracy(p: LearnerProgress, today: DayKey, days = 7): number | null {
  const from = addDays(today, -(days - 1));
  const recent = p.history.filter(h => h.date >= from && h.date <= today);
  const total = recent.reduce((n, h) => n + h.correct + h.wrong, 0);
  if (!total) return null;
  return Math.round((recent.reduce((n, h) => n + h.correct, 0) / total) * 100);
}

/** Minutes practised per day, oldest first. */
export function minutesPerDay(p: LearnerProgress, today: DayKey, days = 14): {day: DayKey; minutes: number}[] {
  const out: {day: DayKey; minutes: number}[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const seconds = p.history.filter(h => h.date === day).reduce((n, h) => n + h.seconds, 0);
    out.push({day, minutes: Math.round((seconds / 60) * 10) / 10});
  }
  return out;
}

export function unitProgress(track: Track, p: LearnerProgress): {unit: Unit; done: number; total: number}[] {
  return track.units
    .filter(u => u.status !== 'coming-soon' && u.lessons.length)
    .map(unit => ({unit, done: unit.lessons.filter(l => p.completed[l.id]).length, total: unit.lessons.length}));
}

/** Items with the most wrong answers, then lowest box. */
export function weakItems(p: LearnerProgress, limit = 10) {
  return Object.values(p.items)
    .filter(s => s.wrong > 0 || s.box < COMFORTABLE_BOX)
    .sort((a, b) => b.wrong - a.wrong || a.box - b.box || a.id.localeCompare(b.id))
    .filter(s => s.wrong > 0)
    .slice(0, limit);
}

/** Last day with a lesson or review. */
export function lastActive(p: LearnerProgress): DayKey | null {
  return p.streak.lastActive;
}
