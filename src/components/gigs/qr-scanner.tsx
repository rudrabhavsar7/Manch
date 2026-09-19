'use client';

import { useEffect, useRef, useState, useId } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const uniqueId = useId().replace(/:/g, '');
  const containerId = `qr-reader-${uniqueId}`;

  async function startScanning() {
    setErrorMessage(null);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }
      const scanner = scannerRef.current;
      setScanning(true);

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {},
      );
    } catch (err: unknown) {
      setScanning(false);
      const message = err instanceof Error ? err.message : 'Unable to access camera. Please allow camera permissions.';
      setErrorMessage(message);
    }
  }

  async function stopScanning() {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors if scanner already stopped
      } finally {
        setScanning(false);
      }
    } else {
      setScanning(false);
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        id={containerId}
        data-testid="qr-scanner-container"
        className="w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-black/20 min-h-[250px] flex items-center justify-center border border-stageBorder"
      >
        {!scanning && (
          <p className="text-sm text-textSecondary text-center p-4">
            Camera is inactive. Click below to start scanning.
          </p>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 text-sm text-stageDestructive justify-center">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={scanning ? stopScanning : startScanning}
        className="w-full border-stageBorder text-textPrimary hover:bg-elevated"
      >
        {scanning ? (
          <>
            <CameraOff className="mr-2 h-4 w-4" /> Stop Scanner
          </>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" /> Scan QR Code
          </>
        )}
      </Button>
    </div>
  );
}
