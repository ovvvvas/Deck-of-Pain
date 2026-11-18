import React from 'react';
import type { Card } from '../types/workout';
import { isRedSuit } from '../utils/deck';
import { SuitGlyph } from './SuitIcon';

interface CardFaceProps {
  card: Card;
  moveName: string;
}

export const CardFace: React.FC<CardFaceProps> = ({ card, moveName }) => {
  const isRed = isRedSuit(card.s);
  const cornerContent = (
    <>
      <b className="disp">{card.r}</b>
      <span>
        <SuitGlyph suit={card.s} />
      </span>
    </>
  );

  const jokerTextColor = card.j ? { color: 'var(--joker-ink)' } : undefined;

  return (
    <>
      {card.j && (
        <div
          className="card-corner disp font-black tracking-widest text-[9cqw]"
          style={{ color: 'var(--joker-ink)' }}
        >
          JOKER
        </div>
      )}
      {!card.j && (
        <div className={`card-corner ${isRed ? 'red' : ''}`}>{cornerContent}</div>
      )}
      <div className="card-center relative">
        {card.j && (
          <div className="mb-[2.5cqw] pointer-events-none">
            <SuitGlyph suit={card.s} height="28cqw" />
          </div>
        )}
        <div
          className={`reps-num disp ${isRed ? 'red' : ''}`}
          style={jokerTextColor}
        >
          {card.reps}
        </div>
        <div className="move-name" dir="auto" style={jokerTextColor}>
          {moveName}
        </div>
      </div>
      {card.j && (
        <div
          className="card-corner br disp font-black tracking-widest text-[9cqw]"
          style={{ color: 'var(--joker-ink)' }}
        >
          JOKER
        </div>
      )}
      {!card.j && (
        <div className={`card-corner br ${isRed ? 'red' : ''}`}>
          {cornerContent}
        </div>
      )}
    </>
  );
};
