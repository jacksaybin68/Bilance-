'use client';

import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

export interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Replaces the default close button label. */
  closeLabel?: string;
}

/**
 * Accessible modal used by the landing/auth flows. Supports Escape, backdrop
 * click, background scroll locking and both light and dark themes.
 */
export function Popup({ isOpen, onClose, children, title, closeLabel }: PopupProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'popup-title' : undefined}
        onClick={(event) => event.stopPropagation()}
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:max-w-lg"
      >
        {title ? (
          <h2 id="popup-title" className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
        ) : null}

        <div className="space-y-4">{children}</div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {closeLabel ?? t('common.close')}
        </button>
      </div>
    </div>
  );
}