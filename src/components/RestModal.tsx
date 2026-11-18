import React, { useEffect, useState } from 'react';
import { t } from '../data/i18n';
import { haptics } from '../utils/haptics';
import { sfx } from '../utils/sound';
import { Modal } from './Modal';

interface RestModalProps {
  initialSeconds: number;
  onClose: () => void;
}

export const RestModal: React.FC<RestModalProps> = ({
  initialSeconds,
  onClose,
}) => {
  const [total, setTotal] = useState(initialSeconds);
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      sfx.bell();
      haptics.alert();
      const closeTimer = window.setTimeout(onClose, 850);
      return () => window.clearTimeout(closeTimer);
    }

    if (remaining <= 4) {
      sfx.tick();
    }

    const tickTimer = window.setTimeout(
      () => setRemaining((prev) => prev - 1),
      1000
    );
    return () => window.clearTimeout(tickTimer);
  }, [remaining, onClose]);

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - remaining / Math.max(1, total));

  return (
    <Modal
      label={t('Rest timer')}
      onClose={onClose}
      dismissOnBackdrop={false}
      widthClass="max-w-sm"
      contentClass="text-center p-6 sm:p-8"
    >
      <div className="mut text-sm mb-4">{t('Rest interval')}</div>
      <div
        className="surface-inset rounded-full mx-auto relative"
        style={{ width: 'min(220px, 60vw)', aspectRatio: '1' }}
      >
        <svg
          viewBox="0 0 220 220"
          className="w-full h-full"
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="var(--ac)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center mono text-5xl font-bold">
          {remaining}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-5 flex-wrap">
        <button
          type="button"
          className="btn mono text-xs"
          onClick={() => {
            sfx.pop();
            haptics.tap();
            setRemaining((prev) => Math.max(1, prev - 15));
          }}
        >
          -15{t('unit-s')}
        </button>
        {[15, 30, 45, 60].map((presetSec) => (
          <button
            key={presetSec}
            type="button"
            className={`btn mono text-xs ${total === presetSec ? 'btn-active' : ''}`}
            onClick={() => {
              sfx.pop();
              haptics.tap();
              setTotal(presetSec);
              setRemaining(presetSec);
            }}
          >
            {presetSec}
            {t('unit-s')}
          </button>
        ))}
        <button
          type="button"
          className="btn mono text-xs"
          onClick={() => {
            sfx.pop();
            haptics.tap();
            setRemaining((prev) => {
              const next = prev + 15;
              setTotal((currTotal) => Math.max(currTotal, next));
              return next;
            });
          }}
        >
          +15{t('unit-s')}
        </button>
      </div>

      <button
        type="button"
        className="btn btn-cta w-full mt-5"
        onClick={() => {
          sfx.whistle();
          haptics.tap();
          onClose();
        }}
      >
        {t('Skip rest')}
      </button>
    </Modal>
  );
};
