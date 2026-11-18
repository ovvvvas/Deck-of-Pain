import React from 'react';
import { sfx } from '../utils/sound';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  minWidth?: number;
  onChange: (next: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  min,
  max,
  step = 5,
  label,
  unit = '',
  minWidth = 28,
  onChange,
}) => (
  <span className="flex items-center gap-1.5 sm:gap-2 shrink-0">
    <button
      type="button"
      className="btn !px-0 !min-w-[40px] !min-h-[40px] sm:!min-w-[44px] sm:!min-h-[44px]"
      aria-label={`Fewer ${label}`}
      disabled={value <= min}
      onClick={() => {
        sfx.pop();
        onChange(Math.max(min, value - step));
      }}
    >
      −
    </button>
    <span className="mono text-sm text-center" style={{ minWidth }}>
      {value}
      {unit}
    </span>
    <button
      type="button"
      className="btn !px-0 !min-w-[40px] !min-h-[40px] sm:!min-w-[44px] sm:!min-h-[44px]"
      aria-label={`More ${label}`}
      disabled={value >= max}
      onClick={() => {
        sfx.pop();
        onChange(Math.min(max, value + step));
      }}
    >
      +
    </button>
  </span>
);
