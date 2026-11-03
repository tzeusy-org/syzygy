import { readFile as nodeReadFile, readdir as nodeReaddir } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from '@syzygy/support';
import { AdmissionRecordError, COMMIT_OBJECT_ID, type AdmissionRecord, type AdmissionRecordReader } from './admission-record.js';
import { inForceRecords, notInForceRecords, type NotInForce } from './in-force.js';
import { CITATION_ALLOWLIST } from './citation-allowlist.js';
import { SLOT, recorderTemplate, templateFields, type RecorderTemplate } from './recorder-template.js';

/** Reads admission records from the public-repo-admission package layout.
 *
 * A candidate instance record under `instances/**` binds nothing and is never
 * returned. A record exists only when an owner act record in the closed list
 * `ADMISSION_ACT_FORMS` names it by path and digest. If the instance bytes no
 * longer hash to the act's digest the record comes back with `inForceAt: null`
 * (the act bound other bytes). The instant is the act record's one
 * `Recorded at (UTC)` line; a record without it is unreadable and refuses the
 * read. Every field is read from prose only: a line inside a code fence never
 * counts, and a field that appears only there (or that differs between the whole
 * file and its prose) refuses the read. Every file under the decisions directory,
 * at any depth, is looked at: one that is outside the closed list and the pins
 * but carries an admission stem, artifact path, act identity or record id refuses
 * the whole read. That sweep is a stem match after case, Unicode-compatibility,
 * dash, `_`/whitespace and default-ignorable folding (`stemFolds`); it is a backstop
 * for withdrawal forms nobody has defined, not a parser of them, and a withdrawal
 * worded without a stem ("I withdraw the redis consent") is not seen. */

export const DECISIONS_DIR = '.syzygy/governance/decisions';
export const INSTANCES_DIR = '.syzygy/governance/contracts/candidates/public-repo-admission/instances';
export const EGRESS_V2_INSTANCE = '.syzygy/governance/contracts/candidates/public-egress-v2/instances/egress-anthropic/EGRESS-CONSENT-ANTHROPIC.md';
/** A recorder's act form for an admission record: the one file it writes, its title, the identity it renders and the one instance it
 * binds (scripts/record_public_repo_admission_acts.py, scripts/record_public_egress_v2_act.py). The list is closed: a decisions file
 * about the package that is not one of these (or the pinned owner-answers direction) refuses the read, and an act whose type,
 * identity, title or artifact is not its form's is refused. */
export interface AdmissionActForm { readonly file: string; readonly title: string; readonly type: 'consent-observation' | 'consent-egress'; readonly identity: (date: string) => string; readonly artifact: string; readonly version: 1 | 2 }
export const ADMISSION_ACT_FORMS: readonly AdmissionActForm[] = Object.freeze(([
  { file: 'PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md', title: '# Owner act — psf/requests public-repository observation consent', type: 'consent-observation', identity: d => `PUBLIC-OBS-REQUESTS-${d}`, artifact: `${INSTANCES_DIR}/requests/OBSERVATION-CONSENT.md`, version: 1 },
  { file: 'PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md', title: '# Owner act — redis/redis public-repository observation consent', type: 'consent-observation', identity: d => `PUBLIC-OBS-REDIS-${d}`, artifact: `${INSTANCES_DIR}/redis/OBSERVATION-CONSENT.md`, version: 1 },
  { file: 'PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md', title: '# Owner act — public-target egress consent to Anthropic', type: 'consent-egress', identity: d => `PUBLIC-EGRESS-ANTHROPIC-${d}`, artifact: `${INSTANCES_DIR}/egress-anthropic/EGRESS-CONSENT-ANTHROPIC.md`, version: 1 },
  { file: 'PUBLIC-EGRESS-V2-ANTHROPIC-ACT.md', title: '# Owner act — public-target egress consent to Anthropic, version 2', type: 'consent-egress', identity: d => `PUBLIC-EGRESS-ANTHROPIC-V2-${d}`, artifact: EGRESS_V2_INSTANCE, version: 2 },
] as readonly AdmissionActForm[]).map(form => Object.freeze(form)));
/** The v2 record's revocation line, exactly: it replaces version 0.1.0-candidate.7 of the same record once its own act is in force (RFC5-13). */
const V2_REVOCATION = 'Proposed revocation state: active; supersedes version 0.1.0-candidate.7 of this record, if an act over that version is in force, from the effective instant of the act on this version (prospective, RFC5-13); with none in force it supersedes nothing';
const V2_SUPERSEDES = 'PUBLIC-EGRESS-anthropic@0.1.0-candidate.7';
/** The one plain owner direction in the package's name space, pinned by name and digest: it performs no act. Any other
 * file (or these bytes edited) is an unknown form and refuses the whole read. */
const OWNER_ANSWERS_FILE = 'PUBLIC-REPO-ADMISSION-OWNER-ANSWERS-2026-10-03.md';
const OWNER_ANSWERS_SHA256 = '549a746e108d06581ac7e0a653023692f7f7664075c81e5502918322feb5145c';
const DAY_MS = 86_400_000;

export interface PackageReaderFs {
  readonly readdir: (dir: string) => Promise<readonly string[]>;
  readonly readFile: (file: string) => Promise<string>;
}
const nodeFs: PackageReaderFs = { readdir: dir => nodeReaddir(dir), readFile: file => nodeReadFile(file, 'utf8') };

const refuse = (): never => { throw new AdmissionRecordError('invalid-records'); };

/** The text with every fenced code block and every HTML comment blanked. Fences follow CommonMark: one opens on a line of three or
 * more backticks or tildes, up to three spaces in (a backtick opener's info string holds no backtick), and closes only on a run of
 * the same character at least as long, with nothing but whitespace after it; an unclosed fence or comment runs to the end. Line
 * count is kept. (One of five fence readers, each with its own rule: docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json.) */
function outsideFences(text: string): string {
  let open: string | null = null;
  const unfenced = text.split('\n').map(line => {
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (open === null) { if (m !== null && !(m[1]![0] === '`' && m[2]!.includes('`'))) { open = m[1]!; return ''; } return line; }
    if (m !== null && m[1]![0] === open[0] && m[1]!.length >= open.length && m[2]!.trim() === '') open = null;
    return '';
  }).join('\n');
  return unfenced.replace(/<!--[\s\S]*?(?:-->|$)/g, comment => comment.replace(/[^\n]/g, ''));
}
/** The one capture of `re` in the prose. Refuses when it is absent, repeated, or counts differently once fences are ignored (a field
 * that is partly or wholly inside a fence is not a field). */
const one = (text: string, re: RegExp): string => {
  const all = [...text.matchAll(re)], prose = [...outsideFences(text).matchAll(re)];
  return all.length === 1 && prose.length === 1 ? prose[0]![1]! : refuse();
};
/** Unicode-folded, case-folded, dash-folded: the spelling a reader compares names and field values in. */
const fold = (value: string): string => value.normalize('NFKC').replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/gu, '-').toLowerCase();
/** The spellings the withdrawal sweeps match stems and paths in: `fold`, each run of `_` or whitespace read as a dash, and every
 * default-ignorable code point (soft hyphen, zero-width space) once dropped and once read as a dash, runs of dashes collapsed. */
const stemFolds = (value: string): readonly string[] => {
  const base = fold(value).replace(/[_\s]+/gu, '-');
  return [base.replace(/\p{Default_Ignorable_Code_Point}/gu, ''), base.replace(/\p{Default_Ignorable_Code_Point}/gu, '-')].map(form => form.replace(/-+/g, '-'));
};
/** Whether `text`, in any of its stem spellings, carries `needle` (a stem or path, in its one folded spelling). */
const carries = (text: string, needle: string): boolean => { const n = stemFolds(needle)[0]!; return stemFolds(text).some(form => form.includes(n)); };

async function walk(fs: PackageReaderFs, dir: string, prefix = '', depth = 0, found: string[] = []): Promise<string[]> {
  if (depth > 6) return refuse();
  let names: readonly string[];
  try { names = await fs.readdir(dir); } catch { return refuse(); }
  for (const name of [...names].sort()) {
    let children: readonly string[] | null = null;
    try { children = await fs.readdir(path.join(dir, name)); } catch { children = null; }   // a file, not a directory
    if (children !== null) await walk(fs, path.join(dir, name), `${prefix}${name}/`, depth + 1, found); else found.push(`${prefix}${name}`);
    if (found.length > 5000) return refuse();
  }
  return found;
}

interface Act { readonly type: 'observation' | 'egress'; readonly inForce: number; readonly artifact: string; readonly digest: string; readonly version: 1 | 2 }

/** The act's effective instant: its one `Recorded at (UTC)` line (whole seconds, the same calendar day as `Date:`). The recorders
 * always write it; a record without one, or with a second or oddly spelled one, is unreadable. */
function actInstant(text: string, date: string, label = 'Recorded at \\(UTC\\)', loose = /^\s*recorded at\b/gim): number {
  const prose = outsideFences(text);
  if ([...text.matchAll(loose)].length !== 1 || [...prose.matchAll(loose)].length !== 1) return refuse();   // absent, repeated, or only in a fence
  const value = one(text, new RegExp(`^${label}: (\\S+)$`, 'gm'));
  const m = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}Z$/.exec(value);
  const at = m === null ? NaN : Date.parse(value);
  if (m === null || m[1] !== date || !Number.isSafeInteger(at) || new Date(at).toISOString().slice(0, 19) + 'Z' !== value) return refuse();
  return at;
}

/** The act's one `Supersession / revocation:` field with its wrapped continuation lines (up to the next blank line) joined by a space;
 * '' when the act has none. A repeated field, or one that counts differently once fences and comments are ignored, refuses. */
function supersessionText(text: string): string {
  const re = /^Supersession \/ revocation:/gm;
  const lines = outsideFences(text).split('\n'), at = lines.map((line, i) => (re.test(line) ? i : -1)).filter(i => i >= 0);
  re.lastIndex = 0;
  if (at.length > 1 || [...text.matchAll(re)].length !== at.length) return refuse();
  if (at.length === 0) return '';
  const out: string[] = [];
  for (const line of lines.slice(at[0])) { if (line.trim() === '') break; out.push(line.trim()); }
  return out.join(' ');
}

/** What the strict readers return for one act record: the recorder's head fields, parsed from prose only. */
export interface ParsedAct { readonly file: string; readonly identity: string; readonly type: string; readonly artifact: string; readonly project: string; readonly digest: string; readonly date: string; readonly recordedAt: number; readonly supersession: string; readonly text: string }

function bullets(source: string, heading: RegExp): string[] {
  const text = outsideFences(source);
  const start = text.search(heading);
  if (start < 0) return refuse();
  const lines = text.slice(start).split('\n').slice(1);
  const out: string[] = [];
  for (const line of lines.slice(lines.findIndex(l => l.startsWith('- ')))) {
    if (!line.startsWith('- ')) break;
    out.push(line.slice(2));
  }
  return out;
}

/** The `- ` item lines of the section that starts at the one heading equal to `heading` and runs to the next ATX heading of any level
 * (prose only). The list taken starts at the first line beginning `- ` and runs through `- `, blank and indented lines; it ends at the
 * first other line. A section with no `- ` line refuses, and so does any `-`, `*` or `+` bullet (indented or not) after the list
 * ends, as in `<details>` placed after it. Not refused, only ignored: an ordered list (`1.`) anywhere, and a `*` or `+` list before
 * the first `- ` line. A setext heading does not end the section. An indented line inside the list (an indented `<details>`, say)
 * does not end it, so a later `- ` item is still taken. */
function sectionList(source: string, heading: string): string[] {
  const lines = outsideFences(source).split('\n');
  const at = lines.map((line, i) => (line === heading ? i : -1)).filter(i => i >= 0);
  if (at.length !== 1 || source.split('\n').filter(line => line === heading).length !== 1) return refuse();
  const rest = lines.slice(at[0]! + 1), end = rest.findIndex(line => /^ {0,3}#{1,6}(?: |$)/.test(line));
  const body = end < 0 ? rest : rest.slice(0, end);
  const start = body.findIndex(line => line.startsWith('- '));
  if (start < 0) return refuse();
  let stop = body.slice(start).findIndex(line => !(line.startsWith('- ') || line.trim() === '' || /^\s/.test(line)));
  stop = stop < 0 ? body.length : start + stop;
  if (body.slice(stop).some(line => /^\s*[-*+] /.test(line))) refuse();
  return body.slice(start, stop).filter(line => line.startsWith('- '));
}

/** The observation record's one `Upstream:` URL (the template writes `Upstream: <url> (public; configuration, not repository
 * identity)`), or null when the record has no such line. The URL is configuration that lets a caller find the record for a URL; it is
 * never the repository's identity. A repeated line, one that counts differently once fences are ignored, or one whose value is not a
 * plain https URL refuses the read. */
function upstreamOf(text: string): string | null {
  if ([...text.matchAll(/^Upstream:/gm)].length === 0) return null;
  return one(text, /^Upstream: (https:\/\/[A-Za-z0-9.-]+\/[^\s()`]+?)(?: \([^\n]*\))?$/gm);
}

function parseInstance(text: string, act: Act, inForceAt: number | null): AdmissionRecord {
  const recordId = one(text, /^Record ID: `([^`\n]+)`$/gm);
  const version = one(text, /^Record version: `([^`\n]+)`$/gm);
  const subject = one(text, /^Subject: `([^`\n]+)`$/gm);
  // The revocation line is exactly the form's (the first versions supersede nothing; version 2 supersedes version 1 of its record): any other successor form is refused rather than guessed.
  const revocation = one(text, /^(Proposed revocation state: .*)$/gm);
  if (revocation !== (act.version === 2 ? V2_REVOCATION : 'Proposed revocation state: active; supersedes no earlier consent')) refuse();
  if (act.version === 2 && (act.type !== 'egress' || recordId !== 'PUBLIC-EGRESS-anthropic' || version !== '0.2.0-candidate.1')) refuse();
  // Supersession follows the act's instant, not the bytes: a successor whose bytes later drift still replaced its predecessor.
  const base = { recordId, version, digest: act.digest, inForceAt, withdrawnAt: null, supersedes: act.version === 2 ? V2_SUPERSEDES : null, supersessionAt: act.version === 2 ? act.inForce : null, project: 'project:syzygy' } as const;
  if (act.type === 'observation') {
    const m = /^\(project:syzygy, repository:([a-z0-9][a-z0-9-]*)\)$/.exec(subject) ?? refuse();
    // Only the rows of the admitted-revisions table count: the one header, its separator, then consecutive rows.
    one(text, /^(\| Label \| Commit object id \|)$/gm);
    const lines = outsideFences(text).split('\n'), head = lines.indexOf('| Label | Commit object id |');
    if (lines[head + 1] !== '|---|---|') refuse();
    const revisions: string[] = [], labels: string[] = [];
    for (const line of lines.slice(head + 2)) {
      const row = /^\| `([^`\n]+)` \| `([0-9a-f]+)` \|$/.exec(line);
      if (row === null) break;
      labels.push(row[1]!); revisions.push(row[2]!);
    }
    // A label names one commit and a commit has one label: a duplicate of either (a label in any case) is ambiguous, so the table is unreadable.
    if (revisions.length === 0 || !revisions.every(id => COMMIT_OBJECT_ID.test(id)) || new Set(labels.map(fold)).size !== labels.length || new Set(revisions).size !== revisions.length) refuse();
    return Object.freeze({ ...base, class: 'observation', repositoryId: m![1]!, providerId: null, upstream: upstreamOf(text), admittedRevisions: Object.freeze(revisions), revisionLabels: Object.freeze(labels), admittedRepositories: Object.freeze([]), contentClasses: Object.freeze([]) });
  }
  const m = /^\(project:syzygy, provider:([a-z0-9][a-z0-9-]*)\)$/.exec(subject) ?? refuse();
  // Only the Scope section lists admitted repositories: a bullet naming one elsewhere ("not admitted", an example) is not a grant.
  const repositories = sectionList(text, '## Scope').map(line => /^- `\(project:syzygy, repository:([a-z0-9][a-z0-9-]*)\)`$/.exec(line)?.[1]).filter((id): id is string => id !== undefined);
  const classes = bullets(text, /^Permitted content classes/m).map(line => /^`([a-z-]+)`$/.exec(line)?.[1] ?? refuse());
  if (repositories.length === 0 || classes.length === 0 || new Set(repositories).size !== repositories.length) refuse();
  return Object.freeze({ ...base, class: 'egress', repositoryId: null, providerId: m![1]!, upstream: null, admittedRevisions: Object.freeze([]), revisionLabels: Object.freeze([]), admittedRepositories: Object.freeze(repositories), contentClasses: Object.freeze(classes) });
}

/** The RFC5-14 content-class amendment that version 2's `project-documentation` class depends on (scripts/record_rfc5_project_documentation_act.py):
 * the act record exists in the form the recorder writes, and the installed module hashes to its digest. */
const CLASS_ACT_FILE = 'RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md';
const CLASS_MODULE = '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md';
const CLASS_TITLE = '# Owner act — RFC5-14 project-documentation content-class amendment';
const CLASS_ACT_FORM: ActForm = Object.freeze({
  file: CLASS_ACT_FILE, title: CLASS_TITLE, type: 'contract-amendment', identity: (date: string) => `RFC5-PROJECT-DOCUMENTATION-AMEND-${date}`, artifact: CLASS_MODULE,
});
async function checkClassAct(fs: PackageReaderFs, root: string, v2At: number): Promise<void> {
  const hit = await readClassAct(fs, root);   // only the recorder's file at the top of the decisions directory is the act
  // The amendment took effect no later than the egress act that relies on it.
  if (hit === null || hit.act.recordedAt > v2At) refuse();
}

/** A decisions file that is outside the closed list and the pins yet names an admission artifact, an act identity or a record id,
 * in any case, spelling or directory, is a withdrawal (or a forgery) in a form this reader does not define. Naming means the folded
 * text of the whole file, prose or not. The one exemption is the aggregate acceptance record the recorders append to: it names every
 * act in tables and headings by design, so only its field lines count. */
const ADMISSION_STEMS = ['public-repo-admission', 'public-egress-v2', 'public-obs-', 'public-egress-anthropic', 'public-egress-'];
const ADMISSION_PATHS = [INSTANCES_DIR, EGRESS_V2_INSTANCE, '.syzygy/governance/contracts/candidates/public-repo-admission/', '.syzygy/governance/contracts/candidates/public-egress-v2/'];
const AGGREGATE_RECORD = 'ACCEPTANCE-ACT-RECORD.md';

/** Citations of existing tooling, exactly as written (case and all): `scripts/<name>` or the bare `<name>` of a snake_case code file
 * that is in `scripts/` now (`scripts/build_public_egress_v2.py`), and the repository path, or a suffix of it from a directory up to
 * the package directory, of a file that exists now in the public-repo-admission or public-egress-v2 package outside `instances/`
 * (`contracts/candidates/public-egress-v2/REVIEW-BRIEF.md`). A name that carries a record-id or act-identity needle or a provider stem
 * other than version 2's (`public-egress-openai`) is never one, nor is a path with a segment at any depth that starts `instance` in
 * any case (`Instances/`, `instances.md`, `instance/`). Read through the reader's file system; an unreadable directory gives none.
 * Set aside only in an allowlisted file (`sweepText`). */
const PACKAGE_DIRS = ['.syzygy/governance/contracts/candidates/public-repo-admission', '.syzygy/governance/contracts/candidates/public-egress-v2'];
const ID_NEEDLES = ['public-obs-', 'public-egress-anthropic', 'rfc5-project-documentation-amend', 'public-source-scope', 'pwb-secret-classification-policy'];
const carriesId = (name: string): boolean =>
  ID_NEEDLES.some(needle => carries(name, needle)) || stemFolds(name).some(form => /public-egress-(?!v2(?![a-z0-9]))/u.test(form));
async function toolingCitations(fs: PackageReaderFs, root: string): Promise<ReadonlySet<string>> {
  const out = new Set<string>();
  let scripts: readonly string[] = [];
  try { scripts = await fs.readdir(path.join(root, 'scripts')); } catch { scripts = []; }
  for (const name of scripts) if (/^[a-z0-9]+(?:_[a-z0-9]+)+\.(?:py|mjs|cjs|js|ts|sh)$/.test(name) && !carriesId(name)) out.add(name).add(`scripts/${name}`);
  for (const dir of PACKAGE_DIRS) {
    let files: readonly string[];
    try { files = await walk(fs, path.join(root, dir)); } catch { continue; }
    for (const rel of files) {
      if (fold(rel).split('/').some(segment => segment.startsWith('instance')) || carriesId(rel)) continue;
      const parts = `${dir}/${rel}`.split('/'), top = dir.split('/').length - 1;
      for (let i = 0; i <= top; i += 1) out.add(parts.slice(i).join('/'));
    }
  }
  return out;
}
/** `text` with each whole path-shaped token (a maximal run of ASCII letters, digits, `_`, `.`, `/` and `-`, trailing dots aside) that
 * is one of `citations` blanked; every other token, any part of a token, and any spelling the citation does not match exactly stays. */
const withoutCitations = (text: string, citations: ReadonlySet<string>): string =>
  text.replace(/[A-Za-z0-9_./-]+/g, token => { const core = token.replace(/\.+$/, ''); return citations.has(core) ? ' ' + token.slice(core.length) : token; });
/** The text a sweep reads from the decisions file at `rel`: the file's own text, every stem counting wherever it sits (in a script
 * name or package path too), unless the file is in `CITATION_ALLOWLIST` at exactly that path with exactly those bytes. Then, and only
 * then, its exact tooling citations are set aside. A new, edited, renamed or copied file gets the whole text. The citations are read
 * once per sweep, on the first allowlisted file. */
function sweepText(fs: PackageReaderFs, root: string): (rel: string, text: string) => Promise<string> {
  let citations: Promise<ReadonlySet<string>> | null = null;
  return async (rel, text) => {
    const entry = CITATION_ALLOWLIST.get(rel);
    if (entry === undefined || entry.sha256 !== sha256(text)) return text;
    citations ??= toolingCitations(fs, root);
    return withoutCitations(text, await citations);
  };
}

const ADMISSION_NEEDLES = [...ADMISSION_STEMS, ...ADMISSION_PATHS];
/** The admission family: its four forms, the pinned owner-answers direction, and its sweep (the stems above in a file's text outside
 * the aggregate record; the stems and paths on every swept field line, `>` included; compared as written). Its records are read for
 * either admission act type, with no fixed lines and no supersession field. The paths are not text needles: each one's folded
 * spelling contains an admission stem's (`public-repo-admission` or `public-egress-v2`), so a text that carries a path carries that
 * stem, and the paths could never name an act the stems had not (syzygy-bpyt.8.22). */
const ADMISSION_FAMILY: ParsedActFamily<AdmissionActForm> = {
  forms: ADMISSION_ACT_FORMS,
  pins: new Map([[OWNER_ANSWERS_FILE, OWNER_ANSWERS_SHA256]]),
  sweep: { stems: ADMISSION_STEMS, needles: [], fields: everyField(ADMISSION_NEEDLES), quoted: true, loose: false, citations: true },
  dialect: { typeValue: 'consent-observation|consent-egress', fixedLines: 'none', instant: 'Recorded at (UTC)', supersession: false },
};

export function createPackageAdmissionReader(options: { readonly root: string; readonly fs?: PackageReaderFs }): AdmissionRecordReader {
  const fs = options.fs ?? nodeFs;
  return {
    read: async () => {
      const found = await findActRecords(fs, options.root, ADMISSION_FAMILY);
      if ('why' in found) return refuse();
      const records: AdmissionRecord[] = [];
      let v2At: number | null = null, v1At: number | null = null;
      for (const { form, text } of found.records) {
        let act: Act;
        try {
          const parsed = parseActRecord(text, form, ADMISSION_FAMILY.dialect);
          act = { type: form.type === 'consent-observation' ? 'observation' : 'egress', inForce: parsed.recordedAt, artifact: parsed.artifact, digest: parsed.digest, version: form.version };
        } catch { return refuse(); }
        let artifact: string;
        try { artifact = await fs.readFile(path.join(options.root, act.artifact)); } catch { return refuse(); }
        records.push(parseInstance(artifact, act, sha256(artifact) === act.digest ? act.inForce : null));
        if (act.version === 2) v2At = act.inForce; else if (act.type === 'egress') v1At = act.inForce;
      }
      if (v2At !== null) await checkClassAct(fs, options.root, v2At);
      // Version 2 replaces version 1 only when its act took effect strictly later: the same instant, or version 2 first, is ambiguous (compared on the acts' instants, whatever the bytes now are).
      if (v2At !== null && v1At !== null && v2At <= v1At) return refuse();
      return Object.freeze(records);
    },
  };
}

/** The public-source screening-scope policy (an `approve-policy` act over the
 * policy file). Which act is in force follows the chain, never the bytes:
 * each version from its instant until the next version's, the last from its own. The act
 * in force counts only while the policy file's current bytes hash to its digest
 * AND declare a `publicSourceScope` object; a superseded act counts for nothing
 * even when the bytes revert to its argument. The 2026-09 policy acts approved
 * the Butlers-only policy and satisfy nothing here. Every decisions record naming
 * the policy is read, and one that names it without a readable act form refuses
 * the read. */
export const POLICY_PATH = '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json';
/** One act's term: it counts at `now` when `inForceAt <= now` and (`until` is null or) `now < until`. */
export interface PolicyActRecord { readonly actIdentity: string; readonly digest: string; readonly inForceAt: number; readonly until: number | null }
export interface PolicyActReader { readonly read: () => Promise<readonly PolicyActRecord[]> }

/** A recorder's act form for the screening-scope policy: the one file it writes, the title and the identity it renders
 * (`scripts/record_public_source_screening_scope_act.py`), over the policy file as an `approve-policy` act. The list is closed and
 * ordered; a later recorder (scope v2 to v5) is registered here by a reviewed change, never discovered. */
export interface PolicyActForm { readonly file: string; readonly title: string; readonly type: 'approve-policy'; readonly identity: (date: string) => string; readonly artifact: string }
const APPROVE_POLICY = { type: 'approve-policy', artifact: POLICY_PATH } as const;
export const POLICY_ACT_FORMS: readonly PolicyActForm[] = Object.freeze([Object.freeze({
  file: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md',
  title: '# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope)',
  identity: (date: string) => `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-${date}`,
  ...APPROVE_POLICY,
}), Object.freeze({
  // scripts/record_public_source_screening_scope_v2_act.py: it supersedes the act above for the same role from its own instant, so the
  // first counts for nothing from then on, whatever the policy bytes are.
  file: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md',
  title: '# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope, version 2)',
  identity: (date: string) => `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-${date}`,
  ...APPROVE_POLICY,
}), Object.freeze({
  // scripts/record_public_source_screening_scope_v3_act.py (2026-10-08, `syzygy-fxro`): it supersedes version 2 the same way.
  file: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md',
  title: '# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope, version 3)',
  identity: (date: string) => `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-APPROVAL-${date}`,
  ...APPROVE_POLICY,
}), Object.freeze({
  // scripts/record_public_source_screening_scope_v4_act.py (2026-10-20, `syzygy-3sjj`): it supersedes version 3 the same way.
  file: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md',
  title: '# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope, version 4)',
  identity: (date: string) => `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-APPROVAL-${date}`,
  ...APPROVE_POLICY,
}), Object.freeze({
  // scripts/record_public_source_screening_scope_v5_act.py (2026-11-03, `syzygy-mea.4`): it supersedes version 4 the same way.
  file: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md',
  title: '# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope, version 5)',
  identity: (date: string) => `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-APPROVAL-${date}`,
  ...APPROVE_POLICY,
})]);
export const POLICY_ACT_FILE = POLICY_ACT_FORMS[0]!.file;
/** Earlier acts that name the same policy file for its Butlers-only content, pinned by name and digest: they bind other bytes
 * and count for nothing here, and an edited copy (a forged withdrawal, say) refuses the read. */
const HISTORICAL_POLICY_ACTS: ReadonlyMap<string, string> = new Map([
  ['PWB-SECRET-CLASSIFICATION-POLICY-ACT.md', 'e02c0e6fbe408c4aac7d60f86e116bc8d4b79672a0c3a4dd4d6cf1a9f6bf59bb'],
  ['PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md', 'e766803dafcfbf0c5d40fdc499af7a83239864afd2a09696a7d7a21f81618a0a'],
  ['PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md', '178fcd57c4afde5ff457e6928a73089a2567f02ff8ef95d7efe05234f88e9988'],
]);

const POLICY_STEM = 'pwb-secret-classification-policy';
const SCOPE_STEM = 'public-source-scope';
/** The policy family: its four forms, the historical acts pinned above, and its sweep. A decisions file names the policy when a field
 * line (any case, spacing, dash spelling; a `>` before it does not count) carries its path, or an act identity of its family, or when
 * its name or (outside the aggregate acceptance record) its text carries the public-source-scope stem of the acts' identities and file
 * names, or its name carries the policy stem and a withdrawal word. Its records are read for an act type of lowercase letters and
 * dashes, the provenance line's opening as the one fixed line, and the supersession field the chain needs. */
/* No allowlist here: every needle below is an id needle or the policy path, which no citation can carry (R-355-2 N-3c). */
const POLICY_FAMILY: ParsedActFamily<PolicyActForm> = {
  forms: POLICY_ACT_FORMS,
  pins: HISTORICAL_POLICY_ACTS,
  sweep: {
    stems: [SCOPE_STEM], needles: [], fields: { 'artifact identity': [POLICY_PATH], 'act identity': [POLICY_PATH, POLICY_STEM] },
    quoted: false, loose: false, citations: false, withdrawal: POLICY_STEM,
  },
  dialect: { typeValue: '[a-z-]+', fixedLines: 'provenance', instant: 'Recorded at (UTC)', supersession: true },
};

/** The policy, its declared scope, and the recorder acts over it in chain order (version 1 to 5), every decisions file swept. The
 * chain is strict: each later version needs the one before it, took effect strictly later, binds other bytes, and its supersession
 * text names the earlier version's record path and argument. */
async function readPolicyActs(fs: PackageReaderFs, root: string): Promise<{ readonly policy: string; readonly scope: unknown; readonly acts: readonly ParsedAct[] }> {
  let policy: string;
  try { policy = await fs.readFile(path.join(root, POLICY_PATH)); } catch { return refuse(); }
  // Another record that names the policy is a known historical act (by name and digest) or an unknown form: refuse the unknown.
  const found = await findActRecords(fs, root, POLICY_FAMILY);
  let scope: unknown;
  try { scope = (JSON.parse(policy) as { publicSourceScope?: unknown }).publicSourceScope; } catch { return refuse(); }
  if ('why' in found) return refuse();
  const parsed: Array<ParsedAct | null> = POLICY_ACT_FORMS.map(() => null);
  for (const { form, text } of found.records) parsed[POLICY_ACT_FORMS.indexOf(form)] = parseActRecord(text, form, POLICY_FAMILY.dialect);
  // The recorded versions must be a prefix of the forms: a later version without every earlier one refuses.
  const count = parsed.indexOf(null) < 0 ? parsed.length : parsed.indexOf(null);
  if (parsed.slice(count).some(act => act !== null)) refuse();
  const acts = parsed.slice(0, count) as ParsedAct[];
  for (let i = 1; i < acts.length; i++) {
    const [earlier, later] = [acts[i - 1]!, acts[i]!];
    if (later.recordedAt <= earlier.recordedAt || later.digest === earlier.digest || !later.supersession.includes(`\`${earlier.digest}\``)
      || !later.supersession.includes(`${DECISIONS_DIR}/${earlier.file}`)) refuse();
  }
  return { policy, scope, acts };
}

/** Each recorded act with the term the chain gives it: each version ends where the next begins. */
const policyTerms = (acts: readonly ParsedAct[]): ReadonlyArray<{ readonly act: ParsedAct; readonly until: number | null }> =>
  acts.map((act, i) => ({ act, until: acts[i + 1]?.recordedAt ?? null }));
/** The act the chain puts in force at `now`, whatever the policy bytes are, or null before the first act. */
const policyActAt = (acts: readonly ParsedAct[], now: number): ParsedAct | null =>
  policyTerms(acts).find(t => t.act.recordedAt <= now && (t.until === null || now < t.until))?.act ?? null;
/** Why the act in force does not cover the on-disk policy, or null when it does. */
const policyMismatch = (act: ParsedAct, policy: string, scope: unknown): string | null =>
  act.digest !== sha256(policy) ? 'the policy bytes differ from the in-force act\'s argument'
    : scope === null || typeof scope !== 'object' || Array.isArray(scope) ? 'the policy declares no publicSourceScope object' : null;

export function createPackagePolicyReader(options: { readonly root: string; readonly fs?: PackageReaderFs }): PolicyActReader {
  const fs = options.fs ?? nodeFs;
  return {
    read: async () => {
      const { policy, scope, acts } = await readPolicyActs(fs, options.root);
      // Every act keeps its chain term; one whose argument is not the current policy (or a policy without the scope) is left out, so at
      // any instant the port counts at most the act the chain puts in force, and only when that act binds the bytes.
      return Object.freeze(policyTerms(acts).filter(t => policyMismatch(t.act, policy, scope) === null)
        .map(t => Object.freeze({ actIdentity: t.act.identity, digest: t.act.digest, inForceAt: t.act.recordedAt, until: t.until })));
    },
  };
}

/** The result of a strict act read: the parsed record(s), or why there are none. `absent` (no record) and `refused` (a bad form, a
 * withdrawal-naming file, or bytes that no longer match) both mean "not in force"; they are told apart for the report only. */
/** `namedBy`, on a refusal, is the decisions file that names the act without being its record: a withdrawal, or a form the reader
 * does not define. */
export type ActState<T> = ({ readonly state: 'ok' } & T) | { readonly state: 'absent'; readonly why: string } | { readonly state: 'refused'; readonly why: string; readonly namedBy?: string };
export interface StrictReadOptions { readonly root: string; readonly fs?: PackageReaderFs; readonly now: number }
async function strict<T>(read: () => Promise<ActState<T>>): Promise<ActState<T>> {
  try { return await read(); } catch (error) { if (error instanceof AdmissionRecordError) return { state: 'refused', why: error.message }; throw error; }
}

/** The screening-scope policy act chain at `now`. `final` is the act the chain puts in force then (the latest version whose instant
 * has passed); `ok` only when it binds exactly the on-disk policy bytes and that policy declares a `publicSourceScope` object, which is
 * exactly when the port's public-source-policy check is satisfied. `absent` before the first act's instant. `acts` is every recorded
 * version in chain order; `v1` to `v5` name them by version. */
export type PolicyActChain = {
  readonly v1: ParsedAct | null; readonly v2: ParsedAct | null; readonly v3: ParsedAct | null; readonly v4: ParsedAct | null; readonly v5: ParsedAct | null; readonly acts: readonly ParsedAct[];
  readonly final: ParsedAct; readonly policyDigest: string;
};
export function readPolicyActChain(options: StrictReadOptions): Promise<ActState<PolicyActChain>> {
  return strict<PolicyActChain>(async () => {
    const { policy, scope, acts } = await readPolicyActs(options.fs ?? nodeFs, options.root);
    if (acts.length === 0) return { state: 'absent', why: 'no screening-scope policy act is recorded' };
    const final = policyActAt(acts, options.now);
    if (final === null) return { state: 'absent', why: 'no screening-scope policy act is in force yet' };
    const why = policyMismatch(final, policy, scope);
    return why === null ? { state: 'ok', v1: acts[0] ?? null, v2: acts[1] ?? null, v3: acts[2] ?? null, v4: acts[3] ?? null, v5: acts[4] ?? null, acts, final, policyDigest: sha256(policy) } : { state: 'refused', why };
  });
}

const CLASS_STEM = 'rfc5-project-documentation';
/** The class-act family: its one form and its sweep (the stem in a file's name, the stem or the module's path in its text outside the
 * aggregate record, either on an `Artifact identity` or `Act identity` line, `>` included, compared as written). Its record is read for
 * any act type, with no fixed lines, the `Act instant` line and the supersession field. */
const CLASS_FAMILY: ParsedActFamily<ActForm> = {
  forms: [CLASS_ACT_FORM],
  sweep: { stems: [CLASS_STEM], needles: [CLASS_MODULE], fields: { 'artifact identity': [CLASS_MODULE, CLASS_STEM], 'act identity': [CLASS_MODULE, CLASS_STEM] }, quoted: true, loose: false, citations: true },
  dialect: { typeValue: '[^`\\n]+', fixedLines: 'none', instant: 'Act instant', supersession: true },
};
async function readClassAct(fs: PackageReaderFs, root: string): Promise<{ readonly act: ParsedAct; readonly moduleDigest: string } | null> {
  const found = await findActRecords(fs, root, CLASS_FAMILY);
  if ('why' in found) return refuse();
  const record = found.records.at(-1);
  if (record === undefined) return null;
  let module: string;
  try { module = await fs.readFile(path.join(root, CLASS_MODULE)); } catch { return refuse(); }
  const act = parseActRecord(record.text, record.form, CLASS_FAMILY.dialect);
  if (act.digest !== sha256(module)) refuse();
  return { act, moduleDigest: sha256(module) };
}
/** The RFC5-14 project-documentation class amendment act at `now`: `ok` when the recorder's record exists in form, its argument is the
 * sha256 of the installed RFC-0005 module and its instant is not after `now`; `absent` when none is recorded or it is not in force
 * yet; `refused` for any bad form, a file elsewhere in the decisions tree that names it, or an installed module that no longer matches. */
export type ClassActRead = { readonly act: ParsedAct; readonly moduleDigest: string };
export function readClassActState(options: StrictReadOptions): Promise<ActState<ClassActRead>> {
  return strict<ClassActRead>(async () => {
    const hit = await readClassAct(options.fs ?? nodeFs, options.root);
    if (hit === null) return { state: 'absent', why: 'no class amendment act is recorded' };
    return hit.act.recordedAt > options.now ? { state: 'absent', why: 'the class amendment act is not in force yet' } : { state: 'ok', ...hit };
  });
}

/** The in-force egress record to Anthropic at `now` (version 2 replaces version 1 from its act's instant), with its listed content classes
 * and the repositories its Scope section admits. */
export type InForceEgress = { readonly recordId: string; readonly version: string; readonly digest: string; readonly contentClasses: readonly string[]; readonly admittedRepositories: readonly string[] };
export function readInForceEgress(options: StrictReadOptions): Promise<ActState<InForceEgress>> {
  return strict<InForceEgress>(async () => {
    const live = inForceRecords(await createPackageAdmissionReader(options).read(), options.now).filter(r => r.class === 'egress' && r.providerId === 'anthropic');
    if (live.length === 0) return { state: 'absent', why: 'no egress record is in force' };
    if (live.length > 1) return { state: 'refused', why: 'more than one egress record is in force' };
    const [r] = live;
    return { state: 'ok', recordId: r!.recordId, version: r!.version, digest: r!.digest, contentClasses: r!.contentClasses, admittedRepositories: r!.admittedRepositories };
  });
}

/** One digest-bound owner act outside the admission and policy families, as its recorder writes it: the one decisions file, the
 * title, the act type, the identity it renders for a date, the one artifact it binds, and the stems that name it. The cross-check is
 * RFC3-16(a)'s: the act counts only when its record exists in exactly this form, its argument is the sha256 of the artifact's current
 * bytes and its instant is not after `now`. A status word in the artifact, or the artifact's presence, never counts. The record is
 * read as the admission, policy and class records are (`parseActRecord`, `RECORDER_DIALECT`), and swept by `digestBoundSweep`. */
export interface DigestBoundActForm {
  readonly file: string;
  readonly title: string;
  readonly type: string;
  readonly identity: (date: string) => string;
  readonly artifact: string;
  /** Stems a decisions file carries when it names this act: any other file that carries one, or the artifact path, refuses the read
   * (a withdrawal, or a form this reader does not define). The aggregate acceptance record is exempt except on its field lines. */
  readonly stems: readonly string[];
  /** Needles read only on a decisions file's `Artifact identity`, `Act identity`, `Record ID` or `Subject` field lines: a value that
   * prose elsewhere names for other reasons (a subject tuple an act's Effect quotes). */
  readonly fieldStems?: readonly string[];
  /** For an artifact that binds other files' bytes in turn (an in-force record): the files its one `| File | SHA-256 |` table must
   * list, exactly and in order. The act then counts only while each listed file still hashes to its row. */
  readonly bound?: readonly string[];
  /** Decisions files the sweep reads past while each is exactly what its template renders: a successor or predecessor act over another
   * version of the same record, which must name this act's record or artifact (a supersession). Any other bytes in that file, an
   * edited copy included, are swept as any other file. */
  readonly exemptRecords?: readonly ExemptRecord[];
  /** The record as its recorder renders it: the record counts only when the slots read out of it render the template back to the
   * record, byte for byte. The template fixes every literal line, the scope included. */
  readonly template?: RecorderTemplate;
}
export interface ExemptRecord { readonly file: string; readonly template: RecorderTemplate }

export type DigestBoundAct = { readonly act: ParsedAct; readonly artifactDigest: string; readonly artifactText: string };

/** The public Git-hosting source-acquisition registry entry act (scripts/record_public_admission_registry_entries_acts.py, key
 * `git-source-acquisition`). The act binds the proposed entry file at its manifest row. */
export const REGISTRY_GIT_SOURCE_ACT_FORM: DigestBoundActForm = Object.freeze({
  file: 'PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-ACT.md',
  title: '# Owner act — public Git-hosting source-acquisition registry entry',
  type: 'adopt-registry-entry',
  identity: (date: string) => `PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-${date}`,
  artifact: '.syzygy/governance/contracts/candidates/public-admission-registry-entries/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-CANDIDATE.json',
  stems: Object.freeze(['public-admission-registry-git-source']),
});

/** A digest-bound form's sweep: its stems in a file's name; its stems or `artifact` in the text outside the aggregate record; its
 * stems, field stems or `artifact` on any of the four field lines, `>` included; text and values compared `loose` as well. */
function digestBoundSweep(form: { readonly stems: readonly string[]; readonly fieldStems?: readonly string[] }, artifact: string): ActSweep {
  return { stems: form.stems, needles: [artifact], fields: everyField([...form.stems, ...(form.fieldStems ?? []), artifact]), quoted: true, loose: true, citations: true };
}

/** `value` with backticks dropped and the whitespace around each `:` and `,` removed, so a tuple reads the same however it is spaced
 * or quoted: `(project: syzygy, …)` and ``(`project:syzygy`, …)`` both read `(project:syzygy,…)`. */
const loose = (value: string): string => value.replace(/`/g, '').replace(/\s*([:,])\s*/g, '$1');
/** Whether `text` carries `needle` as written or once both are read `loose`. */
const carriesLoosely = (text: string, needle: string): boolean => carries(text, needle) || carries(loose(text), loose(needle));

/** One row of an act family's closed list: the one decisions file its recorder writes, the title, the act type, the identity it
 * renders for a date and the one artifact it binds; with a template, the record as the recorder renders it, byte for byte. The
 * admission, policy and class forms and `DigestBoundActForm` are all rows of this shape, read by `parseActRecord`. */
interface ActForm {
  readonly file: string;
  readonly title: string;
  readonly type: string;
  readonly identity: (date: string) => string;
  readonly artifact: string;
  readonly template?: RecorderTemplate | undefined;
}

/** How a family's reader holds an act record's head to what its recorder writes. The recorders all write the same head (the `Owner`,
 * `Provenance state` and A1 lines, one instant, a `Supersession / revocation:` field); the readers grew different checks of it, and
 * each family keeps its own (syzygy-bpyt.8.4), because holding one family to another's would refuse records it reads today. */
interface ActDialect {
  /** The pattern an `Act type:` value matches for the line to count as the field. */
  readonly typeValue: string;
  /** The fixed lines read, for a form with no template: all three of `recorderLines`, the provenance line's opening only, or none. */
  readonly fixedLines: 'recorder' | 'provenance' | 'none';
  /** The label of the one instant line. */
  readonly instant: 'Recorded at (UTC)' | 'Act instant';
  /** Whether the `Supersession / revocation:` field is read (a repeated one refuses); unread, the parsed act's is ''. */
  readonly supersession: boolean;
}
/** The dialect of `DigestBoundActForm`: any act type, the recorder lines (or the template), `Recorded at (UTC)`, the supersession. */
const RECORDER_DIALECT: ActDialect = Object.freeze({ typeValue: '[^`\\n]+', fixedLines: 'recorder', instant: 'Recorded at (UTC)', supersession: true });

/** The folded label of a field line a sweep reads. */
type SweptField = 'artifact identity' | 'act identity' | 'record id' | 'subject';
/** What names an act in a decisions file that is none of its family's records, pins or exempt records: the file's name carrying one of
 * `stems` (as written, never `loose`); its text, outside the aggregate acceptance record, carrying one of `stems` or `needles`; or, in
 * any file, a field line whose folded value carries a needle `fields` lists for its label. A field line is optional whitespace, an
 * optional `-` or `*` bullet (or `>`, when `quoted`), any asterisks, the label in any case and spacing, then a colon. */
interface ActSweep {
  readonly stems: readonly string[];
  readonly needles: readonly string[];
  readonly fields: Readonly<Partial<Record<SweptField, readonly string[]>>>;
  /** Whether a `>` before a field line still makes it one. */
  readonly quoted: boolean;
  /** Whether text and field values also count once both they and the needle are read `loose`. */
  readonly loose: boolean;
  /** Whether an allowlisted file's exact tooling citations are set aside first (`sweepText`). */
  readonly citations: boolean;
  /** A stem that, with `withdraw` or `revok`, in a file's name names the act. */
  readonly withdrawal?: string;
}
/** The same needles on every field line a sweep reads. */
function everyField(needles: readonly string[]): ActSweep['fields'] {
  return { 'artifact identity': needles, 'act identity': needles, 'record id': needles, subject: needles };
}
const FIELD_LINE = /^\s*(?:[-*>]\s*)?\**\s*(artifact\s+identity|act\s+identity|record\s+id|subject)\s*\**\s*:\s*(.*)$/u;
const UNQUOTED_FIELD_LINE = /^\s*(?:[-*]\s*)?\**\s*(artifact\s+identity|act\s+identity|record\s+id|subject)\s*\**\s*:\s*(.*)$/u;

/** One swept file's text in the spellings a sweep compares needles in, each computed on its first use and kept for every later needle
 * (syzygy-bpyt.8.20): `plain`, its `stemFolds`; `slack`, the `stemFolds` of its `loose` reading; and `folded`, its `fold`, which the
 * field lines are read from. Each is a pure function of the text, so a kept value is the one a fresh call would return, and each is
 * first computed at the needle where a per-needle call first computed it, so a fold that throws still throws there. `findActRecords`
 * builds one for each file inside its loop and drops it with that file: nothing is shared between files, sweeps or calls, and nothing
 * is held at module level. */
interface TextForms { plain(): readonly string[]; slack(): readonly string[]; folded(): string }
function textForms(text: string): TextForms {
  let plain: readonly string[] | undefined, slack: readonly string[] | undefined, folded: string | undefined;
  return { plain: () => (plain ??= stemFolds(text)), slack: () => (slack ??= stemFolds(loose(text))), folded: () => (folded ??= fold(text)) };
}
/** `carries(text, needle)` for the text `forms` holds, or, `loosely`, `carriesLoosely(text, needle)`. */
function formsCarry(forms: TextForms, needle: string, loosely: boolean): boolean {
  const n = stemFolds(needle)[0]!;
  if (forms.plain().some(form => form.includes(n))) return true;
  if (!loosely) return false;
  const m = stemFolds(loose(needle))[0]!;
  return forms.slack().some(form => form.includes(m));
}

function namesAct(sweep: ActSweep, rel: string, forms: TextForms): boolean {
  const has = sweep.loose ? carriesLoosely : carries;
  if (sweep.stems.some(stem => carries(rel, stem))) return true;
  if (sweep.withdrawal !== undefined && carries(rel, sweep.withdrawal) && /withdraw|revok/u.test(fold(rel))) return true;
  if (rel !== AGGREGATE_RECORD && [...sweep.stems, ...sweep.needles].some(needle => formsCarry(forms, needle, sweep.loose))) return true;
  const line = sweep.quoted ? FIELD_LINE : UNQUOTED_FIELD_LINE;
  return forms.folded().split('\n').some(each => {
    const field = line.exec(each);
    return field !== null && (sweep.fields[field[1]!.replace(/\s+/gu, ' ') as SweptField] ?? []).some(needle => has(field[2]!, needle));
  });
}

/** A closed list of act forms read in one walk of the decisions tree, with the sweep every other file gets, the files pinned by name
 * and digest (other bytes refuse) and the exempt records read past while their template renders them. */
interface ActFamily<F extends { readonly file: string }> {
  readonly forms: readonly F[];
  readonly sweep: ActSweep;
  readonly pins?: ReadonlyMap<string, string>;
  readonly exempt?: readonly ExemptRecord[] | undefined;
}
/** A family whose records `parseActRecord` reads, and the dialect it reads them in. */
interface ParsedActFamily<F extends ActForm> extends ActFamily<F> { readonly dialect: ActDialect }
/** Each form's record found in the walk, in walk order, or why the sweep refuses and the file that named the act. */
type FoundRecords<F> = { readonly records: readonly { readonly form: F; readonly text: string }[] } | { readonly why: string; readonly namedBy: string };
async function findActRecords<F extends { readonly file: string }>(fs: PackageReaderFs, root: string, family: ActFamily<F>): Promise<FoundRecords<F>> {
  const files = await walk(fs, path.join(root, DECISIONS_DIR)), swept = family.sweep.citations ? sweepText(fs, root) : async (_rel: string, text: string) => text;
  const records: { readonly form: F; readonly text: string }[] = [];
  for (const rel of files) {
    let text: string;
    try { text = await fs.readFile(path.join(root, DECISIONS_DIR, rel)); } catch { return refuse(); }
    const form = family.forms.find(f => f.file === rel);
    if (form !== undefined) { records.push({ form, text }); continue; }
    const pinned = family.pins?.get(rel);
    if (pinned !== undefined) { if (sha256(text) !== pinned) refuse(); continue; }
    if ((family.exempt ?? []).some(exempt => exempt.file === rel && templateFields(exempt.template, text) !== null)) continue;
    if (namesAct(family.sweep, rel, textForms(await swept(rel, text)))) {
      return { why: `${DECISIONS_DIR}/${rel} names the act without being its record: a withdrawal or a form this reader does not define`, namedBy: `${DECISIONS_DIR}/${rel}` };
    }
  }
  return { records };
}

/** The record's slots when it is exactly what `template` renders from them; refuses otherwise, and when an owner-selection slot
 * (`opening`, `label`, `description`, `quote`) carries a 64-hex token, which the recorders never write there. */
function fromTemplate(template: RecorderTemplate, text: string): Readonly<Record<string, string>> {
  const fields = templateFields(template, text);
  if (fields === null || ['opening', 'label', 'description', 'quote'].some(slot => /[0-9a-fA-F]{64}/.test(fields[slot] ?? ''))) return refuse();
  return fields;
}

/** The lines every recorder of these acts writes for RFC3-16(b) items 7 and 9 (owner, provenance state, the explicit A1 absence), for a
 * form with no template; a record without one of them, or with another, is not the recorder's form. */
function recorderLines(text: string): void {
  one(text, /^(Owner: Tzeusy)$/gm);
  one(text, /^(Provenance state: `owner-adopted \(bootstrap, uncorrelated\)` — state \(1\),)$/gm);
  one(text, /^(A1 audit-record identity \(RFC3-16\(b\) item 9\): \*\*explicitly absent\*\*)$/gm);
}

/** The record of `form`, read from prose as `dialect` holds it: the title; the template, or the dialect's fixed lines; one each of
 * `Date`, `Act identity`, `Act type`, `Artifact identity`, `Project identity` and `Exact digest (SHA-256)`; a real calendar date; the
 * form's identity for that date, its type and its artifact; the instant; and the supersession field. Anything else refuses. */
function parseActRecord(text: string, form: ActForm, dialect: ActDialect): ParsedAct {
  if (!text.startsWith(`${form.title}\n`)) refuse();
  if (form.template !== undefined) fromTemplate(form.template, text);
  else if (dialect.fixedLines === 'recorder') recorderLines(text);
  else if (dialect.fixedLines === 'provenance') one(text, /^Provenance state: `(owner-adopted \(bootstrap, uncorrelated\))`/gm);
  const date = one(text, /^Date: (\d{4}-\d{2}-\d{2})$/gm), identity = one(text, /^Act identity: `([^`\n]+)`$/gm), type = one(text, new RegExp(`^Act type: \`(${dialect.typeValue})\`$`, 'gm'));
  const artifact = one(text, /^Artifact identity: `([^`\n]+)`$/gm), project = one(text, /^Project identity: `(project:syzygy)`$/gm), digest = one(text, /^Exact digest \(SHA-256\): `([0-9a-f]{64})`$/gm);
  const day = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isSafeInteger(day) || new Date(day).toISOString().slice(0, 10) !== date || identity !== form.identity(date) || type !== form.type || artifact !== form.artifact) refuse();
  const recordedAt = dialect.instant === 'Act instant' ? actInstant(text, date, 'Act instant', /^\s*act instant\b/gim) : actInstant(text, date);
  return { file: form.file, identity, type, artifact, project, digest, date, recordedAt, supersession: dialect.supersession ? supersessionText(text) : '', text };
}

/** Why the artifact's bound-files table does not hold for `bound`, or null when every listed file still hashes to its row. */
async function boundMismatch(fs: PackageReaderFs, root: string, artifact: string, bound: readonly string[]): Promise<string | null> {
  const HEAD = '| File | SHA-256 |';
  const lines = outsideFences(artifact).split('\n'), at = lines.flatMap((line, i) => (line === HEAD ? [i] : []));
  if (at.length !== 1 || artifact.split('\n').filter(line => line === HEAD).length !== 1 || lines[at[0]! + 1] !== '|---|---|') return 'the act\'s artifact does not carry exactly one bound-files table';
  const rows: (readonly [string, string])[] = [];
  for (const line of lines.slice(at[0]! + 2)) {
    const row = /^\| `([^`\n]+)` \| `([0-9a-f]{64})` \|$/.exec(line);
    if (row === null) break;
    rows.push([row[1]!, row[2]!]);
  }
  if (rows.length !== bound.length || rows.some(([file], i) => file !== bound[i])) return `the act's artifact binds ${rows.map(([file]) => file).join(', ') || 'no file'}, not exactly ${bound.join(', ')}`;
  for (const [file, digest] of rows) {
    let text: string;
    try { text = await fs.readFile(path.join(root, file)); } catch { return `the bound file ${file} cannot be read`; }
    if (sha256(text) !== digest) return `the bytes of ${file} differ from the digest the act's artifact binds`;
  }
  return null;
}

/** The act `form` describes, cross-checked at `now` under RFC3-16(a): `ok` when its record exists in the recorder's form, binds the
 * artifact's current bytes and took effect no later than `now`; `absent` when no record exists or it is not in force yet; `refused` for a
 * bad form, bytes that differ from the argument, or another decisions file that names the act. */
export function readDigestBoundActState(options: StrictReadOptions & { readonly form: DigestBoundActForm }): Promise<ActState<DigestBoundAct>> {
  return strict<DigestBoundAct>(async () => {
    const fs = options.fs ?? nodeFs, form = options.form;
    const found = await findActRecords(fs, options.root, { forms: [form], sweep: digestBoundSweep(form, form.artifact), exempt: form.exemptRecords });
    if ('why' in found) return { state: 'refused', why: found.why, namedBy: found.namedBy };
    const record = found.records.at(-1);
    if (record === undefined) return { state: 'absent', why: `no owner-act record ${DECISIONS_DIR}/${form.file} exists` };
    const act = parseActRecord(record.text, form, RECORDER_DIALECT);
    let artifactText: string;
    try { artifactText = await fs.readFile(path.join(options.root, form.artifact)); } catch { return { state: 'refused', why: `the act's artifact ${form.artifact} cannot be read` }; }
    if (sha256(artifactText) !== act.digest) return { state: 'refused', why: `the bytes of ${form.artifact} differ from the act's argument` };
    const unbound = form.bound === undefined ? null : await boundMismatch(fs, options.root, artifactText, form.bound);
    if (unbound !== null) return { state: 'refused', why: unbound };
    if (act.recordedAt > options.now) return { state: 'absent', why: `the act ${act.identity} is not in force yet` };
    return { state: 'ok', act, artifactDigest: act.digest, artifactText };
  });
}

/** A registry entry signed off by version tag (scripts/record_versioned_signoff.py, Scope A as the owner extends it): the one decisions
 * record the recorder writes for the package at one version, and the entry it installs. The record names the installed entry and the
 * SHA-256 of its installed bytes; that is the argument the cross-check holds the entry to. */
export interface VersionedSignoffForm {
  readonly file: string;
  readonly packageKey: string;
  readonly version: string;
  readonly installed: string;
  /** As `DigestBoundActForm.stems`; the installed entry's path is swept too. */
  readonly stems: readonly string[];
  /** The record as the recorder renders it (`render_record` with `installed_lines`) for this package, version and installed entry,
   * slots `date`, `quote`, `review`, `commit`, `verdict`, `disposition`, `instant` and `sha`. */
  readonly template: RecorderTemplate;
}

/** scripts/record_versioned_signoff.py `render_record` for a package that installs a registry entry and declares no options. */
function registrySignoffTemplate(o: { readonly title: string; readonly packageKey: string; readonly version: string; readonly installed: string; readonly candidate: string }): RecorderTemplate {
  const tag = `${o.packageKey}-v${o.version}`;
  return recorderTemplate(`# ${o.title} — version-tagged sign-off v${o.version}

Date: {date}

Owner: Tzeusy

Package: ${o.packageKey}

Version: ${o.version}

Tag: ${tag}

Kind: registry entry

Owner selection: {quote}

Review: {review}

Reviewed commit: {commit}

Review verdict: {verdict}

Disposition: {disposition}

Recorded at (UTC): {instant}

Act type: \`adopt-registry-entry\`

Project identity: \`project:syzygy\`

Installed entry: ${o.installed}

Installed entry SHA-256: {sha}

Scope: the entry's own subject and read authority, nothing wider

Scope A extension: the owner's selection quoted above names it ("Extend Scope A"); the extension is a plain owner direction and this record is its only record

Supersession / revocation: supersedes nothing; revoked only by a later
exact owner act naming it

Provenance state: \`owner-adopted (bootstrap, uncorrelated)\` — state (1),
the owner's option selection quoted above

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

Signed under \`.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md\`: the owner's selection of an option naming this package and version is the sign-off; no phrase or digest argument exists.

## What this records

The owner signed off version ${o.version} of \`${o.candidate}\` by the
selection quoted above. The review named above read the package bytes this
sign-off applies; the recorder confirmed that the package directory still
equals the package at the reviewed commit (disposition records excepted) and
that the package's own builder check passed before its patches were applied
through the builder.

The binding is the annotated tag \`${tag}\` on the commit that
carries this record and the applied result. A later edit to the package is a
new version signed separately; it does not retire this one.

## What this does not do

It approves the registry entry named above at exactly the SHA-256 above and
no other byte: a later edit at that path is unsigned. It is one of the
separate acts a read needs; it gives no observation consent, adopts no
classification or screening policy, widens no egress, write or execution,
and authorizes no implementation. Every exclusion of the acts in force
stands.
`, { date: SLOT.date, quote: SLOT.line, review: SLOT.line, commit: SLOT.commit, verdict: SLOT.verdict, disposition: SLOT.line, instant: SLOT.instant, sha: SLOT.sha256 });
}

/** The local-agent public Git source-acquisition entry, version 1.0 of its package (row 2 of the local-agent Redis sitting).
 *
 * Hard-wired to v1.0: a later sign-off of this package (`…-SIGNOFF-v1.1.md`) carries the `…-signoff` stem, so this reader takes it
 * for a withdrawal of v1.0 and refuses, though the recorder says a new version never retires an earlier one. The commit that records a
 * later version must change this form in the same commit (R-POLARIS-DOSSIER-GATE-SOURCES-2 note 6).
 *
 * The sweep reads the package key (and so the tag, the act's identity, the record's file name and the installed entry's basename), the
 * record's title and the installed entry's path. No decisions file is read past: a line that cites the sign-off before the record exists
 * refuses the gate. */
export const LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM: VersionedSignoffForm = (() => {
  const entry = {
    title: 'Public Git source acquisition, local-agent version', packageKey: 'public-git-source-acquisition-local-agent', version: '1.0',
    installed: '.syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json',
    candidate: '.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent',
  } as const;
  return Object.freeze({
    file: 'PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md',
    packageKey: entry.packageKey,
    version: entry.version,
    installed: entry.installed,
    // The bare package key carries the tag, both sign-off spellings, the record's file name and the installed entry's basename.
    stems: Object.freeze([entry.packageKey, `${entry.title.toLowerCase()} — version-tagged sign-off`]),
    template: registrySignoffTemplate(entry),
  });
})();

/** The sign-off `form` describes, cross-checked at `now` under RFC3-16(a) as `readDigestBoundActState` does: `ok` when the record
 * exists in the recorder's form, names the form's package, version, tag and installed entry, the entry's current bytes hash to the
 * SHA-256 it records, and its instant is not after `now`. The act's identity is the tag. */
export function readVersionedSignoffState(options: StrictReadOptions & { readonly form: VersionedSignoffForm }): Promise<ActState<DigestBoundAct>> {
  return strict<DigestBoundAct>(async () => {
    const fs = options.fs ?? nodeFs, form = options.form;
    const found = await findActRecords(fs, options.root, { forms: [form], sweep: digestBoundSweep(form, form.installed) });
    if ('why' in found) return { state: 'refused', why: found.why, namedBy: found.namedBy };
    const record = found.records.at(-1);
    if (record === undefined) return { state: 'absent', why: `no owner-act record ${DECISIONS_DIR}/${form.file} exists` };
    const text = record.text, tag = `${form.packageKey}-v${form.version}`;
    // The template, built from this form, fixes every literal line: the title, package, version, tag, kind, installed entry, act type,
    // project, owner, provenance, A1 and scope. The recorder's own input checks (validate_inputs, validate_disposition) follow: the
    // selection names the Scope A extension, and a disposition record is named exactly when the verdict is CONFIRM WITH EXCEPTIONS
    // (record() passes one only then; R-POLARIS-DOSSIER-GATE-SOURCES-3 note 3).
    const slots = fromTemplate(form.template, text);
    if (!slots['quote']!.includes('Extend Scope A') || (slots['verdict'] === 'CONFIRM WITH EXCEPTIONS') !== (slots['disposition'] !== 'none')) refuse();
    const date = slots['date']!, digest = slots['sha']!, day = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isSafeInteger(day) || new Date(day).toISOString().slice(0, 10) !== date) refuse();
    const act: ParsedAct = { file: form.file, identity: tag, type: 'adopt-registry-entry', artifact: form.installed, project: 'project:syzygy', digest, date, recordedAt: actInstant(text, date), supersession: supersessionText(text), text };
    let artifactText: string;
    try { artifactText = await fs.readFile(path.join(options.root, form.installed)); } catch { return { state: 'refused', why: `the signed entry ${form.installed} cannot be read` }; }
    if (sha256(artifactText) !== digest) return { state: 'refused', why: `the bytes of ${form.installed} differ from the SHA-256 the sign-off records` };
    if (act.recordedAt > options.now) return { state: 'absent', why: `the sign-off ${tag} is not in force yet` };
    return { state: 'ok', act, artifactDigest: digest, artifactText };
  });
}

/** Structurally the poc:dossier trigger's `AdmissionRecordsPort`. */
export interface AdmissionRequirementLike { readonly kind: 'observation-consent' | 'public-source-policy' | 'egress-consent'; readonly repositoryId: string; readonly revision: string }
export interface ConsentedRevision { readonly label: string; readonly commitId: string }
export type AdmissionAnswerLike = { readonly satisfied: true; readonly record: string } | { readonly satisfied: false; readonly why: string };
export interface AdmissionRecordsPortLike {
  readonly source: string;
  readonly check: (requirement: AdmissionRequirementLike & Record<string, unknown>) => Promise<AdmissionAnswerLike>;
  /** The owner's consented revisions for a repository id: label and full commit id, from the observation records in force now. Fails closed to
   * an empty list when records cannot be read, or when labels and commits are not one-to-one across the records in force. */
  readonly consentedRevisionsFor: (repositoryId: string) => Promise<readonly ConsentedRevision[]>;
  /** The repository ids of the observation records in force now whose `Upstream:` is exactly `url`, sorted and distinct. The caller
   * never derives an id from the URL: it takes the one id this returns, and refuses on none or several. Empty when records cannot be read. */
  readonly repositoryIdsFor: (url: string) => Promise<readonly string[]>;
  /** Why no observation record in force names `url` as its Upstream, for a refusal's reason: the records could not be read, none names
   * it, or each that does is withdrawn, superseded, not yet in force, bound by no act, or voided by a byte-different twin. Reporting only;
   * it grants nothing (R-POLARIS-DOSSIER-S3-GATES-1 finding 4). */
  readonly consentAbsenceFor?: (url: string) => Promise<string>;
}

const NOT_IN_FORCE_TEXT: Readonly<Record<NotInForce, string>> = {
  'withdrawn': 'is withdrawn',
  'superseded': 'is superseded by a successor in force',
  'future-dated': 'is not in force yet',
  'not-in-force': 'has no owner act in force over its current bytes',
  'ambiguous-records': 'is void: another record claims the same id and version with different bytes',
};

/** Answers each requirement from the reader, fresh on every call, with the same
 * in-force polarity as the consent ports. The public-source policy requirement
 * needs the `policy` reader and is otherwise never satisfied. */
/** Both readers over one checkout, as the dossier trigger wires them. */
export function createPackageAdmissionRecordsPort(options: { readonly root: string; readonly now: () => number; readonly fs?: PackageReaderFs }): AdmissionRecordsPortLike {
  const fsOption = options.fs === undefined ? {} : { fs: options.fs };
  return createAdmissionRecordsPort({ reader: createPackageAdmissionReader({ root: options.root, ...fsOption }), policy: createPackagePolicyReader({ root: options.root, ...fsOption }), now: options.now });
}

export function createAdmissionRecordsPort(options: { readonly reader: AdmissionRecordReader; readonly policy?: PolicyActReader; readonly now: () => number }): AdmissionRecordsPortLike {
  return {
    source: 'public-repo-admission act records (owner acts over the instance records)',
    repositoryIdsFor: async url => {
      let live: readonly AdmissionRecord[];
      try { live = inForceRecords(await options.reader.read(), options.now()); } catch { return []; }
      return Object.freeze([...new Set(live.filter(r => r.class === 'observation' && r.upstream === url).map(r => r.repositoryId!))].sort());
    },
    consentAbsenceFor: async url => {
      let records: readonly AdmissionRecord[];
      try { records = await options.reader.read(); } catch (cause) {
        return `the admission act records could not be read (${cause instanceof Error ? cause.message : 'unknown error'}), so no consent can be established`;
      }
      const naming = records.filter(r => r.class === 'observation' && r.upstream === url);
      if (naming.length === 0) return `no observation record names ${url} as its Upstream`;
      const why = notInForceRecords(records, options.now());
      const each = naming.map(r => `${r.recordId}@${r.version} ${why.has(r) ? NOT_IN_FORCE_TEXT[why.get(r)!] : 'is in force'}`).join('; ');
      return naming.every(r => why.has(r)) ? `the observation record(s) naming ${url} are not in force: ${each}` : `the observation record(s) naming ${url}: ${each}`;
    },
    consentedRevisionsFor: async repositoryId => {
      let live: readonly AdmissionRecord[];
      try { live = inForceRecords(await options.reader.read(), options.now()); } catch { return []; }
      const byLabel = new Map<string, { label: string; commitId: string }>(), byCommit = new Map<string, string>();
      for (const r of live) {
        if (r.class !== 'observation' || r.repositoryId !== repositoryId) continue;
        for (const [i, commitId] of r.admittedRevisions.entries()) {
          const label = r.revisionLabels[i]!, key = fold(label);
          // one label (in any case), two commits, or the reverse, or one label spelled two ways, across records
          const seen = byLabel.get(key);
          if ((seen !== undefined && (seen.commitId !== commitId || seen.label !== label)) || (byCommit.get(commitId) ?? label) !== label) return [];
          byLabel.set(key, { label, commitId }); byCommit.set(commitId, label);
        }
      }
      return Object.freeze([...byLabel.values()].map(pair => Object.freeze({ ...pair })));
    },
    check: async requirement => {
      if (requirement.kind === 'public-source-policy') {
        if (options.policy === undefined) return { satisfied: false, why: 'no record found: no policy act reader is wired' };
        try {
          const now = options.now();
          const hit = (await options.policy.read()).find(r => r.inForceAt <= now && (r.until === null || now < r.until));
          return hit === undefined ? { satisfied: false, why: 'no record found: no owner approve-policy act covers the current public-source screening scope' } : { satisfied: true, record: hit.actIdentity };
        } catch { return { satisfied: false, why: 'no record found: the policy act records could not be read' }; }
      }
      let live: readonly AdmissionRecord[];
      try { live = inForceRecords(await options.reader.read(), options.now()); } catch { return { satisfied: false, why: 'no record found: the admission act records could not be read' }; }
      const hit = requirement.kind === 'observation-consent'
        ? live.find(r => r.class === 'observation' && r.repositoryId === requirement.repositoryId && r.admittedRevisions.includes(requirement.revision))
        : live.find(r => r.class === 'egress' && r.providerId === 'anthropic' && r.admittedRepositories.includes(requirement.repositoryId));
      return hit === undefined
        ? { satisfied: false, why: `no record found: no owner act puts a ${requirement.kind} for ${requirement.repositoryId} in force${requirement.kind === 'observation-consent' ? ` at revision ${requirement.revision}` : ''}` }
        : { satisfied: true, record: `${hit.recordId}@${hit.version}` };
    },
  };
}
