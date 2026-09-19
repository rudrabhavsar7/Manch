'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { StickyNote, Plus, Trash2 } from 'lucide-react';
import { AnnotationEditor } from './annotation-editor';
import type { Database } from '@/types/database';

type Annotation = Database['public']['Tables']['annotations']['Row'];

interface GeneralNotesProps {
  annotations: Annotation[];
  onAdd: (content: string, color: string) => void;
  onDelete: (id: string) => void;
}

export function GeneralNotes({ annotations, onAdd, onDelete }: GeneralNotesProps) {
  const [adding, setAdding] = useState(false);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <StickyNote className="h-4 w-4 mr-1" />
          Notes
          {annotations.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center">
              {annotations.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>My Notes</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {annotations.map((ann) => (
            <div
              key={ann.id}
              className="p-3 rounded-lg text-sm"
              style={{ backgroundColor: `${ann.color}20`, borderLeft: `3px solid ${ann.color}` }}
            >
              <div className="flex items-start justify-between">
                <span>{ann.content}</span>
                <button onClick={() => onDelete(ann.id)} className="text-destructive shrink-0 ml-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {adding ? (
            <AnnotationEditor
              onSave={(content, color) => { onAdd(content, color); setAdding(false); }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Note
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
