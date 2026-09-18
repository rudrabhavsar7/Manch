import type { ChordSegment } from '@/types/song';

interface ChordLineProps {
  segments: ChordSegment[];
}

export function ChordLine({ segments }: ChordLineProps) {
  const hasChords = segments.some((s) => s.chord !== null);

  // Check for section markers, e.g. "--- Chorus ---" or "── Chorus ──"
  const isSectionMarker =
    !hasChords &&
    segments.length === 1 &&
    /^[-─]{2,}\s*(.+?)\s*[-─]{2,}$/.test(segments[0].lyrics.trim());

  if (isSectionMarker) {
    return (
      <div className="my-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-textSecondary select-none">
        <div className="flex-1 h-px bg-stageBorder" />
        <span>{segments[0].lyrics.trim()}</span>
        <div className="flex-1 h-px bg-stageBorder" />
      </div>
    );
  }

  // Preserve blank lines between sections
  if (!hasChords && segments.length === 1 && segments[0].lyrics.trim() === '') {
    return <div className="min-h-[1.5em]" />;
  }

  return (
    <div className="font-mono leading-relaxed whitespace-pre">
      {hasChords && (
        <div className="text-chord font-semibold text-sm select-none">
          {segments.map((seg, i) => (
            <span
              key={i}
              className="inline-block"
              style={{ minWidth: `${seg.lyrics.length}ch` }}
            >
              {seg.chord ?? ''}
            </span>
          ))}
        </div>
      )}
      <div className="text-textPrimary">
        {segments.map((seg, i) => (
          <span key={i}>{seg.lyrics}</span>
        ))}
      </div>
    </div>
  );
}
