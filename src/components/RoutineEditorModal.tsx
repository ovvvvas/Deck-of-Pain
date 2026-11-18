import React, { useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { t } from '../data/i18n';
import { ALL_MOVEMENTS, MOVEMENT_BANK } from '../data/movements';
import { PROTOCOL_TYPES } from '../data/presets';
import type { Preset } from '../types/workout';
import { fullDeckReps } from '../utils/deck';
import { sfx } from '../utils/sound';
import { Modal } from './Modal';
import { MovementOptions } from './MovementOptions';
import { Stepper } from './Stepper';
import { SuitGlyph } from './SuitIcon';

interface RoutineEditorModalProps {
  preset: Preset;
  isNew?: boolean;
  favoriteMovements: string[];
  onToggleFavoriteMovement: (move: string) => void;
  onSave: (patch: Partial<Preset>) => void;
  onReset: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const RoutineEditorModal: React.FC<RoutineEditorModalProps> = ({
  preset,
  isNew = false,
  favoriteMovements,
  onToggleFavoriteMovement,
  onSave,
  onReset,
  onDelete,
  onClose,
}) => {
  const isCustom = preset.id.startsWith('c');
  const [name, setName] = useState(preset.name);
  const [cat, setCat] = useState<string>(
    (PROTOCOL_TYPES as readonly string[]).includes(preset.cat)
      ? preset.cat
      : 'Custom'
  );
  const [exercises, setExercises] = useState<Preset['ex']>([...preset.ex]);

  const [joker1Active, setJoker1Active] = useState<boolean>(
    preset.jrs ? preset.jrs[0] > 0 : (preset.jr ?? 50) > 0
  );
  const [joker1Move, setJoker1Move] = useState<string>(
    preset.jokers?.[0] || preset.joker || 'Burpees'
  );
  const [joker1Reps, setJoker1Reps] = useState<number>(
    preset.jrs?.[0] && preset.jrs[0] > 0
      ? preset.jrs[0]
      : preset.jr && preset.jr > 0
      ? Math.min(50, preset.jr)
      : 40
  );

  const [joker2Active, setJoker2Active] = useState<boolean>(
    preset.jrs ? preset.jrs[1] > 0 : (preset.jr ?? 50) > 0
  );
  const [joker2Move, setJoker2Move] = useState<string>(
    preset.jokers?.[1] || preset.jokers?.[0] || preset.joker || 'Jump Squats'
  );
  const [joker2Reps, setJoker2Reps] = useState<number>(
    preset.jrs?.[1] && preset.jrs[1] > 0
      ? preset.jrs[1]
      : preset.jr && preset.jr > 0
      ? Math.min(50, preset.jr)
      : 40
  );

  const [restInput, setRestInput] = useState(String(preset.rest));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFavPicker, setShowFavPicker] = useState(false);

  const projectedTotal = fullDeckReps({
    scale: 1,
    jrs: [
      joker1Active ? joker1Reps : 0,
      joker2Active ? joker2Reps : 0,
    ],
  });

  const favCount = favoriteMovements.filter((m) =>
    ALL_MOVEMENTS.includes(m)
  ).length;

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-muted)',
    color: 'var(--tx)',
    minHeight: 44,
    border: '1px solid var(--border)',
  };

  const renderStarToggle = (move: string) => {
    const isStarred = favoriteMovements.includes(move);
    return (
      <button
        type="button"
        className={`btn !min-h-[44px] !min-w-[44px] !px-0 shrink-0 ${
          isStarred ? 'btn-active' : ''
        }`}
        aria-pressed={isStarred}
        aria-label={`${t(isStarred ? 'Unstar movement' : 'Star movement')}: ${t(move)}`}
        title={t(isStarred ? 'Unstar movement' : 'Star movement')}
        onClick={() => {
          sfx.pop();
          onToggleFavoriteMovement(move);
        }}
      >
        <Star
          className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`}
          aria-hidden="true"
        />
      </button>
    );
  };

  return (
    <Modal
      label={t(isNew ? 'New routine' : 'Edit routine')}
      onClose={onClose}
      dismissOnBackdrop={false}
    >
      <h2 className="text-lg font-bold mb-3">
        {t(isNew ? 'New routine' : 'Edit routine')}
      </h2>

      {isCustom && (
        <>
          <label className="mut text-xs block mb-3">
            {t('Name')}
            <input
              className="rounded-xl px-3 w-full mt-1"
              style={inputStyle}
              value={name}
              maxLength={28}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="mb-3">
            <div className="mut text-xs mb-1.5">{t('Protocol type')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PROTOCOL_TYPES.map((typeOption) => (
                <button
                  key={typeOption}
                  type="button"
                  aria-pressed={cat === typeOption}
                  className={`btn !min-h-[38px] !min-w-0 !px-2 text-xs whitespace-nowrap truncate ${
                    cat === typeOption ? 'btn-active' : ''
                  }`}
                  onClick={() => setCat(typeOption)}
                >
                  {t(typeOption)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Favorite Movements Quick Manager */}
      <div className="surface-inset rounded-2xl p-3 mb-3">
        <button
          type="button"
          className="flex items-center justify-between gap-2 w-full text-start"
          aria-expanded={showFavPicker}
          onClick={() => {
            sfx.pop();
            setShowFavPicker((prev) => !prev);
          }}
        >
          <span className="flex items-center gap-2 text-xs font-semibold">
            <Star
              className="w-3.5 h-3.5 fill-current shrink-0"
              style={{ color: 'var(--ac)' }}
              aria-hidden="true"
            />
            <span>
              {t('Favorite movements')} ({favCount})
            </span>
          </span>
          <ChevronDown
            className={`w-4 h-4 mut shrink-0 transition-transform ${
              showFavPicker ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {showFavPicker && (
          <div
            className="mt-2.5 pt-2.5 border-t space-y-2.5 max-h-48 overflow-y-auto pe-1"
            style={{ borderColor: 'var(--border)' }}
          >
            {Object.entries(MOVEMENT_BANK).map(([group, items]) => (
              <div key={group}>
                <div className="mut text-[11px] font-semibold uppercase tracking-wider mb-1">
                  {t(group)}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((item) => {
                    const active = favoriteMovements.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={active}
                        className={`btn !min-h-[36px] !min-w-0 !px-2.5 justify-start text-xs truncate ${
                          active ? 'btn-active' : ''
                        }`}
                        onClick={() => {
                          sfx.pop();
                          onToggleFavoriteMovement(item);
                        }}
                      >
                        <Star
                          className={`w-3 h-3 shrink-0 ${
                            active ? 'fill-current' : ''
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{t(item)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mut text-xs mb-2">
        {t('One movement per suit, picked from the movement bank.')}
      </p>

      {exercises.map((move, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-2.5">
          <span className="w-6 text-xl text-center shrink-0">
            <SuitGlyph suit={idx} />
          </span>
          <select
            aria-label={`${t('Movements')} ${idx + 1}`}
            className="rounded-xl px-3 w-full min-w-0 text-sm"
            style={inputStyle}
            value={move}
            onChange={(e) => {
              const next = [...exercises] as Preset['ex'];
              next[idx] = e.target.value;
              setExercises(next);
            }}
          >
            <MovementOptions
              current={move}
              favoriteMovements={favoriteMovements}
              includeGear
            />
          </select>
          {renderStarToggle(move)}
        </div>
      ))}

      <div className="surface-inset rounded-2xl p-3 mb-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium flex items-center gap-2">
            <SuitGlyph suit={4} />
            <span>{t('Jokers (2 cards)')}</span>
          </span>
        </div>

        {/* Joker 1 */}
        <div className="border-t pt-2.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold">{t('Joker Card 1')}</span>
            <button
              type="button"
              className={`btn !min-h-[36px] text-xs px-3 ${joker1Active ? 'btn-active' : ''}`}
              aria-pressed={joker1Active}
              onClick={() => setJoker1Active(!joker1Active)}
            >
              {t(joker1Active ? 'On' : 'Off')}
            </button>
          </div>
          {joker1Active && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select
                  className="rounded-xl px-3 w-full min-w-0 text-sm"
                  style={inputStyle}
                  value={joker1Move}
                  aria-label={t('Joker 1 movement')}
                  onChange={(e) => setJoker1Move(e.target.value)}
                >
                  <MovementOptions
                    current={joker1Move}
                    favoriteMovements={favoriteMovements}
                    includeGear
                  />
                </select>
                {renderStarToggle(joker1Move)}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="mut text-xs">{t('Reps, 20 to 50')}</span>
                <Stepper
                  value={joker1Reps}
                  min={20}
                  max={50}
                  label="joker 1 reps"
                  onChange={setJoker1Reps}
                />
              </div>
            </div>
          )}
        </div>

        {/* Joker 2 */}
        <div className="border-t pt-2.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold">{t('Joker Card 2')}</span>
            <button
              type="button"
              className={`btn !min-h-[36px] text-xs px-3 ${joker2Active ? 'btn-active' : ''}`}
              aria-pressed={joker2Active}
              onClick={() => setJoker2Active(!joker2Active)}
            >
              {t(joker2Active ? 'On' : 'Off')}
            </button>
          </div>
          {joker2Active && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select
                  className="rounded-xl px-3 w-full min-w-0 text-sm"
                  style={inputStyle}
                  value={joker2Move}
                  aria-label={t('Joker 2 movement')}
                  onChange={(e) => setJoker2Move(e.target.value)}
                >
                  <MovementOptions
                    current={joker2Move}
                    favoriteMovements={favoriteMovements}
                    includeGear
                  />
                </select>
                {renderStarToggle(joker2Move)}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="mut text-xs">{t('Reps, 20 to 50')}</span>
                <Stepper
                  value={joker2Reps}
                  min={20}
                  max={50}
                  label="joker 2 reps"
                  onChange={setJoker2Reps}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-2">
        <label className="mut text-xs min-w-0 block">
          {t('Rest (s)')}
          <input
            type="number"
            min={5}
            max={300}
            className="rounded-xl px-3 w-full mt-1"
            style={inputStyle}
            value={restInput}
            onChange={(e) => setRestInput(e.target.value)}
          />
        </label>
      </div>

      <p className="mut text-xs mb-4">
        {t('Full deck: about')} {projectedTotal} {t('reps')}
      </p>

      <div className="flex gap-2 flex-wrap min-w-0">
        <button
          type="button"
          className="btn btn-cta flex-1 !min-w-[100px]"
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              ...(isCustom
                ? {
                    name: name.trim(),
                    cat,
                    tag: cat === 'Custom' ? 'Custom routine' : cat,
                  }
                : {}),
              ex: exercises,
              jokers: [
                joker1Active ? joker1Move : '',
                joker2Active ? joker2Move : '',
              ],
              jrs: [
                joker1Active ? joker1Reps : 0,
                joker2Active ? joker2Reps : 0,
              ],
              joker: joker1Move,
              jr:
                (joker1Active ? joker1Reps : 0) +
                (joker2Active ? joker2Reps : 0),
              rest: Math.min(300, Math.max(5, Number(restInput) || 30)),
              scale: 1,
            })
          }
        >
          {t('Save')}
        </button>

        {!isCustom && (
          <button type="button" className="btn !min-w-0" onClick={onReset}>
            {t('Reset')}
          </button>
        )}

        {isCustom && !isNew && (
          <button
            type="button"
            className="btn !min-w-0"
            onClick={() => {
              if (confirmDelete) {
                onDelete();
              } else {
                setConfirmDelete(true);
                window.setTimeout(() => setConfirmDelete(false), 3000);
              }
            }}
          >
            {t(confirmDelete ? 'Tap again to delete' : 'Delete')}
          </button>
        )}

        <button type="button" className="btn !min-w-0" onClick={onClose}>
          {t('Cancel')}
        </button>
      </div>
    </Modal>
  );
};
