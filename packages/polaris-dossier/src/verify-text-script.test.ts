import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';

// syzygy-5dhm.24 review finding F4: the output guards of scripts/dossier_verify_text.mjs, run as a child process. Each refusal comes
// before the script reads the clone, the policy or the text, so the clone named here does not exist and no build is needed. The
// script's checked path (a real pilot clone) is not run here: it needs the pilot's bare clone, which the checkout does not carry.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT = path.join(ROOT, 'scripts', 'dossier_verify_text.mjs');

/** Runs the script asynchronously (a synchronous child would block the vitest worker; sync-child-process-guard.test.ts). */
const run = (...args: string[]): Promise<{ readonly status: number | null; readonly stderr: string }> => new Promise((resolve) => {
  execFile(process.execPath, [SCRIPT, '--clone', '/nonexistent/clone.git', '--text', '/nonexistent/text.md', ...args], { cwd: ROOT, encoding: 'utf8' },
    (error, _stdout, stderr) => resolve({ status: error === null ? 0 : typeof error.code === 'number' ? error.code : null, stderr }));
});

describe('dossier_verify_text.mjs output guards', () => {
  it('refuses an --html that already exists, and leaves it as it was', async () => {
    const dir = tempDir('verify-script-');
    const existing = path.join(dir, 'page.html');
    fs.writeFileSync(existing, 'kept');
    const result = await run('--html', existing);
    expect(result.status).toBe(2);
    expect(result.stderr).toBe('dossier_verify_text: --html must name a new file outside this checkout\n');
    expect(fs.readFileSync(existing, 'utf8')).toBe('kept');
  });

  it('refuses an --out that already exists', async () => {
    const dir = tempDir('verify-script-');
    const existing = path.join(dir, 'copy.md');
    fs.writeFileSync(existing, 'kept');
    const result = await run('--out', existing);
    expect(result.status).toBe(2);
    expect(result.stderr).toBe('dossier_verify_text: --out must name a new file outside this checkout\n');
  });

  it('refuses an --html inside this checkout, and writes nothing there', async () => {
    const inside = path.join(ROOT, 'packages', 'polaris-dossier', `verify-page-${process.pid}.html`);
    const result = await run('--html', inside);
    expect(result.status).toBe(2);
    expect(result.stderr).toBe('dossier_verify_text: --html must name a new file outside this checkout\n');
    expect(fs.existsSync(inside)).toBe(false);
  });

  it('refuses one file named by both --out and --html, and writes nothing', async () => {
    const dir = tempDir('verify-script-');
    const both = path.join(dir, 'both.out');
    const result = await run('--out', both, '--html', both);
    expect(result.status).toBe(2);
    expect(result.stderr).toBe('dossier_verify_text: --out and --html must name two different files\n');
    expect(fs.existsSync(both)).toBe(false);
  });
});
