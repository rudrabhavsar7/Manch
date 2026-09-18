import { NOTES_SHARP, NOTES_FLAT, ROOT_REGEX, CHORD_REGEX } from './constants';

function noteIndex(note: string): number {
  const sharpIdx = NOTES_SHARP.indexOf(note as (typeof NOTES_SHARP)[number]);
  if (sharpIdx !== -1) return sharpIdx;
  const flatIdx = NOTES_FLAT.indexOf(note as (typeof NOTES_FLAT)[number]);
  if (flatIdx !== -1) return flatIdx;
  return -1;
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;

  const match = chord.match(ROOT_REGEX);
  if (!match) return chord;

  const root = match[1];
  const quality = chord.slice(root.length);
  const idx = noteIndex(root);
  if (idx === -1) return chord;

  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  // Use sharps by default
  const newRoot = NOTES_SHARP[newIdx];

  return newRoot + quality;
}

export function transposeSong(content: string, semitones: number): string {
  if (semitones === 0) return content;

  return content.replace(
    new RegExp(CHORD_REGEX.source, 'g'),
    (_fullMatch, chord: string) => {
      return `[${transposeChord(chord, semitones)}]`;
    },
  );
}
