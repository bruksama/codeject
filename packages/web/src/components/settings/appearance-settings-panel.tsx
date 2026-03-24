'use client';

import { Check, Palette, Type } from 'lucide-react';
import { NotificationSettingsCard } from '@/components/settings/notification-settings-card';
import SettingsGroup from '@/components/ui/SettingsGroup';
import { useAppStore } from '@/stores/useAppStore';
import { selectSettings, selectUpdateSettings } from '@/stores/use-app-store-selectors';

const ACCENT_COLORS = [
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Cyan', value: '#0891b2' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Orange', value: '#ea580c' },
];

const FONT_SIZE_OPTIONS = [
  { helper: 'Tighter layout, minimum readable mobile text', label: 'Small', value: 'small' },
  { helper: 'Balanced default for most phones', label: 'Medium', value: 'medium' },
  { helper: 'Larger reading scale across transcript and forms', label: 'Large', value: 'large' },
] as const;

export function AppearanceSettingsPanel() {
  const settings = useAppStore(selectSettings);
  const updateSettings = useAppStore(selectUpdateSettings);

  return (
    <div className="space-y-5 px-4 pb-8 pt-4">
      <div className="glass-card rounded-[28px] border border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
            <Palette className="accent-text" size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/92">Live preview</p>
            <p className="text-sm leading-6 text-white/55">
              Accent and font size apply immediately across chat, cards, and composer spacing.
            </p>
          </div>
        </div>
      </div>

      <SettingsGroup title="Font Size">
        <div className="grid gap-3 p-4">
          {FONT_SIZE_OPTIONS.map((option) => {
            const isSelected = settings.fontSize === option.value;
            return (
              <button
                aria-pressed={isSelected}
                className={`interactive-focus-ring rounded-2xl border px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'border-white/15 bg-white/10 text-white'
                    : 'border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                }`}
                key={option.value}
                onClick={() => updateSettings({ fontSize: option.value })}
                type="button"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                    <Type className={isSelected ? 'accent-text' : 'text-white/55'} size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{option.label}</p>
                      {isSelected ? <Check className="accent-text" size={16} /> : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-white/55">{option.helper}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      <SettingsGroup title="Accent Color">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {ACCENT_COLORS.map((color) => {
            const isSelected = settings.accentColor === color.value;
            return (
              <button
                aria-label={`${color.label} accent color`}
                aria-pressed={isSelected}
                className={`interactive-focus-ring rounded-2xl border px-3 py-3 transition-colors ${
                  isSelected
                    ? 'border-white/15 bg-white/10 text-white'
                    : 'border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                }`}
                key={color.value}
                onClick={() => updateSettings({ accentColor: color.value })}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="block h-11 w-11 rounded-2xl border border-white/20"
                    style={{ background: color.value }}
                  />
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium">{color.label}</p>
                    <p className="mt-1 text-xs text-white/45">{isSelected ? 'Active' : 'Apply'}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      <SettingsGroup title="Attention Alerts">
        <div className="p-4">
          <NotificationSettingsCard />
        </div>
      </SettingsGroup>
    </div>
  );
}
