import { parseSongContent } from '@/lib/music/chord-parser';
import { transposeSong } from '@/lib/music/transpose';
import { ChordLine } from './chord-line';
import { cn } from '@/lib/utils';

interface SongRendererProps {
  content: string;
  transpose: number;
  fontSize?: number;
  className?: string;
}

export function SongRenderer({
  content,
  transpose,
  fontSize = 16,
  className,
}: SongRendererProps) {
  const safeContent = content || '';
  const transposedContent = transposeSong(safeContent, transpose);
  const parsed = parseSongContent(transposedContent);

  return (
    <div
      className={cn('font-mono leading-relaxed', className)}
      style={{ fontSize: `${fontSize}px` }}
    >
      {parsed.lines.map((line, i) => (
        <ChordLine key={i} segments={line.segments} />
      ))}
    </div>
  );
}
