import React from 'react';
import { t } from '../data/i18n';
import { MOVEMENT_ALTS, MOVEMENT_CUES } from '../data/movements';
import type { Preset } from '../types/workout';
import { Modal } from './Modal';
import { SuitGlyph } from './SuitIcon';

interface FormGuideModalProps {
  preset: Preset;
  onClose: () => void;
}

export const FormGuideModal: React.FC<FormGuideModalProps> = ({
  preset,
  onClose,
}) => {
  const j1Active = preset.jrs ? preset.jrs[0] > 0 : (preset.jr ?? 50) > 0;
  const j2Active = preset.jrs ? preset.jrs[1] > 0 : (preset.jr ?? 50) > 0;
  const j1Move = preset.jokers?.[0] || preset.joker || 'Burpees';
  const j2Move = preset.jokers?.[1] || preset.jokers?.[0] || preset.joker || 'Jump Squats';

  const items: { move: string; suit: number }[] = preset.ex.map((move, idx) => ({
    move,
    suit: idx,
  }));
  if (j1Active && j1Move) {
    items.push({ move: j1Move, suit: 4 });
  }
  if (j2Active && j2Move && (!j1Active || j2Move !== j1Move)) {
    items.push({ move: j2Move, suit: 5 });
  }

  return (
    <Modal label={t('Technique standards')} onClose={onClose}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{t('Technique standards')}</h2>
        <button type="button" className="btn" onClick={onClose}>
          {t('Close')}
        </button>
      </div>

      <div className="grid gap-3">
        {items.map(({ move, suit }, idx) => (
          <div key={`${move}-${idx}`} className="surface-inset rounded-2xl p-4">
            <div className="font-bold flex items-center gap-2">
              <SuitGlyph suit={suit} />
              <span>{t(move)}</span>
            </div>
            <p className="mut text-sm mt-1">
              {MOVEMENT_CUES[move] ||
                'Full range of motion, controlled tempo, no half reps.'}
            </p>
            {MOVEMENT_ALTS[move] && (
              <p className="text-sm mt-2">
                <strong>{t('Easier or no equipment:')}</strong>{' '}
                {MOVEMENT_ALTS[move]}
              </p>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
};
