import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AppShell, isShellHidden } from '@/components/layout/app-shell';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';

const { mockPathname } = vi.hoisted(() => ({
  mockPathname: vi.fn(),
}));

const mockAuthStore = vi.hoisted(() => {
  const getState = vi.fn(() => ({
    user: { id: 'test-user', email: 'test@test.com' },
    loading: false,
    initialize: vi.fn(),
  }));
  
  const hookFn = vi.fn((selector) => selector({
    user: { id: 'test-user', email: 'test@test.com' },
    loading: false,
    initialize: vi.fn(),
    getState,
  }));
  
  hookFn.getState = getState;
  
  return hookFn;
});

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: mockAuthStore,
}));

describe('isShellHidden helper', () => {
  it('hides shell on auth routes', () => {
    expect(isShellHidden('/auth/login')).toBe(true);
    expect(isShellHidden('/auth/signup')).toBe(true);
    expect(isShellHidden('/auth/callback')).toBe(true);
  });

  it('hides shell on live gig view routes (/gigs/[id])', () => {
    expect(isShellHidden('/gigs/c8f4d9c4-1234-4a5b-9876-abcdef123456')).toBe(true);
    expect(isShellHidden('/gigs/live-gig-id-99')).toBe(true);
  });

  it('shows shell on standard navigation routes', () => {
    expect(isShellHidden('/dashboard')).toBe(false);
    expect(isShellHidden('/songs')).toBe(false);
    expect(isShellHidden('/songs/new')).toBe(false);
    expect(isShellHidden('/setlists')).toBe(false);
    expect(isShellHidden('/setlists/new')).toBe(false);
    expect(isShellHidden('/gigs')).toBe(false);
    expect(isShellHidden('/gigs/new')).toBe(false);
    expect(isShellHidden('/gigs/join')).toBe(false);
    expect(isShellHidden('/profile')).toBe(false);
    expect(isShellHidden('/settings')).toBe(false);
  });
});

describe('AppShell component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ theme: 'dark' });
  });

  it('renders sidebar, header, and content on dashboard', () => {
    mockPathname.mockReturnValue('/dashboard');

    render(
      <AppShell>
        <div>Dashboard Content</div>
      </AppShell>
    );

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Manch' }).length).toBeGreaterThan(0);
    // There are two links matching "songs" (sidebar + header search), check both exist
    expect(screen.getAllByRole('link', { name: /songs/i }).length).toBe(2);
  });

  it('hides sidebar and header on /auth/login', () => {
    mockPathname.mockReturnValue('/auth/login');

    render(
      <AppShell>
        <div>Login Content</div>
      </AppShell>
    );

    expect(screen.getByText('Login Content')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /songs/i })).not.toBeInTheDocument();
  });

  it('hides sidebar and header on live gig route (/gigs/c8f4d9c4-1234-4a5b-9876-abcdef123456)', () => {
    mockPathname.mockReturnValue('/gigs/c8f4d9c4-1234-4a5b-9876-abcdef123456');

    render(
      <AppShell>
        <div>Live Gig View</div>
      </AppShell>
    );

    expect(screen.getByText('Live Gig View')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /songs/i })).not.toBeInTheDocument();
  });

  it('keeps navigation visible on /gigs, /gigs/new, and /gigs/join', () => {
    for (const path of ['/gigs', '/gigs/new', '/gigs/join']) {
      mockPathname.mockReturnValue(path);

      const { unmount } = render(
        <AppShell>
          <div>Gig Route Content: {path}</div>
        </AppShell>
      );

      expect(screen.getAllByRole('link', { name: /songs/i }).length).toBe(2);
      unmount();
    }
  });

  it('syncs theme class with documentElement', () => {
    mockPathname.mockReturnValue('/dashboard');
    useUIStore.setState({ theme: 'light' });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      useUIStore.setState({ theme: 'dark' });
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });
});
