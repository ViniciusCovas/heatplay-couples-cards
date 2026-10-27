/**
 * Daily Spark — deterministic couple question of the day.
 *
 * 60 curated questions per locale, written natively (not machine-translated),
 * ranging from sweet to lightly spicy. The day's question is picked with a
 * deterministic day-of-year hash so both partners see the same question on
 * the same day, in their own language, with no server round-trip.
 */

import { QUESTIONS, QUESTION_COUNT } from '../../supabase/functions/_shared/spark-questions';
import type { SparkLocale } from '../../supabase/functions/_shared/spark-questions';
export type { SparkLocale } from '../../supabase/functions/_shared/spark-questions';

/** Normalize any i18next language tag ("pt-BR", "es-419"...) to a SparkLocale. */
export function toSparkLocale(language: string | undefined): SparkLocale {
  const base = (language || 'en').toLowerCase().split('-')[0];
  return (['en', 'es', 'fr', 'pt'].includes(base) ? base : 'en') as SparkLocale;
}

/** Day-of-year (1-366) for a local date. */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Deterministic index for the day. Mixing in the year keeps the yearly cycle
 * from repeating in the exact same order.
 */
export function sparkIndexForDate(date: Date = new Date()): number {
  const n = dayOfYear(date) * 31 + date.getFullYear() * 17;
  return ((n % QUESTION_COUNT) + QUESTION_COUNT) % QUESTION_COUNT;
}

/** Today's Daily Spark question for a locale. */
export function getDailySpark(language: string | undefined, date: Date = new Date()): string {
  const locale = toSparkLocale(language);
  return QUESTIONS[locale][sparkIndexForDate(date)];
}

/**
 * A curated sample of real questions for a locale, by index into the
 * question list. Used by the landing page deck & heat-level previews so
 * marketing always shows real game content, never placeholders.
 */
export function getSparkSample(language: string | undefined, indices: number[]): string[] {
  const locale = toSparkLocale(language);
  const list = QUESTIONS[locale];
  return indices.map((i) => list[((i % QUESTION_COUNT) + QUESTION_COUNT) % QUESTION_COUNT]);
}

/** Local YYYY-MM-DD key used for streak/share bookkeeping. */
export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
