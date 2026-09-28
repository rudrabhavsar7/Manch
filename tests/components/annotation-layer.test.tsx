import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnnotationLayer } from '@/components/live/annotation-layer';

const mockAnnotations = [
  { id: '1', line_number: 1, content: 'Note 1', color: '#fbbf24', user_id: 'u1', song_id: 's1', type: 'inline' as const, created_at: '', updated_at: '' },
  { id: '2', line_number: 2, content: 'Note 2', color: '#ef4444', user_id: 'u1', song_id: 's1', type: 'inline' as const, created_at: '', updated_at: '' },
];

describe('AnnotationLayer', () => {
  it('renders annotations for the specific line', () => {
    render(<AnnotationLayer lineNumber={1} annotations={mockAnnotations} onAdd={vi.fn()} onDelete={vi.fn()} />);
    
    expect(screen.getByText('Note 1')).toBeInTheDocument();
    expect(screen.queryByText('Note 2')).not.toBeInTheDocument();
  });

  it('opens editor and calls onAdd', () => {
    const onAdd = vi.fn();
    render(<AnnotationLayer lineNumber={1} annotations={[]} onAdd={onAdd} onDelete={vi.fn()} />);
    
    const addButton = screen.getByTitle('Add note');
    fireEvent.click(addButton);

    const textarea = screen.getByPlaceholderText('Add your note...');
    fireEvent.change(textarea, { target: { value: 'New inline note' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(onAdd).toHaveBeenCalledWith('New inline note', '#fbbf24');
  });

  it('calls onDelete', () => {
    const onDelete = vi.fn();
    const { container } = render(<AnnotationLayer lineNumber={1} annotations={mockAnnotations} onAdd={vi.fn()} onDelete={onDelete} />);
    
    const deleteButton = screen.getAllByRole('button').find((b) => b.querySelector('.lucide-trash-2'));
    expect(deleteButton).toBeInTheDocument();
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(onDelete).toHaveBeenCalledWith('1');
    }
  });

  it('controls are visible on touch and hover-reveal only on hover-capable devices', () => {
    const { container } = render(
      <AnnotationLayer lineNumber={1} annotations={mockAnnotations} onAdd={vi.fn()} onDelete={vi.fn()} />,
    );

    const addButton = screen.getByTitle('Add note');
    const deleteButton = screen.getAllByRole('button').find((b) => b.querySelector('.lucide-trash-2'));

    for (const el of [addButton, deleteButton]) {
      expect(el).toBeTruthy();
      expect(el).toHaveClass('opacity-100');
      expect(el).toHaveClass('[@media(hover:hover)]:opacity-0');
      expect(el).toHaveClass('[@media(hover:hover)]:group-hover:opacity-100');
      expect(el).toHaveClass('transition-opacity');
    }

    expect(addButton).toHaveClass('[@media(hover:none)]:p-2.5');
    expect(deleteButton).toHaveClass('[@media(hover:none)]:p-2.5');
  });
});
