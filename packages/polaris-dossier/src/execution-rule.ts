import type { DoctrineSpan, Sec3Text } from './doctrine-quote.js';
import type { GateState } from './gate-sources.js';
import type { LaunchedMarkerState } from './launched.js';

/** Which execution rule a brief carries (REQ-polaris-generation-033; design decision 8).
 *
 * SEC-3's own rule unless every condition 033 sets under D9 holds: D9 in force by the act cross-check; the operator declared to be the
 * owner; the owner's execution choice for this run and this pinned revision, taken from `allow-execution` and recorded before the brief,
 * with the operator's declarations that the owner started the authoring session on the owner's own host and attends it; and the
 * adapter-credential probe passing. Only the authoring session's brief may carry the permission; any other role gets SEC-3's rule.
 *
 * The permitting arm is built here and kept off by `PERMITTING_ARM_ENABLED`: the CLI wires `allow-execution`'s record and the
 * credential probe (execution-choice.ts, credential-probe.ts) as its ports, but every brief carries SEC-3's rule, with that reason
 * stated, until the flag is switched on. Tests enable it with fixture ports. Syzygy cannot see who typed the choice or whether the owner attends, so both are the operator's declaration, labelled Inferred. */

/** Off until the owner signs the CC-SEC-3 conforming amendment (syzygy-bpyt.1.6, owner direction GP-Q7); even then it flips only after the implementation is verified to disclose what REQ-polaris-generation-033 requires and a CC-REV-1 class-4 review passes. A caller that enables the arm must also supply its ports. */
export const PERMITTING_ARM_ENABLED = false;
export const PERMITTING_ARM_DISABLED_REASON = 'the permitting arm is not enabled in this build: it stays off until the execution choice (`syzygy dossier allow-execution`) and the adapter-credential probe (syzygy-qkea.5) are merged and the arm is switched on, so no brief may permit execution';

export type BriefRole = 'authoring' | 'inventory' | 'review';

/** The owner's execution choice as `allow-execution` records it (S4). */
export interface ExecutionChoice {
  readonly recordId: string;
  readonly command: 'allow-execution';
  readonly runId: string;
  readonly revision: string;
  /** ISO-8601 instant at which `allow-execution` recorded it. */
  readonly recordedAt: string;
  /** The operator's declarations (R3-F2), each Inferred. */
  readonly declarations: {
    readonly ownerStartedSession: boolean;
    readonly ownersOwnHost: boolean;
    readonly ownerAttends: boolean;
  };
}

export interface ExecutionChoiceSource {
  /** The choice recorded for this run directory, re-read and never cached. */
  readonly choiceFor: (runDir: string) => Promise<{ readonly state: 'ok'; readonly choice: ExecutionChoice } | { readonly state: 'absent' | 'refused'; readonly why: string }>;
}

export type CredentialFindingKind =
  | 'adapter-credential-readable'
  | 'adapter-credential-configuration-refused'
  | 'adapter-credential-undetermined';

export type CredentialProbeOutcome =
  | { readonly passed: true; readonly checked: number; readonly source: string }
  | {
    readonly passed: false;
    readonly why: string;
    /** Older injected probes have no recorded basis. Their refusal remains undetermined. */
    readonly kind?: CredentialFindingKind;
    /** Positive file count when a separate configuration failure also refused the probe. */
    readonly readableAlongsideRefusal?: number;
  };

export interface CredentialProbe {
  /** An operating-system read attempt, as the operator's user, of every credential Syzygy's configuration holds for its typed adapters. */
  readonly probe: () => Promise<CredentialProbeOutcome>;
}

export interface PermittingArm {
  readonly enabled: boolean;
  readonly choices?: ExecutionChoiceSource;
  readonly probe?: CredentialProbe;
}

export interface ExecutionInputs {
  readonly role: BriefRole;
  readonly runDir: string;
  readonly runId: string;
  readonly pinnedRevision: string;
  readonly operatorIsOwner: boolean;
  readonly sec3: Sec3Text;
  readonly now: number;
  readonly d9: () => Promise<GateState>;
  /** Reads the run's launched marker, fail-closed; only `absent`, a run the operator started, can carry the permission. Called only once
   * the permitting arm is consulted, so a brief the arm cannot reach never opens the marker. */
  readonly launched: () => LaunchedMarkerState;
  readonly permitting: PermittingArm;
}

interface DoctrineCitation { readonly path: string; readonly sha256: string }

export type ExecutionRule =
  | {
    readonly arm: 'sec-3';
    readonly cites: 'SEC-3';
    readonly doctrine: DoctrineCitation;
    readonly sec3Head: DoctrineSpan;
    /** Every condition that kept the permitting arm out. */
    readonly notPermittedBecause: readonly string[];
  }
  | {
    readonly arm: 'permitting';
    readonly cites: 'SEC-3 (D9)';
    readonly doctrine: DoctrineCitation;
    readonly d9: string;
    readonly choice: ExecutionChoice;
    readonly choiceLabel: 'Inferred';
    readonly probe: { readonly checked: number; readonly source: string };
    /** D9's cost bullet as adopted (R3-F3). */
    readonly cost: DoctrineSpan;
  };

export async function decideExecutionRule(inputs: ExecutionInputs): Promise<ExecutionRule> {
  const doctrine = { path: inputs.sec3.path, sha256: inputs.sec3.sha256 };
  const sec3 = (reasons: readonly string[]): ExecutionRule => ({ arm: 'sec-3', cites: 'SEC-3', doctrine, sec3Head: inputs.sec3.head, notPermittedBecause: reasons });
  if (inputs.role !== 'authoring') return sec3([`only the authoring session's brief may carry the permission; this is the ${inputs.role} brief`]);
  if (!inputs.permitting.enabled) return sec3([PERMITTING_ARM_DISABLED_REASON]);
  const { choices, probe } = inputs.permitting;
  if (choices === undefined || probe === undefined) return sec3(['the permitting arm is enabled without its choice source or credential probe']);

  const reasons: string[] = [];
  const launched = inputs.launched();
  if (launched === 'launched') reasons.push('this run was launched by `syzygy polaris`, and Syzygy never gives the execution instruction to a session it started');
  if (launched === 'unreadable') reasons.push('the run\'s launched marker is present but cannot be read as the one `syzygy polaris` writes, so the run is treated as launched');
  const d9 = await inputs.d9();
  if (d9.state !== 'ok') reasons.push(`D9 is not established in force: ${d9.why}`);
  if (inputs.sec3.cost === null) reasons.push(`SEC-3 in ${inputs.sec3.path} carries no cost bullet for the permitted case, so the cost cannot be quoted`);
  if (inputs.operatorIsOwner !== true) reasons.push('the run configuration does not declare the operator to be the owner');
  const found = await choices.choiceFor(inputs.runDir);
  let choice: ExecutionChoice | null = null;
  if (found.state !== 'ok') {
    reasons.push(`no execution choice is recorded for this run by allow-execution: ${found.why}`);
  } else {
    choice = found.choice;
    if (choice.command !== 'allow-execution') reasons.push(`the execution choice ${choice.recordId} was not recorded by allow-execution`);
    if (choice.runId !== inputs.runId) reasons.push(`the execution choice ${choice.recordId} names run ${choice.runId}, not ${inputs.runId}`);
    if (choice.revision !== inputs.pinnedRevision) reasons.push(`the execution choice ${choice.recordId} names revision ${choice.revision}, not the pinned ${inputs.pinnedRevision}`);
    const at = Date.parse(choice.recordedAt);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(choice.recordedAt) || Number.isNaN(at)) reasons.push(`the execution choice ${choice.recordId} carries no readable instant`);
    else if (at > inputs.now) reasons.push(`the execution choice ${choice.recordId} is dated after the brief`);
    const declared = choice.declarations;
    if (declared.ownerStartedSession !== true) reasons.push('the operator has not declared that the owner started the authoring session');
    if (declared.ownersOwnHost !== true) reasons.push('the operator has not declared that the authoring session runs on the owner\'s own host');
    if (declared.ownerAttends !== true) reasons.push('the operator has not declared that the owner attends the authoring session');
  }
  const probed = await probe.probe();
  if (!probed.passed) reasons.push(`the adapter-credential probe did not pass: ${probed.why}`);

  if (reasons.length > 0 || d9.state !== 'ok' || choice === null || !probed.passed || inputs.sec3.cost === null) return sec3(reasons);
  return { arm: 'permitting', cites: 'SEC-3 (D9)', doctrine, d9: d9.record, choice, choiceLabel: 'Inferred', probe: { checked: probed.checked, source: probed.source }, cost: inputs.sec3.cost };
}

const fence = (span: DoctrineSpan): string => {
  if (span.text.includes('```')) throw new Error('execution-rule: a doctrine span carries a code fence');
  return `\`\`\`text\n${span.text}\n\`\`\``;
};

/** The brief's execution-rule section. The doctrine spans sit in a fenced block so the quoted bytes are exactly the file's. */
export function executionRuleSection(rule: ExecutionRule, report: 'executions' | 'none' = 'executions'): string {
  const reporting = report === 'none' ? 'You run nothing from the clone, so you report no executions, and no entry rests on building or running the observed project.' : 'Under either rule: list in `executions` every command you run, with its working directory and purpose, whether or not a claim rests on it. A claim that rests on your building or running of the observed project has `label: inferred`, `basis: execution` and names, in `executionIds`, the executions it rests on. Syzygy runs and launches nothing; it records the list as your report, labelled Inferred, and shows each such claim with the commands it names.';
  if (rule.arm === 'sec-3') {
    return [
      '## Execution rule: SEC-3',
      '',
      `SEC-3, as adopted (\`${rule.doctrine.path}\`, lines ${rule.sec3Head.startLine}–${rule.sec3Head.endLine}, sha256 \`${rule.doctrine.sha256}\`):`,
      '',
      fence(rule.sec3Head),
      '',
      'So: do not build or run the observed project outside an explicit, opt-in execution profile. That covers its build, its tests, its scripts and any program, hook or tool that comes from the clone. This brief grants no execution profile and no permission to execute.',
      '',
      reporting,
    ].join('\n');
  }
  return [
    '## Execution rule: SEC-3, the owner\'s attended agent session (D9)',
    '',
    `You may build and run the observed project in the clone, from this authoring session only, under the owner's execution choice \`${rule.choice.recordId}\`, recorded by \`syzygy dossier allow-execution\` at ${rule.choice.recordedAt} for run \`${rule.choice.runId}\` and revision \`${rule.choice.revision}\`. Who typed that command, and that the owner started and attends this session on the owner's own host, are the operator's declaration, labelled Inferred. The code stays untrusted.`,
    '',
    'This permission lapses if the owner stops attending this session, including by leaving it under an automatic-approval or permission-bypass setting while away; once it lapses, run no further observed code.',
    'Work you hand to your own subagents stays part of this session and under this rule.',
    'Start no process meant to outlive this session.',
    'Before this session ends, stop every process you started, including any you left running in the background, and say in your report that you did.',
    'If `syzygy dossier check` reports that the permission has lapsed or that an adapter credential is readable, run nothing further.',
    '',
    `For every command you run, also give in \`executions\` its \`workingDirectory\`, the absolute path you ran it in, and its \`scope\`: \`within-scope\` when it falls within what the owner's execution choice names (building or running the observed project in the clone, from this session, for run \`${rule.choice.runId}\` and revision \`${rule.choice.revision}\`), \`outside-scope\` when it does not. A command is admitted without them, but Syzygy flags, beside the command and labelled Inferred, each one that reports no working directory, whose working directory lies outside the clone, or that you mark \`outside-scope\`. A flag refuses no step and hides no command: it makes the command visible, it does not permit or forbid it.`,
    '',
    `What the permitted case costs, as adopted (\`${rule.doctrine.path}\`, lines ${rule.cost.startLine}–${rule.cost.endLine}, sha256 \`${rule.doctrine.sha256}\`):`,
    '',
    fence(rule.cost),
    '',
    reporting,
  ].join('\n');
}
