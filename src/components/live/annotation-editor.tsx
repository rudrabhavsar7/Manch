'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ANNOTATION_COLORS } from '@/types/annotation';
import { cn } from '@/lib/utils';

interface AnnotationEditorProps {
  initialContent?: string;
  initialColor?: string;
  onSave: (content: string, color: string) => void;
  onCancel: () => void;
}

export function AnnotationEditor({ initialContent = '', initialColor = '#fbbf24', onSave, onCancel }: AnnotationEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [color, setColor] = useState(initialColor);

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-card">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add your note..."
        rows={2}
        className="text-sm border-0 focus-visible:ring-0 shadow-none resize-none p-0"
        autoFocus
      />
      <div className="flex items-center gap-1">
        {ANNOTATION_COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => setColor(c.value)}
            className={cn(
              'w-6 h-6 rounded-full border-2 transition-transform',
              color === c.value ? 'scale-125 border-foreground' : 'border-transparent',
            )}
            style={{ backgroundColor: c.value }}
            title={c.label}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { if (content.trim()) onSave(content, color); }}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
