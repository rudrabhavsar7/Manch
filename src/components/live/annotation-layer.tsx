'use client';

import { useState } from 'react';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { AnnotationEditor } from './annotation-editor';
import type { Annotation } from '@/types/annotation';

interface AnnotationLayerProps {
  lineNumber: number;
  annotations: Annotation[];
  onAdd: (content: string, color: string) => void;
  onDelete: (id: string) => void;
}

export function AnnotationLayer({ lineNumber, annotations, onAdd, onDelete }: AnnotationLayerProps) {
  const [adding, setAdding] = useState(false);
  const lineAnnotations = annotations.filter((a) => a.line_number === lineNumber);

  return (
    <div className="group relative">
      {lineAnnotations.map((ann) => (
        <div
          key={ann.id}
          className="flex items-start gap-1 text-xs px-2 py-1 rounded my-0.5"
          style={{ backgroundColor: `${ann.color}20`, borderLeft: `3px solid ${ann.color}` }}
        >
          <span className="flex-1">{ann.content}</span>
          <button onClick={() => onDelete(ann.id)} className="opacity-0 group-hover:opacity-100 shrink-0">
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </div>
      ))}

      {adding ? (
        <AnnotationEditor
          onSave={(content, color) => { onAdd(content, color); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="opacity-0 group-hover:opacity-100 absolute -left-6 top-0 text-muted-foreground hover:text-foreground transition-opacity"
          title="Add note"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
