/**
 * Vidora subscription plans (Phase 9, Section M — M-SUBS).
 * Structure only: there is no payment provider, nothing is sold and
 * nothing is ever charged. Free is the only live plan — everything is
 * included. The duration set mirrors the one the user knows from
 * PageCommand Pro (7/30/90/180/365 days / Lifetime) so the structure
 * is familiar if a paid plan is ever added.
 */

export type PlanId = 'free' | 'pro';
export type PlanDurationDays = 7 | 30 | 90 | 180 | 365 | 'lifetime';

export interface PlanDef {
  available: boolean;
  description: string;
  features: string[];
  id: PlanId;
  name: string;
}

export const PLANS: PlanDef[] = [
  {
    available: true,
    description: 'Everything included. No payment, no expiry.',
    features: ['All editing tools', 'AI library and AI tools', 'Full export (up to 4K)', 'Templates and cloud backup files'],
    id: 'free',
    name: 'Free',
  },
  {
    available: false,
    description: 'Not available in this build. Nothing is charged.',
    features: ['Same as Free — there is no paid tier yet'],
    id: 'pro',
    name: 'Pro',
  },
];

export const PLAN_DURATIONS: { days: PlanDurationDays; label: string }[] = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '180 days' },
  { days: 365, label: '365 days' },
  { days: 'lifetime', label: 'Lifetime' },
];

export function planById(id: string): PlanDef {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/**
 * Days left on a plan that started at `startedAt` with the given
 * duration. Free and Lifetime never expire (null). A dated plan that
 * was never sold returns null too — this is structure for later.
 */
export function daysRemaining(planId: PlanId, duration: PlanDurationDays, startedAt: string, now = new Date()): number | null {
  if (planId === 'free' || duration === 'lifetime') return null;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return null;
  const end = start + duration * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end - now.getTime()) / (24 * 60 * 60 * 1000)));
}
