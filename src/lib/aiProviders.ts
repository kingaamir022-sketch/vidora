/**
 * AI provider adapters (Phase 7, K-PROVIDERS, SPEC K).
 *
 * A provider is a named source of generated media. Only the Local
 * provider exists in this build — it runs Vidora's own in-browser
 * generators (Phase 6, `lib/aiGenerate.ts`): seeded canvas images,
 * canvas-capture video, Web Audio music, dialogue scenes. No network,
 * no API key, no account.
 *
 * Cloud providers are NOT configured: adding one means implementing
 * the `AIProvider` interface below and registering it here. The panel
 * lists every registered provider with its status and never pretends
 * a cloud call happened.
 */

export type ProviderKind = 'cloud' | 'local';

export interface AIProvider {
  id: string;
  kind: ProviderKind;
  label: string;
  /** Why this provider is or is not usable right now. */
  note: string;
  ready: boolean;
}

export const LOCAL_PROVIDER: AIProvider = {
  id: 'local',
  kind: 'local',
  label: 'Local (on-device)',
  note: 'Vidora’s own generators — seeded canvas + Web Audio. No credits, no network.',
  ready: true,
};

export const CLOUD_PROVIDER_STUBS: AIProvider[] = [
  {
    id: 'openai',
    kind: 'cloud',
    label: 'OpenAI',
    note: 'Not configured — needs an API key (Phase 9 settings).',
    ready: false,
  },
  {
    id: 'stability',
    kind: 'cloud',
    label: 'Stability AI',
    note: 'Not configured — needs an API key (Phase 9 settings).',
    ready: false,
  },
  {
    id: 'replicate',
    kind: 'cloud',
    label: 'Replicate',
    note: 'Not configured — needs an API key (Phase 9 settings).',
    ready: false,
  },
];

const registry = new Map<string, AIProvider>();
for (const p of [LOCAL_PROVIDER, ...CLOUD_PROVIDER_STUBS]) registry.set(p.id, p);

/** Register a new provider (developers only — see K-PROVIDERS card). */
export function registerProvider(provider: AIProvider): void {
  registry.set(provider.id, provider);
}

/** All registered providers, Local first. */
export function listProviders(): AIProvider[] {
  return [...registry.values()].sort((a, b) => (a.id === 'local' ? -1 : b.id === 'local' ? 1 : a.id.localeCompare(b.id)));
}

/** Look a provider up by id. Throws a readable error for unknown ids. */
export function providerById(id: string): AIProvider {
  const p = registry.get(id);
  if (!p) throw new Error(`Unknown AI provider "${id}" — available: ${listProviders().map((x) => x.id).join(', ')}`);
  return p;
}

/** The provider the Generate tab actually uses. Always Local for now. */
export function activeProvider(): AIProvider {
  return LOCAL_PROVIDER;
}
