import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '@/hooks/use-media-query';

type Listener = (e: MediaQueryListEvent) => void;

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches,
    media: '',
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
    dispatch: (next: boolean) => {
      (mql as { matches: boolean }).matches = next;
      listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent));
    },
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({ ...mql, media: query })),
  });
  return mql;
}

describe('useMediaQuery', () => {
  afterEach(() => {
    // @ts-expect-error cleanup optional global
    delete window.matchMedia;
  });

  it('returns false when matchMedia is unavailable', () => {
    // @ts-expect-error intentionally absent
    delete window.matchMedia;
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });

  it('returns the initial matches value', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    const mql = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);

    act(() => mql.dispatch(true));
    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const listeners = new Set<Listener>();
    const remove = vi.fn();
    const add = vi.fn((_: string, cb: Listener) => listeners.add(cb));
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({ matches: false, media: '', addEventListener: add, removeEventListener: remove })),
    });

    const { unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(add).toHaveBeenCalledTimes(1);
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
