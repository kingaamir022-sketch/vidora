/**
 * Registers the extensionless-TS resolve hook (scripts/ts-hooks.mjs) for
 * Node scripts that import the Vidora TypeScript sources directly.
 * Used as `node --import ./scripts/register-ts.mjs <script>`.
 */
import { register } from 'node:module';

register('./ts-hooks.mjs', import.meta.url);
