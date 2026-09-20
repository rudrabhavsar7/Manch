import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareSetlistDialog } from '@/components/setlists/share-setlist-dialog';
import { useAuthStore } from '@/stores/auth-store';

const mockGetUser = vi.fn();
const mockSetlistSharesSelect = vi.fn();
const mockSetlistSharesEq = vi.fn();
const mockSetlistSharesUpsert = vi.fn();
const mockSetlistSharesDelete = vi.fn();
const mockSetlistSharesDeleteEq = vi.fn();

const mockUsersSelect = vi.fn();
const mockUsersEq = vi.fn();
const mockUsersSingle = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === 'setlist_shares') {
    return {
      select: mockSetlistSharesSelect,
      upsert: mockSetlistSharesUpsert,
      delete: mockSetlistSharesDelete,
    };
  }
  if (table === 'users') {
    return {
      select: mockUsersSelect,
    };
  }
  return {};
});

const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
};

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => mockSupabaseClient,
}));

describe('ShareSetlistDialog', () => {
  const setlistId = 'setlist-test-123';
  const ownerUser = { id: 'owner-1', email: 'owner@band.com' };

  const sampleExistingShares = [
    {
      id: 'share-1',
      permission: 'view',
      users: { email: 'drummer@band.com' },
    },
    {
      id: 'share-2',
      permission: 'edit',
      users: { email: 'bassist@band.com' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      user: ownerUser as any,
    });

    mockGetUser.mockResolvedValue({
      data: { user: ownerUser },
    });

    // setlist_shares select chain
    mockSetlistSharesSelect.mockReturnValue({
      eq: mockSetlistSharesEq,
    });
    mockSetlistSharesEq.mockResolvedValue({
      data: sampleExistingShares,
      error: null,
    });

    // setlist_shares upsert chain
    mockSetlistSharesUpsert.mockImplementation(() => {
      const result: any = Promise.resolve({ error: null, data: null });
      result.select = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'share-new-123', permission: 'view' },
          error: null,
        }),
      });
      return result;
    });

    // setlist_shares delete chain
    mockSetlistSharesDelete.mockReturnValue({
      eq: mockSetlistSharesDeleteEq,
    });
    mockSetlistSharesDeleteEq.mockResolvedValue({
      error: null,
    });

    // users select chain
    mockUsersSelect.mockReturnValue({
      eq: mockUsersEq,
    });
    mockUsersEq.mockReturnValue({
      single: mockUsersSingle,
    });
    mockUsersSingle.mockResolvedValue({
      data: { id: 'user-keyboard-456' },
      error: null,
    });
  });

  it('renders share trigger button', () => {
    render(<ShareSetlistDialog setlistId={setlistId} />);

    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toBeInTheDocument();
  });

  it('opens dialog, loads and displays currently shared users with email and permission', async () => {
    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));

    expect(await screen.findByRole('heading', { name: 'Share Setlist' })).toBeInTheDocument();
    expect(screen.getByText('drummer@band.com')).toBeInTheDocument();
    expect(screen.getByText('bassist@band.com')).toBeInTheDocument();
    expect(screen.getByText('view')).toBeInTheDocument();
    expect(screen.getByText('edit')).toBeInTheDocument();

    expect(mockFrom).toHaveBeenCalledWith('setlist_shares');
    expect(mockSetlistSharesSelect).toHaveBeenCalledWith('id, permission, users!user_id(email)');
    expect(mockSetlistSharesEq).toHaveBeenCalledWith('setlist_id', setlistId);
  });

  it('displays empty state when no users are shared yet', async () => {
    mockSetlistSharesEq.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));

    expect(await screen.findByText('Not shared with anyone yet')).toBeInTheDocument();
  });

  it('handles sharing with a valid email (calls lookup, upsert, updates UI, clears input)', async () => {
    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));
    await screen.findByText('drummer@band.com');

    const emailInput = screen.getByPlaceholderText('musician@email.com');
    await user.type(emailInput, 'keyboard@band.com');

    const addButton = screen.getByRole('button', { name: /add user/i });
    await user.click(addButton);

    // Verify lookup
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockUsersSelect).toHaveBeenCalledWith('id');
      expect(mockUsersEq).toHaveBeenCalledWith('email', 'keyboard@band.com');
      expect(mockUsersSingle).toHaveBeenCalled();
    });

    // Verify upsert
    expect(mockFrom).toHaveBeenCalledWith('setlist_shares');
    expect(mockSetlistSharesUpsert).toHaveBeenCalledWith({
      setlist_id: setlistId,
      user_id: 'user-keyboard-456',
      permission: 'view',
      shared_by: 'owner-1',
    });

    // Verify UI updated
    expect(await screen.findByText('keyboard@band.com')).toBeInTheDocument();
    expect(emailInput).toHaveValue('');
  });

  it('shows error message when email is not found in users table', async () => {
    mockUsersSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));
    await screen.findByText('drummer@band.com');

    const emailInput = screen.getByPlaceholderText('musician@email.com');
    await user.type(emailInput, 'unknown@band.com');

    const addButton = screen.getByRole('button', { name: /add user/i });
    await user.click(addButton);

    expect(await screen.findByText('No user found with that email')).toBeInTheDocument();
    expect(mockSetlistSharesUpsert).not.toHaveBeenCalled();
  });

  it('shows error message when upsert fails', async () => {
    mockSetlistSharesUpsert.mockImplementationOnce(() => {
      const result: any = Promise.resolve({ error: { message: 'Database upsert error' }, data: null });
      result.select = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database upsert error' },
        }),
      });
      return result;
    });

    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));
    await screen.findByText('drummer@band.com');

    const emailInput = screen.getByPlaceholderText('musician@email.com');
    await user.type(emailInput, 'keyboard@band.com');

    const addButton = screen.getByRole('button', { name: /add user/i });
    await user.click(addButton);

    expect(await screen.findByText('Database upsert error')).toBeInTheDocument();
  });

  it('handles deleting a share', async () => {
    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));
    await screen.findByText('drummer@band.com');

    const removeDrummerBtn = screen.getByRole('button', { name: /remove drummer@band.com/i });
    await user.click(removeDrummerBtn);

    await waitFor(() => {
      expect(mockSetlistSharesDelete).toHaveBeenCalled();
      expect(mockSetlistSharesDeleteEq).toHaveBeenCalledWith('id', 'share-1');
    });

    expect(screen.queryByText('drummer@band.com')).not.toBeInTheDocument();
    expect(screen.getByText('bassist@band.com')).toBeInTheDocument();
  });

  it('displays error when delete fails', async () => {
    mockSetlistSharesDeleteEq.mockResolvedValueOnce({
      error: { message: 'Failed to revoke access' },
    });

    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));
    await screen.findByText('drummer@band.com');

    const removeDrummerBtn = screen.getByRole('button', { name: /remove drummer@band.com/i });
    await user.click(removeDrummerBtn);

    expect(await screen.findByText('Failed to revoke access')).toBeInTheDocument();
    expect(screen.getByText('drummer@band.com')).toBeInTheDocument();
  });

  it('disables add button when input is empty or whitespace only', async () => {
    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));
    await screen.findByText('drummer@band.com');

    const addButton = screen.getByRole('button', { name: /add user/i });
    expect(addButton).toBeDisabled();

    const emailInput = screen.getByPlaceholderText('musician@email.com');
    await user.type(emailInput, '   ');
    expect(addButton).toBeDisabled();
  });

  it('shows error when user is not authenticated', async () => {
    useAuthStore.setState({ user: null });
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));
    await screen.findByText('drummer@band.com');

    const emailInput = screen.getByPlaceholderText('musician@email.com');
    await user.type(emailInput, 'keyboard@band.com');

    const addButton = screen.getByRole('button', { name: /add user/i });
    await user.click(addButton);

    expect(await screen.findByText('Not authenticated')).toBeInTheDocument();
    expect(mockUsersSelect).not.toHaveBeenCalled();
  });

  it('allows adding user by submitting form with Enter key', async () => {
    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));
    await screen.findByText('drummer@band.com');

    const emailInput = screen.getByPlaceholderText('musician@email.com');
    await user.type(emailInput, 'keyboard@band.com{enter}');

    expect(await screen.findByText('keyboard@band.com')).toBeInTheDocument();
    expect(mockSetlistSharesUpsert).toHaveBeenCalled();
  });

  it('updates existing user in list without duplicate when shared again', async () => {
    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));
    await screen.findByText('drummer@band.com');

    const emailInput = screen.getByPlaceholderText('musician@email.com');
    await user.type(emailInput, 'drummer@band.com');

    const addButton = screen.getByRole('button', { name: /add user/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(mockSetlistSharesUpsert).toHaveBeenCalled();
    });

    // Should only have 1 drummer item
    const drummerItems = screen.getAllByText('drummer@band.com');
    expect(drummerItems).toHaveLength(1);
  });

  it('displays error if initial fetch fails', async () => {
    mockSetlistSharesEq.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to load shares' },
    });

    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));

    expect(await screen.findByText('Failed to load shares')).toBeInTheDocument();
  });

  it('displays error when attempting to share setlist with oneself', async () => {
    mockUsersSingle.mockResolvedValueOnce({
      data: { id: ownerUser.id },
      error: null,
    });

    const user = userEvent.setup();
    render(<ShareSetlistDialog setlistId={setlistId} />);

    await user.click(screen.getByRole('button', { name: /share/i }));
    await screen.findByText('drummer@band.com');

    const emailInput = screen.getByPlaceholderText('musician@email.com');
    await user.type(emailInput, ownerUser.email);
    await user.click(screen.getByRole('button', { name: /add user/i }));

    expect(await screen.findByText('Cannot share setlist with yourself')).toBeInTheDocument();
    expect(mockSetlistSharesUpsert).not.toHaveBeenCalled();
  });
});
