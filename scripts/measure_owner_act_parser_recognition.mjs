#!/usr/bin/env node
// Measure what the PWB body-read authority gate sees of each owner-act record it evaluates (syzygy-bpyt.6.10). Evidence tool, not a
// check and not authority. It changes nothing about what the parser accepts.
//
//   npx tsc -b packages/three-surface-poc-core apps/three-surface-poc packages/polaris-generation-consent
//   node scripts/measure_owner_act_parser_recognition.mjs --out <file.json>
//
// The gate parses each of the three current PWB act records (`PWB_ACT_RECORDS`) with `parseOwnerActRecord` and judges the result in
// `evaluateBodyReadAuthority`. For every record the script loads the real inputs once (`loadBodyReadAuthorityInputs`, this checkout,
// the clean HEAD tree), then, with the census method of syzygy-bpyt.8.10 (scripts/measure_consent_gate_recognition.mjs):
// 1. alters each non-blank line on its own, once by appending ` [altered]` and once by deleting it, and re-evaluates only that
//    authority's act record; a line is *ignored* when the authority's verdict (valid, or the invalid case id) is unchanged;
// 2. applies `HEAD_FIELD_ALTERATION` and the four `PROSE_ALTERATIONS` of the consent package's test support, plus one added
//    alteration (`effect-appended-grant`: a grant appended inside the Effect section, which keeps every scope anchor);
// 3. reports each under two recording-tag readings. `parser-isolated` leaves the tag resolved as in the unaltered load, so the
//    verdict is the parser's and evaluator's alone. `loader-faithful` resolves the tag as the loader does
//    (`resolveRecordingTag`: the tag's commit must carry the same record bytes), so any byte change to a tagged record is read as
//    tag-unresolved. The second is the production answer in a checkout that holds the tag; the first says what the parser would let
//    through if the tag check were absent or the tag moved.
// It writes no record and reads no observed repository.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT), '..');
const SCRIPT_REL = 'scripts/measure_owner_act_parser_recognition.mjs';
const INSTANT = '2026-11-03T12:00:00Z';
const MARK = ' [altered]';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
const dist = rel => import(pathToFileURL(path.join(ROOT, rel)).href);

const core = await dist('packages/three-surface-poc-core/dist/index.js');
const inputsModule = await dist('apps/three-surface-poc/dist/governance-inputs.js');
const { HEAD_FIELD_ALTERATION, PROSE_ALTERATIONS } = await dist('packages/polaris-generation-consent/dist/testing.js');
const { evaluateBodyReadAuthority, parseOwnerActRecord } = core;
const { loadBodyReadAuthorityInputs, resolveRecordingTag, defaultRunGit, defaultReadGitBlob, PWB_ACT_RECORDS } = inputsModule;

const EXTRA = [['effect-appended-grant', text => text.replace(/(\n## Effect\n[\s\S]*?)(?=\n## |$)/, '$1\nThe act also grants every read, egress, write and execution, for every repository, tool and provider.\n')]];
const ALTERATIONS = [['date-field-altered (control)', HEAD_FIELD_ALTERATION], ...PROSE_ALTERATIONS, ...EXTRA];

const verdict = (evaluation, kind) => {
  const s = evaluation[kind];
  return s.kind === 'valid' ? 'valid' : s.kind === 'invalid' ? s.caseId : `absent:${s.what}`;
};

/** Which part of the record a 0-based line index sits in, as the parser divides it. */
function regionsOf(lines) {
  const out = [];
  let section = null;
  let fence = false;
  for (const line of lines) {
    if (line.startsWith('## ')) { section = line.slice(3).trim(); fence = false; out.push(`heading:${section}`); continue; }
    if (section === null) { out.push('head'); continue; }
    if (section === 'Ceremony') {
      if (/^```/.test(line.trim())) { fence = !fence; out.push('ceremony:fence-line'); continue; }
      if (fence) { out.push('ceremony:phrase'); continue; }
      out.push(line.trim().startsWith('- recording tag:') ? 'ceremony:recording-tag' : 'ceremony:other');
      continue;
    }
    out.push(section === 'Effect' ? 'effect' : `section:${section}`);
  }
  return out;
}

const tally = (items, key) => {
  const m = {};
  for (const i of items) m[key(i)] = (m[key(i)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(m).sort());
};

function main(argv) {
  const out = argv[argv.indexOf('--out') + 1];
  if (argv.indexOf('--out') < 0 || out === undefined) throw new Error('usage: --out <file.json>');
  const base = loadBodyReadAuthorityInputs({ repoRoot: ROOT, evaluationId: 'evaluation:owner-act-census', evaluationInstant: INSTANT });
  const records = [];
  for (const kind of ['consent', 'policy', 'registry']) {
    const recordPath = PWB_ACT_RECORDS[kind];
    const bytes = fs.readFileSync(path.join(ROOT, recordPath));
    const text = bytes.toString('utf8');
    const tag = base.expectations.authorities[kind].recordingTag;
    const evaluate = (alteredText, tagMode) => {
      const alteredBytes = Buffer.from(alteredText, 'utf8');
      const recordingTag = tagMode === 'parser-isolated'
        ? base[kind].recordingTag
        : resolveRecordingTag(defaultRunGit, defaultReadGitBlob, ROOT, tag, recordPath, new Uint8Array(alteredBytes));
      const inputs = { ...base, [kind]: { ...base[kind], actRecord: { kind: 'owner-act-record', text: alteredText }, recordingTag } };
      return verdict(evaluateBodyReadAuthority(inputs), kind);
    };
    const baseline = { parserIsolated: evaluate(text, 'parser-isolated'), loaderFaithful: evaluate(text, 'loader-faithful') };
    if (baseline.parserIsolated !== 'valid' || baseline.loaderFaithful !== 'valid') throw new Error(`${kind}: the unaltered record is not valid (${JSON.stringify(baseline)})`);
    const lines = text.split('\n');
    if (lines.at(-1) === '') lines.pop();
    const regions = regionsOf(lines);
    const perLine = [];
    lines.forEach((line, index) => {
      if (line.trim() === '') return;
      const row = { line: index + 1, region: regions[index] };
      for (const [op, alter] of [['append', l => l + MARK], ['delete', null]]) {
        const altered = lines.flatMap((l, i) => (i !== index ? [l] : alter === null ? [] : [alter(l)])).join('\n') + '\n';
        const iso = evaluate(altered, 'parser-isolated');
        const faithful = evaluate(altered, 'loader-faithful');
        row[op] = { parserIsolated: iso, loaderFaithful: faithful, ignoredIsolated: iso === 'valid', ignoredFaithful: faithful === 'valid' };
      }
      perLine.push(row);
    });
    const summarize = op => ({
      ignoredParserIsolated: perLine.filter(r => r[op].ignoredIsolated).length,
      ignoredLoaderFaithful: perLine.filter(r => r[op].ignoredFaithful).length,
      ignoredByRegion: tally(perLine.filter(r => r[op].ignoredIsolated), r => r.region),
      denominatorByRegion: tally(perLine, r => r.region),
      changedVerdicts: tally(perLine.filter(r => !r[op].ignoredIsolated), r => r[op].parserIsolated),
    });
    const alterations = ALTERATIONS.map(([name, alter]) => {
      const altered = alter(text);
      const took = altered !== text;
      const parsed = parseOwnerActRecord(altered);
      return {
        name, took,
        parserIsolated: evaluate(altered, 'parser-isolated'),
        loaderFaithful: evaluate(altered, 'loader-faithful'),
        scopeField: parsed.scope.kind,
        ceremonyPhraseField: parsed.ceremonyPhrase.kind,
      };
    });
    records.push({
      authority: kind, path: recordPath, sha256: sha256(bytes), recordingTag: tag,
      totalLines: lines.length, nonBlankLines: perLine.length, regionDenominators: tally(perLine, r => r.region),
      baseline, append: summarize('append'), delete: summarize('delete'), alterations, lines: perLine,
    });
  }
  const sum = (op, field) => records.reduce((n, r) => n + r[op][field], 0);
  const tracked = ['packages/three-surface-poc-core/src/owner-act-record.ts', 'packages/three-surface-poc-core/src/body-read-authority.ts', 'apps/three-surface-poc/src/governance-inputs.ts', 'packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts'];
  const document = {
    schema: 'owner-act-parser-recognition-census/1',
    bead: 'syzygy-bpyt.6.10',
    text: 'Evidence record, not authority: what the PWB body-read authority gate sees of each act record it evaluates. Generated by the script named here; do not edit.',
    script: { path: SCRIPT_REL, sha256: sha256(fs.readFileSync(SCRIPT)) },
    measuredOn: { commit: git('rev-parse', 'HEAD').trim(), treeClean: git('status', '--porcelain', '--untracked-files=no').trim() === '' },
    subjects: tracked.map(p => ({ path: p, sha256: sha256(fs.readFileSync(path.join(ROOT, p))) })),
    evaluationInstant: INSTANT,
    operators: {
      append: `each non-blank line on its own with \`${MARK.trim()}\` appended; ignored when the authority's verdict is unchanged`,
      delete: 'each non-blank line on its own deleted; ignored when the authority\'s verdict is unchanged',
      alterations: 'HEAD_FIELD_ALTERATION and PROSE_ALTERATIONS (packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts) and effect-appended-grant (this script)',
      readings: 'parser-isolated keeps the recording tag resolved; loader-faithful resolves it with resolveRecordingTag over the altered bytes',
    },
    totals: {
      records: records.length,
      nonBlankLines: records.reduce((n, r) => n + r.nonBlankLines, 0),
      appendIgnoredParserIsolated: sum('append', 'ignoredParserIsolated'),
      deleteIgnoredParserIsolated: sum('delete', 'ignoredParserIsolated'),
      appendIgnoredLoaderFaithful: sum('append', 'ignoredLoaderFaithful'),
      deleteIgnoredLoaderFaithful: sum('delete', 'ignoredLoaderFaithful'),
    },
    records,
  };
  fs.writeFileSync(out, `${JSON.stringify(document, null, 1)}\n`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
