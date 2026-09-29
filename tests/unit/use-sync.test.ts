import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSync } from '../../src/hooks/use-sync';
import { useGigStore } from '../../src/stores/gig-store';
import { useSyncStore } from '../../src/stores/sync-store';

const { fetchSongsByIdsMock, cacheGigStateMock } = vi.hoisted(() => ({
  fetchSongsByIdsMock: vi.fn(),
  cacheGigStateMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/live/setlist-queue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/live/setlist-queue')>();
  return { ...actual, fetchSongsByIds: fetchSongsByIdsMock };
});

vi.mock('../../src/lib/supabase/client', () => ({
  createClient: () => ({}),
}));

vi.mock('../../src/lib/offline/cache-manager', () => ({
  CacheManager: { cacheGigState: cacheGigStateMock },
}));

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

  describe('SETLIST_UPDATE', () => {
    beforeEach(() => {
      fetchSongsByIdsMock.mockReset();
      cacheGigStateMock.mockClear();
    });

    it('fetches new songs, applies setlist id and keeps current song', async () => {
      useGigStore.getState().setGig('gig-1', 'admin');
      useGigStore.getState().setSongIds(['a', 'b']);
      useGigStore.getState().setActiveSongId('b');
      fetchSongsByIdsMock.mockResolvedValue([{ id: 'b' }, { id: 'c' }]);

      const { result } = renderHook(() => useSync());
      await act(async () => {
        await result.current.connect('gig-1', 'user-1', false);
      });

      act(() => {
        (global as any).triggerMessage({
          type: 'SETLIST_UPDATE',
          songIds: ['b', 'c'],
          setlistId: 'sl-2',
          timestamp: 1,
        });
      });

      await waitFor(() => {
        const state = useGigStore.getState();
        expect(state.songIds).toEqual(['b', 'c']);
        expect(state.activeSetlistId).toBe('sl-2');
        expect(state.songs.map((s) => s.id)).toEqual(['b', 'c']);
        expect(state.activeSongId).toBe('b');
      });

      expect(fetchSongsByIdsMock).toHaveBeenCalledTimes(1);
      expect(cacheGigStateMock).toHaveBeenCalledWith('gig-1', 'sl-2', ['b', 'c']);
    });

    it('resets active song to first of new setlist when current is missing', async () => {
      useGigStore.getState().setGig('gig-1', 'admin');
      useGigStore.getState().setSongIds(['a']);
      useGigStore.getState().setActiveSongId('a');
      fetchSongsByIdsMock.mockResolvedValue([{ id: 'x' }]);

      const { result } = renderHook(() => useSync());
      await act(async () => {
        await result.current.connect('gig-1', 'user-1', false);
      });

      act(() => {
        (global as any).triggerMessage({
          type: 'SETLIST_UPDATE',
          songIds: ['x'],
          setlistId: 'sl-3',
          timestamp: 1,
        });
      });

      await waitFor(() => {
        expect(useGigStore.getState().activeSongId).toBe('x');
      });
    });
  });

  describe('GIG_STATE_RESPONSE song refetch', () => {
    beforeEach(() => {
      fetchSongsByIdsMock.mockReset();
      useGigStore.getState().setGig('gig-1', 'admin');
      useGigStore.getState().setSongIds(['a']);
      useGigStore.getState().setSongs([{ id: 'a' } as any]);
    });

    it('refetches songs when response songIds differ', async () => {
      fetchSongsByIdsMock.mockResolvedValue([{ id: 'x' }]);

      const { result } = renderHook(() => useSync());
      await act(async () => {
        await result.current.connect('gig-1', 'user-1', false);
      });

      act(() => {
        (global as any).triggerMessage({
          type: 'GIG_STATE_RESPONSE',
          activeSongId: 'x',
          songIds: ['x'],
          status: 'live',
          timestamp: 1,
        });
      });

      await waitFor(() => {
        expect(useGigStore.getState().songs.map((s) => s.id)).toEqual(['x']);
      });
      expect(fetchSongsByIdsMock).toHaveBeenCalledTimes(1);
    });

    it('does not refetch when response songIds match current', async () => {
      const { result } = renderHook(() => useSync());
      await act(async () => {
        await result.current.connect('gig-1', 'user-1', false);
      });

      act(() => {
        (global as any).triggerMessage({
          type: 'GIG_STATE_RESPONSE',
          activeSongId: 'a',
          songIds: ['a'],
          status: 'live',
          timestamp: 1,
        });
      });

      await waitFor(() => {
        expect(useGigStore.getState().activeSongId).toBe('a');
      });
      expect(fetchSongsByIdsMock).not.toHaveBeenCalled();
    });
  });
});
