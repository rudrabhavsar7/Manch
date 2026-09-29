import { create } from 'zustand';
import { resolveActiveSong } from '@/lib/live/setlist-queue';
import type { Tables } from '@/types/database';

type Song = Tables<'songs'>;

export interface GigMember {
  id: string;
  role: 'admin' | 'co-admin' | 'musician';
}

export interface QueueItem {
  id: string;
  setlistId: string;
  name: string;
}

interface GigState {
  gigId: string | null;
  activeSongId: string | null;
  songIds: string[];
  songs: Song[];
  queue: QueueItem[];
  activeSetlistId: string | null;
  status: 'draft' | 'live' | 'paused' | 'ended';
  members: Record<string, GigMember>;
  myRole: 'admin' | 'co-admin' | 'musician';
  scrollPosition: { position: number; percentage: number } | null;

  setGigId: (id: string | null) => void;
  setGig: (id: string, role: 'admin' | 'co-admin' | 'musician') => void;
  setActiveSongId: (id: string | null) => void;
  setActiveSong: (id: string | null) => void;
  setSongIds: (ids: string[]) => void;
  setSongs: (songs: Song[]) => void;
  setQueue: (queue: QueueItem[]) => void;
  addToQueue: (item: QueueItem) => void;
  removeFromQueue: (id: string) => void;
  setActiveSetlistId: (id: string) => void;
  applySetlistUpdate: (update: { songIds: string[]; songs: Song[]; setlistId?: string }) => void;
  setStatus: (status: 'draft' | 'live' | 'paused' | 'ended') => void;
  setMembers: (members: Record<string, GigMember>) => void;
  updateMemberRole: (userId: string, role: 'admin' | 'co-admin' | 'musician') => void;
  setMyRole: (role: 'admin' | 'co-admin' | 'musician') => void;
  setScrollPosition: (pos: { position: number; percentage: number } | null) => void;
  reset: () => void;
}

export const useGigStore = create<GigState>((set) => ({
  gigId: null,
  activeSongId: null,
  songIds: [],
  songs: [],
  queue: [],
  activeSetlistId: null,
  status: 'draft',
  members: {},
  myRole: 'musician',
  scrollPosition: null,

  setGigId: (id) => set({ gigId: id }),
  setGig: (id, role) => set({ gigId: id, myRole: role }),
  setActiveSongId: (id) => set({ activeSongId: id, scrollPosition: null }),
  setActiveSong: (id) => set({ activeSongId: id, scrollPosition: null }),
  setSongIds: (ids) => set({ songIds: ids }),
  setSongs: (songs) => set({ songs }),
  setQueue: (queue) => set({ queue }),
  addToQueue: (item) => set((state) => ({ queue: [...state.queue, item] })),
  removeFromQueue: (id) =>
    set((state) => ({ queue: state.queue.filter((q) => q.id !== id) })),
  setActiveSetlistId: (id) => set({ activeSetlistId: id }),
  applySetlistUpdate: ({ songIds, songs, setlistId }) =>
    set((state) => {
      const activeSongId = resolveActiveSong(state.activeSongId, songIds);
      const songChanged = activeSongId !== state.activeSongId;
      return {
        songIds,
        songs,
        activeSetlistId: setlistId ?? state.activeSetlistId,
        activeSongId,
        ...(songChanged ? { scrollPosition: null } : {}),
      };
    }),
  setStatus: (status) => set({ status }),
  setMembers: (members) => set({ members }),
  updateMemberRole: (userId, role) => set((state) => ({
    members: {
      ...state.members,
      [userId]: { id: userId, role }
    }
  })),
  setMyRole: (role) => set({ myRole: role }),
  setScrollPosition: (pos) => set({ scrollPosition: pos }),
  reset: () => set({
    gigId: null,
    activeSongId: null,
    songIds: [],
    songs: [],
    queue: [],
    activeSetlistId: null,
    status: 'draft',
    members: {},
    myRole: 'musician',
    scrollPosition: null,
  })
}));
