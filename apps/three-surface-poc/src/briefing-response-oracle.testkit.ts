import { deepStrictEqual, equal } from 'node:assert/strict';

/** Verify the entire successful briefing from the actual two HTTP bodies. */
export function assertBriefingDerivesFromMachine(machineBody: string, briefingBody: string, claimId: string): void {
  const machine = JSON.parse(machineBody) as {
    readonly evaluation: { readonly asOf: string };
    readonly projectShape: {
      readonly kind: string;
      readonly authority: { readonly evaluationId: string; readonly evaluationInstant: string };
      readonly identity: { readonly scope: unknown };
      readonly items: readonly { readonly claim: { readonly claimId: string; readonly evaluationId: string } }[];
    };
  };
  const shape = machine.projectShape;
  equal(shape.kind, 'observed');
  equal(shape.authority.evaluationInstant, machine.evaluation.asOf);
  const matches = shape.items.filter(row => row.claim.claimId === claimId);
  equal(matches.length, 1);
  equal(matches[0]?.claim.evaluationId, shape.authority.evaluationId);
  deepStrictEqual(JSON.parse(briefingBody), {
    evaluation: machine.evaluation,
    scope: shape.identity.scope,
    authority: shape.authority,
    item: matches[0],
  });
}
