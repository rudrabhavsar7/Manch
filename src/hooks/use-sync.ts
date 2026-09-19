import { useEffect, useCallback, useRef } from 'react';
import { useGigStore } from '../stores/gig-store';
import { useSyncStore } from '../stores/sync-store';
import { SyncEngine } from '../lib/sync/sync-engine';
import { SyncMessage } from '../lib/sync/message-types';

export function useSync() {
  const engineRef = useRef<SyncEngine | null>(null);
  
  const { setActiveSongId, setSongIds, setStatus, updateMemberRole } = useGigStore();
  const { setConnectionStatus, setTransport } = useSyncStore();
  
  useEffect(() => {
    engineRef.current = new SyncEngine();
    return () => {
      engineRef.current?.disconnect();
    };
  }, []);

  const connect = useCallback(async (gigIdToConnect: string, userId: string, isHost: boolean) => {
    if (!engineRef.current) return;
    
    engineRef.current.onStatusChange((status, transport) => {
      setConnectionStatus(status);
      setTransport(transport);
    });
    
    engineRef.current.onMessage((msg: SyncMessage) => {
      switch (msg.type) {
        case 'SONG_CHANGE':
          setActiveSongId(msg.songId);
          break;
        case 'SETLIST_UPDATE':
          setSongIds(msg.songIds);
          break;
        case 'MEMBER_ROLE':
          updateMemberRole(msg.userId, msg.role);
          break;
        case 'GIG_STATUS':
          setStatus(msg.status);
          break;
        case 'GIG_STATE_REQUEST':
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
          setSongIds(msg.songIds);
          setStatus(msg.status);
          break;
      }
    });
    
    await engineRef.current.connect(gigIdToConnect, userId, isHost);
    
    if (!isHost) {
      engineRef.current.send({ type: 'GIG_STATE_REQUEST', from: userId, timestamp: Date.now() });
    }
  }, [setActiveSongId, setSongIds, setStatus, updateMemberRole, setConnectionStatus, setTransport]);

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
