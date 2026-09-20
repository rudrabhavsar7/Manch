import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePage from '@/app/profile/page';
import { useAuthStore } from '@/stores/auth-store';

const {
  mockSingle,
  mockUpdate,
  mockUpdateEq,
} = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockUpdateEq = vi.fn();
  const mockUpdate = vi.fn(() => ({
    eq: mockUpdateEq,
  }));

  return {
    mockSingle,
    mockUpdate,
    mockUpdateEq,
  };
});

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
          update: mockUpdate,
        };
      }
      return {};
    }),
  }),
}));

describe('ProfilePage (/profile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'user-456',
        email: 'david@pinkfloyd.com',
        user_metadata: { display_name: 'David' },
      } as any,
    });
    mockSingle.mockResolvedValue({
      data: {
        id: 'user-456',
        display_name: 'David Gilmour',
        instrument: 'Fender Stratocaster',
        role: 'Lead Guitarist',
      },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it('loads user profile data into inputs', async () => {
    render(<ProfilePage />);

    expect(screen.getByRole('heading', { level: 1, name: /profile/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue('David Gilmour');
      expect(screen.getByLabelText(/instrument/i)).toHaveValue('Fender Stratocaster');
      expect(screen.getByLabelText(/role/i)).toHaveValue('Lead Guitarist');
    });
  });

  it('saves updates to users table on save button click', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue('David Gilmour');
    });

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Roger Waters' },
    });
    fireEvent.change(screen.getByLabelText(/instrument/i), {
      target: { value: 'Bass Guitar' },
    });
    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: 'Bassist & Vocals' },
    });

    const saveButton = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        display_name: 'Roger Waters',
        instrument: 'Bass Guitar',
        role: 'Bassist & Vocals',
      });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-456');
    });

    expect(await screen.findByText(/saved ✓/i)).toBeInTheDocument();
  });

  it('displays error message if saving profile fails', async () => {
    mockUpdateEq.mockResolvedValueOnce({
      error: { message: 'Database connection failed' },
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue('David Gilmour');
    });

    const saveButton = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(saveButton);

    expect(await screen.findByText('Database connection failed')).toBeInTheDocument();
  });
});
