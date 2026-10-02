import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  theme: 'dark' | 'light';
  fontSize: number;
  scrollLock: boolean;
  autoScroll: boolean;
  autoScrollSpeed: number;
  transposeMap: Record<string, number>;
  photoScale: number;
  photoIndex: number;
  photoCount: number;
  isViewingPhoto: boolean;
  
  setTheme: (theme: 'dark' | 'light') => void;
  setFontSize: (size: number) => void;
  setScrollLock: (lock: boolean) => void;
  setAutoScroll: (auto: boolean) => void;
  setAutoScrollSpeed: (speed: number) => void;
  setTranspose: (songId: string, amount: number) => void;
  getTranspose: (songId: string) => number;
  setPhotoScale: (scale: number) => void;
  resetPhotoScale: () => void;
  setPhotoIndex: (index: number) => void;
  setPhotoCount: (count: number) => void;
  setIsViewingPhoto: (isViewing: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      fontSize: 16,
      scrollLock: false,
      autoScroll: false,
      autoScrollSpeed: 50,
      transposeMap: {},
      photoScale: 1,
      photoIndex: 0,
      photoCount: 0,
      isViewingPhoto: false,

      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: size }),
      setScrollLock: (lock) => set({ scrollLock: lock }),
      setAutoScroll: (auto) => set({ autoScroll: auto }),
      setAutoScrollSpeed: (speed) => set({ autoScrollSpeed: speed }),
      setTranspose: (songId, amount) => set((state) => ({
        transposeMap: {
          ...state.transposeMap,
          [songId]: amount
        }
      })),
      getTranspose: (songId) => get().transposeMap[songId] || 0,
      setPhotoScale: (scale) => set({ photoScale: scale }),
      resetPhotoScale: () => set({ photoScale: 1 }),
      setPhotoIndex: (index) => set({ photoIndex: index }),
      setPhotoCount: (count) => set({ photoCount: count }),
      setIsViewingPhoto: (isViewing) => set({ isViewingPhoto: isViewing }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        autoScrollSpeed: state.autoScrollSpeed,
        transposeMap: state.transposeMap,
      }),
    }
  )
);
