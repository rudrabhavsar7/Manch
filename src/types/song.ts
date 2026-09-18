export interface ParsedChordLine {
  segments: ChordSegment[];
}

export interface ChordSegment {
  chord: string | null;
  lyrics: string;
}

export interface ParsedSong {
  lines: ParsedChordLine[];
}
