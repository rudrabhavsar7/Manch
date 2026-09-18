'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GripVertical, X } from 'lucide-react';
import { SongPicker } from './song-picker';
import { useSupabase } from '@/hooks/use-supabase';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];
type Setlist = Database['public']['Tables']['setlists']['Row'];

export interface SetlistSongItem {
  id: string;
  song: Song;
  position: number;
}

export function SortableSongItem({
  item,
  onRemove,
}: {
  item: SetlistSongItem;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`setlist-song-${item.id}`}
      className="flex items-center gap-2 p-3 rounded-lg border border-stageBorder bg-surface hover:bg-elevated/40 transition-colors"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${item.song.title}`}
        className="cursor-grab text-textSecondary hover:text-textPrimary p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stageAccent"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm font-mono text-textSecondary w-6 shrink-0">
        {item.position + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-textPrimary truncate block">
          {item.song.title}
        </span>
        <span className="text-sm text-textSecondary truncate block">
          {item.song.artist || 'Unknown Artist'}
        </span>
      </div>
      {item.song.key && (
        <Badge
          variant="secondary"
          className="bg-elevated text-textSecondary border border-stageBorder font-mono text-xs shrink-0"
        >
          {item.song.key}
        </Badge>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.song.title}`}
        className="text-textSecondary hover:text-stageDestructive p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stageAccent"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export interface SetlistEditorProps {
  setlist?: Setlist;
  initialSongs?: SetlistSongItem[];
}

export function SetlistEditor({
  setlist,
  initialSongs = [],
}: SetlistEditorProps) {
  const [name, setName] = useState(setlist?.name ?? '');
  const [privacy, setPrivacy] = useState<'public' | 'private'>(
    setlist?.privacy ?? 'private'
  );
  const [songs, setSongs] = useState<SetlistSongItem[]>(initialSongs);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useSupabase();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSongs((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      const moved = arrayMove(items, oldIndex, newIndex);
      return moved.map((item, idx) => ({ ...item, position: idx }));
    });
  }

  function addSong(song: Song) {
    const newItem: SetlistSongItem = {
      id: `song-${Date.now()}-${song.id}`,
      song,
      position: songs.length,
    };
    setSongs((prev) => [...prev, newItem]);
  }

  function removeSong(id: string) {
    setSongs((items) =>
      items
        .filter((i) => i.id !== id)
        .map((item, idx) => ({ ...item, position: idx }))
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Not authenticated');
      setSaving(false);
      return;
    }

    if (setlist) {
      // Update existing setlist
      const { error: updateErr } = await supabase
        .from('setlists')
        .update({ name: name.trim(), privacy })
        .eq('id', setlist.id);

      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }

      // Replace setlist songs
      const { error: deleteErr } = await supabase
        .from('setlist_songs')
        .delete()
        .eq('setlist_id', setlist.id);

      if (deleteErr) {
        setError(deleteErr.message);
        setSaving(false);
        return;
      }

      if (songs.length > 0) {
        const { error: insertErr } = await supabase
          .from('setlist_songs')
          .insert(
            songs.map((s, idx) => ({
              setlist_id: setlist.id,
              song_id: s.song.id,
              position: idx,
            }))
          );

        if (insertErr) {
          setError(insertErr.message);
          setSaving(false);
          return;
        }
      }
    } else {
      // Create new setlist
      const { data: newSetlist, error: createErr } = await supabase
        .from('setlists')
        .insert({ name: name.trim(), privacy, owner_id: user.id })
        .select()
        .single();

      if (createErr || !newSetlist) {
        setError(createErr?.message ?? 'Failed to create setlist');
        setSaving(false);
        return;
      }

      if (songs.length > 0) {
        const { error: insertErr } = await supabase
          .from('setlist_songs')
          .insert(
            songs.map((s, idx) => ({
              setlist_id: newSetlist.id,
              song_id: s.song.id,
              position: idx,
            }))
          );

        if (insertErr) {
          setError(insertErr.message);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(false);
    router.refresh();
    router.push('/setlists');
  }

  async function handleDelete() {
    if (!setlist) return;

    if (
      typeof window !== 'undefined' &&
      window.confirm &&
      !window.confirm('Are you sure you want to delete this setlist?')
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    const { error: err } = await supabase
      .from('setlists')
      .delete()
      .eq('id', setlist.id);

    if (err) {
      setError(err.message);
      setDeleting(false);
    } else {
      router.refresh();
      router.push('/setlists');
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-textPrimary">
            <h2>{setlist ? 'Edit Setlist' : 'New Setlist'}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-textSecondary">
                Setlist Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Friday Night Live"
                className="bg-elevated border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none text-textPrimary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacy" className="text-textSecondary">
                Privacy
              </Label>
              <Select
                value={privacy}
                onValueChange={(v) => setPrivacy(v as 'public' | 'private')}
              >
                <SelectTrigger
                  id="privacy"
                  className="bg-elevated border-stageBorder focus:ring-stageAccent shadow-none text-textPrimary"
                >
                  <SelectValue placeholder="Select privacy" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-stageBorder text-textPrimary">
                  <SelectItem value="public">
                    Public (visible to gig members)
                  </SelectItem>
                  <SelectItem value="private">Private (invite only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-textSecondary font-medium">
                Songs ({songs.length})
              </Label>
              <SongPicker
                excludeSongIds={songs.map((s) => s.song.id)}
                onSelect={addSong}
              />
            </div>

            {songs.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={songs.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2" data-testid="sortable-songs-list">
                    {songs.map((item) => (
                      <SortableSongItem
                        key={item.id}
                        item={item}
                        onRemove={() => removeSong(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-8 border border-dashed border-stageBorder rounded-lg bg-surface/50">
                <p className="text-textSecondary">No songs added yet</p>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive font-medium">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={saving || deleting}
                className="bg-stageAccent hover:bg-stageAccent/90 text-white font-medium"
              >
                {saving ? 'Saving...' : 'Save Setlist'}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/setlists')}
                disabled={saving || deleting}
                className="border-stageBorder text-textSecondary hover:bg-elevated hover:text-textPrimary"
              >
                Cancel
              </Button>
            </div>
            {setlist && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="bg-stageDestructive hover:bg-stageDestructive/90 text-white font-medium"
              >
                {deleting ? 'Deleting...' : 'Delete Setlist'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
