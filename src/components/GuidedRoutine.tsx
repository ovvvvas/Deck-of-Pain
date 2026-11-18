import React, { useEffect, useState } from 'react';
import { getAppLanguage, t } from '../data/i18n';
import type { GuidedStep } from '../types/workout';
import { sfx } from '../utils/sound';

interface GuidedRoutineProps {
  title: string;
  steps: GuidedStep[];
  secondsPerStep: number;
  onFinish: () => void;
}

export const GuidedRoutine: React.FC<GuidedRoutineProps> = ({
  title,
  steps,
  secondsPerStep,
  onFinish,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [remaining, setRemaining] = useState(secondsPerStep);
  const lang = getAppLanguage();

  const advance = () => {
    sfx.pop();
    if (stepIdx + 1 >= steps.length) {
      onFinish();
    } else {
      setStepIdx((prev) => prev + 1);
      setRemaining(secondsPerStep);
    }
  };

  useEffect(() => {
    if (remaining <= 0) {
      sfx.alert();
      if (stepIdx + 1 >= steps.length) {
        onFinish();
      } else {
        setStepIdx((prev) => prev + 1);
        setRemaining(secondsPerStep);
      }
      return;
    }

    if (remaining <= 3) {
      sfx.tick();
    }

    const timer = window.setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, stepIdx, steps.length, secondsPerStep, onFinish]);

  const currentStep = steps[stepIdx];
  const progressPct =
    ((stepIdx + (secondsPerStep - remaining) / secondsPerStep) / steps.length) *
    100;

  return (
    <div className="max-w-xl mx-auto p-4 md:p-10 min-h-[100dvh] flex flex-col justify-center">
      <div className="surface-card rounded-3xl p-6 sm:p-8 text-center">
        <div className="mut text-sm mb-1">
          {t(title)}
          {lang === 'fa' ? '، ' : ', '}
          {t('step')} {stepIdx + 1} {t('of')} {steps.length}
        </div>
        <h2 className="disp text-5xl font-black mb-2">{t(currentStep.n)}</h2>
        <p className="mut mb-6 text-sm sm:text-base">{t(currentStep.cue)}</p>
        <div className="mono text-7xl font-bold mb-6">{remaining}</div>
        <div className="progress-track mb-6">
          <i className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="grid gap-3">
          <button
            type="button"
            className="btn btn-cta !min-h-[52px]"
            onClick={advance}
          >
            {t(stepIdx + 1 >= steps.length ? 'Finish' : 'Next move')}
          </button>
          <button type="button" className="btn" onClick={onFinish}>
            {t(`Skip ${title.toLowerCase()}`)}
          </button>
        </div>
      </div>
    </div>
  );
};
