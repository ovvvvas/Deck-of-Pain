import React, { useEffect, useRef } from 'react';

interface ModalProps {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
  contentClass?: string;
  isAlert?: boolean;
  dismissOnBackdrop?: boolean;
  backdropOpacity?: number;
}

export const Modal: React.FC<ModalProps> = ({
  label,
  onClose,
  children,
  widthClass = 'max-w-md',
  contentClass = 'p-5 sm:p-6',
  isAlert = false,
  dismissOnBackdrop = true,
  backdropOpacity = 0.45,
}) => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: `rgba(10, 12, 18, ${backdropOpacity})`,
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div
        role={isAlert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={label}
        className={`surface-card rounded-3xl w-full overflow-y-auto overscroll-contain ${widthClass} ${contentClass}`}
        style={{ maxHeight: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
