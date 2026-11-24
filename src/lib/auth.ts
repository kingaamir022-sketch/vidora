/**
 * Vidora local accounts (Phase 9, Section M — M-AUTH).
 * No server: accounts live only on this computer, in localStorage.
 * First account = OWNER, later accounts = CUSTOMER (read-only).
 * Passwords are never stored — only a random salt + SHA-256(salt+password).
 * Signed out = full access (the app worked that way before accounts);
 * the read-only rule applies only to a signed-in CUSTOMER.
 */

export type AccountRole = 'owner' | 'customer';

export interface VidoraAccount {
  createdAt: string;
  email: string;
  id: string;
  name: string;
  plan: 'free' | 'pro';
  role: AccountRole;
  /** Hex salt; the password hash is SHA-256(salt + ':' + password). */
  salt: string;
  /** Hex SHA-256 hash. Never a password. */
  hash: string;
}

export const ACCOUNTS_STORAGE_KEY = 'vidora.accounts.v1';
export const SESSION_STORAGE_KEY = 'vidora.session.v1';

export function loadAccounts(): VidoraAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is VidoraAccount =>
        !!a && typeof a === 'object' && typeof (a as VidoraAccount).email === 'string' && typeof (a as VidoraAccount).hash === 'string',
    );
  } catch {
    return [];
  }
}

function saveAccounts(accounts: VidoraAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    /* storage unavailable — the account lives for this session only */
  }
}

export function loadSessionEmail(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function currentAccount(): VidoraAccount | null {
  const email = loadSessionEmail();
  if (!email) return null;
  return loadAccounts().find((a) => a.email === email) ?? null;
}

/** True when the signed-in account may edit. Signed out = may edit. */
export function canEdit(account: VidoraAccount | null): boolean {
  return account === null || account.role === 'owner';
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  if (!crypto.subtle) throw new Error('Secure sign-in is not available in this browser.');
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface AuthResult {
  account?: VidoraAccount;
  error?: string;
}

/** Create an account. The first account on this computer becomes OWNER. */
export async function createAccount(name: string, email: string, password: string): Promise<AuthResult> {
  const trimmedName = name.trim().slice(0, 60);
  const lowerEmail = email.trim().toLowerCase();
  if (trimmedName.length < 1) return { error: 'Enter a name.' };
  if (!isValidEmail(lowerEmail)) return { error: 'Enter a valid email address.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  const accounts = loadAccounts();
  if (accounts.some((a) => a.email === lowerEmail)) {
    return { error: 'An account with this email already exists — sign in instead.' };
  }
  let hash: string;
  try {
    const salt = randomSalt();
    hash = await hashPassword(password, salt);
    const account: VidoraAccount = {
      createdAt: new Date().toISOString(),
      email: lowerEmail,
      hash,
      id: `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      plan: 'free',
      role: accounts.length === 0 ? 'owner' : 'customer',
      salt,
    };
    accounts.push(account);
    saveAccounts(accounts);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, lowerEmail);
    } catch {
      /* session-only sign-in */
    }
    return { account };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Sign in. Wrong email and wrong password give the same message. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const lowerEmail = email.trim().toLowerCase();
  const account = loadAccounts().find((a) => a.email === lowerEmail);
  if (!account) return { error: 'Wrong email or password.' };
  let hash: string;
  try {
    hash = await hashPassword(password, account.salt);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (hash !== account.hash) return { error: 'Wrong email or password.' };
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, lowerEmail);
  } catch {
    /* session-only sign-in */
  }
  return { account };
}

export function signOut(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* already signed out */
  }
}
