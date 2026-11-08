import type { Mood } from "./types";

/** How a mood is presented and timed. */
export interface MoodInfo {
  /** Seconds per eye cycle. */
  cycle: number;
  key: Mood;
  /** Display name. */
  label: string;
  /** Eye cycles per seamless loop. */
  reps: number;
}

/**
 * Every mood's label and timing: the one place mood data is written down.
 * A plain record, so worklets can read it on the UI runtime.
 */
export const MOOD_TABLE: Readonly<Record<Mood, Omit<MoodInfo, "key">>> = {
  done: { cycle: 3.2, label: "Done", reps: 1 },
  failed: { cycle: 5.5, label: "Failed", reps: 1 },
  idle: { cycle: 5.5, label: "Idle", reps: 2 },
  inactive: { cycle: 3.4, label: "Inactive", reps: 1 },
  invalid: { cycle: 4, label: "Invalid", reps: 1 },
  observing: { cycle: 6.5, label: "Observing", reps: 2 },
  processing: { cycle: 9, label: "Processing", reps: 1 },
  thinking: { cycle: 5.5, label: "Thinking", reps: 1 },
  working: { cycle: 3.75, label: "Working", reps: 1 },
};

/** Mood names in display order. */
export const MOOD_KEYS: readonly Mood[] = Object.keys(MOOD_TABLE) as Mood[];

/** Every mood with its key, in display order. */
export const MOODS: readonly MoodInfo[] = MOOD_KEYS.map((key) => ({
  key,
  ...MOOD_TABLE[key],
}));

/** Seconds per seamless loop for a mood. */
export function loopLength(mood: Mood): number {
  "worklet";
  const { cycle, reps } = MOOD_TABLE[mood];
  return cycle * reps;
}
