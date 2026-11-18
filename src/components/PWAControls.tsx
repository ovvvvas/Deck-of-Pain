import React, { useState } from 'react';
import { Download, Share, WifiOff } from 'lucide-react';
import { t } from '../data/i18n';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Modal } from './Modal';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="btn whitespace-nowrap shrink-0 px-3 text-xs sm:text-sm"
        aria-label={t('Install App')}
      >
        <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">{t('Install App')}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="btn whitespace-nowrap shrink-0 px-3 text-xs sm:text-sm"
          aria-label={t('Install on iOS')}
        >
          <Share className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">{t('Install on iOS')}</span>
        </button>

        {showIOSGuide && (
          <Modal
            label={t('Install on iPhone / iPad')}
            onClose={() => setShowIOSGuide(false)}
            widthClass="max-w-sm"
          >
            <h3 className="text-lg font-bold mb-2">
              {t('Install on iPhone / iPad')}
            </h3>
            <p className="text-sm mut mb-5 leading-relaxed">
              1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
              <br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="btn btn-cta w-full"
            >
              {t('Close')}
            </button>
          </Modal>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold surface-card"
      style={{ borderColor: 'var(--ac)' }}
    >
      <WifiOff
        className="w-3.5 h-3.5 shrink-0"
        style={{ color: 'var(--ac)' }}
        aria-hidden="true"
      />
      <span>{t('Offline Mode — Working from local cache')}</span>
    </div>
  );
};
