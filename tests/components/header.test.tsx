import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth-store';

const { mockPathname } = vi.hoisted(() => ({
  mockPathname: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('Header component', () => {
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
    useAuthStore.setState({
      user: {
        id: 'user-789',
        email: 'musician@manch.app',
        user_metadata: { display_name: 'Lead Singer' },
      } as any,
      signOut: mockSignOut,
    });
  });

  it('renders user display name, brand, and theme toggle', () => {
    render(<Header />);

    expect(screen.getByText('Lead Singer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open mobile navigation menu/i })
    ).toBeInTheDocument();
  });

  it('opens mobile navigation sheet on menu button click and renders navigation links', async () => {
    render(<Header />);

    const menuButton = screen.getByRole('button', {
      name: /open mobile navigation menu/i,
    });
    fireEvent.click(menuButton);

    expect(await screen.findByRole('link', { name: /songs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /setlists/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /gigs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('calls signOut from mobile menu sign out button', async () => {
    render(<Header />);

    const menuButton = screen.getByRole('button', {
      name: /open mobile navigation menu/i,
    });
    fireEvent.click(menuButton);

    const signOutBtn = await screen.findByRole('button', { name: /sign out/i });
    fireEvent.click(signOutBtn);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
