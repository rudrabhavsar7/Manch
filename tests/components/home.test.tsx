import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';
import { useAuthStore } from '@/stores/auth-store';

describe('Home page component', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('renders heading and subtitle correctly', () => {
    render(<Home />);

    const heading = screen.getByRole('heading', { level: 1, name: /manch/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Manch');

    const subtitle = screen.getByText(/live gig companion for musicians/i);
    expect(subtitle).toBeInTheDocument();
  });

  it('renders auth and join links when unauthenticated', () => {
    render(<Home />);

    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/auth/signup');
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login');
    expect(screen.getByRole('link', { name: /join gig with pin/i })).toHaveAttribute('href', '/gigs/join');
    expect(screen.getByText(/sub-100ms stage sync/i)).toBeInTheDocument();
  });

  it('renders dashboard link when authenticated', () => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'musician@band.com' } as any,
    });

    render(<Home />);

    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: /get started/i })).not.toBeInTheDocument();
  });
});
