import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { useAuthStore } from '@/stores/auth-store';

const { mockPathname } = vi.hoisted(() => ({
  mockPathname: vi.fn(),
}));

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

const mockAuthStore = vi.hoisted(() => {
  const signOut = vi.fn();
  return {
    user: { id: 'test-user', email: 'test@test.com' },
    loading: false,
    signOut,
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => mockRouter,
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn((selector) => selector(mockAuthStore)),
}));

describe('AppSidebar component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
  });

  it('renders Manch brand heading and all navigation links', () => {
    render(<AppSidebar />);

    expect(screen.getByRole('link', { name: 'Manch' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /songs/i })).toHaveAttribute('href', '/songs');
    expect(screen.getByRole('link', { name: /setlists/i })).toHaveAttribute('href', '/setlists');
    expect(screen.getByRole('link', { name: /gigs/i })).toHaveAttribute('href', '/gigs');
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });

  it('marks active link based on current pathname', () => {
    mockPathname.mockReturnValue('/songs');
    render(<AppSidebar />);

    const songsLink = screen.getByRole('link', { name: /songs/i });
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });

    expect(songsLink).toHaveAttribute('aria-current', 'page');
    expect(songsLink.className).toContain('bg-primary');
    expect(dashboardLink).not.toHaveAttribute('aria-current');
  });

  it('marks parent link active on sub-routes', () => {
    mockPathname.mockReturnValue('/gigs/new');
    render(<AppSidebar />);

    const gigsLink = screen.getByRole('link', { name: /gigs/i });
    expect(gigsLink).toHaveAttribute('aria-current', 'page');
  });

  it('renders theme toggle in the sidebar', () => {
    render(<AppSidebar />);
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });

  it('calls signOut on Sign Out button click', () => {
    render(<AppSidebar />);

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    expect(signOutBtn).toBeInTheDocument();

    fireEvent.click(signOutBtn);
    expect(mockAuthStore.signOut).toHaveBeenCalledTimes(1);
  });
});
