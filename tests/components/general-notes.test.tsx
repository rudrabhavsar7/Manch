import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GeneralNotes } from '@/components/live/general-notes';

const mockAnnotations = [
  { id: '1', line_number: null, content: 'General Note 1', color: '#fbbf24', user_id: 'u1', song_id: 's1', type: 'general' as const, created_at: '', updated_at: '' },
];

describe('GeneralNotes', () => {
  it('renders note count badge', () => {
    render(<GeneralNotes annotations={mockAnnotations} onAdd={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens sheet and renders notes', () => {
    render(<GeneralNotes annotations={mockAnnotations} onAdd={vi.fn()} onDelete={vi.fn()} />);
    
    const trigger = screen.getByRole('button', { name: /Notes/ });
    fireEvent.click(trigger);
    
    expect(screen.getByText('My Notes')).toBeInTheDocument();
    expect(screen.getByText('General Note 1')).toBeInTheDocument();
  });
});
