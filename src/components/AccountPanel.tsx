import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { loadAccounts } from '../lib/auth';
import { PLANS } from '../lib/subscription';

/**
 * Account panel (Phase 9, Section M — M-AUTH, M-SUBS). Local accounts
 * only: the first account is the OWNER, later ones are CUSTOMER
 * (read-only). Passwords are never stored — only a salted hash.
 * Google sign-in is not available in this build (no cloud account).
 */
export default function AccountPanel() {
  const account = useProjectStore((s) => s.account);
  const signUp = useProjectStore((s) => s.signUp);
  const signInAccount = useProjectStore((s) => s.signInAccount);
  const signOutAccount = useProjectStore((s) => s.signOutAccount);
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState(() => loadAccounts());

  const submit = async () => {
    setBusy(true);
    setError('');
    const err = mode === 'signup' ? await signUp(name, email, password) : await signInAccount(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setPassword('');
    setAccounts(loadAccounts());
  };

  return (
    <section className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-label="Account">
      <h2 className="text-lg font-semibold">Account</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Accounts live only on this computer. There is no cloud sign-in — Google sign-in is not available in this build.
      </p>

      {account ? (
        <div className="mt-3 space-y-3 text-sm">
          <p>
            Signed in as <strong>{account.name}</strong> ({account.email}) — role: <strong>{account.role === 'owner' ? 'OWNER' : 'CUSTOMER'}</strong>, plan: Free.
          </p>
          {account.role === 'customer' && (
            <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              You are signed in as Customer — read-only. Ask the Owner to make changes.
            </p>
          )}
          {account.role === 'owner' && accounts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400">Accounts on this computer</p>
              <ul className="mt-1 space-y-1 text-xs text-zinc-400">
                {accounts.map((a) => (
                  <li key={a.id}>
                    {a.name} ({a.email}) — {a.role === 'owner' ? 'OWNER' : 'CUSTOMER'} — plan: Free
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-zinc-400">Plans</p>
            <ul className="mt-1 space-y-1 text-xs text-zinc-400">
              {PLANS.map((p) => (
                <li key={p.id}>
                  {p.name} — {p.description} {p.id === 'free' ? '(current plan)' : ''}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-zinc-500">Durations exist in the plan structure (7 / 30 / 90 / 180 / 365 days / Lifetime) but no plan is sold.</p>
          </div>
          <button type="button" onClick={signOutAccount} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs">
            Sign out
          </button>
        </div>
      ) : (
        <div className="mt-3 max-w-sm space-y-2 text-sm">
          <div className="flex gap-2" role="tablist" aria-label="Account forms">
            {(['signup', 'signin'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setError(''); }}
                className={`rounded-md border px-3 py-1.5 text-xs ${mode === m ? 'border-violet-500 bg-violet-600/20 text-white' : 'border-zinc-700 text-zinc-400'}`}
              >
                {m === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>
          {mode === 'signup' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            aria-label="Email"
            autoComplete="email"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (at least 8 characters)"
            type="password"
            aria-label="Password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          {error && (
            <p className="text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
          <p className="text-xs text-zinc-500">
            {accounts.length === 0 ? 'No account yet — the first account becomes the Owner.' : 'The first account on this computer is the Owner; later accounts are Customers (read-only).'}
          </p>
        </div>
      )}
    </section>
  );
}
