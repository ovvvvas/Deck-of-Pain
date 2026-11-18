import React from 'react';
import { SUITS, isRedSuit } from '../utils/deck';

export const JokerIcon: React.FC<{ height?: string }> = ({
  height = '1.25em',
}) => (
  <svg
    viewBox="0 0 64 64"
    role="img"
    aria-label="Joker"
    style={{
      height,
      width: height,
      display: 'inline-block',
      verticalAlign: '-0.18em',
      color: 'var(--joker-ink)',
      flexShrink: 0,
    }}
  >
    <path
      d="M16 42C12 31 9 23 12 19c4-1 10 4 13 11 2-8 4.5-14 7-17 2.5 3 5 9 7 17 3-7 9-12 13-11 3 4 0 12-4 23H16z"
      fill="currentColor"
    />
    <rect
      x="15"
      y="46.5"
      width="34"
      height="5.5"
      rx="2.75"
      fill="currentColor"
    />
    <circle cx="9.5" cy="15.5" r="3.8" fill="currentColor" />
    <circle cx="32" cy="8.5" r="3.8" fill="currentColor" />
    <circle cx="54.5" cy="15.5" r="3.8" fill="currentColor" />
  </svg>
);

export const SuitGlyph: React.FC<{ suit: number; height?: string }> = ({
  suit,
  height,
}) => {
  if (suit >= 4) {
    return (
      <span className="inline-flex items-center justify-center">
        <JokerIcon height={height} />
      </span>
    );
  }

  return (
    <span className={isRedSuit(suit) ? 'red' : ''} aria-hidden="true">
      {SUITS[suit]}
    </span>
  );
};
