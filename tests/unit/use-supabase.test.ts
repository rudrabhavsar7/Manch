import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSupabase } from '@/hooks/use-supabase';

const mockCreateClient = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockCreateClient(),
}));

describe('useSupabase hook', () => {
  it('returns memoized client instance', () => {
    const fakeClient = { auth: {} };
    mockCreateClient.mockReturnValue(fakeClient);

    const { result, rerender } = renderHook(() => useSupabase());

    expect(result.current).toBe(fakeClient);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);

    rerender();
    expect(result.current).toBe(fakeClient);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });
});
