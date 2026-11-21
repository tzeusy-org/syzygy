import { describe, expect, it } from 'vitest';
import { findUrlParentAdoption, URL_PARENT_TAG } from './url-parent-adoption.js';

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

describe('URL parent adoption record', () => {
  it('finds the exact subject commit of a single complete adoption row', () => {
    expect(findUrlParentAdoption(`# Agent adoptions\n${row}\n`)).toEqual({ id: 'A-15', commit });
  });

  it.each(['', `${row}\n${row}\n`, row.replace(links[1]!, ''), row.replace('-m 1', '-m 2'),
    row.replace(`/blob/${commit}/`, '/blob/main/'), row.replace('A-15', 'Owner Act'),
    row.replace(URL_PARENT_TAG, 'wrong-version')])('refuses missing, ambiguous or mismatched record %#', record => {
    expect(findUrlParentAdoption(record)).toBeNull();
  });
});
