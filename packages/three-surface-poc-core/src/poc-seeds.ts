import { deepFreeze } from '@syzygy/support';
import type { OrreryDeclaredMapping } from './orrery-projection.js';
import type { PocEntity, PocRelationship, PocSurface } from './model.js';
import type { WorkerChangeSeam } from './worker-change-observation.js';

/**
 * The small implementation-plane input that supplies the static part of a
 * three-surface model.  This is deliberately not a project-shape profile:
 * it contains only the POC's seeded graph and the artifact declarations that
 * the graph names.  Observation facts still come from the builder's explicit
 * inputs and observers.
 */
type PocSeedEntityRole =
  | 'project'
  | 'capability'
  | 'intent'
  | 'code'
  | 'test-definition'
  | 'work'
  | 'test-evidence'
  | 'runtime'
  | 'unknown-region';

type PocSeedRelationshipRole =
  | 'project-to-capability'
  | 'capability-to-intent'
  | 'capability-to-code'
  | 'capability-to-test-definition'
  | 'intent-to-work'
  | 'work-to-code'
  | 'code-to-evidence'
  | 'code-to-runtime'
  | 'capability-to-unmapped-region';

export interface PocSeedEntity {
  readonly role: PocSeedEntityRole;
  readonly id: string;
  readonly kind: PocEntity['kind'];
  /** Supports `{projectName}` and artifact-path placeholders. */
  readonly title: string;
  /** Supports `{projectName}`, `{codePath}`, and `{testPath}`. */
  readonly detail: string;
}

export interface PocSeedRelationship {
  readonly role: PocSeedRelationshipRole;
  readonly id: string;
  readonly kind: string;
  readonly from: string;
  readonly to: string;
  /** Supports `{projectName}`. */
  readonly statement: string;
}

interface PocSeedArtifacts {
  readonly design: string;
  readonly proposal: string;
  readonly requirement: string;
  readonly code: string;
  readonly test: string;
}

interface PocSeedIntentMarkers {
  readonly design: readonly string[];
  readonly proposal: readonly string[];
  readonly requirement: readonly string[];
}

export interface PocSeedInput {
  readonly project: {
    /** Opaque repository identity; never derive identity from display name. */
    readonly repositoryId: string;
    readonly displayName: string;
    /** Human-readable source label used only in provenance. */
    readonly provenanceSource: string;
  };
  readonly artifacts: PocSeedArtifacts;
  readonly intentMarkers: PocSeedIntentMarkers;
  readonly workerChangeSeam: WorkerChangeSeam;
  readonly workerChangeIntentId: string;
  readonly beadPrefix: string;
  readonly entities: readonly PocSeedEntity[];
  readonly relationships: readonly PocSeedRelationship[];
  readonly surfaces: readonly PocSurface[];
  readonly orreryMappings: readonly OrreryDeclaredMapping[];
}

/**
 * The current Butlers proving-case seed.  It is the only default supplied by
 * the application; the model builder has no implicit fallback to it.
 */
export const BUTLERS_POC_SEEDS: PocSeedInput = deepFreeze({
  project: {
    repositoryId: 'repository:butlers-configured-poc',
    displayName: 'Butlers',
    provenanceSource: 'Butlers repository',
  },
  artifacts: {
    design: 'docs/superpowers/specs/2026-08-24-whatsapp-identity-reconciliation-design.md',
    proposal: 'openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md',
    requirement:
      'openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md',
    code: 'src/butlers/identity.py',
    test: 'tests/core/test_identity.py',
  },
  intentMarkers: {
    design: ['Approved for implementation'],
    proposal: ['owner approved the design and end-to-end implementation on 2026-08-24'],
    requirement: ['REQ-switchboard-identity-001', 'whatsapp_user_client', 'whatsapp_jid'],
  },
  workerChangeSeam: {
    sourcePath: 'src/butlers/connectors/whatsapp_user_client.py',
    testPath: 'tests/connectors/test_whatsapp_user_client.py',
  },
  workerChangeIntentId: 'REQ-connector-base-spec-001',
  beadPrefix: 'bu',
  entities: [
    {
      role: 'project',
      id: 'project:butlers',
      kind: 'project',
      title: '{projectName}',
      detail: 'The one configured external proving project.',
    },
    {
      role: 'capability',
      id: 'capability:whatsapp-transport-identity',
      kind: 'capability',
      title: 'WhatsApp transport identity normalization',
      detail: 'Preserve transport metadata while resolving identity through canonical WhatsApp JIDs.',
    },
    {
      role: 'intent',
      id: 'intent:req-switchboard-identity-001',
      kind: 'intent',
      title: 'REQ-switchboard-identity-001',
      detail: 'The selected intent revision records owner approval for implementation.',
    },
    {
      role: 'code',
      id: 'code:identity-resolution',
      kind: 'code-region',
      title: 'Identity resolution code region',
      detail: 'The manually mapped code file at {codePath} implements sender-identity resolution.',
    },
    {
      role: 'test-definition',
      id: 'test:identity-regression-definition',
      kind: 'test-definition',
      title: 'Identity regression test definition',
      detail: 'The manually mapped test file at {testPath} defines the identity regression check.',
    },
    {
      role: 'work',
      id: 'work:whatsapp-single-event-normalization',
      kind: 'work-item',
      title: 'Single-event sender normalization work',
      detail: 'Planned demonstration work has not been materialized.',
    },
    {
      role: 'test-evidence',
      id: 'evidence:focused-pytest',
      kind: 'test-evidence',
      title: 'Focused pytest evidence',
      detail: 'A test definition is not a captured test run.',
    },
    {
      role: 'runtime',
      id: 'runtime:live-satisfaction',
      kind: 'runtime',
      title: 'Live runtime satisfaction',
      detail: 'Repository state does not establish deployment or runtime health.',
    },
    {
      role: 'unknown-region',
      id: 'region:unmapped-code',
      kind: 'unknown-region',
      title: 'Unmapped {projectName} code',
      detail: 'Everything outside the two manually mapped files is outside this slice.',
    },
  ],
  relationships: [
    {
      role: 'project-to-capability',
      id: 'relationship:project-to-capability',
      kind: 'contains',
      from: 'project:butlers',
      to: 'capability:whatsapp-transport-identity',
      statement: '{projectName} declares the selected capability.',
    },
    {
      role: 'capability-to-intent',
      id: 'relationship:capability-to-intent',
      kind: 'governed-by',
      from: 'capability:whatsapp-transport-identity',
      to: 'intent:req-switchboard-identity-001',
      statement: 'The capability is governed by the selected intent revision.',
    },
    {
      role: 'capability-to-code',
      id: 'relationship:capability-to-code',
      kind: 'mapped-to',
      from: 'capability:whatsapp-transport-identity',
      to: 'code:identity-resolution',
      statement: 'The POC manually maps the capability to this code region.',
    },
    {
      role: 'capability-to-test-definition',
      id: 'relationship:capability-to-test-definition',
      kind: 'mapped-to',
      from: 'capability:whatsapp-transport-identity',
      to: 'test:identity-regression-definition',
      statement: 'The POC manually maps the capability to this test definition.',
    },
    {
      role: 'intent-to-work',
      id: 'relationship:intent-to-work',
      kind: 'materializes-as',
      from: 'intent:req-switchboard-identity-001',
      to: 'work:whatsapp-single-event-normalization',
      statement: 'Approved intent materializes as a work item.',
    },
    {
      role: 'work-to-code',
      id: 'relationship:work-to-code',
      kind: 'changes',
      from: 'work:whatsapp-single-event-normalization',
      to: 'code:identity-resolution',
      statement: 'The work item changes the mapped code region.',
    },
    {
      role: 'code-to-evidence',
      id: 'relationship:code-to-evidence',
      kind: 'verified-by',
      from: 'code:identity-resolution',
      to: 'evidence:focused-pytest',
      statement: 'A captured test artifact verifies the code against intent.',
    },
    {
      role: 'code-to-runtime',
      id: 'relationship:code-to-runtime',
      kind: 'satisfies-at-runtime',
      from: 'code:identity-resolution',
      to: 'runtime:live-satisfaction',
      statement: 'The mapped code satisfies the intent in the live runtime.',
    },
    {
      role: 'capability-to-unmapped-region',
      id: 'relationship:capability-to-unmapped-region',
      kind: 'coverage-unknown',
      from: 'capability:whatsapp-transport-identity',
      to: 'region:unmapped-code',
      statement: 'Other code may relate to this capability.',
    },
  ],
  surfaces: [
    {
      id: 'polaris',
      state: 'desired',
      title: 'Polaris',
      question: 'What is this capability supposed to be?',
      entityIds: [
        'project:butlers',
        'capability:whatsapp-transport-identity',
        'intent:req-switchboard-identity-001',
        'runtime:live-satisfaction',
      ],
      relationshipIds: [
        'relationship:project-to-capability',
        'relationship:capability-to-intent',
        'relationship:code-to-runtime',
      ],
    },
    {
      id: 'trajectory',
      state: 'execution',
      title: 'Trajectory',
      question: 'What work and verification exist?',
      entityIds: [
        'intent:req-switchboard-identity-001',
        'work:whatsapp-single-event-normalization',
        'code:identity-resolution',
        'evidence:focused-pytest',
      ],
      relationshipIds: [
        'relationship:intent-to-work',
        'relationship:work-to-code',
        'relationship:code-to-evidence',
      ],
    },
    {
      id: 'orrery',
      state: 'observed',
      title: 'Orrery',
      question: 'Where do intent, work, code, tests, and Unknown regions live?',
      entityIds: [
        'project:butlers',
        'capability:whatsapp-transport-identity',
        'intent:req-switchboard-identity-001',
        'code:identity-resolution',
        'test:identity-regression-definition',
        'work:whatsapp-single-event-normalization',
        'evidence:focused-pytest',
        'runtime:live-satisfaction',
        'region:unmapped-code',
      ],
      relationshipIds: [
        'relationship:project-to-capability',
        'relationship:capability-to-intent',
        'relationship:capability-to-code',
        'relationship:capability-to-test-definition',
        'relationship:intent-to-work',
        'relationship:work-to-code',
        'relationship:code-to-evidence',
        'relationship:code-to-runtime',
        'relationship:capability-to-unmapped-region',
      ],
    },
  ],
  orreryMappings: [
    {
      id: 'code:identity-resolution',
      path: 'src/butlers/identity.py',
      capabilityId: 'capability:whatsapp-transport-identity',
    },
  ],
});
