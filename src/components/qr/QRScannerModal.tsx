'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { extractTokenFromQR, validateToken, CONTEXT_DISPLAY } from '@/lib/token-validation';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ScannerState = 'idle' | 'scanning' | 'processing' | 'error' | 'success';

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const router = useRouter();
  const [state, setState] = useState<ScannerState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      setState('scanning');
      setErrorMessage(null);

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Ignore scan failures
        }
      );
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setErrorMessage(err.message || 'ไม่สามารถเปิดกล้องได้');
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setState('idle');
      setErrorMessage(null);
      setScannedResult(null);
      // Start scanner after a short delay
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  async function handleScanSuccess(decodedText: string) {
    // Stop scanner immediately
    await stopScanner();
    setScannedResult(decodedText);
    setState('processing');

    try {
      // Extract token UUID from the scanned QR string
      const tokenId = extractTokenFromQR(decodedText);

      if (!tokenId) {
        setErrorMessage('ไม่พบ QR Token ที่ถูกต้อง');
        setState('error');
        return;
      }

      // Validate token via centralized API (4-layer security check)
      const result = await validateToken(tokenId);

      if (!result.valid || !result.token) {
        setErrorMessage(result.error?.message_th || 'QR Token ไม่ถูกต้อง');
        setState('error');
        return;
      }

      // Show context info briefly before navigating
      const ctx = CONTEXT_DISPLAY[result.token.context];
      setScannedResult(`${ctx.icon} ${ctx.label}`);
      setState('success');

      // Navigate to the adopt page with the token
      setTimeout(() => {
        onClose();
        router.push(`/adopt/${tokenId}`);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถประมวลผล QR Code ได้');
      setState('error');
    }
  }

  function handleClose() {
    stopScanner();
    onClose();
  }

  function handleRetry() {
    setErrorMessage(null);
    setScannedResult(null);
    startScanner();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl overflow-hidden max-w-md w-full mx-4 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📷</span>
            <div>
              <h2 className="font-bold text-gray-900">สแกน QR Code</h2>
              <p className="text-xs text-gray-500">Meow World QR Token</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Scanner Area */}
        <div className="relative aspect-square bg-gray-900">
          {/* QR Reader Container */}
          <div 
            ref={containerRef}
            id="qr-reader"
            className="w-full h-full"
          />

          {/* Scanning Overlay */}
          {state === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner markers */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />
              </div>
              
              {/* Scan line animation */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-0.5 bg-orange-500 animate-pulse" />
            </div>
          )}

          {/* Processing Overlay */}
          {state === 'processing' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3 animate-spin">⏳</div>
                <p className="text-white font-medium">กำลังประมวลผล...</p>
              </div>
            </div>
          )}

          {/* Success Overlay */}
          {state === 'success' && (
            <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-3 animate-bounce">✅</div>
                <p className="text-white font-bold text-lg">พบ QR Token!</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {state === 'error' && (
            <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-3">❌</div>
                <p className="text-white font-bold mb-2">เกิดข้อผิดพลาด</p>
                <p className="text-white/80 text-sm px-4">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Idle State */}
          {state === 'idle' && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-3">📷</div>
                <p className="text-white/80">กำลังเปิดกล้อง...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50">
          {state === 'scanning' && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                ชี้กล้องไปที่ QR Code ของ Meow World
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition"
              >
                ยกเลิก
              </button>
            </div>
          )}

          {state === 'error' && (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {state === 'processing' && scannedResult && (
            <div className="text-center">
              <p className="text-xs text-gray-500 truncate">
                Token: {scannedResult.slice(0, 30)}...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
