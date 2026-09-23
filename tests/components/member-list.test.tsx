import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberList } from '@/components/live/member-list';
import { useGigStore } from '@/stores/gig-store';
import { useAuthStore } from '@/stores/auth-store';

const { mockSelectEq, mockSelect, mockUpdateEq2, mockUpdateEq1, mockUpdate, mockFrom } = vi.hoisted(() => {
  const mockSelectEq = vi.fn();
  const mockSelect = vi.fn(() => ({ eq: mockSelectEq }));

  const mockUpdateEq2 = vi.fn();
  const mockUpdateEq1 = vi.fn(() => ({ eq: mockUpdateEq2 }));
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq1 }));

  const mockFrom = vi.fn((table: string) => {
    if (table === 'gig_members') {
      return {
        select: mockSelect,
        update: mockUpdate,
      };
    }
    return {};
  });

  return { mockSelectEq, mockSelect, mockUpdateEq2, mockUpdateEq1, mockUpdate, mockFrom };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe('MemberList', () => {
  const defaultMembers = {
    'user-admin': { id: 'user-admin', role: 'admin' as const },
    'user-coadmin': { id: 'user-coadmin', role: 'co-admin' as const },
    'user-musician': { id: 'user-musician', role: 'musician' as const },
  };

  const sampleUserDetails = [
    {
      user_id: 'user-admin',
      users: { id: 'user-admin', display_name: 'Admin Alice', instrument: 'Drums' },
    },
    {
      user_id: 'user-coadmin',
      users: { id: 'user-coadmin', display_name: 'CoAdmin Bob', instrument: 'Keyboard' },
    },
    {
      user_id: 'user-musician',
      users: { id: 'user-musician', display_name: 'Musician Charlie', instrument: 'Guitar' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useGigStore.setState({
      members: { ...defaultMembers },
    });
    useAuthStore.setState({
      user: { id: 'user-admin', email: 'admin@test.com' } as any,
    });

    mockSelectEq.mockResolvedValue({
      data: sampleUserDetails,
      error: null,
    });
    mockUpdateEq2.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('renders member list with initials, names, instruments, and role badges', async () => {
    render(<MemberList gigId="gig-123" />);

    expect(screen.getByText('Band Members')).toBeInTheDocument();
    expect(screen.getByText('3 connected')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Admin Alice')).toBeInTheDocument();
      expect(screen.getByText('CoAdmin Bob')).toBeInTheDocument();
      expect(screen.getByText('Musician Charlie')).toBeInTheDocument();
    });

    expect(screen.getByText('Drums')).toBeInTheDocument();
    expect(screen.getByText('Keyboard')).toBeInTheDocument();
    expect(screen.getByText('Guitar')).toBeInTheDocument();

    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('co-admin')).toBeInTheDocument();
    expect(screen.getByText('musician')).toBeInTheDocument();
  });

  it('does not render promote or demote buttons when isAdmin is false or not provided', async () => {
    render(<MemberList gigId="gig-123" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByText('Musician Charlie')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /promote to co-admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /demote to musician/i })).not.toBeInTheDocument();
  });

  it('does not render promote or demote buttons for self or for primary admin', async () => {
    render(<MemberList gigId="gig-123" isAdmin={true} />);

    await waitFor(() => {
      expect(screen.getByText('Admin Alice')).toBeInTheDocument();
    });

    // Alice is user-admin (self AND admin role)
    // Only Charlie (musician) should have promote, Bob (co-admin) should have demote
    const promoteButtons = screen.queryAllByRole('button', { name: /promote to co-admin/i });
    const demoteButtons = screen.queryAllByRole('button', { name: /demote to musician/i });

    expect(promoteButtons).toHaveLength(1);
    expect(demoteButtons).toHaveLength(1);
  });

  it('renders promote button for musician and promotes on click', async () => {
    const user = userEvent.setup();
    const mockOnSend = vi.fn();

    render(<MemberList gigId="gig-123" isAdmin={true} onSend={mockOnSend} />);

    await waitFor(() => {
      expect(screen.getByText('Musician Charlie')).toBeInTheDocument();
    });

    const promoteButton = screen.getByRole('button', { name: /promote to co-admin/i });
    expect(promoteButton).toBeInTheDocument();
    expect(promoteButton).toHaveAttribute('title', 'Promote to co-admin');

    await user.click(promoteButton);

    expect(mockFrom).toHaveBeenCalledWith('gig_members');
    expect(mockUpdate).toHaveBeenCalledWith({ role: 'co-admin' });
    expect(mockUpdateEq1).toHaveBeenCalledWith('gig_id', 'gig-123');
    expect(mockUpdateEq2).toHaveBeenCalledWith('user_id', 'user-musician');

    expect(mockOnSend).toHaveBeenCalledWith({
      type: 'MEMBER_ROLE',
      userId: 'user-musician',
      role: 'co-admin',
      timestamp: expect.any(Number),
    });

    // Check zustand store updated
    expect(useGigStore.getState().members['user-musician'].role).toBe('co-admin');
  });

  it('renders demote button for co-admin and demotes on click', async () => {
    const user = userEvent.setup();
    const mockOnSend = vi.fn();

    render(<MemberList gigId="gig-123" isAdmin={true} onSend={mockOnSend} />);

    await waitFor(() => {
      expect(screen.getByText('CoAdmin Bob')).toBeInTheDocument();
    });

    const demoteButton = screen.getByRole('button', { name: /demote to musician/i });
    expect(demoteButton).toBeInTheDocument();
    expect(demoteButton).toHaveAttribute('title', 'Demote to musician');

    await user.click(demoteButton);

    expect(mockFrom).toHaveBeenCalledWith('gig_members');
    expect(mockUpdate).toHaveBeenCalledWith({ role: 'musician' });
    expect(mockUpdateEq1).toHaveBeenCalledWith('gig_id', 'gig-123');
    expect(mockUpdateEq2).toHaveBeenCalledWith('user_id', 'user-coadmin');

    expect(mockOnSend).toHaveBeenCalledWith({
      type: 'MEMBER_ROLE',
      userId: 'user-coadmin',
      role: 'musician',
      timestamp: expect.any(Number),
    });

    // Check zustand store updated
    expect(useGigStore.getState().members['user-coadmin'].role).toBe('musician');
  });

  it('handles missing onSend gracefully when promoting', async () => {
    const user = userEvent.setup();

    render(<MemberList gigId="gig-123" isAdmin={true} />);

    await waitFor(() => {
      expect(screen.getByText('Musician Charlie')).toBeInTheDocument();
    });

    const promoteButton = screen.getByRole('button', { name: /promote to co-admin/i });
    await user.click(promoteButton);

    expect(mockUpdate).toHaveBeenCalledWith({ role: 'co-admin' });
    expect(useGigStore.getState().members['user-musician'].role).toBe('co-admin');
  });

  it('falls back to User {id} when userDetails is missing', async () => {
    useGigStore.setState({
      members: {
        'anon-12345': { id: 'anon-12345', role: 'musician' },
      },
    });
    mockSelectEq.mockResolvedValue({
      data: [],
      error: null,
    });

    render(<MemberList gigId="gig-123" />);

    await waitFor(() => {
      expect(screen.getByText('User anon')).toBeInTheDocument();
    });
  });

  it('renders close button and calls onClose on click', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<MemberList gigId="gig-123" onClose={mockOnClose} />);

    const closeBtn = screen.getByRole('button', { name: /close band members/i });
    expect(closeBtn).toBeInTheDocument();

    await user.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not render close button when onClose is not provided', () => {
    render(<MemberList gigId="gig-123" />);
    expect(screen.queryByRole('button', { name: /close band members/i })).not.toBeInTheDocument();
  });

  it('loads members from gig_members table when useGigStore.members is initially empty', async () => {
    useGigStore.setState({
      members: {},
    });
    mockSelectEq.mockResolvedValue({
      data: sampleUserDetails,
      error: null,
    });

    render(<MemberList gigId="gig-123" />);

    await waitFor(() => {
      expect(screen.getByText('3 connected')).toBeInTheDocument();
      expect(screen.getByText('Admin Alice')).toBeInTheDocument();
      expect(screen.getByText('CoAdmin Bob')).toBeInTheDocument();
      expect(screen.getByText('Musician Charlie')).toBeInTheDocument();
    });
  });
});
