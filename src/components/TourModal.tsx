import React, { useState } from 'react';
import { t } from '../data/i18n';
import { TOUR_STEPS } from '../data/movements';
import { Modal } from './Modal';

interface TourModalProps {
  onClose: () => void;
}

export const TourModal: React.FC<TourModalProps> = ({ onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const current = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <Modal label={t('How it works')} onClose={onClose}>
      <div className="mut text-sm mb-2">
        {t('Step')} {stepIndex + 1} {t('of')} {TOUR_STEPS.length}
      </div>
      <h2 className="disp text-4xl font-black mb-3">{t(current.title)}</h2>
      <ul className="grid gap-2 mb-6">
        {current.bullets.map((bullet) => (
          <li
            key={bullet}
            className="surface-inset rounded-xl px-4 py-3 text-sm"
          >
            {t(bullet)}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <button type="button" className="btn" onClick={onClose}>
          {t('Skip')}
        </button>
        <span className="flex-1" />
        {stepIndex > 0 && (
          <button
            type="button"
            className="btn"
            onClick={() => setStepIndex((i) => i - 1)}
          >
            {t('Back')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-cta"
          onClick={() => (isLast ? onClose() : setStepIndex((i) => i + 1))}
        >
          {t(isLast ? 'Start training' : 'Next')}
        </button>
      </div>
    </Modal>
  );
};
