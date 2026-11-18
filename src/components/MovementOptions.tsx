import React from 'react';
import { t } from '../data/i18n';
import { ALL_MOVEMENTS, MOVEMENT_BANK, MOVEMENT_GEAR } from '../data/movements';

interface MovementOptionsProps {
  current: string;
  favoriteMovements: string[];
  includeGear?: boolean;
}

export function sortMovementsWithFavorites(
  favorites: string[]
): { favoritesList: string[]; groups: [string, string[]][] } {
  const favSet = new Set(
    favorites.filter((m) => ALL_MOVEMENTS.includes(m))
  );
  const favoritesList = ALL_MOVEMENTS.filter((m) => favSet.has(m));
  return {
    favoritesList,
    groups: Object.entries(MOVEMENT_BANK),
  };
}

export const MovementOptions: React.FC<MovementOptionsProps> = ({
  current,
  favoriteMovements,
  includeGear = false,
}) => {
  const { favoritesList, groups } = sortMovementsWithFavorites(favoriteMovements);

  const formatLabel = (move: string) =>
    includeGear && MOVEMENT_GEAR[move]
      ? `${t(move)} (${t(MOVEMENT_GEAR[move])})`
      : t(move);

  return (
    <>
      {favoritesList.length > 0 && (
        <optgroup label={`★ ${t('Favorites')}`}>
          {favoritesList.map((item) => (
            <option key={`fav-${item}`} value={item}>
              ★ {formatLabel(item)}
            </option>
          ))}
        </optgroup>
      )}
      {groups.map(([group, items]) => (
        <optgroup key={group} label={t(group)}>
          {items.map((item) => (
            <option key={item} value={item}>
              {formatLabel(item)}
            </option>
          ))}
        </optgroup>
      ))}
      {!ALL_MOVEMENTS.includes(current) && (
        <option key={`custom-${current}`} value={current}>
          {t(current)}
        </option>
      )}
    </>
  );
};
