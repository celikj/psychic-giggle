import { useEffect, useRef, useState } from 'react';
import { X, ScanBarcode, Keyboard } from 'lucide-react';
import { hapticWarning } from '../lib/haptics';

interface Props {
  title: string;
  subtitle: string;
  /** When set, only this exact code is accepted (verify mode). */
  expectedCode?: string;
  onResult: (code: string) => void;
  onClose: () => void;
}

/**
 * Full-screen camera barcode scanner. Decoding runs on-device via zxing
 * (lazy-loaded so it stays out of the initial bundle). If the camera is
 * unavailable or permission is denied, falls back to typing the code printed
 * on the item — still requires physically reading it.
 */
export default function BarcodeScanner({ title, subtitle, expectedCode, onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handled = useRef(false);
  const [cameraError, setCameraError] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const mismatchTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleCode = (code: string) => {
    const trimmed = code.trim();
    if (handled.current || !trimmed) return;
    if (expectedCode && trimmed !== expectedCode) {
      hapticWarning();
      setMismatch(true);
      clearTimeout(mismatchTimer.current);
      mismatchTimer.current = setTimeout(() => setMismatch(false), 2500);
      return;
    }
    handled.current = true;
    onResult(trimmed);
  };

  useEffect(() => {
    let controls: { stop(): void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        if (!videoRef.current || cancelled) return;
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, result => {
          if (result) handleCode(result.getText());
        });
        if (cancelled) controls.stop();
      } catch {
        if (!cancelled) {
          setCameraError(true);
          setManual(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
      clearTimeout(mismatchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* Camera */}
      {!cameraError && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Overlay */}
      <div className="relative flex-1 flex flex-col" style={{ background: cameraError ? 'transparent' : 'rgba(10,10,15,0.35)' }}>
        <div className="flex items-start justify-between px-5" style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}>
          <div className="pt-2">
            <h2 className="text-lg font-bold text-white drop-shadow">{title}</h2>
            <p className="text-xs text-white/70 drop-shadow mt-0.5 max-w-[240px]">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close scanner"
            className="p-2.5 mt-1 rounded-xl bg-black/40 backdrop-blur active:scale-90 transition-transform"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Viewfinder */}
        {!cameraError && (
          <div className="flex-1 flex items-center justify-center px-10">
            <div
              className={`w-full max-w-[280px] aspect-[3/2] rounded-2xl border-2 transition-colors ${
                mismatch ? 'border-red-400' : 'border-white/70'
              }`}
              style={{ boxShadow: '0 0 0 9999px rgba(10,10,15,0.35)' }}
            />
          </div>
        )}

        {/* Status + actions */}
        <div className="px-6 space-y-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 28px)' }}>
          {mismatch && (
            <div className="mx-auto max-w-xs text-center bg-red-500/20 border border-red-400/40 backdrop-blur rounded-xl px-4 py-2.5 text-sm font-semibold text-red-300">
              That's not the registered code — find the right item.
            </div>
          )}
          {cameraError && (
            <div className="flex-1 flex flex-col items-center justify-center text-center pt-16 pb-8">
              <ScanBarcode className="w-10 h-10 text-white/30 mb-3" />
              <p className="text-white/70 text-sm font-semibold">Camera unavailable</p>
              <p className="text-white/40 text-xs mt-1 max-w-[260px] leading-relaxed">
                Allow camera access in Settings, or type the code printed on the item below.
              </p>
            </div>
          )}

          {manual ? (
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCode(manualCode)}
                placeholder="Type the code on the item…"
                className="flex-1 bg-white/10 backdrop-blur border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 outline-none"
              />
              <button
                onClick={() => handleCode(manualCode)}
                disabled={!manualCode.trim()}
                className="px-5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold disabled:opacity-30"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setManual(true)}
              className="mx-auto flex items-center gap-1.5 text-xs font-medium text-white/60 bg-black/40 backdrop-blur px-3.5 py-2 rounded-xl"
            >
              <Keyboard className="w-3.5 h-3.5" /> Enter code manually
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
