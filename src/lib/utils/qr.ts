export interface GigQRData {
  pin: string;
  gigId?: string;
}

export function generateGigQrData(pin: string, gigId?: string): string {
  return JSON.stringify({
    pin,
    ...(gigId ? { gigId } : {}),
  });
}

export function parseGigQrData(data: string): { pin?: string; gigId?: string } {
  if (!data || typeof data !== 'string') {
    return {};
  }

  const trimmed = data.trim();

  // Try parsing as JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const pin = parsed.pin ? String(parsed.pin).trim() : undefined;
      const gigId = parsed.gigId ? String(parsed.gigId).trim() : undefined;
      return { pin, gigId };
    }
  } catch {
    // Not JSON
  }

  // Check if it's a URL like /gigs/:id or /gigs/join?pin=1234
  try {
    const url = new URL(trimmed, 'https://manch.local');
    const pinParam = url.searchParams.get('pin');
    if (pinParam) {
      return { pin: pinParam };
    }
    const matchGig = url.pathname.match(/^\/gigs\/([a-zA-Z0-9_-]+)$/);
    if (matchGig && matchGig[1] !== 'new' && matchGig[1] !== 'join') {
      return { gigId: matchGig[1] };
    }
  } catch {
    // Not a valid URL
  }

  // If plain string, return as pin
  return { pin: trimmed };
}
