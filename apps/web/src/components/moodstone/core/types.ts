import type { ShapeParams } from "./shape";

/** Surface silhouette of the avatar. */
export type Cut =
  | "circle"
  | "squircle"
  | "square"
  | "diamond"
  | "hexagon"
  | "badge"
  | "burst";

/** Animation state. Each mood is a seamless loop. */
export type Mood =
  | "idle"
  | "observing"
  | "thinking"
  | "processing"
  | "working"
  | "done"
  | "failed"
  | "invalid"
  | "inactive";

/**
 * How the light moves, as three numbers in 0..2π so `randomSeed()` can draw them uniformly:
 * - `angle`: where the light starts around the centre, in radians.
 * - `drift`: the orbit direction, clockwise when at most π and counter-clockwise above it.
 * - `orbit`: the orbit's size, from 85% of `LIGHT_ORBIT` at 0 to 115% at 2π.
 */
export type Seed = readonly [angle: number, drift: number, orbit: number];

/** Everything the renderer needs to know about an avatar, minus time. */
export interface AvatarSpec {
  /** Surface colour, any CSS hex colour (#rgb or #rrggbb). */
  color: string;
  /**
   * How far the face pulls toward the centre to fit the silhouette, 0.55..1.
   * When omitted, `computeFrame` uses the cut's value, which is wrong for a
   * custom `shape`. `resolveSpec` fills it in from the shape.
   */
  contentScale?: number;
  /** Silhouette preset. Its geometry is replaced when `shape` is set. */
  cut: Cut;
  /** Eye colour, hex. */
  eyeColor: string;
  mood: Mood;
  /** How the light moves. */
  seed: Seed;
  /** Optional custom silhouette from the shape engine; overrides the cut's geometry. */
  shape?: Partial<ShapeParams>;
}

/** One eye (or eye-derived dot) in the 64×64 box. Centre-based so it can rotate. */
export interface EyeRect {
  alpha: number;
  cx: number;
  cy: number;
  h: number;
  /** Corner radius. */
  r: number;
  /** Rotation in radians about the centre. */
  rot: number;
  w: number;
}

/** Dizzy swirl drawn over an eye in the `failed` mood. */
export interface Swirl {
  alpha: number;
  cx: number;
  cy: number;
  /** Winding direction: 1 clockwise, -1 counter-clockwise. */
  dir: 1 | -1;
  /** 0..1, how much of the spiral is drawn. */
  grow: number;
  /** Radius of the outermost turn, box units. */
  radius: number;
  /** Rotation offset in radians. */
  rot: number;
}

/** A floating "z" in the `inactive` mood. */
export interface SleepMark {
  alpha: number;
  /** Width and height of the "z". */
  size: number;
  strokeWidth: number;
  /** Centre of the "z". */
  x: number;
  y: number;
}

/** A fully resolved frame: plain numbers, renderer-agnostic. */
export interface Frame {
  /** Surface colour for this frame (the `done` mood cycles it). */
  color: string;
  /** Always four entries. Unused ones have alpha 0. */
  eyes: readonly [EyeRect, EyeRect, EyeRect, EyeRect];
  /** Light source position in box units: the bright end of the surface gradient. */
  light: readonly [number, number];
  /** Lit hue derived from `color` this frame. */
  lit: string;
  /** Body translation. */
  offset: readonly [number, number];
  /** 0..1 phase within the eye cycle. */
  phase: number;
  /** Shaded hue derived from `color` this frame. */
  shade: string;
  sleepMarks: readonly SleepMark[];
  swirls: readonly Swirl[];
  /** Seconds into the loop. */
  t: number;
  /** Body rotation in degrees about the centre. */
  tilt: number;
}
