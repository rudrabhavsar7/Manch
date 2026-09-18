import { describe, it, expect } from 'vitest';
import { parseChordLine, parseSongContent } from '@/lib/music/chord-parser';

describe('parseChordLine', () => {
  it('parses line with chords', () => {
    const result = parseChordLine('[Am]Hello [G]world');
    expect(result.segments).toEqual([
      { chord: 'Am', lyrics: 'Hello ' },
      { chord: 'G', lyrics: 'world' },
    ]);
  });

  it('parses line with no chords', () => {
    const result = parseChordLine('Just lyrics here');
    expect(result.segments).toEqual([
      { chord: null, lyrics: 'Just lyrics here' },
    ]);
  });

  it('parses line starting without chord', () => {
    const result = parseChordLine('Start [Am]middle [G]end');
    expect(result.segments).toEqual([
      { chord: null, lyrics: 'Start ' },
      { chord: 'Am', lyrics: 'middle ' },
      { chord: 'G', lyrics: 'end' },
    ]);
  });

  it('parses complex chords', () => {
    const result = parseChordLine('[Cmaj7]One [F#m7b5]two');
    expect(result.segments).toEqual([
      { chord: 'Cmaj7', lyrics: 'One ' },
      { chord: 'F#m7b5', lyrics: 'two' },
    ]);
  });

  it('handles empty line', () => {
    const result = parseChordLine('');
    expect(result.segments).toEqual([
      { chord: null, lyrics: '' },
    ]);
  });

  it('handles chord-only line', () => {
    const result = parseChordLine('[Am] [G] [C]');
    expect(result.segments).toEqual([
      { chord: 'Am', lyrics: ' ' },
      { chord: 'G', lyrics: ' ' },
      { chord: 'C', lyrics: '' },
    ]);
  });

  it('handles consecutive chords without whitespace', () => {
    const result = parseChordLine('[Am][G]');
    expect(result.segments).toEqual([
      { chord: 'Am', lyrics: '' },
      { chord: 'G', lyrics: '' },
    ]);
  });
});

describe('parseSongContent', () => {
  it('parses multi-line song', () => {
    const content = '[Am]Hello [G]world\n[C]Second [F]line';
    const result = parseSongContent(content);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].segments[0].chord).toBe('Am');
    expect(result.lines[1].segments[0].chord).toBe('C');
  });

  it('handles section markers', () => {
    const content = '--- Verse 1 ---\n[Am]Lyrics here';
    const result = parseSongContent(content);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].segments[0].chord).toBeNull();
    expect(result.lines[0].segments[0].lyrics).toBe('--- Verse 1 ---');
  });

  it('handles chorus marker', () => {
    const content = '--- Chorus ---\n[C]Praise [G]Him';
    const result = parseSongContent(content);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].segments[0].chord).toBeNull();
    expect(result.lines[0].segments[0].lyrics).toBe('--- Chorus ---');
    expect(result.lines[1].segments[0].chord).toBe('C');
    expect(result.lines[1].segments[0].lyrics).toBe('Praise ');
  });
});
