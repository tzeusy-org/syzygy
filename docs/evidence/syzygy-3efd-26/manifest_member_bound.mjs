// Widest manifestFacts member at given caps, encoded as the check record encodes it (two-space JSON, member at depth 1).
const SAFE = Number.MAX_SAFE_INTEGER;
const censusPath = (p) => JSON.stringify(p).replace(/[`\u0080-\u009f\u2028\u2029]/gu, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const shown = (p) => (p.length <= 512 ? censusPath(p) : `${censusPath(p.slice(0, 512))} (${p.length - 512} more code units)`);
const notCitable = shown('\u0001'.repeat(512) + 'x'.repeat(16)).replace(/\(16 more/, `(${SAFE} more`);
const citablePath = '\u4e00'.repeat(512);
const lone = '\ud800'.repeat(256);

const [recognizerCount, filesPerRecognizer, factsListed, placesListed] = process.argv.slice(2).map(Number);
const fileEntry = { path: notCitable, epistemic: 'unknown', unknownReason: 'path-not-citable', parseFault: null, facts: null, valuesLeftOut: null };
const recognizer = (i) => ({
  rule: 'terraform-configuration', ruleVersion: SAFE, label: 'inferred', candidates: SAFE, secretPathsLeftOut: SAFE, setApart: SAFE, inferred: SAFE,
  unknown: SAFE, valuesLeftOut: SAFE, facts: SAFE, files: Array.from({ length: filesPerRecognizer }, () => fileEntry), filesNotListed: SAFE,
});
const fact = { id: `_manifest-${SAFE}`, fact: 'dependency', rule: 'python-project-manifest', ruleVersion: SAFE, path: citablePath, lines: [SAFE, SAFE],
  name: lone, section: 'target.build-dependencies', group: lone, epistemic: 'inferred' };
const member = {
  format: 'polaris-dossier-manifest-facts/2', state: 'derived',
  screeningPolicy: { policyId: lone.repeat(16), policyVersion: lone.repeat(16), sha256: 'f'.repeat(64) },
  recognizers: Array.from({ length: recognizerCount }, (_, i) => ({ ...recognizer(i), files: Array.from({ length: i < 5 ? 250 : filesPerRecognizer }, () => fileEntry) })),
  facts: Array.from({ length: factsListed }, () => fact), factsNotListed: SAFE,
};
if (placesListed > 0) member.remainder = {
  files: SAFE, secretPathsLeftOut: SAFE, candidates: SAFE, notCandidates: SAFE,
  places: Array.from({ length: placesListed }, () => ({ place: notCitable, files: SAFE, notCandidates: SAFE })),
  placesNotListed: SAFE, filesInPlacesNotListed: SAFE, notCandidatesInPlacesNotListed: SAFE,
};
const bytes = (v) => Buffer.byteLength(JSON.stringify(v, null, 2) + '\n', 'utf8');
const without = bytes({ format: 'polaris-dossier-check/1' });
const withMember = bytes({ format: 'polaris-dossier-check/1', manifestFacts: member });
console.log(JSON.stringify({ recognizerCount, filesPerRecognizer, factsListed, placesListed, memberBytes: withMember - without }));
