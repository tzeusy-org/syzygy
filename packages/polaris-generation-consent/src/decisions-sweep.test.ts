import { createHash } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadRecorderForms, RECORDER_FORMS_TIMEOUT_MS, renderRegistryAct } from './recorder-fixtures.testkit.js';
import {
  DECISIONS_DIR, REGISTRY_GIT_SOURCE_ACT_FORM, createPackageAdmissionReader, readDigestBoundActState, type DigestBoundActForm, type PackageReaderFs,
} from './package-reader.js';

// The recorder forms render once, before any other hook of this file (syzygy-bpyt.4.8).
beforeAll(loadRecorderForms, RECORDER_FORMS_TIMEOUT_MS);

// The decisions sweep reads each swept file's text in its spellings once, whatever the number of needles, and only for that file
// (syzygy-bpyt.8.20): a file walked after another is read in its own spellings, and a file's new bytes are read in theirs. Verdicts and
// reasons are literals.

const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const D = DECISIONS_DIR;
const ENTRY = '{"entries":[{"observerId":"x"}]}\n';
const ACT_FILE = `${D}/${REGISTRY_GIT_SOURCE_ACT_FORM.file}`;
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const STEM = 'public-admission-registry-git-source';

/** A file system over a map of repository-relative paths under `/r`: a directory is any proper prefix of a key. */
function memoryFs(files: Readonly<Record<string, string>>): PackageReaderFs {
  return {
    readdir: async dir => {
      const prefix = `${dir.slice(3)}/`;
      const names = new Set(Object.keys(files).filter(f => f.startsWith(prefix)).map(f => f.slice(prefix.length).split('/')[0]!));
      if (!dir.startsWith('/r/') || names.size === 0) throw new Error('enoent');
      return [...names];
    },
    readFile: async file => { const key = file.slice(3); if (!(key in files)) throw new Error('enoent'); return files[key]!; },
  };
}
const read = (files: Readonly<Record<string, string>>, form: DigestBoundActForm = REGISTRY_GIT_SOURCE_ACT_FORM) =>
  readDigestBoundActState({ root: '/r', fs: memoryFs(files), now: NOW, form });

let BASE: Readonly<Record<string, string>> = {};
beforeAll(() => {
  BASE = Object.freeze({
    [REGISTRY_GIT_SOURCE_ACT_FORM.artifact]: ENTRY,
    [ACT_FILE]: renderRegistryAct(sha(ENTRY), '2026-10-07', '2026-10-07T09:30:00Z'),
    [`${D}/AA-NOTES.md`]: '# Notes\n\nNothing about any act.\n',
  });
});
const named = (rel: string) => ({
  state: 'refused', why: `${D}/${rel} names the act without being its record: a withdrawal or a form this reader does not define`, namedBy: `${D}/${rel}`,
});

describe('each swept file is read in its own spellings', () => {
  it('reads the act in force when no other file names it', async () => {
    expect((await read(BASE)).state).toBe('ok');
  });
  // AA-NOTES.md is swept first in each world; the file that names the act is walked after it.
  it.each([
    ['its stem in prose', 'ZZ-NOTES.md', `See ${STEM}.\n`],
    ['its stem split by backticks, read loosely', 'ZZ-NOTES.md', 'See public-admission-`registry`-git-source.\n'],
    ['its stem on a field line of the aggregate record', 'ACCEPTANCE-ACT-RECORD.md', `# Acceptance act record\n\nRecord ID: ${STEM}\n`],
  ])('refuses on a file walked after a file that does not name it: %s', async (_name, file, text) => {
    expect(await read({ ...BASE, [`${D}/${file}`]: text })).toEqual(named(file));
  });
  it('reads a file\'s new bytes in their own spellings when the same file is edited between two reads', async () => {
    const files: Record<string, string> = { ...BASE, [`${D}/ZZ-NOTES.md`]: '# Notes\n' };
    expect((await read(files)).state).toBe('ok');
    files[`${D}/ZZ-NOTES.md`] = `See ${STEM}.\n`;
    expect(await read(files)).toEqual(named('ZZ-NOTES.md'));
    files[`${D}/ZZ-NOTES.md`] = '# Notes\n';
    expect((await read(files)).state).toBe('ok');
  });
});

// A cost contract, not a behaviour: a loose sweep (a digest-bound form's) folds each swept file's whole text at most three times (its
// stem spellings, those of its loose reading, and the fold its field lines are read from), however many needles the form has. Before
// syzygy-bpyt.8.20 it folded the text twice per needle, 19 times for this form's nine. Each fold of a text calls
// `String.prototype.normalize` on it once, so the test counts those calls on strings longer than `LONG`; it never times anything.
describe('the decisions sweep\'s cost contract', () => {
  const LONG = 10_000, FILES = 6;
  const COST_FORM: DigestBoundActForm = Object.freeze({
    file: 'COST-PROBE-ACT.md', title: '# Owner act \u2014 cost probe', type: 'adopt-registry-entry',
    identity: (date: string) => `COST-PROBE-${date}`, artifact: '.syzygy/governance/cost-probe.json',
    stems: Object.freeze(['cost-probe-one', 'cost-probe-two', 'cost-probe-three', 'cost-probe-four', 'cost-probe-five', 'cost-probe-six', 'cost-probe-seven', 'cost-probe-eight']),
  });
  let TREE: Readonly<Record<string, string>> = {};
  beforeAll(() => {
    // Prose with a dash, a no-break space and an accent, so every fold has work to do, and no needle in any spelling.
    const prose = 'Owner notes \u2014 nothing\u00a0here names an act; caf\u00e9 minutes, kept for the record.\n'.repeat(300);
    expect(prose.length).toBeGreaterThan(2 * LONG);
    TREE = Object.freeze(Object.fromEntries(Array.from({ length: FILES }, (_, i) => [`${D}/NOTES-${i}.md`, `# Notes ${i}\n\n${prose}`])));
  });
  afterEach(() => vi.restoreAllMocks());

  it('folds each swept file\'s text at most three times in a sweep with nine needles (cost test)', async () => {
    const normalize = vi.spyOn(String.prototype, 'normalize');
    expect(await read(TREE, COST_FORM)).toEqual({ state: 'absent', why: `no owner-act record ${D}/COST-PROBE-ACT.md exists` });
    const folds = normalize.mock.contexts.filter(self => String(self).length > LONG).length;
    expect(folds).toBeGreaterThanOrEqual(FILES);
    expect(folds).toBeLessThanOrEqual(3 * FILES);
  });
});

// The admission sweep reads its paths on field lines only (syzygy-bpyt.8.22): in text, each path names the admission act through the
// admission stem its folded spelling contains, so a file whose text carries a path, in any spelling, still refuses the read.
describe('an admission path in a decisions file\'s text', () => {
  const PATHS = [
    '.syzygy/governance/contracts/candidates/public-repo-admission/instances',
    '.syzygy/governance/contracts/candidates/public-egress-v2/instances/egress-anthropic/EGRESS-CONSENT-ANTHROPIC.md',
    '.syzygy/governance/contracts/candidates/public-repo-admission/',
    '.syzygy/governance/contracts/candidates/public-egress-v2/',
  ];
  const SPELLINGS: ReadonlyArray<readonly [string, (p: string) => string]> = [
    ['as written', p => p],
    ['upper case with underscores', p => p.toUpperCase().replace(/-/g, '_')],
    ['with a soft hyphen before each dash', p => p.replace(/-/g, '\u00ad-')],
  ];
  const readAdmission = (files: Readonly<Record<string, string>>) => createPackageAdmissionReader({ root: '/r', fs: memoryFs(files) }).read();
  const world = (text: string) => ({ [`${D}/README.md`]: '# decisions\n', [`${D}/NOTES.md`]: text });

  it('reads no admission record, and refuses nothing, when no file names the act', async () => {
    expect(await readAdmission(world('# Notes\n\nSee .syzygy/governance/contracts/candidates/other-package/.\n'))).toEqual([]);
  });
  for (const p of PATHS) {
    it.each(SPELLINGS)(`refuses on ${p} in prose, %s`, async (_name, spell) => {
      await expect(readAdmission(world(`# Notes\n\nSee ${spell(p)} for the instances.\n`))).rejects.toThrow('invalid-records');
    });
  }
});
