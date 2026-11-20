/**
 * How a spoken text maps to its Kokoro clip. Shared by the generator
 * (tools/tts/make-audio.ts) and the app, so both always agree.
 */

/** Trim, collapse spaces, lowercase, curly quotes → straight; keep "?" but drop a final "." or "!". */
export function normalize(text: string): string {
  return text
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[.!]+$/, '')
    .trim();
}

/** 32-bit FNV-1a of the normalised text, as 8 hex digits. */
export function fnv1a32Hex(text: string): string {
  let h = 0x811c9dc5;
  for (const ch of new TextEncoder().encode(text)) {
    h ^= ch;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function clipFile(text: string): string {
  return `${fnv1a32Hex(normalize(text))}.mp3`;
}
