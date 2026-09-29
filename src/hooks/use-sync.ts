import { useEffect, useCallback, useRef } from 'react';
import { useGigStore } from '../stores/gig-store';
import { useSyncStore } from '../stores/sync-store';
import { SyncEngine } from '../lib/sync/sync-engine';
import { SyncMessage } from '../lib/sync/message-types';
import { createClient } from '../lib/supabase/client';
import { fetchSongsByIds } from '../lib/live/setlist-queue';
import { CacheManager } from '../lib/offline/cache-manager';

export function useSync() {
  const engineRef = useRef<SyncEngine | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const { setActiveSongId, setStatus, updateMemberRole, setScrollPosition } = useGigStore();
  const { setConnectionStatus, setTransport } = useSyncStore();

  useEffect(() => {
    engineRef.current = new SyncEngine();
    return () => {
      engineRef.current?.disconnect();
    };
  }, []);

  const syncSongs = useCallback(async (songIds: string[], setlistId?: string) => {
    const state = useGigStore.getState();
    const changed = JSON.stringify(songIds) !== JSON.stringify(state.songIds);
    let songs = state.songs;
    if (changed) {
      supabaseRef.current ??= createClient();
      try {
        songs = await fetchSongsByIds(supabaseRef.current, songIds);
      } catch (err) {
        console.error('Failed to fetch songs for setlist sync:', err);
      }
    }
    useGigStore.getState().applySetlistUpdate({ songIds, songs, setlistId });
    const gigId = useGigStore.getState().gigId;
    if (gigId && setlistId) {
      CacheManager.cacheGigState(gigId, setlistId, songIds).catch((err) =>
        console.error('Failed to cache gig state:', err),
      );
    }
  }, []);

  const connect = useCallback(async (gigIdToConnect: string, userId: string, isHost: boolean) => {
    if (!engineRef.current) return;

    engineRef.current.onStatusChange((status, transport) => {
      setConnectionStatus(status);
      setTransport(transport);
    });

    engineRef.current.onMessage((msg: SyncMessage) => {
      switch (msg.type) {
        case 'SCROLL_SYNC':
          setScrollPosition({ position: msg.position, percentage: msg.percentage });
          break;
        case 'SONG_CHANGE':
          setActiveSongId(msg.songId);
          break;
        case 'SETLIST_UPDATE':
          syncSongs(msg.songIds, msg.setlistId);
          break;
        case 'MEMBER_ROLE':
          updateMemberRole(msg.userId, msg.role);
          break;
        case 'MEMBER_JOIN':
          if (msg.userId) {
            const existingRole = useGigStore.getState().members[msg.userId]?.role;
            updateMemberRole(msg.userId, msg.role || existingRole || 'musician');
          }
          break;
        case 'GIG_STATUS':
          setStatus(msg.status);
          break;
        case 'GIG_STATE_REQUEST':
          if (msg.from) {
            const existingRole = useGigStore.getState().members[msg.from]?.role;
            updateMemberRole(msg.from, existingRole || 'musician');
          }
          if (isHost) {
            engineRef.current?.send({
              type: 'GIG_STATE_RESPONSE',
              activeSongId: useGigStore.getState().activeSongId,
              songIds: useGigStore.getState().songIds,
              status: useGigStore.getState().status as 'live' | 'paused' | 'ended',
              timestamp: Date.now(),
            });
          }
          break;
        case 'GIG_STATE_RESPONSE':
          setActiveSongId(msg.activeSongId);
          setStatus(msg.status);
          syncSongs(msg.songIds);
          break;
      }
    });

    await engineRef.current.connect(gigIdToConnect, userId, isHost);

    engineRef.current.send({
      type: 'MEMBER_JOIN',
      userId,
      role: isHost ? 'admin' : (useGigStore.getState().myRole || 'musician'),
      timestamp: Date.now(),
    });

    if (!isHost) {
      engineRef.current.send({ type: 'GIG_STATE_REQUEST', from: userId, timestamp: Date.now() });
    }
  }, [setActiveSongId, setStatus, updateMemberRole, setScrollPosition, setConnectionStatus, setTransport, syncSongs]);

  const disconnect = useCallback(() => {
    engineRef.current?.disconnect();
    setConnectionStatus('disconnected');
    setTransport('none');
  }, [setConnectionStatus, setTransport]);

  const send = useCallback((message: SyncMessage) => {
    engineRef.current?.send(message);
  }, []);

  return { connect, disconnect, send };
}
