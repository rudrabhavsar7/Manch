import { describe, it, expect } from 'vitest';
import { generateGigQrData, parseGigQrData } from '@/lib/utils/qr';

describe('qr utils', () => {
  describe('generateGigQrData', () => {
    it('generates JSON string with pin', () => {
      const result = generateGigQrData('1234');
      expect(JSON.parse(result)).toEqual({ pin: '1234' });
    });

    it('generates JSON string with pin and gigId', () => {
      const result = generateGigQrData('5678', 'gig-abc');
      expect(JSON.parse(result)).toEqual({ pin: '5678', gigId: 'gig-abc' });
    });
  });

  describe('parseGigQrData', () => {
    it('parses JSON formatted string with pin and gigId', () => {
      const input = JSON.stringify({ pin: '4321', gigId: 'gig-xyz' });
      const parsed = parseGigQrData(input);
      expect(parsed).toEqual({ pin: '4321', gigId: 'gig-xyz' });
    });

    it('parses JSON formatted string with only pin', () => {
      const input = JSON.stringify({ pin: '9876' });
      const parsed = parseGigQrData(input);
      expect(parsed).toEqual({ pin: '9876', gigId: undefined });
    });

    it('parses 4-digit numeric string as pin', () => {
      const parsed = parseGigQrData('2468');
      expect(parsed).toEqual({ pin: '2468' });
    });

    it('parses URL with pin query parameter', () => {
      const parsed = parseGigQrData('https://manch.live/gigs/join?pin=1357');
      expect(parsed).toEqual({ pin: '1357' });
    });

    it('parses URL with direct gig ID path', () => {
      const parsed = parseGigQrData('https://manch.live/gigs/gig-target-456');
      expect(parsed).toEqual({ gigId: 'gig-target-456' });
    });

    it('returns empty object for empty or invalid input', () => {
      expect(parseGigQrData('')).toEqual({});
      expect(parseGigQrData(null as any)).toEqual({});
    });
  });
});
