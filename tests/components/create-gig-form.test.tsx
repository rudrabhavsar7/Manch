import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateGigForm } from '@/components/gigs/create-gig-form';
import { generateUniquePin } from '@/lib/utils/pin-generator';

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/utils/pin-generator', () => ({
  generatePin: vi.fn(() => '5678'),
  formatPin: vi.fn((pin: string) => pin.padStart(4, '0')),
  generateUniquePin: vi.fn().mockResolvedValue('5678'),
}));

const mockGetUser = vi.fn();
const mockGigsInsert = vi.fn();
const mockMembersInsert = vi.fn();
const mockSetlistsOrder = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === 'setlists') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: mockSetlistsOrder,
        })),
      })),
    };
  }
  if (table === 'gigs') {
    return {
      insert: mockGigsInsert,
    };
  }
  if (table === 'gig_members') {
    return {
      insert: mockMembersInsert,
    };
  }
  return {};
});

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

describe('CreateGigForm', () => {
  const sampleSetlists = [
    { id: 'setlist-1', name: 'Friday Night Set', owner_id: 'user-1' },
    { id: 'setlist-2', name: 'Acoustic Set', owner_id: 'user-1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'musician@band.com' } },
    });

    mockSetlistsOrder.mockResolvedValue({
      data: sampleSetlists,
      error: null,
    });

    mockGigsInsert.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'new-gig-123',
            name: 'Friday Night at Blue Frog',
            admin_id: 'user-1',
            setlist_id: 'setlist-1',
            pin: '5678',
            status: 'live',
          },
          error: null,
        }),
      }),
    }));

    mockMembersInsert.mockResolvedValue({ error: null });
  });

  it('renders form inputs and submit button', async () => {
    render(<CreateGigForm />);

    expect(screen.getByText('Create Gig')).toBeInTheDocument();
    expect(screen.getByLabelText(/gig name/i)).toBeInTheDocument();
    expect(await screen.findByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create & go live/i })).toBeInTheDocument();
  });

  it('displays empty state when user has no setlists', async () => {
    mockSetlistsOrder.mockResolvedValue({ data: [], error: null });

    render(<CreateGigForm />);

    expect(
      await screen.findByText(/no setlists found\. you need a setlist to create a gig\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create a setlist/i })).toHaveAttribute(
      'href',
      '/setlists/new',
    );
  });

  it('validates required name field', async () => {
    const user = userEvent.setup();
    render(<CreateGigForm />);

    await screen.findByText('Friday Night Set');

    const submitBtn = screen.getByRole('button', { name: /create & go live/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(mockGigsInsert).not.toHaveBeenCalled();
  });

  it('validates required setlist selection', async () => {
    const user = userEvent.setup();
    render(<CreateGigForm />);

    const nameInput = screen.getByLabelText(/gig name/i);
    await user.type(nameInput, 'Live Concert');

    const submitBtn = screen.getByRole('button', { name: /create & go live/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Select a setlist')).toBeInTheDocument();
    expect(mockGigsInsert).not.toHaveBeenCalled();
  });

  it('submits form, inserts gig and member, and navigates to live gig page', async () => {
    const user = userEvent.setup();
    render(<CreateGigForm />);

    const nameInput = screen.getByLabelText(/gig name/i);
    await user.type(nameInput, 'Friday Night at Blue Frog');

    // Select setlist
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);

    const option = await screen.findByRole('option', { name: 'Friday Night Set' });
    await user.click(option);

    const submitBtn = screen.getByRole('button', { name: /create & go live/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(generateUniquePin).toHaveBeenCalled();
      expect(mockGigsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Friday Night at Blue Frog',
          admin_id: 'user-1',
          setlist_id: 'setlist-1',
          pin: '5678',
          status: 'live',
        }),
      );
      expect(mockMembersInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          gig_id: 'new-gig-123',
          user_id: 'user-1',
          role: 'admin',
        }),
      );
      expect(mockPush).toHaveBeenCalledWith('/gigs/new-gig-123');
    });
  });

  it('displays error message if gig creation fails', async () => {
    const user = userEvent.setup();
    mockGigsInsert.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database insert failed' },
        }),
      }),
    }));

    render(<CreateGigForm />);

    const nameInput = screen.getByLabelText(/gig name/i);
    await user.type(nameInput, 'Fail Gig');

    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);

    const option = await screen.findByRole('option', { name: 'Friday Night Set' });
    await user.click(option);

    const submitBtn = screen.getByRole('button', { name: /create & go live/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Database insert failed')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
