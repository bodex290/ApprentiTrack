import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ open, onClose, title, children }: ModalProps) => {
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
        className="w-full max-w-lg rounded-xl shadow-2xl"
        style={{ background: 'white', border: '1px solid #e2e8f0', maxHeight: '90vh', overflow: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
          <h2 className="font-semibold" style={{ fontSize: '18px', color: '#0f172a' }}>{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100"
          >
            <X size={18} style={{ color: '#64748b' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
