import { describe, expect, it } from 'vitest';
import { findUrlParentAdoption, parseUrlParentRefs, URL_PARENT_DEFAULT_REF, URL_PARENT_TAG } from './url-parent-adoption.js';

const commit = 'a'.repeat(40);
const change = 'openspec/changes/dossier-url-declared-source-run/proposed';
const governance = '.syzygy/governance';
const subjects = [
  [ 'Specification', `${change}/polaris-generation/spec.md` ],
  [ 'Amendment', `${change}/contracts/DOSSIER-URL-LOCAL-MACHINE-CREDENTIAL-AMENDMENT.md` ],
  [ 'Policy', `${governance}/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json` ],
  [ 'Applicability', `${governance}/decisions/DOSSIER-URL-RUN-CONTRACT-APPLICABILITY.md` ],
] as const;
const links = subjects.map(([label, file]) => `[${label}](https://github.com/tzeusy-org/syzygy/blob/${commit}/${file})`);
const row = `| A-15 | 2026-11-21 | \`${commit}\` | ${links.join(', ')} | Apply reviewed URL dossier 2.1 | \`git revert -m 1 ${commit}\` | \`${URL_PARENT_TAG}\` |`;
const ledger = (data: string): string => `# Agent adoptions\n\n| Id | Date | Commit | What changed | Why | Revert | Tag |\n|---|---|---|---|---|---|---|\n${data}\n`;

describe('URL parent adoption record', () => {
  it('finds the exact subject commit of a single complete adoption row', () => {
    expect(findUrlParentAdoption(ledger(row))).toEqual({ id: 'A-15', commit });
  });

  it.each(['', `${row}\n${row}\n`, row.replace(links[1]!, ''), row.replace('-m 1', '-m 2'),
    row.replace(`/blob/${commit}/`, '/blob/main/'), row.replace('A-15', 'Owner Act'),
    row.replace(URL_PARENT_TAG, 'wrong-version')])('refuses missing, ambiguous or mismatched record %#', record => {
    expect(findUrlParentAdoption(ledger(record))).toBeNull();
  });

  it('distinguishes actual ledger entries from standalone and fenced examples', () => {
    expect(findUrlParentAdoption(row)).toBeNull();
    expect(findUrlParentAdoption(`# Agent adoptions\n\n\`\`\`markdown\n${ledger(row)}\`\`\`\n`)).toBeNull();
    expect(findUrlParentAdoption(`~~~markdown\n${ledger(row)}~~~\n\n${ledger(row)}`)).toEqual({ id: 'A-15', commit });
  });

  it('honors a later explicit veto even with the original tagged row and subjects present', () => {
    const later = (action: string): string => ledger(`${row}\n| A-16 | 2026-11-22 | \`bbb0000\` | ${action} | Test case | — | — |`);
    expect(findUrlParentAdoption(later('Veto A-15 at the owner’s direction'))).toBeNull();
    expect(findUrlParentAdoption(later('Retire \`aaaaaaa\`'))).toBeNull();
    expect(findUrlParentAdoption(later(`Revert ${subjects[2][1]}`))).toBeNull();
    expect(findUrlParentAdoption(later('Document the results observed after A-15'))).toEqual({ id: 'A-15', commit });
    expect(findUrlParentAdoption(later('Revert A-150'))).toEqual({ id: 'A-15', commit });
    expect(findUrlParentAdoption(later('Revert A-150 after documenting A-15'))).toEqual({ id: 'A-15', commit });
  });
});

describe('URL parent exact references', () => {
  it('admits the exact direct refs and preserves the raw annotated tag object identity', () => {
    const tagRef = `refs/tags/${URL_PARENT_TAG}`;
    const tagObject = 'b'.repeat(40);
    const actual = `${URL_PARENT_DEFAULT_REF}\0${commit}\0\n${tagRef}\0${tagObject}\0\n`;
    expect(parseUrlParentRefs(Buffer.from(actual))).toEqual({ defaultCommit: commit, tagObject });
    expect(parseUrlParentRefs(Buffer.from(actual.replace(URL_PARENT_DEFAULT_REF, `refs/tags/${URL_PARENT_DEFAULT_REF}`)))).toBeNull();
    expect(parseUrlParentRefs(Buffer.from(actual.replace(tagRef, `refs/heads/${tagRef}`)))).toBeNull();
    expect(parseUrlParentRefs(Buffer.from(actual.replace(`${commit}\0\n`, `${commit}\0refs/heads/main\n`)))).toBeNull();
  });
});
