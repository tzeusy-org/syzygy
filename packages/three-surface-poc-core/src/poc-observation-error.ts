/** A required seed artifact or the seed graph itself failed observation;
 * re-exported from `model.ts`, whose path governed records cite. */
export class PocObservationError extends Error {
  constructor(
    readonly kind:
      | 'required-artifact-missing'
      | 'required-artifact-semantic-mismatch'
      | 'required-artifact-unreadable'
      | 'invalid-seed-graph',
    readonly artifactPath?: string,
    readonly detail?: string,
  ) {
    super([kind, artifactPath, detail].filter((part): part is string => part !== undefined).join(': '));
    this.name = 'PocObservationError';
  }
}
