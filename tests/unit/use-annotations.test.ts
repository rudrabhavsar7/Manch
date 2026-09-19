import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAnnotations } from '@/hooks/use-annotations';
import { useSupabase } from '@/hooks/use-supabase';
import { useOffline } from '@/hooks/use-offline';
import { CacheManager } from '@/lib/offline/cache-manager';
import { WriteQueue } from '@/lib/offline/write-queue';
import { manchDB } from '@/lib/offline/db';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: vi.fn(),
}));

vi.mock('@/hooks/use-offline', () => ({
  useOffline: vi.fn(),
}));

vi.mock('@/lib/offline/cache-manager', () => ({
  CacheManager: {
    cacheAnnotations: vi.fn(),
    getAnnotationsForSong: vi.fn(),
  },
}));

vi.mock('@/lib/offline/write-queue', () => ({
  WriteQueue: {
    enqueue: vi.fn(),
  },
}));

vi.mock('@/lib/offline/db', () => ({
  manchDB: {
    annotations: {
      put: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

describe('useAnnotations', () => {
  const mockUser = { id: 'user-1' };
  const mockSongId = 'song-1';
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    };

    (useSupabase as any).mockReturnValue(mockSupabase);
    (useAuthStore as any).mockReturnValue(mockUser);
  });

  it('loads annotations from supabase when online', async () => {
    (useOffline as any).mockReturnValue({ isOnline: true });
    
    const mockData = [{ id: 'a1', type: 'inline' }];
    const secondEq = vi.fn().mockResolvedValue({ data: mockData });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    mockSupabase.select.mockReturnValue({ eq: firstEq });

    const { result } = renderHook(() => useAnnotations(mockSongId));

    expect(result.current.loading).toBe(true);
    
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.annotations).toEqual(mockData);
    expect(CacheManager.cacheAnnotations).toHaveBeenCalledWith(mockData);
  });

  it('loads annotations from cache when offline', async () => {
    (useOffline as any).mockReturnValue({ isOnline: false });
    
    const mockCached = [{ id: 'a2', type: 'general' }];
    (CacheManager.getAnnotationsForSong as any).mockResolvedValueOnce(mockCached);

    const { result } = renderHook(() => useAnnotations(mockSongId));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.annotations).toEqual(mockCached);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('adds annotation online', async () => {
    (useOffline as any).mockReturnValue({ isOnline: true });
    
    // For initial load
    const mockData: any[] = [];
    const secondEq = vi.fn().mockResolvedValue({ data: mockData });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    mockSupabase.select.mockReturnValue({ eq: firstEq });
    
    const { result } = renderHook(() => useAnnotations(mockSongId));
    
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const addedData = { id: 'new-1', type: 'inline', content: 'test', color: 'red' };
    
    // For insert
    const singleMock = vi.fn().mockResolvedValue({ data: addedData, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    mockSupabase.insert.mockReturnValue({ select: selectMock });

    await act(async () => {
      await result.current.addAnnotation('inline', 'test', 'red', 1);
    });

    expect(result.current.annotations).toContainEqual(addedData);
    expect(manchDB.annotations.put).toHaveBeenCalledWith(addedData);
  });

  it('adds annotation offline', async () => {
    (useOffline as any).mockReturnValue({ isOnline: false });
    (CacheManager.getAnnotationsForSong as any).mockResolvedValueOnce([]);
    
    const { result } = renderHook(() => useAnnotations(mockSongId));
    
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addAnnotation('general', 'offline test', 'blue');
    });

    expect(result.current.annotations[0]).toMatchObject({
      content: 'offline test',
      color: 'blue',
      type: 'general',
    });
    expect(WriteQueue.enqueue).toHaveBeenCalledWith('annotations', 'insert', expect.any(Object));
    expect(manchDB.annotations.put).toHaveBeenCalled();
  });

  it('updates annotation online', async () => {
    (useOffline as any).mockReturnValue({ isOnline: true });
    const mockData = [{ id: 'u1', type: 'general', content: 'old', color: 'blue' }];
    const secondEq = vi.fn().mockResolvedValue({ data: mockData });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    mockSupabase.select.mockReturnValue({ eq: firstEq });
    
    const { result } = renderHook(() => useAnnotations(mockSongId));
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateAnnotation('u1', 'new content', 'red');
    });

    expect(result.current.annotations[0].content).toBe('new content');
    expect(result.current.annotations[0].color).toBe('red');
    expect(manchDB.annotations.update).toHaveBeenCalledWith('u1', expect.objectContaining({ content: 'new content', color: 'red' }));
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ content: 'new content', color: 'red' }));
  });

  it('deletes annotation online', async () => {
    (useOffline as any).mockReturnValue({ isOnline: true });
    const mockData = [{ id: 'd1', type: 'general', content: 'test' }];
    const secondEq = vi.fn().mockResolvedValue({ data: mockData });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    mockSupabase.select.mockReturnValue({ eq: firstEq });
    
    const { result } = renderHook(() => useAnnotations(mockSongId));
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteAnnotation('d1');
    });

    expect(result.current.annotations).toHaveLength(0);
    expect(manchDB.annotations.delete).toHaveBeenCalledWith('d1');
    expect(mockSupabase.delete).toHaveBeenCalled();
  });
});
