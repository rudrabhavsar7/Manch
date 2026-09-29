import { describe, it, expect, beforeEach } from 'vitest';
import { useGigStore } from '@/stores/gig-store';
import type { Tables } from '@/types/database';

type Song = Tables<'songs'>;

const song = (id: string): Song => ({
  id,
  title: `Song ${id}`,
  artist: '',
  key: '',
  bpm: null,
  content: '',
  structure: [],
  owner_id: 'u1',
  created_at: '',
  updated_at: '',
});

describe('gig-store applySetlistUpdate', () => {
  beforeEach(() => {
    useGigStore.setState(useGigStore.getInitialState());
    useGigStore.getState().setGig('gig-1', 'admin');
    useGigStore.getState().setSongIds(['a', 'b', 'c']);
    useGigStore.getState().setActiveSongId('b');
    useGigStore.getState().setScrollPosition({ position: 4, percentage: 0.5 });
  });

  it('replaces songs, songIds and active setlist id', () => {
    const newSongs = [song('x'), song('y')];
    useGigStore.getState().applySetlistUpdate({
      songIds: ['x', 'y'],
      songs: newSongs,
      setlistId: 'sl-2',
    });

    const state = useGigStore.getState();
    expect(state.songIds).toEqual(['x', 'y']);
    expect(state.songs).toEqual(newSongs);
    expect(state.activeSetlistId).toBe('sl-2');
  });

  it('keeps active song when it exists in new setlist and keeps scroll', () => {
    useGigStore.getState().applySetlistUpdate({
      songIds: ['c', 'b'],
      songs: [song('c'), song('b')],
      setlistId: 'sl-2',
    });

    const state = useGigStore.getState();
    expect(state.activeSongId).toBe('b');
    expect(state.scrollPosition).toEqual({ position: 4, percentage: 0.5 });
  });

  it('resets active song to first song and clears scroll when current missing', () => {
    useGigStore.getState().applySetlistUpdate({
      songIds: ['x', 'y'],
      songs: [song('x'), song('y')],
      setlistId: 'sl-2',
    });

    const state = useGigStore.getState();
    expect(state.activeSongId).toBe('x');
    expect(state.scrollPosition).toBeNull();
  });
});

describe('gig-store queue state', () => {
  beforeEach(() => {
    useGigStore.setState(useGigStore.getInitialState());
  });

  it('sets, adds and removes queue items', () => {
    useGigStore.getState().setQueue([
      { id: 'q1', setlistId: 'sl-1', name: 'One' },
      { id: 'q2', setlistId: 'sl-2', name: 'Two' },
    ]);
    expect(useGigStore.getState().queue).toHaveLength(2);

    useGigStore.getState().removeFromQueue('q1');
    expect(useGigStore.getState().queue.map((q) => q.id)).toEqual(['q2']);

    useGigStore.getState().addToQueue({ id: 'q3', setlistId: 'sl-3', name: 'Three' });
    expect(useGigStore.getState().queue.map((q) => q.id)).toEqual(['q2', 'q3']);
  });
});
