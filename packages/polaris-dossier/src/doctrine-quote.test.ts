import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';
import { cutSec3, readSec3 } from './doctrine-quote.js';

// syzygy-qkea.6 (S5): SEC-3's head and D9's cost bullet are cut from the adopted security.md as it stands, byte for byte. The live
// expectations are the file's own lines at the numbers the bead names (SEC-3 head 61–62, cost bullet 95–101), sliced here by number.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const LIVE = fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/doctrine/security.md'), 'utf8');
const lines = (first: number, last: number): string => LIVE.split('\n').slice(first - 1, last).join('\n');

const DOC = (section: string, after = ''): string => `# Security\n\n**SEC-2 — Two.** Text.\n\n${section}\n\n**SEC-4 — Four.** Text.\n${after}`;
const HEAD = '**SEC-3 — Observed code is untrusted, everywhere.** Syzygy runs\nobserved-project code only inside a profile.';
const COST = '- **What the permitted case costs:** the session runs with the owner\'s\n  credentials and network.';

describe('cutSec3', () => {
  it('cuts the head paragraph and the cost bullet with its continuation lines', () => {
    const cut = cutSec3(DOC(`${HEAD}\n\n- **Whom the case binds:** Syzygy.\n${COST}\n- *Violation:* a profile.`));
    expect(cut).toEqual({
      head: { text: HEAD, startLine: 5, endLine: 6 },
      cost: { text: COST, startLine: 9, endLine: 10 },
    });
  });

  it('reports no cost bullet as null, not a refusal', () => {
    expect(cutSec3(DOC(HEAD))).toEqual({ head: { text: HEAD, startLine: 5, endLine: 6 }, cost: null });
  });

  it('ignores a cost bullet outside SEC-3\'s section', () => {
    expect(cutSec3(DOC(HEAD, `\n${COST}\n`))).toMatchObject({ cost: null });
  });

  it('refuses a missing or repeated SEC-3 head', () => {
    expect(cutSec3(DOC('**SEC-9 — Other.** Text.'))).toBe('.syzygy/governance/doctrine/security.md has 0 lines opening **SEC-3 —, not exactly one');
    expect(cutSec3(DOC(`${HEAD}\n\n${HEAD}`))).toBe('.syzygy/governance/doctrine/security.md has 2 lines opening **SEC-3 —, not exactly one');
  });

  it('refuses a SEC-3 with no SEC-4 after it', () => {
    expect(cutSec3(`${HEAD}\n`)).toBe('.syzygy/governance/doctrine/security.md has no single **SEC-4 — after SEC-3, so SEC-3\'s section has no end');
  });

  it('refuses two cost bullets', () => {
    expect(cutSec3(DOC(`${HEAD}\n\n${COST}\n${COST}`))).toBe('SEC-3\'s section in .syzygy/governance/doctrine/security.md has 2 bullets opening - **What the permitted case costs:**, not at most one');
  });
});

describe('readSec3 over the adopted security.md, read live', () => {
  it('quotes SEC-3\'s head and D9\'s cost bullet byte-equal to the file\'s lines', () => {
    const read = readSec3(REAL_ROOT);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.sec3.head).toEqual({ text: lines(61, 62), startLine: 61, endLine: 62 });
    expect(read.sec3.head.text.startsWith('**SEC-3 — Observed code is untrusted, everywhere.** Syzygy runs\n')).toBe(true);
    expect(read.sec3.cost).toEqual({ text: lines(95, 101), startLine: 95, endLine: 101 });
    expect(read.sec3.cost?.text.startsWith('- **What the permitted case costs:** the session runs with the owner\'s own\n')).toBe(true);
    expect(read.sec3.cost?.text.endsWith('  sandbox, and forbidding it.')).toBe(true);
    expect(read.sec3.sha256).toBe(createHash('sha256').update(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/doctrine/security.md'))).digest('hex'));
  });

  it('refuses a records root with no security.md, and one that is not UTF-8', () => {
    const root = tempDir('dossier-doctrine-');
    expect(readSec3(root)).toEqual({ ok: false, reason: '.syzygy/governance/doctrine/security.md cannot be read (ENOENT)' });
    fs.mkdirSync(path.join(root, '.syzygy/governance/doctrine'), { recursive: true });
    fs.writeFileSync(path.join(root, '.syzygy/governance/doctrine/security.md'), Buffer.from([0x2a, 0xff, 0x0a]));
    expect(readSec3(root)).toEqual({ ok: false, reason: '.syzygy/governance/doctrine/security.md is not valid UTF-8' });
  });
});
