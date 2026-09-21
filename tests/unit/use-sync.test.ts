import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSync } from '../../src/hooks/use-sync';
import { useGigStore } from '../../src/stores/gig-store';
import { useSyncStore } from '../../src/stores/sync-store';

vi.mock('../../src/lib/sync/sync-engine', () => {
  return {
    SyncEngine: class {
      connect = vi.fn().mockResolvedValue(undefined);
      disconnect = vi.fn();
      send = vi.fn();
      onMessage = vi.fn((cb) => {
        // mock triggering message
        (global as any).triggerMessage = cb;
      });
      onStatusChange = vi.fn();
    }
  };
});

describe('useSync', () => {
  beforeEach(() => {
    useGigStore.setState(useGigStore.getInitialState());
    useSyncStore.setState(useSyncStore.getInitialState());
  });

  it('connects to engine', async () => {
    const { result } = renderHook(() => useSync());
    await act(async () => {
      await result.current.connect('gig-1', 'user-1', false);
    });
    // Just a sanity check
    expect(result.current.send).toBeDefined();
  });

  it('updates store on message', async () => {
    const { result } = renderHook(() => useSync());
    await act(async () => {
      await result.current.connect('gig-1', 'user-1', false);
    });
    
    act(() => {
      if ((global as any).triggerMessage) {
        (global as any).triggerMessage({ type: 'SONG_CHANGE', songId: 'song-2', timestamp: 123 });
      }
    });

    expect(useGigStore.getState().activeSongId).toBe('song-2');
  });

  it('updates store members on MEMBER_JOIN message', async () => {
    const { result } = renderHook(() => useSync());
    await act(async () => {
      await result.current.connect('gig-1', 'user-1', false);
    });
    
    act(() => {
      if ((global as any).triggerMessage) {
        (global as any).triggerMessage({ type: 'MEMBER_JOIN', userId: 'user-2', role: 'musician', timestamp: 123 });
      }
    });

    expect(useGigStore.getState().members['user-2']).toEqual({
      id: 'user-2',
      role: 'musician',
    });
  });
});
