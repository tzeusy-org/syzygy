// Test support: exports with no non-test importer are consumed by tests only, by design.

/** The Unknown-disclosure markers a capability deep dive may render for its
 * contract band (PWB-REQ-015), restated by hand for the marker sweeps. */
export const DEEP_DIVE_MARKERS = (capabilityId: string): readonly string[] => [
  `${capabilityId}/current-authority`,
  `${capabilityId}/adoption`,
  `${capabilityId}/requirement-text`,
  `${capabilityId}/doctrine`,
  `${capabilityId}/non-goals`,
];
