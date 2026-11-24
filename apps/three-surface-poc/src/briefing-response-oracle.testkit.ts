import { deepStrictEqual, equal } from 'node:assert/strict';

interface ClaimCarrier {
  readonly claim: { readonly claimId: string; readonly evaluationId: string };
}

interface MachineWire {
  readonly evaluation: { readonly snapshot: string; readonly asOf: string; readonly inputsDigest: string };
  readonly projectShape: {
    readonly kind: string;
    readonly claim: ClaimCarrier['claim'];
    readonly authority: { readonly evaluationId: string; readonly evaluationInstant: string; readonly admits: boolean };
    readonly identity: { readonly scope: unknown };
    readonly classes: Readonly<Record<string, ClaimCarrier>>;
    readonly sources: readonly ClaimCarrier[];
    readonly items: readonly ClaimCarrier[];
    readonly unenumeratedHeadings: readonly ClaimCarrier[];
    readonly projectAccount: readonly ClaimCarrier[];
    readonly facts: readonly ClaimCarrier[];
    readonly contradictions: readonly ClaimCarrier[];
  };
}

export function briefingSubjectsFromMachine(machineBody: string): readonly { family: string; record: ClaimCarrier }[] {
  const { projectShape } = JSON.parse(machineBody) as MachineWire;
  const root = { family: 'shape', record: { claim: projectShape.claim } };
  if (projectShape.kind === 'observation-failed') return [root];
  equal(projectShape.kind, 'observed');
  const { classes, sources, items, unenumeratedHeadings, projectAccount, facts, contradictions } = projectShape;
  const byClaim = new Map(facts.map(fact => [fact.claim.claimId, fact]));
  for (const mirror of contradictions) deepStrictEqual(mirror, byClaim.get(mirror.claim.claimId));
  return [
    root,
    ...sources.map(record => ({ family: 'source', record })),
    ...items.map(record => ({ family: 'item', record })),
    ...Object.values(classes).map(record => ({ family: 'class', record })),
    ...facts.map(record => ({ family: 'fact', record })),
    ...unenumeratedHeadings.map(record => ({ family: 'unenumerated-heading', record })),
    ...projectAccount.map(record => ({ family: 'project-account', record })),
  ];
}

/** Verify the entire successful briefing from the actual two HTTP bodies. */
export function assertBriefingDerivesFromMachine(machineBody: string, briefingBody: string, claimId: string): void {
  const { projectShape, evaluation } = JSON.parse(machineBody) as MachineWire;
  const { authority } = projectShape;
  equal(authority.admits, true);
  equal(authority.evaluationInstant, evaluation.asOf);
  const matches = briefingSubjectsFromMachine(machineBody).filter(row => row.record.claim.claimId === claimId);
  equal(matches.length, 1);
  equal(matches[0]?.record.claim.evaluationId, authority.evaluationId);
  deepStrictEqual(JSON.parse(briefingBody), {
    evaluation: { snapshot: evaluation.snapshot, inputsDigest: evaluation.inputsDigest, asOf: evaluation.asOf },
    ...(projectShape.kind === 'observed' ? { scope: projectShape.identity.scope } : {}),
    authority,
    subject: matches[0],
  });
}
