import { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { LOCALES, t, type Locale } from '../lib/i18n';

const AUTO_UPDATES_KEY = 'vidora.autoUpdates.v1';

/**
 * Settings dialog (CapCut-fix 2026-11-25, X1 + Y4/Y5). CapCut's order:
 * General, Language, Theme, Input preferences, Task bar, Sidebar,
 * Feature usage. No Diagnostics section, no plans list, no tour
 * replay, no reset. Esc closes it (App.tsx also handles Esc).
 */
export default function SettingsDialog() {
  const open = useProjectStore((s) => s.settingsOpen);
  const setOpen = useProjectStore((s) => s.setSettingsOpen);
  const locale = useProjectStore((s) => s.locale);
  const setLocale = useProjectStore((s) => s.setLocale);
  const theme = useProjectStore((s) => s.theme);
  const setTheme = useProjectStore((s) => s.setTheme);
  const inputPreference = useProjectStore((s) => s.inputPreference);
  const setInputPreference = useProjectStore((s) => s.setInputPreference);
  const showTaskBar = useProjectStore((s) => s.showTaskBar);
  const setShowTaskBar = useProjectStore((s) => s.setShowTaskBar);
  const showSidebar = useProjectStore((s) => s.showSidebar);
  const setShowSidebar = useProjectStore((s) => s.setShowSidebar);
  const [autoUpdates, setAutoUpdates] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_UPDATES_KEY) !== 'off';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  if (!open) return null;

  const toggleAutoUpdates = (on: boolean) => {
    setAutoUpdates(on);
    try {
      localStorage.setItem(AUTO_UPDATES_KEY, on ? 'on' : 'off');
    } catch {
      /* storage unavailable — the toggle still works for this session */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="settings-heading" onClick={() => setOpen(false)}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#3D3D3D] bg-[#0A0A0A] p-5 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="settings-heading" className="text-lg font-semibold">{t(locale, 'settings.title')}</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-zinc-700 px-2 py-1 text-xs" aria-label={t(locale, 'common.close')}>
            ✕ {t(locale, 'common.close')}
          </button>
        </div>

        <div className="mt-4 space-y-5 text-sm">
          <section aria-label="General">
            <h3 className="font-semibold">General</h3>
            <label className="mt-2 flex items-center justify-between gap-3">
              <span>Automatic updates</span>
              <input type="checkbox" checked={autoUpdates} onChange={(e) => toggleAutoUpdates(e.target.checked)} aria-label="Automatic updates" />
            </label>
            <p className="mt-1 text-xs text-zinc-500">The web app updates on reload.</p>
          </section>

          <section aria-label="Language">
            <h3 className="font-semibold">{t(locale, 'settings.language')}</h3>
            <label className="mt-2 flex items-center justify-between gap-3">
              <span>{t(locale, 'settings.language')}</span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5"
                aria-label={t(locale, 'settings.language')}
              >
                {LOCALES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.native}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1 text-xs text-zinc-500">Menus, dashboard and settings are translated. Effect and panel names stay in English.</p>
          </section>

          <section aria-label="Theme">
            <h3 className="font-semibold">{t(locale, 'settings.theme')}</h3>
            <label className="mt-2 flex items-center justify-between gap-3">
              <span>{t(locale, 'settings.theme')}</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5"
                aria-label={t(locale, 'settings.theme')}
              >
                <option value="dark">{t(locale, 'settings.themeDark')}</option>
                <option value="light">{t(locale, 'settings.themeLight')}</option>
              </select>
            </label>
          </section>

          <section aria-label="Input preferences">
            <h3 className="font-semibold">Input preferences</h3>
            <label className="mt-2 flex items-center justify-between gap-3">
              <span>Input preferences</span>
              <select
                value={inputPreference}
                onChange={(e) => setInputPreference(e.target.value as 'default' | 'left-handed')}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5"
                aria-label="Input preferences"
              >
                <option value="default">Default</option>
                <option value="left-handed">Left-handed mouse</option>
              </select>
            </label>
            <p className="mt-1 text-xs text-zinc-500">Left-handed mouse: timeline scroll direction is reversed (the wheel still zooms with Ctrl held).</p>
          </section>

          <section aria-label="Task bar">
            <h3 className="font-semibold">Task bar</h3>
            <label className="mt-2 flex items-center justify-between gap-3">
              <span>Show task bar</span>
              <input type="checkbox" checked={showTaskBar} onChange={(e) => setShowTaskBar(e.target.checked)} aria-label="Show task bar" />
            </label>
          </section>

          <section aria-label="Sidebar">
            <h3 className="font-semibold">Sidebar</h3>
            <label className="mt-2 flex items-center justify-between gap-3">
              <span>Show sidebar</span>
              <input type="checkbox" checked={showSidebar} onChange={(e) => setShowSidebar(e.target.checked)} aria-label="Show sidebar" />
            </label>
          </section>

          <section aria-label="Feature usage" className="rounded-lg border border-zinc-800 bg-[#1C1C1C] p-3">
            <h3 className="font-semibold">{t(locale, 'settings.featureUsage')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Vidora has no paid Pro tier — every feature is included.
            </p>
            <p className="mt-2 text-xs text-zinc-500">Pro is not available in this build. Nothing is charged.</p>
          </section>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-[#00D9D9] px-4 py-2 text-sm font-semibold text-[#062A2A]">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
