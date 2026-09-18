import { describe, it, expect } from 'vitest';
import { transposeChord, transposeSong } from '@/lib/music/transpose';

describe('transposeChord', () => {
  it('transposes up by 2 semitones', () => {
    expect(transposeChord('Am', 2)).toBe('Bm');
  });

  it('transposes down by 1 semitone', () => {
    expect(transposeChord('C', -1)).toBe('B');
  });

  it('wraps around (G + 3 = A#)', () => {
    expect(transposeChord('G', 3)).toBe('A#');
  });

  it('preserves chord quality (m, 7, maj7, dim, etc)', () => {
    expect(transposeChord('Am7', 2)).toBe('Bm7');
    expect(transposeChord('Cmaj7', 3)).toBe('D#maj7');
    expect(transposeChord('Fdim', 1)).toBe('F#dim');
    expect(transposeChord('F#m7b5', 2)).toBe('G#m7b5');
  });

  it('handles sharps', () => {
    expect(transposeChord('F#', 1)).toBe('G');
    expect(transposeChord('C#m', 2)).toBe('D#m');
  });

  it('handles flats', () => {
    expect(transposeChord('Bb', 2)).toBe('C');
    expect(transposeChord('Ebm', 1)).toBe('Em');
    expect(transposeChord('Ab', 1)).toBe('A');
  });

  it('transpose by 0 returns same chord', () => {
    expect(transposeChord('Am', 0)).toBe('Am');
  });

  it('transpose by 12 returns same chord (octave)', () => {
    expect(transposeChord('Am', 12)).toBe('Am');
  });

  it('transpose by -12 returns same chord', () => {
    expect(transposeChord('Am', -12)).toBe('Am');
  });

  it('returns original string when root note does not match', () => {
    expect(transposeChord('Hdim', 2)).toBe('Hdim');
  });
});

describe('transposeSong', () => {
  it('transposes all chords in content', () => {
    const content = '[Am]Hello [G]world\n[C]Second [F]line';
    const result = transposeSong(content, 2);
    expect(result).toBe('[Bm]Hello [A]world\n[D]Second [G]line');
  });

  it('preserves non-chord text', () => {
    const content = '--- Verse 1 ---\n[Am]Lyrics';
    const result = transposeSong(content, 2);
    expect(result).toBe('--- Verse 1 ---\n[Bm]Lyrics');
  });

  it('transpose by 0 returns identical content', () => {
    const content = '[Am]Test [G]song';
    expect(transposeSong(content, 0)).toBe(content);
  });

  it('preserves empty lines and formatting', () => {
    const content = '[C]First\n\n[G]After gap\n--- Chorus ---';
    const result = transposeSong(content, 1);
    expect(result).toBe('[C#]First\n\n[G#]After gap\n--- Chorus ---');
  });
});
