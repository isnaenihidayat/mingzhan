/** A named colour from the built-in palette. */
export type PaletteKey =
  | "sand"
  | "lemon"
  | "tangerine"
  | "rose"
  | "salmon"
  | "cherry"
  | "lilac"
  | "sky"
  | "plum"
  | "lime"
  | "mint"
  | "pine";

/** The built-in surface colours, by name. */
export const PALETTE: Record<PaletteKey, string> = {
  cherry: "#D63A2F",
  lemon: "#FFD447",
  lilac: "#C9B8F0",
  lime: "#C5D94A",
  mint: "#5FC7B0",
  pine: "#1F8A70",
  plum: "#9B59B6",
  rose: "#F48FB1",
  salmon: "#F2705B",
  sand: "#F5D48A",
  sky: "#3FC1F5",
  tangerine: "#FF9F43",
};

/** Palette names in display order. */
export const PALETTE_KEYS: readonly PaletteKey[] = Object.keys(
  PALETTE
) as PaletteKey[];

export const EYE_WHITE = "#FFFFFF";
export const EYE_BLACK = "#111111";

/** Whether `c` names a palette colour. Only the palette's own keys count, not inherited ones like `constructor`. */
export function isPaletteKey(c: string): c is PaletteKey {
  return Object.hasOwn(PALETTE, c);
}

/** A palette key's hex, or `c` unchanged when it isn't one, so any hex passes through. */
export function resolveColor(c: string): string {
  return isPaletteKey(c) ? PALETTE[c] : c;
}
