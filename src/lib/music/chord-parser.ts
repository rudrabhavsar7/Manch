import { CHORD_REGEX } from './constants';
import type { ParsedChordLine, ParsedSong, ChordSegment } from '@/types/song';

export function parseChordLine(line: string): ParsedChordLine {
  const segments: ChordSegment[] = [];
  const regex = new RegExp(CHORD_REGEX.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    // Text before this chord
    if (match.index > lastIndex) {
      segments.push({
        chord: null,
        lyrics: line.slice(lastIndex, match.index),
      });
    }

    // Find lyrics after this chord (until next chord or end)
    const chordEnd = regex.lastIndex;
    const nextMatch = new RegExp(CHORD_REGEX.source, 'g');
    nextMatch.lastIndex = chordEnd;
    const next = nextMatch.exec(line);
    const lyricsEnd = next ? next.index : line.length;

    segments.push({
      chord: match[1],
      lyrics: line.slice(chordEnd, lyricsEnd),
    });

    lastIndex = lyricsEnd;
  }

  // If no chords found, entire line is lyrics
  if (segments.length === 0) {
    segments.push({ chord: null, lyrics: line });
  }

  return { segments };
}

export function parseSongContent(content: string): ParsedSong {
  const lines = content.split('\n');
  return {
    lines: lines.map((line) => parseChordLine(line)),
  };
}
