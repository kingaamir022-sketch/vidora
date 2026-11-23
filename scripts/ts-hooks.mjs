/**
 * ESM resolve hook for Node type-stripping runs: the Vidora sources use
 * extensionless relative imports (`from '../schema/project'`), which
 * Node's ESM resolver rejects. This hook retries a failed relative
 * specifier with `.ts` (then `/index.ts`) appended.
 * Registered via `scripts/register-ts.mjs` (see package.json build:assets).
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (typeof specifier === 'string' && specifier.startsWith('.') && !/\.[a-zA-Z]+$/.test(specifier)) {
      for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
        try {
          return await nextResolve(candidate, context);
        } catch {
          // try the next candidate
        }
      }
    }
    throw err;
  }
}
