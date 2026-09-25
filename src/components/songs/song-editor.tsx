'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SongRenderer } from './song-renderer';
import { PhotoUploader, type PhotoItem } from './photo-uploader';
import { useSupabase } from '@/hooks/use-supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];

const KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm',
];

interface SongEditorProps {
  song?: Song;
}

export function SongEditor({ song }: SongEditorProps) {
  const [title, setTitle] = useState(song?.title ?? '');
  const [artist, setArtist] = useState(song?.artist ?? '');
  const [key, setKey] = useState(song?.key ?? '');
  const [bpm, setBpm] = useState<string>(song?.bpm?.toString() ?? '');
  const [content, setContent] = useState(song?.content ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [initialPhotoIds, setInitialPhotoIds] = useState<Set<string>>(new Set());
  const [removedExisting, setRemovedExisting] = useState<{ id: string; storagePath: string }[]>([]);

  const supabase = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!song?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('song_photos')
          .select('*')
          .eq('song_id', song.id)
          .order('position');
        if (fetchError || !data || cancelled) return;

        const items = await Promise.all(
          data.map(async (p) => {
            const { data: urlData } = await supabase.storage
              .from('song-photos')
              .createSignedUrl(p.storage_path, 3600);
            if (!urlData?.signedUrl) return null;
            return {
              kind: 'existing' as const,
              id: p.id,
              storagePath: p.storage_path,
              url: urlData.signedUrl,
            };
          }),
        );
        const valid = items.filter(
          (i): i is Extract<PhotoItem, { kind: 'existing' }> => i !== null,
        );
        if (!cancelled) {
          setPhotoItems(valid);
          setInitialPhotoIds(new Set(valid.map((i) => i.id)));
        }
      } catch (err) {
        console.error('Failed to load song photos:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [song?.id, supabase]);

  function handleAddFiles(files: File[]) {
    const newItems: PhotoItem[] = files.map((file) => {
      let url = '';
      try {
        url = URL.createObjectURL(file);
      } catch {
        url = '';
      }
      return { kind: 'pending', file, url };
    });
    setPhotoItems((prev) => [...prev, ...newItems]);
  }

  function handleRemovePhoto(index: number) {
    setPhotoItems((prev) => {
      const item = prev[index];
      if (item?.kind === 'existing') {
        setRemovedExisting((r) => [...r, { id: item.id, storagePath: item.storagePath }]);
      } else if (item?.kind === 'pending') {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleMovePhoto(index: number, direction: -1 | 1) {
    setPhotoItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function syncPhotos(songId: string, userId: string) {
    for (const removed of removedExisting) {
      await supabase.storage.from('song-photos').remove([removed.storagePath]);
      await supabase.from('song_photos').delete().eq('id', removed.id);
    }

    for (let position = 0; position < photoItems.length; position++) {
      const item = photoItems[position];
      if (item.kind === 'existing') {
        await supabase.from('song_photos').update({ position }).eq('id', item.id);
      } else {
        const ext = item.file.name.split('.').pop() || 'jpg';
        const path = `${userId}/${songId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('song-photos')
          .upload(path, item.file, { contentType: item.file.type });
        if (uploadError) {
          console.error('Photo upload failed:', uploadError);
          continue;
        }
        const { error: insertError } = await supabase.from('song_photos').insert({
          song_id: songId,
          storage_path: path,
          position,
        });
        if (insertError) {
          console.error('Photo row insert failed:', insertError);
        }
      }
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!content.trim() && photoItems.length === 0) {
      setError('Add lyrics or at least one photo');
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

    const songData = {
      title: title.trim(),
      artist: artist.trim(),
      key,
      bpm: bpm ? parseInt(bpm, 10) : null,
      content,
      structure: song?.structure ?? [],
    };

    let savedSongId: string | null = song?.id ?? null;

    if (song) {
      const { error: err } = await supabase
        .from('songs')
        .update(songData)
        .eq('id', song.id);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    } else {
      const { data: newSong, error: err } = await supabase
        .from('songs')
        .insert({ ...songData, owner_id: user.id })
        .select()
        .single();
      if (err || !newSong) {
        setError(err?.message ?? 'Failed to create song');
        setSaving(false);
        return;
      }
      savedSongId = newSong.id;
    }

    if (savedSongId) {
      await syncPhotos(savedSongId, user.id);
    }

    router.refresh();
    router.push('/songs');
    setSaving(false);
  }

  async function handleDelete() {
    if (!song) return;
    if (
      typeof window !== 'undefined' &&
      window.confirm &&
      !window.confirm('Are you sure you want to delete this song?')
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    const { error: err } = await supabase
      .from('songs')
      .delete()
      .eq('id', song.id);

    if (err) {
      setError(err.message);
      setDeleting(false);
    } else {
      router.refresh();
      router.push('/songs');
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-textPrimary">
            <h2>{song ? 'Edit Song' : 'New Song'}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-textSecondary">
                Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hotel California"
                className="bg-elevated border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none text-textPrimary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist" className="text-textSecondary">
                Artist
              </Label>
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Eagles"
                className="bg-elevated border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none text-textPrimary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key" className="text-textSecondary">
                Key
              </Label>
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger
                  id="key"
                  className="bg-elevated border-stageBorder focus:ring-stageAccent shadow-none text-textPrimary"
                >
                  <SelectValue placeholder="Select key" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-stageBorder text-textPrimary max-h-60">
                  {KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bpm" className="text-textSecondary">
                BPM
              </Label>
              <Input
                id="bpm"
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                min={1}
                max={300}
                placeholder="e.g. 120"
                className="bg-elevated border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none text-textPrimary"
              />
            </div>
          </div>

          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="bg-elevated border border-stageBorder">
              <TabsTrigger
                value="edit"
                className="data-[state=active]:bg-surface data-[state=active]:text-textPrimary"
              >
                Edit
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="data-[state=active]:bg-surface data-[state=active]:text-textPrimary"
              >
                Preview
              </TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="space-y-2 mt-4">
              <div className="space-y-2">
                <Label htmlFor="content" className="text-textSecondary">
                  Lyrics &amp; Chords
                </Label>
                <p className="text-xs text-textSecondary">
                  Use [Am], [G7], etc. to mark chords. Example: [Am]Lyrics [G]here. Section lines: --- Chorus ---
                </p>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={18}
                  className="font-mono text-sm bg-elevated border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none text-textPrimary"
                  placeholder="[Am]Start typing your [G]song here..."
                />
              </div>
              <div className="pt-2 border-t border-stageBorder mt-4">
                <PhotoUploader
                  items={photoItems}
                  disabled={saving || deleting}
                  onAddFiles={handleAddFiles}
                  onRemove={handleRemovePhoto}
                  onMove={handleMovePhoto}
                />
              </div>
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <div className="rounded-lg border border-stageBorder bg-surface p-4 min-h-[220px] overflow-x-auto">
                {content.trim() ? (
                  <SongRenderer content={content} transpose={0} />
                ) : (
                  <p className="text-sm text-textSecondary italic">
                    No song content to preview. Type chords and lyrics in the Edit tab.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

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
                {saving ? 'Saving...' : 'Save Song'}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/songs')}
                disabled={saving || deleting}
                className="border-stageBorder text-textSecondary hover:bg-elevated hover:text-textPrimary"
              >
                Cancel
              </Button>
            </div>
            {song && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="bg-stageDestructive hover:bg-stageDestructive/90 text-white font-medium"
              >
                {deleting ? 'Deleting...' : 'Delete Song'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
