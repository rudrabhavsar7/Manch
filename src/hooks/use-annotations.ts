'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './use-supabase';
import { useOffline } from './use-offline';
import { CacheManager } from '@/lib/offline/cache-manager';
import { WriteQueue } from '@/lib/offline/write-queue';
import { manchDB } from '@/lib/offline/db';
import { useAuthStore } from '@/stores/auth-store';
import type { Database } from '@/types/database';

type Annotation = Database['public']['Tables']['annotations']['Row'];

export function useAnnotations(songId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();
  const { isOnline } = useOffline();
  const user = useAuthStore((s) => s.user);

  const loadAnnotations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isOnline) {
      const { data } = await supabase
        .from('annotations')
        .select('*')
        .eq('user_id', user.id)
        .eq('song_id', songId);
      if (data) {
        setAnnotations(data);
        await CacheManager.cacheAnnotations(data);
      }
    } else {
      const cached = await CacheManager.getAnnotationsForSong(user.id, songId);
      setAnnotations(cached);
    }

    setLoading(false);
  }, [user, songId, isOnline, supabase]);

  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  const addAnnotation = useCallback(async (
    type: 'inline' | 'general',
    content: string,
    color: string,
    lineNumber?: number,
  ) => {
    if (!user) return;

    const newAnnotation = {
      id: crypto.randomUUID(),
      user_id: user.id,
      song_id: songId,
      type,
      content,
      color,
      line_number: lineNumber ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    setAnnotations((prev) => [...prev, newAnnotation as Annotation]);

    if (isOnline) {
      const { data, error } = await supabase
        .from('annotations')
        .insert(newAnnotation)
        .select()
        .single();
      if (error) {
        console.error('Failed to add annotation:', error);
      }
      if (data) {
        setAnnotations((prev) =>
          prev.map((a) => (a.id === newAnnotation.id ? data : a)),
        );
        await manchDB.annotations.put(data);
      }
    } else {
      await manchDB.annotations.put(newAnnotation as Annotation);
      await WriteQueue.enqueue('annotations', 'insert', newAnnotation);
    }
  }, [user, songId, isOnline, supabase]);

  const updateAnnotation = useCallback(async (id: string, content: string, color: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, content, color, updated_at: new Date().toISOString() } : a)),
    );

    if (isOnline) {
      await supabase.from('annotations').update({ content, color }).eq('id', id);
    } else {
      await WriteQueue.enqueue('annotations', 'update', { id, content, color });
    }
  }, [isOnline, supabase]);

  const deleteAnnotation = useCallback(async (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));

    if (isOnline) {
      await supabase.from('annotations').delete().eq('id', id);
    } else {
      await WriteQueue.enqueue('annotations', 'delete', { id });
    }
    await manchDB.annotations.delete(id);
  }, [isOnline, supabase]);

  const inlineAnnotations = annotations.filter((a) => a.type === 'inline');
  const generalAnnotations = annotations.filter((a) => a.type === 'general');

  return {
    annotations,
    inlineAnnotations,
    generalAnnotations,
    loading,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  };
}
