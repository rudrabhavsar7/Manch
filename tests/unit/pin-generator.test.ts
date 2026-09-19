import { describe, it, expect, vi } from 'vitest';
import { generatePin, formatPin, generateUniquePin } from '@/lib/utils/pin-generator';

describe('generatePin', () => {
  it('generates 4-digit string', () => {
    const pin = generatePin();
    expect(pin).toMatch(/^\d{4}$/);
  });

  it('generates different pins', () => {
    const pins = new Set(Array.from({ length: 100 }, () => generatePin()));
    expect(pins.size).toBeGreaterThan(50);
  });
});

describe('formatPin', () => {
  it('pads short pins', () => {
    expect(formatPin('42')).toBe('0042');
    expect(formatPin('7')).toBe('0007');
    expect(formatPin('')).toBe('0000');
  });

  it('keeps 4-digit pins as is', () => {
    expect(formatPin('1234')).toBe('1234');
    expect(formatPin('9999')).toBe('9999');
  });
});

describe('generateUniquePin', () => {
  it('returns pin when no collision is found', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      })),
    };

    const pin = await generateUniquePin(mockSupabase as any);
    expect(pin).toMatch(/^\d{4}$/);
    expect(mockSupabase.from).toHaveBeenCalledWith('gigs');
  });

  it('retries when collision occurs and returns new unique pin', async () => {
    let callCount = 0;
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                  return { data: { id: 'existing-gig' }, error: null };
                }
                return { data: null, error: null };
              }),
            })),
          })),
        })),
      })),
    };

    const pin = await generateUniquePin(mockSupabase as any);
    expect(pin).toMatch(/^\d{4}$/);
    expect(callCount).toBe(2);
  });

  it('throws error when max attempts reached', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-gig' }, error: null }),
            })),
          })),
        })),
      })),
    };

    await expect(generateUniquePin(mockSupabase as any)).rejects.toThrow(
      'Could not generate unique PIN after max attempts',
    );
  });
});
