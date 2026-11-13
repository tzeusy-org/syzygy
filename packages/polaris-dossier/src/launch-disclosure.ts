import * as fs from 'node:fs';
import * as path from 'node:path';
import { BoundedJsonError, parseBoundedJson, type LocalDisclosureItem } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { IDENTITY_RESIDUALS } from './launch-question.js';
import type { LaunchStageName, LaunchStatement, RunClass, StatementClass } from './launch-statements.js';
import { RUN_LAYOUT } from './state-directory.js';

/** The run record's launch disclosure (REQ-polaris-generation-046, line 37, under 047's stage rule).
 *
 * "The run record and every rendered page SHALL disclose, in human and machine form: that the consents were recorded at launch, with each
 * record's identity and its recording commit, or that none was recorded; the repository identity, its normalised URL, their source and
 * their Inferred label; the operator's declaration whether the repository is public, labelled Inferred, or that none was made; how the
 * identity was proposed and the identity residuals above; under REQ-polaris-generation-047's stage rule ...; the drawer statement relied on,
 * if any; that who answered rests on the operator's declaration, labelled Inferred".
 *
 * `init` writes it once (through `createRunDirectory`), as `launch.json` beside `run.json`, for every run it creates: run.json's exact key set is read by every step, so
 * the disclosure is its own file and a run initialised before it existed stays readable. It holds the stages a run reaches by `init`, the
 * brief stage's among them in its not-reached form; each brief Syzygy issues stores its own reached form in its record (`brief.json`, an
 * inventory session's prompt record), and a page reads those stored statements, never deriving them. The file lies within the agent
 * sessions' write reach, so every value read back is Inferred, and it is re-validated in full. */

export const LAUNCH_DISCLOSURE_FORMAT = 'polaris-dossier-launch-disclosure/1';
const LIMITS = Object.freeze({ maxBytes: 65_536, maxNodes: 512, maxDepth: 4 });
const TEXT_MAX = 4096;

export interface LaunchDisclosure {
  readonly format: typeof LAUNCH_DISCLOSURE_FORMAT;
  readonly runClass: RunClass;
  /** Whether `init` launched the run (asked or relied on launch consent records), or the run rests on consents another act recorded. */
  readonly launched: boolean;
  /** The operator's clone, as `init` resolved the path it was given; in a copy-class run the copy is the run's clone and this is not. */
  readonly operatorClone: string;
  /** A copy-class run's copy; null for a no-copy run. */
  readonly copy: string | null;
  /** The launch consent records written at launch and their recording commit; none recorded: an empty list and a null commit. */
  readonly consents: { readonly recorded: readonly string[]; readonly commit: string | null; readonly relied: readonly string[] };
  readonly subject: {
    readonly identity: string;
    readonly url: string;
    readonly source: string;
    /** How the identity was proposed at launch; null for a run that was not launched. */
    readonly proposedBy: string | null;
    /** The operator's declaration whether the repository is public; null where none was made. */
    readonly publicDeclaration: string | null;
  };
  /** The drawer statement relied on, or null. */
  readonly drawer: string | null;
  readonly statements: readonly LaunchStatement[];
  readonly label: 'Inferred';
}

export type LaunchDisclosureRead =
  | { readonly state: 'absent' }
  | { readonly state: 'ok'; readonly disclosure: LaunchDisclosure }
  | { readonly state: 'unreadable'; readonly why: string };

const STAGES: readonly LaunchStageName[] = ['identifier named', 'copy step started', 'commit pinned', 'question asked', 'brief or packet delivered'];
const CLASSES: readonly StatementClass[] = ['copy-class', 'no-copy', 'both'];
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= TEXT_MAX;
const isTexts = (v: unknown): v is readonly string[] => Array.isArray(v) && v.every(isText);
const nullOr = <T>(v: unknown, test: (x: unknown) => x is T): boolean => v === null || test(v);
const exactKeys = (r: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean => Object.keys(r).sort().join(',') === [...keys].sort().join(',');

export function isStatement(v: unknown): v is LaunchStatement {
  if (!isRecord(v) || !exactKeys(v, ['id', 'stage', 'runClass', 'reached', 'label', 'text'])) return false;
  return isText(v['id']) && (v['stage'] === null || STAGES.includes(v['stage'] as LaunchStageName))
    && (v['runClass'] === null || CLASSES.includes(v['runClass'] as StatementClass)) && typeof v['reached'] === 'boolean'
    && v['label'] === 'Inferred' && isText(v['text']);
}

/** The run's launch disclosure, read fail-closed: `absent` where no file of that name exists (a run initialised before it was written);
 * `unreadable`, with why, where something is there that is not the record `init` writes. */
export function readLaunchDisclosure(runDir: string): LaunchDisclosureRead {
  let text: string;
  try {
    const file = path.join(runDir, RUN_LAYOUT.launchDisclosure);
    const stat = fs.lstatSync(file);
    if (!stat.isFile()) return { state: 'unreadable', why: 'it is not a regular file' };
    text = fs.readFileSync(file, 'utf8');
  } catch (cause) {
    const code = (cause as NodeJS.ErrnoException).code;
    return code === 'ENOENT' ? { state: 'absent' } : { state: 'unreadable', why: `it cannot be read (${code ?? 'unknown-error'})` };
  }
  let v: unknown;
  try { v = parseBoundedJson(text, LIMITS); } catch (cause) {
    return { state: 'unreadable', why: `it is not one bounded JSON object (${cause instanceof BoundedJsonError ? cause.code : 'invalid-json'})` };
  }
  const keys = ['format', 'runClass', 'launched', 'operatorClone', 'copy', 'consents', 'subject', 'drawer', 'statements', 'label'];
  if (!isRecord(v) || !exactKeys(v, keys) || v['format'] !== LAUNCH_DISCLOSURE_FORMAT || v['label'] !== 'Inferred') {
    return { state: 'unreadable', why: `it is not a ${LAUNCH_DISCLOSURE_FORMAT} record` };
  }
  const consents = v['consents'], subject = v['subject'];
  const ok = (v['runClass'] === 'copy-class' || v['runClass'] === 'no-copy') && typeof v['launched'] === 'boolean' && isText(v['operatorClone'])
    // A run that was not launched is a no-copy run: every copy-class run is launch-consented (046).
    && (v['launched'] === true || v['runClass'] === 'no-copy')
    && (v['runClass'] === 'copy-class' ? isText(v['copy']) : v['copy'] === null)
    && isRecord(consents) && exactKeys(consents, ['recorded', 'commit', 'relied']) && isTexts(consents['recorded']) && nullOr(consents['commit'], isText)
    // A recording commit exactly where records were written.
    && (consents['commit'] === null) === ((consents['recorded'] as readonly string[]).length === 0);
  const subjectOk = isRecord(subject) && exactKeys(subject, ['identity', 'url', 'source', 'proposedBy', 'publicDeclaration'])
    && isText(subject['identity']) && isText(subject['url']) && isText(subject['source']) && nullOr(subject['proposedBy'], isText) && nullOr(subject['publicDeclaration'], isText);
  const rest = isRecord(consents) && isTexts(consents['relied']) && nullOr(v['drawer'], isText)
    && Array.isArray(v['statements']) && v['statements'].length > 0 && v['statements'].every(isStatement);
  if (!ok || !subjectOk || !rest) return { state: 'unreadable', why: `it carries a field that is not of the form ${LAUNCH_DISCLOSURE_FORMAT} gives` };
  return { state: 'ok', disclosure: v as unknown as LaunchDisclosure };
}

/** The run record's form of the operator's public declaration: as given, or as the launch observation consent relied on records it; none
 * made where the operator gave none, or where the launch asked nothing and relies on no launch observation consent. */
export function publicDeclarationOf(declaration: 'public' | 'not-public' | 'not-given' | null): string | null {
  return declaration === 'not-given' || declaration === null ? null : declaration;
}

/** A statement's id on a page, carrying its machine form: the stage it needs, the run class that requires it, and whether it was reached. */
export const statementItemId = (s: LaunchStatement): string =>
  `launch/${(s.stage ?? 'no-stage').replace(/ /g, '-')}/${s.runClass ?? 'class-undecided'}/${s.reached ? 'reached' : 'not-reached'}/${s.id}`;

/** A statement as a page item, its id carrying its machine form. */
export const statementItem = (s: LaunchStatement): LocalDisclosureItem => ({ id: statementItemId(s), text: s.text, label: s.label });

/** The item a page shows for one issued brief: the statement its record stored when Syzygy issued it, or, where the record carries none that
 * can be read as one, that what the brief directed its session to is Unknown. */
export function storedBriefItem(record: unknown, which: string, id: string): LocalDisclosureItem {
  const stored = isRecord(record) ? record['stageStatement'] : undefined;
  if (isStatement(stored) && stored.stage === 'brief or packet delivered' && stored.reached) return statementItem(stored);
  return { id: `launch/brief-or-packet-delivered/unknown/${id}`, text: `${which} was issued, and its record carries no brief-stage statement Syzygy can read, so whether it directed its session to a copy is Unknown.`, label: 'Unknown' };
}

/** The launch disclosure in human form, each item with its id and label, for the init output and every page. `issued` holds an item per brief
 * Syzygy issued, from each brief's own record (`storedBriefItem`); where there is any, they stand in place of the record's not-reached
 * brief-stage statement. `init` passes none, since no brief exists yet. */
export function launchDisclosureItems(d: LaunchDisclosure, issued: readonly LocalDisclosureItem[]): LocalDisclosureItem[] {
  const items: LocalDisclosureItem[] = [];
  const item = (id: string, text: string): void => { items.push({ id: `launch/${id}`, text, label: 'Inferred' }); };
  if (!d.launched) item('consents', 'No consent was recorded at launch: the run was not launched, and rests on the observation consent another act recorded.');
  else if (d.consents.recorded.length > 0) item('consents', `The consents were recorded at launch: ${d.consents.recorded.join(', ')}, in the recording commit ${d.consents.commit ?? ''}.`);
  else item('consents', `No consent was recorded at launch: the run rests on launch consent records already in force: ${d.consents.relied.join('; ')}.`);
  item('identity', `The repository identity ${d.subject.identity} and its normalised URL ${d.subject.url} are Inferred, from ${d.subject.source}.`);
  item('public', d.subject.publicDeclaration === null
    ? 'The operator made no declaration whether the repository is public [Inferred].'
    : `The operator's declaration whether the repository is public: ${d.subject.publicDeclaration} [Inferred].`);
  if (d.subject.proposedBy === null) item('proposed', 'The identity was not proposed at launch: it is the one the observation consent another act recorded names.');
  else {
    item('proposed', `The identity was proposed by the rule (${d.subject.proposedBy}) and declared by the owner's phrase.`);
    IDENTITY_RESIDUALS.forEach((residual, i) => item(`residual-${i + 1}`, residual));
  }
  for (const s of d.statements) if (!(issued.length > 0 && s.id === 'briefs')) items.push(statementItem(s));
  items.push(...issued);
  item('drawer', d.drawer === null ? 'No drawer statement was relied on.' : `The drawer statement relied on: ${d.drawer}.`);
  const asked = d.statements.some(s => s.id === 'question' && s.reached);
  item('answered', asked
    ? 'Who answered rests on the operator\'s declaration that the owner answered in person [Inferred].'
    : 'No question was asked, so no one answered it.');
  return items;
}

/** A page's item where the run carries no launch disclosure it can read. */
export function launchDisclosureUnknown(read: Exclude<LaunchDisclosureRead, { state: 'ok' }>): LocalDisclosureItem {
  return read.state === 'absent'
    ? { id: 'launch/unknown', text: `The run directory holds no ${RUN_LAYOUT.launchDisclosure}: the run was initialised before Syzygy recorded its launch disclosure, so whether it was launched, its class, whether a copy was made and every launch statement are Unknown.`, label: 'Unknown' }
    : { id: 'launch/unknown', text: `The run's ${RUN_LAYOUT.launchDisclosure} cannot be read as the record init writes (${read.why}), so whether it was launched, its class, whether a copy was made and every launch statement are Unknown.`, label: 'Unknown' };
}

/** What a brief says of the run's clone (REQ-polaris-generation-046 and 047; briefs only, review packets unchanged): in a copy-class run the
 * copy, named as the clone to work in, and the operator's clone, which the session is not to read. */
export interface BriefCopy { readonly dir: string; readonly operatorClone: string }

export type BriefCopyDecision = { readonly ok: true; readonly copy: BriefCopy | null } | { readonly ok: false; readonly reason: string };

/** Whether the run's briefs name a copy, decided from the launch disclosure: a copy-class run's copy, which must be the run record's clone;
 * none for a no-copy run, or a run initialised before the disclosure was written. A disclosure that cannot be read decides nothing, so no
 * brief is issued: a copy-class run's brief that omitted the copy would send its session to read nothing but what the record names. */
export function briefCopyOf(read: LaunchDisclosureRead, runClone: string): BriefCopyDecision {
  if (read.state === 'absent') return { ok: true, copy: null };
  if (read.state === 'unreadable') {
    return { ok: false, reason: `the run's ${RUN_LAYOUT.launchDisclosure} cannot be read as the record init writes (${read.why}), so whether the brief must direct its session to a copy cannot be decided` };
  }
  const d = read.disclosure;
  if (d.runClass === 'no-copy' || d.copy === null) return { ok: true, copy: null };
  if (d.copy !== runClone) return { ok: false, reason: `the run's ${RUN_LAYOUT.launchDisclosure} names the copy ${d.copy}, but the run record's clone is ${runClone}` };
  return { ok: true, copy: { dir: d.copy, operatorClone: d.operatorClone } };
}

/** The lines a copy-class run's brief adds, for either session. */
export function briefCopyLines(copy: BriefCopy): readonly string[] {
  return [
    `- Clone: \`${copy.dir}\`, a copy of the pinned commit alone, which Syzygy made from the operator's clone (Inferred, from the run's launch disclosure); this copy is the run's clone: work in it, and read it by this path, never as your working directory`,
    `- The operator's clone, at \`${copy.operatorClone}\`: do not read it, or anything under it. Everything this brief says of the clone means the copy. Whether you stayed in the copy is your own report.`,
  ];
}
