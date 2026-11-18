import React from 'react';
import { Check, Monitor, Moon, Palette, RotateCcw, Sun, X } from 'lucide-react';
import { t } from '../data/i18n';
import type { ThemeAccentId, ThemeMode } from '../types/workout';
import { sfx } from '../utils/sound';
import {
  DEFAULT_ACCENT_ID,
  DEFAULT_THEME_MODE,
  THEME_ACCENTS,
} from '../utils/theme';
import { Modal } from './Modal';

interface ThemeSettingsModalProps {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  accent: ThemeAccentId;
  onChangeThemeMode: (mode: ThemeMode) => void;
  onChangeAccent: (accent: ThemeAccentId) => void;
  onReset: () => void;
  onClose: () => void;
}

const MODE_OPTIONS: {
  id: ThemeMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  themeMode,
  resolvedTheme,
  accent,
  onChangeThemeMode,
  onChangeAccent,
  onReset,
  onClose,
}) => {
  const isDefault =
    themeMode === DEFAULT_THEME_MODE && accent === DEFAULT_ACCENT_ID;

  return (
    <Modal
      label={t('Theme settings')}
      widthClass="max-w-md"
      onClose={onClose}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Palette
              className="w-4 h-4 shrink-0"
              style={{ color: 'var(--ac)' }}
              aria-hidden="true"
            />
            <span>{t('Theme settings')}</span>
          </h2>
          <p className="mut text-xs mt-0.5">
            {t('Choose appearance mode and accent color.')}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-ghost !min-h-[40px] !min-w-[40px] !px-0 shrink-0"
          aria-label={t('Close')}
          onClick={() => {
            sfx.pop();
            onClose();
          }}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Appearance Mode: System / Light / Dark */}
      <div className="mb-5">
        <div className="text-xs font-semibold mut mb-2">
          {t('Appearance')}
        </div>
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-label={t('Appearance')}
        >
          {MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = themeMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                className={`btn !min-h-[44px] !min-w-0 !px-2.5 text-xs sm:text-sm ${
                  active ? 'btn-active' : ''
                }`}
                onClick={() => {
                  sfx.pop();
                  onChangeThemeMode(option.id);
                }}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(option.label)}</span>
              </button>
            );
          })}
        </div>

        {themeMode === 'system' && (
          <p className="mut text-xs mt-2">
            {t('Following device preference')} · {t('Currently')}{' '}
            {t(resolvedTheme === 'dark' ? 'Dark' : 'Light')}
          </p>
        )}
      </div>

      {/* Accent Color Swatches */}
      <div className="mb-5">
        <div className="text-xs font-semibold mut mb-2">
          {t('Accent color')}
        </div>
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          role="group"
          aria-label={t('Accent color')}
        >
          {THEME_ACCENTS.map((option) => {
            const active = accent === option.id;
            const swatchColor =
              resolvedTheme === 'dark'
                ? option.swatchDark
                : option.swatchLight;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                className={`btn !min-h-[44px] !min-w-0 !px-2.5 justify-start text-xs ${
                  active ? 'btn-active' : ''
                }`}
                onClick={() => {
                  sfx.pop();
                  onChangeAccent(option.id);
                }}
              >
                <span
                  className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center border"
                  style={{
                    backgroundColor: swatchColor,
                    borderColor: 'rgba(255,255,255,0.28)',
                  }}
                  aria-hidden="true"
                >
                  {active && (
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  )}
                </span>
                <span className="truncate">{t(option.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Preview Strip */}
      <div className="surface-inset rounded-2xl p-3.5 mb-5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="mut font-medium">{t('Preview')}</span>
          <span className="mono font-bold" style={{ color: 'var(--ac)' }}>
            72%
          </span>
        </div>
        <div className="progress-track" style={{ height: 8 }}>
          <i className="progress-fill" style={{ width: '72%' }} />
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="btn btn-cta !min-h-[36px] !px-3.5 text-xs pointer-events-none">
            {t('Primary action')}
          </span>
          <span className="btn btn-active !min-h-[36px] !px-3.5 text-xs pointer-events-none">
            {t(resolvedTheme === 'dark' ? 'Dark' : 'Light')}
          </span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn !min-h-[44px] text-xs"
          disabled={isDefault}
          onClick={() => {
            sfx.pop();
            onReset();
          }}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{t('Reset default')}</span>
        </button>

        <button
          type="button"
          className="btn btn-cta !min-h-[44px] !px-6"
          onClick={() => {
            sfx.pop();
            onClose();
          }}
        >
          {t('Done')}
        </button>
      </div>
    </Modal>
  );
};
