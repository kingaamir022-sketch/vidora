# K-PROVIDERS — AI provider adapters (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** Section K requires "AI image generation (provider adapters with free/open-source alternatives)". Vidora's Generate tab already renders locally (Phase 6). Phase 7 adds the adapter layer: a small provider registry (`AIProvider`: id, label, kind, `generateImage(prompt)`, `generateVideo(prompt)`, `generateMusic(prompt)` — each returns a local result or a clear "not configured" error) with the `local` provider wired in (the existing in-browser generators) and the adapter interface documented for future cloud providers. No API keys are stored, no cloud call is made, and the panel lists exactly which providers exist: Local only. Cloud providers (OpenAI, Stability, Replicate…) are a Phase 9 settings job and the panel says so. ASSUMED — the adapter shape is Vidora's own; no reference provider UI was observed.
- **Where it lives:** `src/lib/aiProviders.ts` (registry + Local provider), `src/components/AIToolsPanel.tsx` (Providers section), `src/lib/aiGenerate.ts` (local implementations, reused).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Provider | — | — | Local | — | Only "Local (on-device)" is available |
| Text | Provider list | — | — | — | — | Each provider: name, kind, status (ready / needs key / not installed) |
| Note | Honest note | — | — | — | — | Local only; cloud providers need an API key (Phase 9) |

## Interactions
- Open the Providers section: it lists the Local provider as ready and explains that every Generate result in the app comes from it. Selecting any other provider shows "Not configured — needs an API key (Phase 9)" and no key field is offered.
- Developers: implement `AIProvider` in `src/lib/aiProviders.ts` and register it; the Generate tab picks it up automatically.

## States
- Local provider missing (build error): the section shows an error instead of a silent fallback.

## Result
The Generate tab's provider is explicit and swappable; nothing is faked as a cloud call.

## Edge cases
- A registered provider throws mid-generation: the error is shown with the provider's name; the Local provider stays usable.

## Evidence
`src/lib/aiProviders.ts`, `src/test/phase7.test.ts` (registry lists local; unknown provider id throws a readable error).

## Status
ASSUMED
