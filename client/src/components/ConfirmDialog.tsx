import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: string;
  loading?: boolean;
}

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  confirmColor = '#ef4444',
  loading = false,
}: ConfirmDialogProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl"
        style={{ background: 'white', border: '1px solid #e2e8f0' }}
      >
        {/* Icon + Content */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: '#fef2f2' }}
          >
            <AlertTriangle size={28} style={{ color: '#ef4444' }} />
          </div>
          <h3 className="font-semibold mb-2" style={{ fontSize: '18px', color: '#0f172a' }}>
            {title}
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div
          className="px-6 py-4 flex gap-3"
          style={{ borderTop: '1px solid #f1f5f9' }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200"
            style={{
              fontSize: '14px',
              color: '#475569',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200"
            style={{
              fontSize: '14px',
              color: 'white',
              background: confirmColor,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
