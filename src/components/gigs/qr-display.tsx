'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRDisplay({ value, size = 256, className }: QRDisplayProps) {
  return (
    <div
      data-testid="qr-display"
      className={`flex flex-col items-center justify-center p-6 bg-white rounded-xl ${className ?? ''}`.trim()}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        aria-label="Gig QR Code"
        role="img"
      />
    </div>
  );
}
