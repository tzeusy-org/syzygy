import {
  LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM, createPackageAdmissionRecordsPort, readDigestBoundActState, readPolicyActChain, readVersionedSignoffState,
  DECISIONS_DIR, SLOT, recorderTemplate,
  type ActState, type ConsentedRevision, type DigestBoundAct, type DigestBoundActForm, type ExemptRecord, type ObservationRecordSummary, type PackageReaderFs, type RecorderTemplate,
  type VersionedSignoffForm,
} from '@syzygy/polaris-generation-consent/live';
import { readdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { DrawerStatement } from './governed.js';
import { normaliseUrl } from './launch-identity.js';

/** The records Syzygy's start gates read (REQ-polaris-generation-033, 036), each re-read on every call and never cached.
 *
 * Every source establishes "in force" by the act cross-check of RFC3-16(a): an owner-act record in its recorder's form whose argument
 * is the sha256 of the artifact's current bytes and whose instant is not after `now`; never by a status word or a file's presence
 * (R3-F8). The records lie in Syzygy's checkout, within the agent sessions' write reach, and every report says so. */

export type GateState =
  | { readonly state: 'ok'; readonly record: string }
  | { readonly state: 'absent'; readonly why: string }
  | { readonly state: 'refused'; readonly why: string };

export type ConsentAnswer = { readonly satisfied: true; readonly record: string } | { readonly satisfied: false; readonly why: string };

/** A per-project statement (SEC-2's explicit, recorded, per-project consent) as the gate needs it. The package source reads it from
 * the agent-provider records of the local-agent sitting and their acts (`STATEMENT_FORMS`). */
export interface ProviderStatementRecord {
  readonly recordId: string;
  readonly version: string;
  readonly digest: string;
  /** The agent tool the statement names, as the run configuration writes it (`AGENT_TOOLS`): consent is to one tool with one provider. */
  readonly agentTool: string;
  /** The model provider the statement names. */
  readonly provider: string;
  /** The content classes it may receive. */
  readonly contentClasses: readonly string[];
  readonly withdrawn: boolean;
  /** The owner act that put it in force, cross-checked under RFC3-16(a) by the source; null when none binds its bytes. */
  readonly act: { readonly identity: string; readonly inForceAt: number } | null;
}

export interface ProjectInputSource {
  readonly drawerFor: (repositoryId: string) => Promise<DrawerStatement>;
}
export interface ProviderStatementSource {
  readonly statementsFor: (repositoryId: string) => Promise<readonly ProviderStatementRecord[]>;
}

export interface GateSources {
  /** Where the records are read from, for the disclosure. */
  readonly recordsRoot: string;
  /** Repository ids of the observation consents in force whose `Upstream:` URL, normalised by REQ-polaris-generation-046's rule, equals
   * `url`, a normalised locator (host and whole path), for every host (line 17). */
  readonly repositoryIdsFor: (url: string) => Promise<readonly string[]>;
  /** Why no observation consent in force names the normalised URL, for a refusal's reason only (R-POLARIS-DOSSIER-S3-GATES-1 finding 4). */
  readonly consentAbsenceFor?: (url: string) => Promise<string>;
  readonly consentedRevisionsFor: (repositoryId: string) => Promise<readonly ConsentedRevision[]>;
  readonly observationConsentFor: (repositoryId: string, revision: string) => Promise<ConsentAnswer>;
  /** Whether an in-force observation consent made by any act of these sources names `revision`, whatever its repository: the class rule of
   * REQ-polaris-generation-047 ("unless its named identifier is named by an in-force observation consent made by another act"). It reads the
   * same records as `observationConsentFor` and nothing else. */
  readonly observationConsentNaming: (revision: string) => Promise<ConsentAnswer>;
  /** Every observation consent these sources hold, in any state, with its subject, `Upstream:` URL as written and admitted revisions:
   * the records "made by any other act" that REQ-polaris-generation-046 matches by identity, by normalised `Upstream:` URL, by the pinned
   * revision or by a parent. Refused, never empty, when the records cannot be read. Grants nothing. */
  readonly observationRecords: () => Promise<{ readonly ok: true; readonly records: readonly ObservationRecordSummary[] } | { readonly ok: false; readonly why: string }>;
  readonly registryEntry: () => Promise<GateState>;
  /** The classification and screening policy that covers public sources: one policy file carries both (the public-source scope of
   * `project:syzygy`'s secret-classification policy), under one act chain. */
  readonly screeningPolicy: () => Promise<GateState>;
  readonly d9: () => Promise<GateState>;
  readonly rfc720Ruling: () => Promise<GateState>;
  readonly projectInput: ProjectInputSource;
  readonly providerStatements: ProviderStatementSource;
  /** These sources without launch consent records, where they were added (`withLaunchRecords`): what "an observation consent made by
   * another act" is decided from (REQ-polaris-generation-047's first branch and class rule; 046's records "made by any other act").
   * Absent, these sources hold no launch record. */
  readonly otherActs?: GateSources;
}

/** The sources an "another act" decision reads: never a launch consent record (R-PDJA-33-SLICE-B-1 finding 1). */
export const otherActsOf = (sources: GateSources): GateSources => sources.otherActs ?? sources;

/** The implementation the source-acquisition registry entry must name for the dossier's reads (git-object-reader.ts): the local-agent
 * entry, signed off by version tag (`LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM`), names it with implementation version 1.0.0. */
export const DOSSIER_READER_IMPLEMENTATION_ID = 'polaris-dossier/git-object-reader';

const UNSTATED_WHY = 'no admitted project input record (REQ-polaris-generation-001) for this subject exists, so whether a kernel evidence drawer exists is not stated';
export const NO_PROJECT_INPUT: ProjectInputSource = Object.freeze({
  drawerFor: async (): Promise<DrawerStatement> => ({ stated: false, why: UNSTATED_WHY }),
});
export const NO_PROVIDER_STATEMENTS: ProviderStatementSource = Object.freeze({ statementsFor: async () => [] });

/** The local-agent sitting's records (scripts/build_dossier_local_agent_acts.py) and the acts over them, each a dedicated decisions
 * record written by scripts/record_dossier_local_agent_acts.py (`ACTS`, `render_act`): `DOSSIER-LOCAL-AGENT-<stem>-ACT.md`, titled
 * `# Owner act — <title>`, identity `<identity stem>-<date>`, binding the record's exact bytes. An act counts only when its record is
 * byte for byte what `render_act` writes from the record's own date, instant, argument, owner selection and review provenance; the
 * port of the template is held to the recorder's output by a test over every act (R-POLARIS-DOSSIER-GATE-SOURCES-2 finding 2). */
const SITTING_PACKAGE = '.syzygy/governance/contracts/candidates/dossier-local-agent-acts';
const SITTING_INSTANCES = `${SITTING_PACKAGE}/instances`;
interface SittingAct {
  /** `Act.key`, `.label`, `.stem`, `.identity_stem`, `.title`, `.act_type`, `.scope` and `.effect` in the recorder; `artifact` is
   * `.subject` under the sitting's instances, and `heading` its own H1 without the `# ` (R-POLARIS-DOSSIER-GATE-SOURCES-3 note 2). */
  readonly key: string; readonly label: string; readonly stem: string; readonly identityStem: string; readonly title: string;
  readonly type: string; readonly artifact: string; readonly heading: string; readonly scope: string; readonly effect: string;
}
/** scripts/record_dossier_local_agent_acts.py `render_act`, slots `date`, `instant`, `argument`, the owner's selection (`opening`,
 * `label`, `description`) and the confirming review's provenance (`manifest`, `frozen`, `verdict`, `reviewed`). */
function sittingTemplate(a: SittingAct): RecorderTemplate {
  return recorderTemplate(`# Owner act — ${a.title}

Date: {date}

Recorded at (UTC): {instant}

Owner: Tzeusy

Act identity: \`${a.identityStem}-{date}\`

Act type: \`${a.type}\`

Project identity: \`project:syzygy\`

Artifact identity: \`${SITTING_INSTANCES}/${a.artifact}\`

Exact digest (SHA-256): \`{argument}\`

Scope: ${a.scope}

Provenance state: \`owner-adopted (bootstrap, uncorrelated)\` — state (1),
explicitly selected by the owner's option selection recorded below

Supersession / revocation: supersedes nothing; revoked only by a later exact
owner act naming it.

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

The owner was presented the confirmed packet at
\`${SITTING_PACKAGE}/OWNER-SITTING-PACKET.md\`, which by design carries no digest. The act takes
this phrase, whose argument is this record's row of the sitting manifest:

\`\`\`text
${a.label}: {argument}
\`\`\`

The owner did not type the phrase. On {date} the owner answered a structured
question in the Claude Code CLI that opened "{opening}" by selecting the
option below; the selection is the instruction, and it names the record "at
the manifest row". The label and description, verbatim:

| Label | Description |
|---|---|
| "{label}" | "{description}" |

The argument was read from this record's row of
\`${SITTING_PACKAGE}/DOSSIER-LOCAL-AGENT-SITTING-MANIFEST.txt\` at the frozen commit and matched the record on
disk at recording. A swapped argument would have been refused: the recorder
rejects an argument that is not this record's row.

Frozen provenance:

- frozen subject (package bytes): \`{frozen}\`;
- the sitting manifest file hashes to \`{manifest}\` (a container digest,
  no act's argument; worded so CG-7e's bare-heading pass does not read it as
  a stale copy of this act's argument);
- confirmation review: \`${SITTING_PACKAGE}/reviews/R-DOSSIER-LOCAL-AGENT-SITTING-3-RAW.md\`, verdict
  \`{verdict}\`, its head bound to the manifest file's SHA-256 above; notes, if
  any, are dispositioned in \`${SITTING_PACKAGE}/ROUND-3-DISPOSITIONS.md\`; the raw names
  reviewed commit \`{reviewed}\` [Observed — the raw's own line; binding is by
  digest]; and
- recording tag: \`dossier-local-agent-${a.key}-signed-{date}\`, on the commit carrying this act record.

## Effect

${a.effect}

## What this act does not authorize

This act satisfies only its own authority; the sitting's other acts each take
their own act and none implies another (REQ-polaris-generation-025). It gives
no observation consent, adopts no registry entry or screening policy, amends
no doctrine, contract or specification, and grants no read, egress, write,
execution, deployment, release, autonomous or multi-user authority beyond
what its Effect states. It proves no read, screening, generation or answer
result.
`, {
    date: SLOT.date, instant: SLOT.instant, argument: SLOT.sha256, opening: SLOT.line, label: SLOT.line, description: SLOT.line,
    frozen: SLOT.commit, manifest: SLOT.sha256, verdict: SLOT.verdict, reviewed: SLOT.commit,
  });
}
/** What a form adds to its own stems: `stems` (prose), `fieldStems` (field lines only), `bound` files, and the `exemptRecords` its
 * sweep reads past (`DigestBoundActForm`). */
interface FormExtras {
  readonly bound?: readonly string[]; readonly stems?: readonly string[]; readonly fieldStems?: readonly string[];
  readonly exemptRecords?: readonly ExemptRecord[];
}
const extras = (more: FormExtras) => ({
  ...(more.fieldStems === undefined ? {} : { fieldStems: Object.freeze([...more.fieldStems]) }),
  ...(more.bound === undefined ? {} : { bound: Object.freeze([...more.bound]) }),
  ...(more.exemptRecords === undefined ? {} : { exemptRecords: Object.freeze([...more.exemptRecords]) }),
});
/** The form of one sitting act. Its sweep reads the record's file stem, the act identity, the artifact's path, basename and heading,
 * the phrase label and the record's title, plus the extras. */
const sittingForm = (a: SittingAct, more: FormExtras = {}): DigestBoundActForm => Object.freeze({
  file: `DOSSIER-LOCAL-AGENT-${a.stem}-ACT.md`,
  title: `# Owner act — ${a.title}`,
  type: a.type,
  identity: (date: string) => `${a.identityStem}-${date}`,
  artifact: `${SITTING_INSTANCES}/${a.artifact}`,
  stems: Object.freeze([`dossier-local-agent-${a.stem.toLowerCase()}`, a.identityStem.toLowerCase(), a.artifact.split('/').pop()!, a.heading, a.label, a.title, ...(more.stems ?? [])]),
  template: sittingTemplate(a),
  ...extras(more),
});

/** Version 2 of the Redis statement for Claude Code with Anthropic (`dossier-agent-provider-v2/`, register row P-106): the same record
 * with `project-documentation` added. Its act is written by scripts/record_dossier_agent_provider_v2_act.py; this is a byte-for-byte
 * port of its `render_act`, slots as the sitting's plus the packet words the owner's option maps to (`quote`) and the version-1 act's
 * date and argument (`supersededDate`, `superseded`), held to the recorder by a test. */
const PROVIDER_V2_PACKAGE = '.syzygy/governance/contracts/candidates/dossier-agent-provider-v2';
const PROVIDER_V2_FILE = 'DOSSIER-AGENT-PROVIDER-V2-REDIS-ANTHROPIC-ACT.md';
const PROVIDER_V2_LABEL = 'CONSENT TO ANTHROPIC AGENT PROVIDER VERSION 2 FOR REDIS';
const PROVIDER_V2_TITLE = 'agent-provider statement for redis/redis, version 2: Claude Code with Anthropic';
const PROVIDER_V2_ARTIFACT = `${PROVIDER_V2_PACKAGE}/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md`;
const PROVIDER_V1_RECORD = `${DECISIONS_DIR}/DOSSIER-LOCAL-AGENT-REDIS-AGENT-ANTHROPIC-ACT.md`;
const STATEMENT_SCOPE = 'operator-agent runs over this one repository with this one tool and provider';
const PROVIDER_V2_TEMPLATE: RecorderTemplate = recorderTemplate(`# Owner act — ${PROVIDER_V2_TITLE}

Date: {date}

Recorded at (UTC): {instant}

Owner: Tzeusy

Act identity: \`AGENT-PROVIDER-V2-REDIS-ANTHROPIC-{date}\`

Act type: \`consent-agent-provider\`

Project identity: \`project:syzygy\`

Artifact identity: \`${PROVIDER_V2_ARTIFACT}\`

Exact digest (SHA-256): \`{argument}\`

Scope: ${STATEMENT_SCOPE}

Provenance state: \`owner-adopted (bootstrap, uncorrelated)\` — state (1),
explicitly selected by the owner's option selection recorded below

Supersession / revocation: this act supersedes, prospectively from its own instant (RFC5-13), the {supersededDate} act recorded at \`${PROVIDER_V1_RECORD}\`, which binds version 1 of the same record at \`{superseded}\`. That record, its digest and the bytes it bound remain immutable history. This act is revoked only by a later exact owner act naming it.

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

The owner was presented decision 2 of the packet at
\`${DECISIONS_DIR}/DOSSIER-BLOCKERS-DECISION-PACKET-2026-10-08.md\`, which by design carries no digest.
The act takes this phrase, whose argument is the one row of the package
manifest:

\`\`\`text
${PROVIDER_V2_LABEL}: {argument}
\`\`\`

The owner did not type the phrase. On {date} the owner answered a structured
question in the Claude Code CLI that opened "{opening}" by selecting the
option below. The label and description, verbatim:

| Label | Description |
|---|---|
| "{label}" | "{description}" |

The packet maps that option to its words "{quote}"; the selection is the
instruction, and the words name the record at the manifest row.

The argument was read from the one row of
\`${PROVIDER_V2_PACKAGE}/DOSSIER-AGENT-PROVIDER-V2-MANIFEST.txt\` and matched the record on disk
at recording. A swapped argument would have been refused: the recorder
rejects an argument that is not that row.

Frozen provenance:

- frozen subject (package bytes): \`{frozen}\`;
- the package manifest file hashes to \`{manifest}\` (a container
  digest, no act's argument);
- confirmation review: \`docs/reviews/R-DOSSIER-AGENT-PROVIDER-V2-2-RAW.md\`, verdict
  \`{verdict}\`, its head bound to the manifest file's SHA-256 above; notes, if
  any, are dispositioned in \`${PROVIDER_V2_PACKAGE}/ROUND-2-DISPOSITIONS.md\`; the raw names
  reviewed commit \`{reviewed}\` [Observed — the raw's own line; binding is by
  digest]; and
- recording tag: \`dossier-agent-provider-v2-redis-anthropic-signed-{date}\`, on the commit carrying this act record.

## Effect

The record is the owner's explicit, recorded, per-project consent (SEC-2)
that the operator's Claude Code sessions, with Anthropic, may receive the
content classes it lists from (\`project:syzygy\`, \`repository:redis-redis\`) in
an operator-agent run, so a brief may issue for that repository even when it
counts as governed. Version 2 lists \`project-documentation\` beside version
1's five classes and differs from version 1 in nothing else but its draft
date, version and supersession line. From this act's instant the gate reads
version 2 and not version 1; before it, version 1 alone.

## What this act does not authorize

This act satisfies only its own authority (REQ-polaris-generation-025). It
gives no observation consent, adopts no registry entry or screening policy,
amends no doctrine, contract or specification, and grants no read, egress,
write, execution, deployment, release, autonomous or multi-user authority
beyond what its Effect states. It is not an egress record and widens no
consent to another tool, provider or repository. It proves no read,
screening, generation or answer result.
`, {
  date: SLOT.date, instant: SLOT.instant, argument: SLOT.sha256, opening: SLOT.line, label: SLOT.line, description: SLOT.line, quote: SLOT.line,
  frozen: SLOT.commit, manifest: SLOT.sha256, verdict: SLOT.verdict, reviewed: SLOT.commit, superseded: SLOT.sha256, supersededDate: SLOT.date,
});

/** D9 was adopted by the owner's words, logged in the doctrine amendment log with no digest, which RFC3-16(a) does not read as an
 * act. Its in-force record binds the whole-file bytes of `security.md` and `v1.md`, and the act binds the record: D9 counts only
 * while the act binds the record's bytes and both files still hash to the record's rows. */
export const D9_ACT_FORM: DigestBoundActForm = sittingForm({
  key: 'd9-in-force', label: 'BIND D9 TO EXACT BYTES FOR OPERATOR-AGENT RUNS', stem: 'D9-IN-FORCE', identityStem: 'D9-IN-FORCE-OPERATOR-AGENT',
  title: 'D9 in force for operator-agent runs', type: 'bind-exact-bytes', artifact: 'in-force/D9-IN-FORCE-RECORD.md',
  heading: 'D9 for operator-agent runs — exact-bytes record',
  scope: 'REQ-polaris-generation-033\'s execution rule only',
  effect: 'The record binds D9, adopted 2026-10-06, to the exact whole-file bytes of `security.md` and `v1.md` it lists, so the act cross-check of RFC3-16(a) may treat D9 as in force for REQ-polaris-generation-033\'s execution rule while both files hash to those digests, and not otherwise.',
}, { bound: ['.syzygy/governance/doctrine/security.md', '.syzygy/governance/doctrine/v1.md'] });
/** Item 1 of the owner direction POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05 (the RFC7-20 reading), in force the same way over the
 * direction file's bytes. */
export const RFC7_20_RULING_ACT_FORM: DigestBoundActForm = sittingForm({
  key: 'rfc7-20-reading-in-force', label: 'BIND RFC7-20 READING TO EXACT BYTES FOR OPERATOR-AGENT RUNS', stem: 'RFC7-20-READING-IN-FORCE',
  identityStem: 'RFC7-20-READING-IN-FORCE-OPERATOR-AGENT', title: 'the owner\'s RFC7-20 reading in force for operator-agent runs', type: 'bind-exact-bytes',
  artifact: 'in-force/RFC7-20-READING-IN-FORCE-RECORD.md', heading: 'The owner\'s RFC7-20 reading for operator-agent runs — exact-bytes record', scope: 'item 1 of the direction, for REQ-polaris-generation-033\'s draft-layer rule only',
  effect: 'The record binds item 1 of the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05` to the exact bytes of its file, so the act cross-check of RFC3-16(a) may treat that reading as in force for REQ-polaris-generation-033\'s draft-layer rule while the file hashes to that digest, and not otherwise.',
}, { bound: ['.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-DIRECTION.md'] });
/** Row 3: the project-input statement that no kernel evidence drawer exists, per repository id. Its Subject tuple is swept on field
 * lines only: the statements' acts quote the same tuple in their Effect. */
export const DRAWER_FORMS: Readonly<Record<string, DigestBoundActForm>> = Object.freeze({
  'redis-redis': sittingForm({
    key: 'redis-no-evidence-drawer', label: 'STATE NO KERNEL EVIDENCE DRAWER FOR REDIS-REDIS', stem: 'REDIS-NO-EVIDENCE-DRAWER', identityStem: 'NO-EVIDENCE-DRAWER-REDIS',
    title: 'no kernel evidence drawer for redis/redis', type: 'state-project-input', artifact: 'redis/NO-EVIDENCE-DRAWER-STATEMENT.md',
    heading: 'No kernel evidence drawer — redis-redis',
    scope: 'the drawer half of REQ-polaris-generation-033\'s governed predicate for this one repository',
    effect: 'The record is the owner\'s statement, in the admitted project input, that no kernel evidence drawer exists for (`project:syzygy`, `repository:redis-redis`). With the pinned tree holding no `openspec/**` and no `.syzygy/` path, the subject is non-governed under REQ-polaris-generation-033 and a brief needs no agent-provider statement.',
  }, { fieldStems: ['(project:syzygy, repository:redis-redis)'] }),
});
/** Rows 3a and 3b: the per-project agent-provider statements, per repository id, each naming the tool (its run-configuration id and
 * the name its record's `Agent tool:` line opens with) and the provider it consents to. A statement's record says it is withdrawn by
 * "a later owner act naming this record", so the sweep reads its Record ID and its Subject as well as the act's own stems. */
/** `successor`, when set, is the act form over the next version of the same record (same Record ID, Subject, tool and provider): from its
 * act's instant the source reads the successor and not this version (RFC5-13, prospective), so the gate never sees two statements for the
 * pair. Each version's sweep reads past the other's act record, and only while it is exactly what that act's recorder renders. */
export interface StatementForm {
  readonly agentTool: string; readonly toolName: string; readonly provider: string; readonly recordId: string; readonly form: DigestBoundActForm;
  readonly successor?: DigestBoundActForm;
}
const statementAct = (toolName: string, provider: string, providerName: string, repositoryId: string, stem: string, identityStem: string, artifact: string): SittingAct => ({
  key: `redis-agent-${provider}`, label: `CONSENT TO AGENT PROVIDER ${provider.toUpperCase()} FOR ${repositoryId.toUpperCase()}`, stem, identityStem,
  title: `agent-provider statement for ${repositoryId.replace('-', '/')}: ${toolName} with ${providerName}`, type: 'consent-agent-provider', artifact,
  heading: `Agent-provider statement — ${repositoryId} to ${provider}`,
  scope: STATEMENT_SCOPE,
  effect: `The record is the owner's explicit, recorded, per-project consent (SEC-2) that the operator's ${toolName} sessions, with ${providerName}, may receive the content classes it lists from (\`project:syzygy\`, \`repository:${repositoryId}\`) in an operator-agent run, so a brief may issue for that repository even when it counts as governed.`,
});
const statementStems = (repositoryId: string, provider: string): readonly string[] =>
  [`AGENT-PROVIDER-${repositoryId}-${provider}`.toLowerCase(), `project:syzygy, repository:${repositoryId}, agent-provider:${provider}`];
const statementForm = (agentTool: string, act: SittingAct, toolName: string, provider: string, repositoryId: string, successor?: { readonly form: DigestBoundActForm; readonly template: RecorderTemplate }): StatementForm => Object.freeze({
  agentTool, toolName, provider, recordId: `AGENT-PROVIDER-${repositoryId}-${provider}`,
  form: sittingForm(act, { stems: statementStems(repositoryId, provider), ...(successor === undefined ? {} : { exemptRecords: [{ file: successor.form.file, template: successor.template }] }) }),
  ...(successor === undefined ? {} : { successor: successor.form }),
});
const REDIS_ANTHROPIC_V1 = statementAct('Claude Code', 'anthropic', 'Anthropic', 'redis-redis', 'REDIS-AGENT-ANTHROPIC', 'AGENT-PROVIDER-REDIS-ANTHROPIC', 'redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md');
/** Version 2's form. Its own stems are new (file, identity, label, title; none in a decisions file before its act, round-2 note 3); the
 * artifact's basename, heading, Record ID and Subject are version 1's, so it reads past version 1's act record at its exact render. */
export const PROVIDER_V2_FORM: DigestBoundActForm = Object.freeze({
  file: PROVIDER_V2_FILE,
  title: `# Owner act — ${PROVIDER_V2_TITLE}`,
  type: 'consent-agent-provider',
  identity: (date: string) => `AGENT-PROVIDER-V2-REDIS-ANTHROPIC-${date}`,
  artifact: PROVIDER_V2_ARTIFACT,
  stems: Object.freeze(['dossier-agent-provider-v2-redis-anthropic', 'agent-provider-v2-redis-anthropic', 'AGENT-PROVIDER-STATEMENT-ANTHROPIC.md',
    'Agent-provider statement — redis-redis to anthropic', PROVIDER_V2_LABEL, PROVIDER_V2_TITLE, ...statementStems('redis-redis', 'anthropic')]),
  template: PROVIDER_V2_TEMPLATE,
  ...extras({ exemptRecords: [{ file: PROVIDER_V1_RECORD.slice(DECISIONS_DIR.length + 1), template: sittingTemplate(REDIS_ANTHROPIC_V1) }] }),
});
export const STATEMENT_FORMS: Readonly<Record<string, readonly StatementForm[]>> = Object.freeze({
  'redis-redis': Object.freeze([
    statementForm('claude-code', REDIS_ANTHROPIC_V1, 'Claude Code', 'anthropic', 'redis-redis', { form: PROVIDER_V2_FORM, template: PROVIDER_V2_TEMPLATE }),
    statementForm('codex', statementAct('Codex', 'openai', 'OpenAI', 'redis-redis', 'REDIS-AGENT-OPENAI', 'AGENT-PROVIDER-REDIS-OPENAI', 'redis/AGENT-PROVIDER-STATEMENT-OPENAI.md'), 'Codex', 'openai', 'redis-redis'),
  ]),
});

const notEstablished = (what: string): GateState => ({
  state: 'absent',
  why: `no owner-act record binds a digest of ${what}, so the act cross-check of RFC3-16(a) cannot establish it in force; a status word, a log row or a file's presence is not read as one`,
});

/** The record's one `<label>: \`value\`` field, or null when it has none or several. */
const field = (text: string, label: string): string | null => {
  const all = [...text.matchAll(new RegExp(`^${label}: \`([^\`\\n]+)\`$`, 'gm'))];
  return all.length === 1 ? all[0]![1]! : null;
};

/** The drawer statement an in-force act puts in the project input for `repositoryId`. Unstated, with the reader's reason, unless the
 * act binds the record's bytes, is in force and the record states no drawer for exactly this subject. */
function drawerStatement(state: ActState<DigestBoundAct>, repositoryId: string): DrawerStatement {
  if (state.state === 'absent' && state.why.startsWith('no owner-act record ')) return { stated: false, why: UNSTATED_WHY };
  if (state.state !== 'ok') return { stated: false, why: `the project-input statement for this subject is not in force: ${state.why}` };
  const text = state.artifactText, recordId = field(text, 'Record ID'), version = field(text, 'Record version');
  const states = text.split('\n').filter(line => line.startsWith('Statement: ')).join('\n') === 'Statement: no kernel evidence drawer (RFC-0006 §3.5) exists for this';
  if (recordId === null || version === null || field(text, 'Subject') !== `(project:syzygy, repository:${repositoryId})` || !states) {
    return { stated: false, why: `the record ${state.act.identity} binds does not state, for exactly this subject, that no kernel evidence drawer exists` };
  }
  return { stated: true, drawer: 'absent', record: `${recordId}@${version}` };
}

/** One provider statement as the gate reads it; null when no act is recorded or in force yet, so an unrecorded statement is no
 * statement at all. A record whose act does not bind it, or whose bytes do not name exactly this subject, tool and provider,
 * carries `act: null`; one that another decisions file names (a withdrawal, or a form the reader does not define) is withdrawn. */
function providerStatement(state: ActState<DigestBoundAct>, repositoryId: string, s: StatementForm): ProviderStatementRecord | null {
  if (state.state === 'absent') return null;
  const { agentTool, provider, recordId } = s;
  const unbound: ProviderStatementRecord = { recordId, version: 'unestablished', digest: '', agentTool, provider, contentClasses: [], withdrawn: false, act: null };
  if (state.state === 'refused' && state.namedBy !== undefined) return { ...unbound, withdrawn: true };
  if (state.state !== 'ok') return unbound;
  const text = state.artifactText, version = field(text, 'Record version');
  const lines = text.split('\n'), at = lines.findIndex(line => line.startsWith('Content classes the provider may receive'));
  const classes: string[] = [];
  for (const line of at < 0 ? [] : lines.slice(at + 2)) {
    const m = /^- `([a-z-]+)`$/.exec(line);
    if (m === null) break;
    classes.push(m[1]!);
  }
  const tools = lines.filter(line => line.startsWith('Agent tool: '));
  if (field(text, 'Record ID') !== recordId || version === null || field(text, 'Subject') !== `(project:syzygy, repository:${repositoryId}, agent-provider:${provider})`
    || tools.length !== 1 || !tools[0]!.startsWith(`Agent tool: ${s.toolName}, `)) return unbound;
  return { recordId, version, digest: state.artifactDigest, agentTool, provider, contentClasses: classes, withdrawn: false, act: { identity: state.act.identity, inForceAt: state.act.recordedAt } };
}

const liveStatements = (records: readonly ProviderStatementRecord[], agentTool: string, provider: string, now: number): readonly ProviderStatementRecord[] =>
  records.filter(r => r.agentTool === agentTool && r.provider === provider && !r.withdrawn && r.act !== null && r.act.inForceAt <= now && r.contentClasses.length > 0);

/** The content classes of the one statement `providerStatementGate` admits for the pair at `now`, or null when it admits none. */
export function statementContentClasses(records: readonly ProviderStatementRecord[], agentTool: string, provider: string, now: number): readonly string[] | null {
  const live = liveStatements(records, agentTool, provider, now);
  return live.length === 1 ? live[0]!.contentClasses : null;
}

/** The statement gate: exactly one in-force statement for the subject that names the run's declared `agentTool` with its `provider`,
 * and at least one content class. A statement for the same provider under another tool, or the same tool with another provider, is
 * no consent to this pair (SEC-2: the record consents to one tool with one provider). */
export function providerStatementGate(records: readonly ProviderStatementRecord[], agentTool: string, provider: string, now: number): GateState {
  const pair = `the agent tool ${agentTool} with the provider ${provider}`;
  const named = records.filter(r => r.agentTool === agentTool && r.provider === provider);
  const live = liveStatements(records, agentTool, provider, now);
  if (live.length === 1) return { state: 'ok', record: `${live[0]!.recordId}@${live[0]!.version}` };
  if (live.length > 1) return { state: 'refused', why: `${live.length} in-force per-project statements name ${pair}; which one governs is ambiguous` };
  if (named.length === 0) {
    const others = records.filter(r => r.agentTool === agentTool || r.provider === provider).map(r => `${r.recordId}@${r.version} names ${r.agentTool} with ${r.provider}`);
    return { state: 'absent', why: `no per-project statement names the operator's agent tool ${agentTool} with the provider ${provider}${others.length === 0 ? '' : ` (${others.join('; ')})`}` };
  }
  const why = named.map(r => `${r.recordId}@${r.version} ${r.withdrawn ? 'is withdrawn' : r.act === null ? 'has no owner act binding its bytes' : r.act.inForceAt > now ? 'is not in force yet' : 'names no content class'}`);
  return { state: 'absent', why: `no per-project statement naming ${pair} is in force: ${why.join('; ')}` };
}

export interface PackageGateSourceOptions {
  readonly root: string;
  readonly now: () => number;
  readonly fs?: PackageReaderFs;
  readonly projectInput?: ProjectInputSource;
  readonly providerStatements?: ProviderStatementSource;
  readonly registryForm?: VersionedSignoffForm;
  readonly d9Form?: DigestBoundActForm | null;
  readonly rfc720Form?: DigestBoundActForm | null;
}

/** The gate sources over one Syzygy checkout, every one an act cross-check through the consent package's readers: the observation
 * consents, the policy chain, the registry entry's version-tagged sign-off, D9 and the RFC7-20 reading, and the drawer and provider
 * statements of the local-agent sitting. With no act recorded each states nothing: D9 and the reading are not established, the
 * drawer is unstated and no statement exists. `projectInput` and `providerStatements` replace the package sources (tests). */
/** Whether a record's `Upstream:` URL, normalised by the same rule, is the normalised locator `url`, host and whole path. */
const upstreamIs = (upstream: string | null, url: string): boolean => upstream !== null && normaliseUrl(upstream)?.url === url;

export function createPackageGateSources(options: PackageGateSourceOptions): GateSources {
  const fsOption = options.fs === undefined ? {} : { fs: options.fs };
  const port = createPackageAdmissionRecordsPort({ root: options.root, now: options.now, ...fsOption });
  const read = (form: DigestBoundActForm) => readDigestBoundActState({ root: options.root, now: options.now(), form, ...fsOption });
  const recorded = async (file: string): Promise<boolean> => {
    try { return (await (options.fs?.readdir ?? readdir)(path.join(options.root, DECISIONS_DIR))).includes(file); } catch { return false; }
  };
  const crossCheck = async (form: DigestBoundActForm | null | undefined, what: string): Promise<GateState> => {
    if (form === null || form === undefined) return notEstablished(what);
    const state = await read(form);
    if (state.state === 'absent' && state.why.startsWith('no owner-act record ')) return notEstablished(what);
    return state.state === 'ok' ? { state: 'ok', record: state.act.identity } : { state: state.state, why: state.why };
  };
  const projectInput: ProjectInputSource = {
    drawerFor: async repositoryId => {
      const form = Object.hasOwn(DRAWER_FORMS, repositoryId) ? DRAWER_FORMS[repositoryId]! : null;
      return form === null ? NO_PROJECT_INPUT.drawerFor(repositoryId) : drawerStatement(await read(form), repositoryId);
    },
  };
  const providerStatements: ProviderStatementSource = {
    statementsFor: async repositoryId => {
      const forms = Object.hasOwn(STATEMENT_FORMS, repositoryId) ? STATEMENT_FORMS[repositoryId]! : [];
      const found = await Promise.all(forms.map(async (s): Promise<readonly (ProviderStatementRecord | null)[]> => {
        const current = providerStatement(await read(s.form), repositoryId, s);
        if (s.successor === undefined) return [current];
        // The successor replaces this version from its act's instant (an act not yet in force reads absent, and this version stands).
        // A successor record that exists but does not hold fails closed: this version is read as withdrawn beside it. With no successor
        // record, a sweep refusal is a file naming the shared stems, which this version's own read has already judged.
        const next = await read(s.successor);
        if (next.state === 'absent' || (next.state === 'refused' && !(await recorded(s.successor.file)))) return [current];
        const successor = providerStatement(next, repositoryId, s);
        if (next.state === 'ok') return [successor];
        return [current === null ? null : { ...current, withdrawn: true }, successor];
      }));
      return found.flat().filter((r): r is ProviderStatementRecord => r !== null);
    },
  };
  return {
    recordsRoot: options.root,
    // By the whole normalised `Upstream:` URL, for every host (046, line 17), from the port's own listing of its records.
    repositoryIdsFor: async url => {
      const read = port.observationRecords === undefined ? null : await port.observationRecords();
      if (read === null || !read.ok) return [];
      return [...new Set(read.records.filter(r => r.state === 'in force' && upstreamIs(r.upstream, url)).map(r => r.repositoryId))].sort();
    },
    consentAbsenceFor: async url => {
      const read = port.observationRecords === undefined ? { ok: false as const, why: 'the admission records port cannot list its observation records' } : await port.observationRecords();
      if (!read.ok) return `${read.why}, so no consent can be established`;
      const naming = read.records.filter(r => upstreamIs(r.upstream, url));
      if (naming.length === 0) return `no observation record's Upstream normalises to ${url}`;
      const each = naming.map(r => `${r.record} ${r.state === 'in force' ? 'is in force' : r.state}`).join('; ');
      return naming.every(r => r.state !== 'in force') ? `the observation record(s) whose Upstream normalises to ${url} are not in force: ${each}` : `the observation record(s) whose Upstream normalises to ${url}: ${each}`;
    },
    consentedRevisionsFor: repositoryId => port.consentedRevisionsFor(repositoryId),
    observationConsentFor: async (repositoryId, revision) => {
      const answer = await port.check({ kind: 'observation-consent', repositoryId, revision });
      return answer.satisfied ? { satisfied: true, record: answer.record } : { satisfied: false, why: answer.why };
    },
    observationRecords: async () => (port.observationRecords === undefined
      ? { ok: false, why: 'the admission records port cannot list its observation records' } : port.observationRecords()),
    observationConsentNaming: async revision => {
      if (port.observationConsentNaming === undefined) return { satisfied: false, why: 'the admission records port cannot answer by revision alone' };
      const answer = await port.observationConsentNaming(revision);
      return answer.satisfied ? { satisfied: true, record: answer.record } : { satisfied: false, why: answer.why };
    },
    registryEntry: async () => {
      const state = await readVersionedSignoffState({ root: options.root, now: options.now(), form: options.registryForm ?? LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM, ...fsOption });
      if (state.state !== 'ok') return { state: state.state, why: state.why };
      return registryEntryUsable(state.artifactText, state.act.identity);
    },
    screeningPolicy: async () => {
      const state = await readPolicyActChain({ root: options.root, now: options.now(), ...fsOption });
      return state.state === 'ok' ? { state: 'ok', record: state.final.identity } : state;
    },
    d9: () => crossCheck(options.d9Form === undefined ? D9_ACT_FORM : options.d9Form, 'the D9 text (SEC-3 amendment)'),
    rfc720Ruling: () => crossCheck(options.rfc720Form === undefined ? RFC7_20_RULING_ACT_FORM : options.rfc720Form, 'the RFC7-20 reading (POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05, item 1)'),
    projectInput: options.projectInput ?? projectInput,
    providerStatements: options.providerStatements ?? providerStatements,
  };
}

/** A registry entry the act binds still admits no read unless it names the dossier's reader with a known implementation version
 * (RFC4-3 admits no output from an entry whose implementation version is Unknown). */
export function registryEntryUsable(entryText: string, actIdentity: string): GateState {
  let document: unknown;
  try {
    document = JSON.parse(entryText);
  } catch {
    return { state: 'refused', why: `the registry entry bound by ${actIdentity} is not JSON` };
  }
  const entries = (document as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(entries) || entries.length !== 1 || entries[0] === null || typeof entries[0] !== 'object') {
    return { state: 'refused', why: `the registry entry file bound by ${actIdentity} does not hold exactly one entry` };
  }
  const entry = entries[0] as { implementationId?: unknown; implementationVersion?: unknown };
  if (entry.implementationId !== DOSSIER_READER_IMPLEMENTATION_ID) {
    return { state: 'refused', why: `the registry entry bound by ${actIdentity} names the implementation ${JSON.stringify(entry.implementationId)}, not ${DOSSIER_READER_IMPLEMENTATION_ID}` };
  }
  if (typeof entry.implementationVersion !== 'string' || entry.implementationVersion.trim() === '') {
    return { state: 'refused', why: `the registry entry bound by ${actIdentity} has no implementation version (Unknown), so RFC4-3 admits no output from it` };
  }
  return { state: 'ok', record: actIdentity };
}

export const RECORDS_WITHIN_REACH = 'the consent, registry, policy and statement records the gates read lie in Syzygy\'s checkout, which the agent sessions can write; Syzygy re-reads and re-checks them at every step, and cannot rule out that a session changed them';
