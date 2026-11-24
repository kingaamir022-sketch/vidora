/**
 * Vidora local telemetry (Phase 9, Section M — M-TELEMETRY).
 * Local only: usage counts and errors live in localStorage and nothing
 * is ever sent anywhere. Usage counting is opt-in (default off);
 * error logging is always on locally (it is the only way to see what
 * went wrong). Logging never throws — a failure inside the logger is
 * swallowed so it can never break the app.
 */

export const TELEMETRY_STORAGE_KEY = 'vidora.telemetry.v1';
export const TELEMETRY_OPTIN_KEY = 'vidora.telemetry.optin.v1';

export interface TelemetryEvent {
  count: number;
  name: string;
}

export interface TelemetryError {
  message: string;
  time: string;
}

export interface TelemetryState {
  errors: TelemetryError[];
  events: TelemetryEvent[];
}

const MAX_ERRORS = 50;

export function loadTelemetry(): TelemetryState {
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return { errors: [], events: [] };
    const parsed = JSON.parse(raw) as Partial<TelemetryState>;
    return {
      errors: Array.isArray(parsed.errors) ? parsed.errors.slice(0, MAX_ERRORS) : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { errors: [], events: [] };
  }
}

function saveTelemetry(state: TelemetryState): void {
  try {
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full/unavailable — logging stops silently */
  }
}

export function telemetryOptIn(): boolean {
  try {
    return localStorage.getItem(TELEMETRY_OPTIN_KEY) === '1';
  } catch {
    return false;
  }
}

export function setTelemetryOptIn(on: boolean): void {
  try {
    localStorage.setItem(TELEMETRY_OPTIN_KEY, on ? '1' : '0');
  } catch {
    /* session-only preference */
  }
}

/** Count one usage event. Does nothing when the user has not opted in. */
export function logEvent(name: string): void {
  try {
    if (!telemetryOptIn()) return;
    const state = loadTelemetry();
    const existing = state.events.find((e) => e.name === name);
    if (existing) existing.count += 1;
    else state.events.push({ count: 1, name });
    saveTelemetry(state);
  } catch {
    /* logging never breaks the app */
  }
}

/** Record an error locally (always on). Message trimmed to 500 chars. */
export function logError(message: string): void {
  try {
    const state = loadTelemetry();
    state.errors.unshift({ message: message.slice(0, 500), time: new Date().toISOString() });
    state.errors = state.errors.slice(0, MAX_ERRORS);
    saveTelemetry(state);
  } catch {
    /* logging never breaks the app */
  }
}

export function clearTelemetry(): void {
  try {
    localStorage.removeItem(TELEMETRY_STORAGE_KEY);
  } catch {
    /* already clear */
  }
}
