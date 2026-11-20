import { execFileSync } from 'node:child_process';
import { cp, readdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';

const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);
await rm(new URL('dist/', root), { recursive: true, force: true });
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc')], { cwd: root, stdio: 'inherit' });

const attribution = new Set(['Aksharantar-README.md', 'MODEL-NOTICE.md', 'dictionary-source']);
const source = new URL('../src/engine/', import.meta.url);
const destination = new URL('../dist/engine/', import.meta.url);
for (const entry of await readdir(source)) {
  if (entry.endsWith('.js') || attribution.has(entry)) {
    // Copy model data verbatim. Reformatting these modules would inflate the payload.
    await cp(new URL(entry, source), new URL(entry, destination), { recursive: true });
  }
}
