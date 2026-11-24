import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDate, formatNumber, isRtl, loadLocale, t, type StringKey } from '../lib/i18n';
import { canEdit, createAccount, currentAccount, loadAccounts, signIn, signOut } from '../lib/auth';
import { daysRemaining, planById } from '../lib/subscription';
import { clearTelemetry, loadTelemetry, logError, logEvent, setTelemetryOptIn, telemetryOptIn } from '../lib/telemetry';
import { createLruCache, probeCache, thumbnailCache } from '../lib/mediaCache';
import { clampLensStrength, distortPoint, lensGrid } from '../lib/lens';
import { parseAss, parseCaptionFile } from '../lib/captions';
import { defaultAdjustment, migrateProject, SAMPLE_PROJECT } from '../schema/project';

/** In-memory localStorage for the node test env (same pattern as phase8.test.ts). */
function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    clear: () => store.clear(),
    getItem: (k: string) => store.get(k) ?? null,
    removeItem: (k: string) => store.delete(k),
    setItem: (k: string, v: string) => store.set(k, v),
  });
  return store;
}

describe('M-LOCALE i18n', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubStorage();
  });

  it('translates chrome strings in all four locales', () => {
    expect(t('en', 'dashboard.title')).toBe('Your projects');
    expect(t('ur', 'dashboard.title')).toBe('آپ کے پروجیکٹس');
    expect(t('hi', 'dashboard.title')).toBe('आपके प्रोजेक्ट');
    expect(t('ar', 'dashboard.title')).toBe('مشاريعك');
    expect(t('ur', 'topbar.export')).toBe('ایکسپورٹ');
    expect(t('ar', 'topbar.export')).toBe('تصدير');
  });

  it('falls back to English for a missing key', () => {
    expect(t('ar', 'no.such.key' as StringKey)).toBe('no.such.key');
  });

  it('only Arabic is RTL', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
    expect(isRtl('ur')).toBe(false);
    expect(isRtl('hi')).toBe(false);
  });

  it('formats dates and numbers per locale without throwing', () => {
    const d = new Date('2026-11-24T00:00:00Z');
    for (const loc of ['en', 'ur', 'hi', 'ar'] as const) {
      expect(formatDate(loc, d).length).toBeGreaterThan(0);
      expect(formatNumber(loc, 1234).length).toBeGreaterThan(0);
    }
    expect(formatNumber('en', 1234)).toBe('1,234');
  });

  it('loadLocale falls back to English for garbage', () => {
    const store = stubStorage();
    expect(loadLocale()).toBe('en');
    store.set('vidora.locale.v1', 'ur');
    expect(loadLocale()).toBe('ur');
    store.set('vidora.locale.v1', 'xx');
    expect(loadLocale()).toBe('en');
  });
});

describe('M-AUTH local accounts', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubStorage();
  });

  it('the first account is OWNER, later ones are CUSTOMER', async () => {
    const first = await createAccount('Aamir', 'aamir@example.com', 'password123');
    expect(first.error).toBeUndefined();
    expect(first.account?.role).toBe('owner');
    const second = await createAccount('Kashif', 'kashif@example.com', 'password123');
    expect(second.account?.role).toBe('customer');
    expect(loadAccounts()).toHaveLength(2);
  });

  it('rejects duplicate emails, bad emails and short passwords', async () => {
    await createAccount('Aamir', 'aamir@example.com', 'password123');
    expect((await createAccount('Other', 'AAMIR@example.com', 'password123')).error).toMatch(/already exists/);
    expect((await createAccount('Bad', 'not-an-email', 'password123')).error).toMatch(/valid email/);
    expect((await createAccount('Short', 's@example.com', 'abc')).error).toMatch(/at least 8/);
    expect((await createAccount('', 'n@example.com', 'password123')).error).toMatch(/name/);
  });

  it('sign-in checks the password; wrong email and wrong password give the same message', async () => {
    await createAccount('Aamir', 'aamir@example.com', 'password123');
    expect((await signIn('aamir@example.com', 'wrongpass')).error).toBe('Wrong email or password.');
    expect((await signIn('nobody@example.com', 'password123')).error).toBe('Wrong email or password.');
    const ok = await signIn('aamir@example.com', 'password123');
    expect(ok.account?.email).toBe('aamir@example.com');
    expect(currentAccount()?.email).toBe('aamir@example.com');
    signOut();
    expect(currentAccount()).toBeNull();
  });

  it('the same password hashes differently per account (random salt)', async () => {
    const a = await createAccount('One', 'one@example.com', 'samepassword');
    const b = await createAccount('Two', 'two@example.com', 'samepassword');
    expect(a.account?.hash).not.toBe(b.account?.hash);
    expect(a.account?.hash).not.toContain('samepassword');
  });

  it('canEdit: signed out and OWNER may edit, CUSTOMER may not', async () => {
    expect(canEdit(null)).toBe(true);
    const owner = await createAccount('Owner', 'o@example.com', 'password123');
    expect(canEdit(owner.account ?? null)).toBe(true);
    const customer = await createAccount('Cust', 'c@example.com', 'password123');
    expect(canEdit(customer.account ?? null)).toBe(false);
  });
});

describe('M-SUBS plans', () => {
  it('Free is available, Pro is not, unknown ids fall back to Free', () => {
    expect(planById('free').available).toBe(true);
    expect(planById('pro').available).toBe(false);
    expect(planById('nope').id).toBe('free');
  });

  it('Free and Lifetime never expire; dated plans count down', () => {
    const now = new Date('2026-11-24T00:00:00Z');
    expect(daysRemaining('free', 30, '2026-01-01T00:00:00Z', now)).toBeNull();
    expect(daysRemaining('pro', 'lifetime', '2026-01-01T00:00:00Z', now)).toBeNull();
    expect(daysRemaining('pro', 30, '2026-11-24T00:00:00Z', now)).toBe(30);
    expect(daysRemaining('pro', 30, '2026-10-25T00:00:00Z', now)).toBe(0);
  });
});

describe('M-TELEMETRY local-only logging', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubStorage();
  });

  it('usage counting is off by default and counts when opted in', () => {
    expect(telemetryOptIn()).toBe(false);
    logEvent('exports');
    expect(loadTelemetry().events).toEqual([]);
    setTelemetryOptIn(true);
    expect(telemetryOptIn()).toBe(true);
    logEvent('exports');
    logEvent('exports');
    logEvent('projects');
    expect(loadTelemetry().events).toEqual([
      { count: 2, name: 'exports' },
      { count: 1, name: 'projects' },
    ]);
  });

  it('errors are always logged locally and trimmed to 500 chars', () => {
    logError('boom');
    expect(loadTelemetry().errors).toHaveLength(1);
    expect(loadTelemetry().errors[0].message).toBe('boom');
    logError('x'.repeat(600));
    expect(loadTelemetry().errors[0].message).toHaveLength(500);
    clearTelemetry();
    expect(loadTelemetry()).toEqual({ errors: [], events: [] });
  });
});

describe('M-PERF LRU caches', () => {
  it('evicts the least-recently-used entry and honours get() touches', () => {
    const cache = createLruCache<string>(2);
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size()).toBe(2);
    cache.get('a'); // touch a → b is now least-recently-used
    cache.set('c', '3');
    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('the app-wide caches are LRU caches', () => {
    expect(typeof thumbnailCache.set).toBe('function');
    expect(typeof probeCache.get).toBe('function');
  });
});

describe('M-LENS distortion math', () => {
  it('the centre never moves', () => {
    expect(distortPoint(0, 0, 0.5)).toEqual({ x: 0, y: 0 });
    expect(distortPoint(0, 0, -1)).toEqual({ x: 0, y: 0 });
  });

  it('k = 0 is identity; positive k pushes points out, negative pulls them in', () => {
    expect(distortPoint(0.5, 0, 0)).toEqual({ x: 0.5, y: 0 });
    expect(distortPoint(0.5, 0, 0.5).x).toBeCloseTo(0.5625);
    expect(distortPoint(0.5, 0, -0.5).x).toBeCloseTo(0.4375);
  });

  it('the grid centre maps to the frame centre and corners clamp to the edge', () => {
    const grid = lensGrid(1200, 600, 0.5, 12, 12);
    expect(grid[6][6]).toEqual({ sx: 600, sy: 300 });
    expect(grid[0][0].sx).toBe(0);
    expect(grid[0][0].sy).toBe(0);
    const flat = lensGrid(1200, 600, 0, 12, 12);
    expect(flat[0][0]).toEqual({ sx: 0, sy: 0 });
    expect(flat[12][12]).toEqual({ sx: 1199, sy: 599 });
  });

  it('clampLensStrength keeps the slider range', () => {
    expect(clampLensStrength(2)).toBe(1);
    expect(clampLensStrength(-2)).toBe(-1);
    expect(clampLensStrength(0.3)).toBe(0.3);
    expect(clampLensStrength(NaN)).toBe(0);
  });
});

const SAMPLE_ASS = `[Script Info]
Title: Test
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,Hello {\\pos(10,20)}world
Comment: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,This is a comment
Dialogue: 0,0:00:05.50,0:00:08.00,Default,,0,0,0,,Second\\Nline here
Dialogue: 0,not-a-time,0:00:09.00,Default,,0,0,0,,Skipped line
Dialogue: 0,0:00:10.00,0:00:11.00,Default,,0,0,0,,
`;

describe('M-ASS .ass import', () => {
  it('parses Dialogue lines, strips override tags, honours \\N and ignores comments', () => {
    const cues = parseAss(SAMPLE_ASS);
    expect(cues).toHaveLength(2);
    expect(cues[0].start).toBe(1);
    expect(cues[0].end).toBe(4);
    expect(cues[0].text).toBe('Hello world');
    expect(cues[1].text).toBe('Second\nline here');
    expect(cues[1].start).toBe(5.5);
  });

  it('reads the Format line instead of assuming column order', () => {
    const reordered = `[Events]
Format: Start, End, Text, Layer
Dialogue: 0:00:02.00,0:00:03.00,Reordered,0
`;
    const cues = parseAss(reordered);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Reordered');
  });

  it('throws when there is no dialogue at all', () => {
    expect(() => parseAss('[Events]\nFormat: Layer, Start, End, Text\n')).toThrow(/No dialogue/);
  });

  it('parseCaptionFile dispatches .ass and rejects .lrc', () => {
    expect(parseCaptionFile('subs.ass', SAMPLE_ASS)).toHaveLength(2);
    expect(() => parseCaptionFile('subs.lrc', '[00:01.00] hi')).toThrow(/\.lrc is not supported/);
  });
});

describe('M schema v1.0.0', () => {
  it('default adjustments carry lensStrength 0', () => {
    expect(defaultAdjustment().lensStrength).toBe(0);
    expect(defaultAdjustment().lensCorrection).toBe(false);
  });

  it('a v0.9.0 document migrates to 1.0.0 with lens off', () => {
    const old = { ...SAMPLE_PROJECT, version: '0.9.0' as const };
    const migrated = migrateProject(old);
    expect(migrated.version).toBe('1.0.0');
    const clip = migrated.tracks.flatMap((t) => t.clips)[0];
    if (clip) {
      expect(clip.adjustment.lensCorrection).toBe(false);
      expect(clip.adjustment.lensStrength).toBe(0);
    }
  });
});
