import { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { LOCALES, t, type Locale } from '../lib/i18n';
import { clearTelemetry, loadTelemetry, logEvent, type TelemetryState } from '../lib/telemetry';
import { PLANS } from '../lib/subscription';

/**
 * Settings dialog (Phase 9, Section M — M-SETTINGS, M-TELEMETRY).
 * Language, theme, input preferences, task bar / sidebar, tour replay,
 * reset, diagnostics (local-only) and feature usage. Esc closes it.
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
  const replayOnboarding = useProjectStore((s) => s.replayOnboarding);
  const resetSettings = useProjectStore((s) => s.resetSettings);
  const setGuideOpen = useProjectStore((s) => s.setGuideOpen);
  const analyticsOptIn = useProjectStore((s) => s.analyticsOptIn);
  const setAnalyticsOptIn = useProjectStore((s) => s.setAnalyticsOptIn);
  const [telemetry, setTelemetry] = useState<TelemetryState>({ errors: [], events: [] });
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (open) setTelemetry(loadTelemetry());
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  if (!open) return null;

  const copyDiagnostics = async () => {
    const text = telemetry.errors.length === 0 ? 'No errors recorded.' : telemetry.errors.map((e) => `${e.time} — ${e.message}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the list is still visible */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="settings-heading" onClick={() => setOpen(false)}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="settings-heading" className="text-lg font-semibold">{t(locale, 'settings.title')}</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-zinc-700 px-2 py-1 text-xs" aria-label={t(locale, 'common.close')}>
            ✕ {t(locale, 'common.close')}
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <label className="flex items-center justify-between gap-3">
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
          <p className="text-xs text-zinc-500">Menus, dashboard and settings are translated. Effect and panel names stay in English.</p>

          <label className="flex items-center justify-between gap-3">
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

          <label className="flex items-center justify-between gap-3">
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
          <p className="text-xs text-zinc-500">Left-handed mouse: timeline scroll direction is reversed (the wheel still zooms with Ctrl held).</p>

          <label className="flex items-center justify-between gap-3">
            <span>Show task bar</span>
            <input type="checkbox" checked={showTaskBar} onChange={(e) => setShowTaskBar(e.target.checked)} aria-label="Show task bar" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Show sidebar</span>
            <input type="checkbox" checked={showSidebar} onChange={(e) => setShowSidebar(e.target.checked)} aria-label="Show sidebar" />
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={replayOnboarding} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs">
              {t(locale, 'settings.showTour')}
            </button>
            <button type="button" onClick={() => { setOpen(false); setGuideOpen(true); }} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs">
              {t(locale, 'settings.help')}
            </button>
            {confirmReset ? (
              <button
                type="button"
                onClick={() => { resetSettings(); setConfirmReset(false); }}
                className="rounded-md border border-red-500 px-3 py-1.5 text-xs text-red-300"
              >
                Confirm reset?
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmReset(true)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs">
                {t(locale, 'settings.reset')}
              </button>
            )}
          </div>

          <section aria-label="Feature usage" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <h3 className="font-semibold">{t(locale, 'settings.featureUsage')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Vidora has no paid Pro tier — every feature is included.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-400">
              {PLANS[0].features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-zinc-500">Pro is not available in this build. Nothing is charged.</p>
          </section>

          <section aria-label="Diagnostics" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <h3 className="font-semibold">Diagnostics</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Nothing leaves this computer. Errors are logged locally so you can see what went wrong.
            </p>
            <label className="mt-2 flex items-center justify-between gap-3 text-xs">
              <span>Count how I use Vidora (local only)</span>
              <input
                type="checkbox"
                checked={analyticsOptIn}
                onChange={(e) => {
                  setAnalyticsOptIn(e.target.checked);
                  if (e.target.checked) logEvent('analytics-opt-in');
                  // Refresh the list immediately — otherwise the new
                  // event only shows after closing and reopening Settings.
                  setTelemetry(loadTelemetry());
                }}
                aria-label="Count how I use Vidora (local only)"
              />
            </label>
            {analyticsOptIn && telemetry.events.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                {telemetry.events.map((e) => (
                  <li key={e.name}>
                    {e.name}: {e.count}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs font-semibold">Recent errors ({telemetry.errors.length})</p>
            {telemetry.errors.length === 0 ? (
              <p className="mt-1 text-xs text-zinc-500">No errors recorded.</p>
            ) : (
              <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs text-zinc-400">
                {telemetry.errors.map((e, i) => (
                  <li key={`${e.time}-${i}`}>
                    {new Date(e.time).toLocaleString()} — {e.message}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={copyDiagnostics} className="rounded-md border border-zinc-700 px-3 py-1 text-xs">
                {copied ? 'Copied' : 'Copy diagnostics'}
              </button>
              <button
                type="button"
                onClick={() => { clearTelemetry(); setTelemetry({ errors: [], events: [] }); }}
                className="rounded-md border border-zinc-700 px-3 py-1 text-xs"
              >
                Clear diagnostics
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
