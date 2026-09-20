'use client';

import { useState } from 'react';
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

  const supabase = useSupabase();
  const router = useRouter();

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required');
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

    if (song) {
      const { error: err } = await supabase
        .from('songs')
        .update(songData)
        .eq('id', song.id);
      if (err) {
        setError(err.message);
      } else {
        router.refresh();
        router.push('/songs');
      }
    } else {
      const { error: err } = await supabase
        .from('songs')
        .insert({ ...songData, owner_id: user.id });
      if (err) {
        setError(err.message);
      } else {
        router.refresh();
        router.push('/songs');
      }
    }

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
