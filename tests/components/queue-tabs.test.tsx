import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueueTabs } from '@/components/live/queue-tabs';
import type { QueueItem } from '@/stores/gig-store';

const items: QueueItem[] = [
  { id: 'q1', setlistId: 'sl-1', name: 'Opening' },
  { id: 'q2', setlistId: 'sl-2', name: 'Timli Set' },
  { id: 'q3', setlistId: 'sl-3', name: 'Encore' },
];

const baseProps = {
  items,
  activeSetlistId: 'sl-1',
  onSwitch: vi.fn(),
  onRemove: vi.fn(),
  onAdd: vi.fn(),
};

describe('QueueTabs', () => {
  it('renders one tab per queue item', () => {
    render(<QueueTabs {...baseProps} isAdmin={true} />);
    expect(screen.getByRole('button', { name: 'Opening' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Timli Set' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encore' })).toBeInTheDocument();
  });

  it('switches setlist when an inactive tab is clicked', () => {
    render(<QueueTabs {...baseProps} isAdmin={true} />);
    fireEvent.click(screen.getByRole('button', { name: 'Timli Set' }));
    expect(baseProps.onSwitch).toHaveBeenCalledWith(items[1]);
  });

  it('does not switch when the active tab is clicked', () => {
    render(<QueueTabs {...baseProps} isAdmin={true} />);
    fireEvent.click(screen.getByRole('button', { name: 'Opening' }));
    expect(baseProps.onSwitch).not.toHaveBeenCalled();
  });

  it('shows add button for admins and calls onAdd', () => {
    render(<QueueTabs {...baseProps} isAdmin={true} />);
    const add = screen.getByRole('button', { name: /add setlist/i });
    fireEvent.click(add);
    expect(baseProps.onAdd).toHaveBeenCalledTimes(1);
  });

  it('removes a non-active tab via its remove button', () => {
    render(<QueueTabs {...baseProps} isAdmin={true} />);
    fireEvent.click(screen.getByRole('button', { name: /remove encore/i }));
    expect(baseProps.onRemove).toHaveBeenCalledWith(items[2]);
    expect(screen.queryByRole('button', { name: /remove opening/i })).not.toBeInTheDocument();
  });

  it('renders nothing for non-admins', () => {
    const { container } = render(<QueueTabs {...baseProps} isAdmin={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});

