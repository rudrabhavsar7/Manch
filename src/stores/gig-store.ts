import { create } from 'zustand';

export interface GigMember {
  id: string;
  role: 'admin' | 'co-admin' | 'musician';
}

interface GigState {
  gigId: string | null;
  activeSongId: string | null;
  songIds: string[];
  status: 'draft' | 'live' | 'paused' | 'ended';
  members: Record<string, GigMember>;
  myRole: 'admin' | 'co-admin' | 'musician';
  scrollPosition: { position: number; percentage: number } | null;
  
  setGigId: (id: string | null) => void;
  setGig: (id: string, role: 'admin' | 'co-admin' | 'musician') => void;
  setActiveSongId: (id: string | null) => void;
  setActiveSong: (id: string | null) => void;
  setSongIds: (ids: string[]) => void;
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
  status: 'draft',
  members: {},
  myRole: 'musician',
  scrollPosition: null,

  setGigId: (id) => set({ gigId: id }),
  setGig: (id, role) => set({ gigId: id, myRole: role }),
  setActiveSongId: (id) => set({ activeSongId: id }),
  setActiveSong: (id) => set({ activeSongId: id }),
  setSongIds: (ids) => set({ songIds: ids }),
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
    status: 'draft',
    members: {},
    myRole: 'musician',
    scrollPosition: null,
  })
}));
