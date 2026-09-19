import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnnotationEditor } from '@/components/live/annotation-editor';

describe('AnnotationEditor', () => {
  it('calls onSave with content and color when save is clicked', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<AnnotationEditor onSave={onSave} onCancel={onCancel} />);

    const textarea = screen.getByPlaceholderText('Add your note...');
    fireEvent.change(textarea, { target: { value: 'New note' } });

    // Click the red color button
    const redButton = screen.getByTitle('Red');
    fireEvent.click(redButton);

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('New note', '#ef4444');
  });

  it('calls onCancel when cancel is clicked', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<AnnotationEditor onSave={onSave} onCancel={onCancel} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });
});
