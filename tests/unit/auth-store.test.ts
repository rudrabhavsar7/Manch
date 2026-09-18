import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@supabase/supabase-js';

const mockUnsubscribe = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

describe('auth store (useAuthStore)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    });

    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  it('initial state has null user and loading true', async () => {
    const { useAuthStore } = await import('@/stores/auth-store');
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.loading).toBe(true);
  });

  describe('signIn', () => {
    it('returns null error on successful sign in', async () => {
      const mockUser = { id: 'u-1', email: 'musician@stage.com' } as User;
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: null },
        error: null,
      });

      const { useAuthStore } = await import('@/stores/auth-store');
      const result = await useAuthStore.getState().signIn('musician@stage.com', 'stagepass');

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'musician@stage.com',
        password: 'stagepass',
      });
      expect(result).toEqual({ error: null });
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('returns error message on failed sign in', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const { useAuthStore } = await import('@/stores/auth-store');
      const result = await useAuthStore.getState().signIn('musician@stage.com', 'wrongpass');

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'musician@stage.com',
        password: 'wrongpass',
      });
      expect(result).toEqual({ error: 'Invalid login credentials' });
    });
  });

  describe('signUp', () => {
    it('calls supabase signUp with display_name metadata and returns null error', async () => {
      const mockUser = {
        id: 'u-2',
        email: 'drummer@stage.com',
        user_metadata: { display_name: 'Fast Hands' },
      } as unknown as User;

      mockSignUp.mockResolvedValueOnce({
        data: { user: mockUser, session: null },
        error: null,
      });

      const { useAuthStore } = await import('@/stores/auth-store');
      const result = await useAuthStore.getState().signUp('drummer@stage.com', 'drumsolo123', 'Fast Hands');

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'drummer@stage.com',
        password: 'drumsolo123',
        options: {
          data: {
            display_name: 'Fast Hands',
          },
        },
      });
      expect(result).toEqual({ error: null });
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('returns error message on failed sign up', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const { useAuthStore } = await import('@/stores/auth-store');
      const result = await useAuthStore.getState().signUp('drummer@stage.com', 'drumsolo123', 'Fast Hands');

      expect(result).toEqual({ error: 'User already registered' });
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut and clears user from state', async () => {
      mockSignOut.mockResolvedValueOnce({ error: null });

      const { useAuthStore } = await import('@/stores/auth-store');
      useAuthStore.setState({
        user: { id: 'u-1', email: 'test@example.com' } as User,
        loading: false,
      });

      await useAuthStore.getState().signOut();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('initialize', () => {
    it('fetches current user from getUser and updates store', async () => {
      const existingUser = { id: 'u-existing', email: 'lead@band.com' } as User;
      mockGetUser.mockResolvedValueOnce({
        data: { user: existingUser },
        error: null,
      });

      const { useAuthStore } = await import('@/stores/auth-store');
      useAuthStore.setState({ user: null, loading: true });

      const unsubscribe = useAuthStore.getState().initialize();

      // Wait for promise tick
      await vi.waitFor(() => {
        expect(useAuthStore.getState().loading).toBe(false);
      });

      expect(mockGetUser).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().user).toEqual(existingUser);
      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('updates user and loading on onAuthStateChange callback', async () => {
      let authCallback: ((event: string, session: { user: User | null } | null) => void) | null = null;
      mockOnAuthStateChange.mockImplementationOnce((cb) => {
        authCallback = cb;
        return {
          data: {
            subscription: {
              unsubscribe: mockUnsubscribe,
            },
          },
        };
      });

      const { useAuthStore } = await import('@/stores/auth-store');
      useAuthStore.setState({ user: null, loading: true });

      const unsubscribe = useAuthStore.getState().initialize();

      expect(authCallback).not.toBeNull();

      const sessionUser = { id: 'u-session', email: 'session@band.com' } as User;
      authCallback!('SIGNED_IN', { user: sessionUser });

      expect(useAuthStore.getState().user).toEqual(sessionUser);
      expect(useAuthStore.getState().loading).toBe(false);

      authCallback!('SIGNED_OUT', null);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().loading).toBe(false);

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('sets loading to false and user to null when getUser fails', async () => {
      mockGetUser.mockRejectedValueOnce(new Error('Network error'));

      const { useAuthStore } = await import('@/stores/auth-store');
      useAuthStore.setState({ user: null, loading: true });

      const unsubscribe = useAuthStore.getState().initialize();

      await vi.waitFor(() => {
        expect(useAuthStore.getState().loading).toBe(false);
      });

      expect(useAuthStore.getState().user).toBeNull();
      unsubscribe();
    });
  });
});
