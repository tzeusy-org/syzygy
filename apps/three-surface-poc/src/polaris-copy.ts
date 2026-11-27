/**
 * Every fixed owner-visible Polaris string, with exactly one role from the
 * closed PWB-REQ-012 set. The renderer takes text from this table and
 * marks the element that carries it with `data-copy-role`; the human output
 * exposes the role through that attribute and the machine side is this
 * table itself. Templated sentences (a count, a reason, a path) are not
 * rows — their carrying element still declares the role, and the oracle in
 * `polaris-copy.test.ts` sweeps the rendered text, not this table.
 */
import { claimRoleAttrs, type NarrativeClaimRole } from './polaris-narrative.js';

const COPY_ROLES = ['project-fact', 'epistemic-disclosure', 'action-label', 'scope-instruction'] as const;
type CopyRole = (typeof COPY_ROLES)[number];

const COPY_KINDS = ['heading', 'lede', 'notice', 'sentence', 'label'] as const;
type CopyKind = (typeof COPY_KINDS)[number];

interface PolarisCopyRow {
  readonly id: string;
  readonly role: CopyRole;
  readonly kind: CopyKind;
  readonly text: string;
}

// Test seam: exported for the tests; production code reaches it only inside this file.
export const POLARIS_COPY = [
  { id: 'shell.heading', role: 'project-fact', kind: 'heading', text: 'Butlers' },
  { id: 'shell.lede', role: 'scope-instruction', kind: 'lede', text: 'Less to remember. More room to live.' },
  { id: 'notice', role: 'epistemic-disclosure', kind: 'notice', text: 'Every positive claim cites its source. Where evidence is absent, Unknown is stated in place with its route to resolution.' },
  { id: 'label.claim-states', role: 'action-label', kind: 'label', text: 'What the claim states mean' },
  { id: 'states.heading', role: 'epistemic-disclosure', kind: 'heading', text: 'What the claim states mean' },
  { id: 'gloss.tuple', role: 'epistemic-disclosure', kind: 'sentence', text: 'Each claim carries one line: label · tier · freshness · challenge. The first one reads:' },
  { id: 'proof.sources', role: 'project-fact', kind: 'label', text: 'sources' },
  { id: 'proof.items', role: 'project-fact', kind: 'label', text: 'declared items' },
  { id: 'proof.facts', role: 'project-fact', kind: 'label', text: 'facts' },
  { id: 'proof.unknown', role: 'action-label', kind: 'label', text: 'Where the Unknown claims are' },
  // The claim-state glossary (RFC2-25 tiers; PWB-REQ-007): every field of
  // the tuple beside each claim, in ordinary words, and the only routes
  // that strengthen a claim. Nothing here rounds a state up.
  { id: 'states.lede', role: 'epistemic-disclosure', kind: 'lede', text: 'Beside each claim: its label, tier, freshness and challenge state; then the only routes that strengthen it.' },
  { id: 'states.observed', role: 'epistemic-disclosure', kind: 'sentence', text: 'Observed — the statement was read from the named source at the evaluated revision.' },
  { id: 'states.inferred', role: 'epistemic-disclosure', kind: 'sentence', text: 'Inferred — a worker asserted it; no source was read for it.' },
  { id: 'states.unknown', role: 'epistemic-disclosure', kind: 'sentence', text: 'Unknown — no admissible evidence; the reason and its route are stated in place. Never green, never zero.' },
  { id: 'states.tier', role: 'epistemic-disclosure', kind: 'label', text: 'Tier — how the evidence reached the claim:' },
  { id: 'states.tier.gate-backed', role: 'epistemic-disclosure', kind: 'sentence', text: 'gate-backed — a retained gate artifact bound to this exact revision vouches for it.' },
  { id: 'states.tier.report-fact', role: 'epistemic-disclosure', kind: 'sentence', text: 'report-fact — the observer read it directly from the source; the strongest tier this evaluation mints.' },
  { id: 'states.tier.reduced-fidelity', role: 'epistemic-disclosure', kind: 'sentence', text: 'reduced-fidelity — read under a limit or a fallback; treat it as partial.' },
  { id: 'states.tier.asserted-by-worker', role: 'epistemic-disclosure', kind: 'sentence', text: 'asserted-by-worker — stated by an agent, not read; always Inferred.' },
  { id: 'states.tier.declared-only', role: 'epistemic-disclosure', kind: 'sentence', text: 'declared-only — a declaration exists but nothing observed it.' },
  { id: 'states.tier.suspended', role: 'epistemic-disclosure', kind: 'sentence', text: 'suspended — a contradiction or challenge holds the claim; Unknown until adjudicated.' },
  { id: 'states.tier.unstated', role: 'epistemic-disclosure', kind: 'sentence', text: 'unstated — no tier applies to an Unknown that has no evidence.' },
  { id: 'states.freshness', role: 'epistemic-disclosure', kind: 'label', text: 'Freshness — whether the evidence is current:' },
  { id: 'states.freshness.fresh', role: 'epistemic-disclosure', kind: 'sentence', text: 'fresh — captured at this evaluation.' },
  { id: 'states.freshness.stale', role: 'epistemic-disclosure', kind: 'sentence', text: 'stale — older than the declared currency bound.' },
  { id: 'states.freshness.broken', role: 'epistemic-disclosure', kind: 'sentence', text: 'broken — its source changed since capture.' },
  { id: 'states.freshness.superseded', role: 'epistemic-disclosure', kind: 'sentence', text: 'superseded — a later evaluation replaced it.' },
  { id: 'evidence.currency-probe', role: 'epistemic-disclosure', kind: 'heading', text: 'Evidence currency probe' },
  { id: 'evidence.currency-probe-disclosure', role: 'epistemic-disclosure', kind: 'sentence', text: 'This probe compares the current repository head with the pinned evaluation; it is a render disclosure, not a project claim or freshness value.' },
  { id: 'states.challenge', role: 'epistemic-disclosure', kind: 'label', text: 'Challenge — whether anyone disputed it:' },
  { id: 'states.challenge.unchallenged', role: 'epistemic-disclosure', kind: 'sentence', text: 'unchallenged — no challenge is recorded; a recorded challenge suspends the claim.' },
  { id: 'states.disclosures', role: 'epistemic-disclosure', kind: 'label', text: 'Not a claim state — what a proposal marks:' },
  { id: 'states.proposed', role: 'epistemic-disclosure', kind: 'sentence', text: 'Proposed change — not current authority: a candidate future beside the current requirement; it never changes any claim\'s label, tier, freshness or challenge.' },
  { id: 'states.strengthen', role: 'epistemic-disclosure', kind: 'sentence', text: 'To strengthen a claim: report-fact becomes gate-backed only through a retained gate artifact bound to the exact revision; an Unknown clears only by the route stated beside it. No summary rounds any state up.' },

  { id: 'depth.label', role: 'scope-instruction', kind: 'label', text: 'On this page' },
  { id: 'depth.summary', role: 'scope-instruction', kind: 'label', text: 'Summary' },
  { id: 'depth.catalog', role: 'scope-instruction', kind: 'label', text: 'Catalog' },
  { id: 'depth.detail', role: 'scope-instruction', kind: 'label', text: 'Detail' },
  { id: 'depth.source', role: 'scope-instruction', kind: 'label', text: 'Exact source' },

  // The opening index (PWB-REQ-010 as amended by `pwb-opening-index-amendment`
  // v1.0, P-98): one row name per PWB-REQ-021 answer identity, spelled
  // exactly as the requirement's table spells it. Offsets and the stopping
  // line are counted in the page after load, so they are templated, not rows.
  { id: 'index.landmark', role: 'scope-instruction', kind: 'label', text: 'Opening index' },
  { id: 'index.why', role: 'action-label', kind: 'label', text: 'purpose' },
  { id: 'index.promises', role: 'action-label', kind: 'label', text: 'promises' },
  { id: 'index.refusals-and-rule', role: 'action-label', kind: 'label', text: 'non-goals' },
  { id: 'index.capabilities-and-fit', role: 'action-label', kind: 'label', text: 'capabilities' },
  { id: 'index.exact-requirement', role: 'action-label', kind: 'label', text: 'exact requirements' },
  { id: 'index.unknown-or-contradiction', role: 'action-label', kind: 'label', text: 'gaps' },
  { id: 'index.claim-strength', role: 'action-label', kind: 'label', text: 'claim strength' },
  { id: 'index.architecture-and-groups', role: 'action-label', kind: 'label', text: 'architecture' },
  { id: 'index.v1-success', role: 'action-label', kind: 'label', text: 'V1 success' },
  { id: 'index.not-rendered', role: 'epistemic-disclosure', kind: 'sentence', text: 'not rendered at this evaluation' },

  { id: 'group.overview', role: 'project-fact', kind: 'heading', text: 'What Butlers is' },
  { id: 'group.boundaries', role: 'project-fact', kind: 'heading', text: 'Scope and principles' },
  { id: 'group.architecture', role: 'project-fact', kind: 'heading', text: 'How Butlers is built' },
  { id: 'group.v1', role: 'project-fact', kind: 'heading', text: 'What V1 ships' },
  { id: 'group.catalog', role: 'project-fact', kind: 'heading', text: 'Project catalog' },
  { id: 'opening.unavailable.overview', role: 'project-fact', kind: 'lede', text: 'Butlers\u2019 purpose and promises are unknown.' },
  { id: 'opening.unavailable.boundaries', role: 'project-fact', kind: 'lede', text: 'The scope and principles are unknown.' },
  { id: 'opening.unavailable.architecture', role: 'project-fact', kind: 'lede', text: 'The declared architecture is unknown.' },
  { id: 'opening.unavailable.v1', role: 'project-fact', kind: 'lede', text: 'The declared V1 scope is unknown.' },
  { id: 'opening.unavailable.catalog', role: 'project-fact', kind: 'lede', text: 'The project catalog is unknown.' },
  { id: 'opening.unavailable-evidence', role: 'project-fact', kind: 'lede', text: 'Evidence for this group is unavailable.' },
  { id: 'opening.empty-catalog', role: 'project-fact', kind: 'lede', text: 'No items were declared by admitted sources.' },
  { id: 'opening.populated-catalog', role: 'project-fact', kind: 'lede', text: 'This catalog lists its entries and shows their source status.' },
  { id: 'opening.unknown-catalog', role: 'project-fact', kind: 'lede', text: 'The declarations for this class are unknown.' },
  { id: 'group.capability-detail', role: 'project-fact', kind: 'heading', text: 'One capability in depth' },
  { id: 'group.evidence-and-gaps', role: 'project-fact', kind: 'heading', text: 'Evidence and gaps' },

  { id: 'account.purpose', role: 'project-fact', kind: 'heading', text: 'Purpose' },
  { id: 'account.promises', role: 'project-fact', kind: 'heading', text: 'Promises' },
  { id: 'account.refusals', role: 'project-fact', kind: 'heading', text: 'Deliberate limits' },
  { id: 'account.architecture', role: 'project-fact', kind: 'heading', text: 'Architecture' },
  { id: 'account.v1-scope', role: 'project-fact', kind: 'heading', text: 'V1 scope' },
  { id: 'account.v1-success', role: 'project-fact', kind: 'heading', text: 'V1 success' },

  { id: 'class.project-account-section', role: 'project-fact', kind: 'heading', text: 'Project account' },
  { id: 'class.principle', role: 'project-fact', kind: 'heading', text: 'Non-negotiable rules' },
  { id: 'class.success-criterion', role: 'project-fact', kind: 'heading', text: 'Success criteria' },
  { id: 'class.catalog-entry', role: 'project-fact', kind: 'heading', text: 'Declared capabilities' },
  { id: 'class.design-contract', role: 'project-fact', kind: 'heading', text: 'Design contracts' },
  { id: 'class.baseline-spec', role: 'project-fact', kind: 'heading', text: 'Baseline specs' },
  { id: 'class.topology-component', role: 'project-fact', kind: 'heading', text: 'Components' },
  { id: 'class.craft-policy', role: 'project-fact', kind: 'heading', text: 'Craft policies' },
  { id: 'class.roster-identity', role: 'project-fact', kind: 'heading', text: 'Roster identities' },

  { id: 'capability.scope', role: 'scope-instruction', kind: 'sentence', text: "This is one capability within the project catalog above; completeness follows its disclosed denominator. Its claims keep their own provenance and state." },

  { id: 'proposed.heading', role: 'project-fact', kind: 'heading', text: 'Proposed OpenSpec change' },
  { id: 'label.proposed', role: 'epistemic-disclosure', kind: 'label', text: 'Proposed change — not current authority.' },
  { id: 'proposed.current', role: 'project-fact', kind: 'heading', text: 'Current authority' },
  { id: 'proposed.change', role: 'project-fact', kind: 'heading', text: 'The proposal' },
  { id: 'band.argument', role: 'project-fact', kind: 'heading', text: 'Why this capability' },
  { id: 'band.argument-lede', role: 'scope-instruction', kind: 'lede', text: 'Framing only. This band binds nothing and anchors nothing.' },
  { id: 'label.thesis', role: 'project-fact', kind: 'label', text: 'Capability' },
  { id: 'label.why', role: 'project-fact', kind: 'label', text: 'Why it exists' },
  { id: 'label.related', role: 'project-fact', kind: 'label', text: 'Related' },
  { id: 'sentence.no-intent-declared', role: 'project-fact', kind: 'sentence', text: 'No intent entity names this capability.' },
  { id: 'band.contract', role: 'project-fact', kind: 'heading', text: 'Current intent, verbatim' },
  { id: 'band.contract-lede', role: 'scope-instruction', kind: 'lede', text: 'The current requirement, its governing doctrine and non-goals, and every proposal beside it.' },
  { id: 'contract.verbatim-lede', role: 'scope-instruction', kind: 'lede', text: 'Requirement and scenario text appears byte-for-byte from its owning artifact, or not at all.' },
  { id: 'label.requirement-text', role: 'project-fact', kind: 'heading', text: 'Requirement and scenario text' },
  { id: 'label.doctrine', role: 'project-fact', kind: 'heading', text: 'Governing doctrine' },
  { id: 'label.non-goals', role: 'project-fact', kind: 'heading', text: 'Declared non-goals' },
  { id: 'label.adoption', role: 'project-fact', kind: 'label', text: 'Adoption:' },
  { id: 'adoption.adopted', role: 'project-fact', kind: 'label', text: 'adopted' },
  { id: 'adoption.draft', role: 'project-fact', kind: 'label', text: 'draft, unadopted' },
  { id: 'label.candidate-future', role: 'project-fact', kind: 'label', text: 'One candidate future' },
  { id: 'label.exclusive-with', role: 'project-fact', kind: 'label', text: 'exclusive with' },
  { id: 'sentence.separate-futures', role: 'project-fact', kind: 'sentence', text: 'Competing proposals stay separate; nothing merges them.' },
  { id: 'sentence.no-competitor', role: 'project-fact', kind: 'sentence', text: 'no declared competitor.' },
  { id: 'sentence.exclusivity-not-captured', role: 'project-fact', kind: 'sentence', text: 'no exclusivity declaration was captured, so it is treated as its own future.' },
  { id: 'band.reality', role: 'project-fact', kind: 'heading', text: 'What is observed' },
  { id: 'band.reality-lede', role: 'scope-instruction', kind: 'lede', text: 'Every claim here comes from the shared model with its own provenance and epistemic state.' },
  { id: 'label.mode', role: 'scope-instruction', kind: 'label', text: 'Mode:' },
  { id: 'sentence.base-mode', role: 'scope-instruction', kind: 'sentence', text: 'current intent with observed reality. No proposal is applied.' },
  { id: 'label.lifecycle', role: 'project-fact', kind: 'label', text: 'Lifecycle:' },
  { id: 'label.amends', role: 'project-fact', kind: 'label', text: 'amends' },

  { id: 'label.coverage-counts', role: 'action-label', kind: 'label', text: 'Coverage counts' },
  // Progressive disclosure (PWB-REQ-011): exhaustive populations stay
  // complete behind a native disclosure whose control names the count.
  { id: 'label.selected-passages', role: 'scope-instruction', kind: 'label', text: 'Selected passages from the project’s declaration. The complete account follows below.' },
  { id: 'label.evidence-remedy', role: 'action-label', kind: 'label', text: 'Inspect the evidence disclosure' },
  { id: 'label.source-remedies', role: 'action-label', kind: 'label', text: 'Source details and remedies' },
  { id: 'label.guide-intro', role: 'scope-instruction', kind: 'label', text: 'Declared capability groups, with examples where available.' },
  { id: 'label.complete-catalog', role: 'action-label', kind: 'label', text: 'Explore the complete catalog' },
  { id: 'label.browse-source-records', role: 'scope-instruction', kind: 'sentence', text: 'Browse the source records below. Scroll within the table for the full list.' },
  { id: 'label.component-guides', role: 'scope-instruction', kind: 'label', text: 'Explore the design' },
  // After hoisting, this names a factual source row rather than a disclosure control.
  { id: 'label.source-record', role: 'project-fact', kind: 'label', text: 'Source record' },
  { id: 'label.source-notes', role: 'action-label', kind: 'label', text: 'Sources' },
  { id: 'label.full-account', role: 'action-label', kind: 'label', text: 'Read the complete declaration' },
  { id: 'label.show-items', role: 'action-label', kind: 'label', text: 'Show items' },
  { id: 'label.show-exclusions', role: 'action-label', kind: 'label', text: 'Show exclusions' },
  { id: 'label.exact-text', role: 'action-label', kind: 'label', text: 'Exact text' },
  { id: 'label.by-cause', role: 'epistemic-disclosure', kind: 'label', text: 'By cause:' },
  { id: 'label.folded-claims', role: 'epistemic-disclosure', kind: 'label', text: 'Counted here without a line of their own:' },
  { id: 'label.primary-reasons', role: 'epistemic-disclosure', kind: 'label', text: 'Primary Unknown reasons among members:' },
  { id: 'label.secondary-reasons', role: 'epistemic-disclosure', kind: 'label', text: 'Secondary Unknown reasons among members:' },
  { id: 'sentence.no-member-unknowns', role: 'epistemic-disclosure', kind: 'sentence', text: 'No member claim carries an Unknown reason.' },

  { id: 'evidence.observation', role: 'project-fact', kind: 'heading', text: 'Project-shape observation' },
  { id: 'evidence.sources', role: 'project-fact', kind: 'heading', text: 'Project-shape sources' },
  { id: 'evidence.exclusions', role: 'project-fact', kind: 'heading', text: 'Excluded bodies' },
  { id: 'evidence.contradictions', role: 'project-fact', kind: 'heading', text: 'Contradicted facts' },
  // PWB-REQ-004 (as amended): the root index's own declarations and every
  // disagreement one of its rows decided.
  { id: 'evidence.root-index', role: 'project-fact', kind: 'heading', text: 'Root index declarations' },
  { id: 'label.precedence-rows', role: 'project-fact', kind: 'label', text: 'Precedence rows admitted:' },
  { id: 'sentence.no-precedence', role: 'epistemic-disclosure', kind: 'sentence', text: 'No precedence table is admitted from the root index:' },
  { id: 'label.stated-counts', role: 'project-fact', kind: 'label', text: 'Stated counts:' },
  { id: 'sentence.no-stated-counts', role: 'epistemic-disclosure', kind: 'sentence', text: 'No stated summary count is admitted from the root index:' },
  { id: 'label.decided', role: 'project-fact', kind: 'label', text: 'Decided by a row:' },
  { id: 'sentence.no-decided', role: 'project-fact', kind: 'sentence', text: 'No disagreement between admitted declarations was decided by a row.' },
  { id: 'label.effective', role: 'project-fact', kind: 'label', text: 'effective' },
  { id: 'label.superseded', role: 'epistemic-disclosure', kind: 'label', text: 'superseded' },
  { id: 'table.layer', role: 'project-fact', kind: 'label', text: 'Layer' },
  { id: 'table.owns', role: 'project-fact', kind: 'label', text: 'Owns' },
  { id: 'table.home', role: 'project-fact', kind: 'label', text: 'Home' },
  { id: 'table.declared-at', role: 'project-fact', kind: 'label', text: 'Declared at' },
  { id: 'evidence.gaps', role: 'epistemic-disclosure', kind: 'heading', text: 'Unknown, by reason' },
  { id: 'evidence.code-structure', role: 'project-fact', kind: 'heading', text: 'Observed code structure' },
  { id: 'evidence.work-items', role: 'project-fact', kind: 'heading', text: 'Observed work items' },
  { id: 'evidence.relationships', role: 'project-fact', kind: 'heading', text: "How the capability's claims connect" },
  { id: 'evidence.relationships-lede', role: 'epistemic-disclosure', kind: 'lede', text: 'Each claim above stands alone; the links below say how far the evidence reaches between them.' },

  { id: 'table.key', role: 'project-fact', kind: 'label', text: 'Key' },
  { id: 'table.declared', role: 'project-fact', kind: 'label', text: 'Declared' },
  { id: 'table.epistemic-state', role: 'epistemic-disclosure', kind: 'label', text: 'Epistemic state' },
  { id: 'table.index', role: 'project-fact', kind: 'label', text: '#' },
  { id: 'table.source', role: 'project-fact', kind: 'label', text: 'Source' },
  { id: 'table.source-identity', role: 'project-fact', kind: 'label', text: 'Source identity' },
  { id: 'table.rule-and-pillar', role: 'project-fact', kind: 'label', text: 'Rule and pillar' },
  { id: 'table.outcome-anchor-digest', role: 'project-fact', kind: 'label', text: 'Outcome, anchor and digest' },
  { id: 'table.items', role: 'project-fact', kind: 'label', text: 'Items' },
  // M14 slice 3 (P-81 Q3): the one key to the source-identity grammar. Its
  // drift oracle in `polaris-reconciliation.test.ts` holds it to the five
  // rules, the anchor union and the outcomes the table renders.
  { id: 'legend.sources', role: 'scope-instruction', kind: 'sentence', text: 'Reading a source row: its identity joins the repository, the evaluated revision, the repository-relative path and what the path held: the Git object id for a blob, not-a-blob for a tree or commit, or missing; Rule says how the source was found (root-index, pillar-index, pillar-named-file, baseline-spec-tree or roster-tree); Anchor says what the path held at that revision (a blob with its object id, a tree or commit, or missing at revision); Outcome is body-classified, path-only, excluded or unavailable; Digest is the truncated SHA-256 of the body bytes the observer read, shown only where it read one, and it is neither permission to read those bytes nor a verification of them.' },
  // M14 slice 4 (P-81 Q4): the catalog reconciliation. Machine figures are
  // Observed, arithmetic over them Inferred, the marker remainder Unknown.
  { id: 'reconciliation.label', role: 'scope-instruction', kind: 'label', text: 'Catalog reconciliation.' },
  { id: 'figure.observed', role: 'epistemic-disclosure', kind: 'label', text: 'Observed in the machine answer:' },
  { id: 'figure.inferred', role: 'epistemic-disclosure', kind: 'label', text: 'Inferred by arithmetic over those counts:' },
  { id: 'figure.markers', role: 'epistemic-disclosure', kind: 'label', text: 'Inferred from this page’s own markup:' },
  { id: 'figure.marker-predicate', role: 'scope-instruction', kind: 'sentence', text: 'counted as every occurrence of the data-polaris-item attribute in the final HTML, so an item rendered twice counts twice.' },
  { id: 'figure.unknown', role: 'epistemic-disclosure', kind: 'label', text: 'Unknown from these counts alone:' },
  { id: 'figure.remainder-route', role: 'epistemic-disclosure', kind: 'sentence', text: 'match each marker’s claim identity to exactly one machine item.' },
  { id: 'sentence.reconciliation-unobserved', role: 'epistemic-disclosure', kind: 'sentence', text: 'No project shape was observed, so no source, item or item marker is counted.' },

  { id: 'sentence.no-items', role: 'project-fact', kind: 'sentence', text: 'No items of this class were declared by any admitted source.' },
  { id: 'sentence.no-exclusions', role: 'project-fact', kind: 'sentence', text: 'No source body was excluded by the secret policy or a limit.' },
  { id: 'sentence.no-contradictions', role: 'project-fact', kind: 'sentence', text: 'No two admitted declarations disagree.' },
  { id: 'sentence.no-gaps', role: 'epistemic-disclosure', kind: 'sentence', text: 'Every project-shape claim above is Observed; no Unknown remains in the shape.' },
  { id: 'sentence.body-withheld', role: 'epistemic-disclosure', kind: 'sentence', text: 'The body is not shown anywhere.' },
  { id: 'sentence.no-body-read', role: 'epistemic-disclosure', kind: 'sentence', text: 'no body read' },
  { id: 'sentence.no-source-read', role: 'epistemic-disclosure', kind: 'sentence', text: 'No project-shape source was read.' },
  { id: 'sentence.not-evaluated', role: 'epistemic-disclosure', kind: 'sentence', text: 'No body-read authority evaluation reached this evaluation:' },
  { id: 'sentence.gate-refused', role: 'epistemic-disclosure', kind: 'sentence', text: 'The body-read gate refused' },
  { id: 'sentence.observer-failed', role: 'epistemic-disclosure', kind: 'sentence', text: 'The observer failed before any shape fact was read' },
  { id: 'sentence.missing-statement', role: 'epistemic-disclosure', kind: 'sentence', text: 'the shared model carries no statement for this key.' },
  { id: 'label.unknown', role: 'epistemic-disclosure', kind: 'label', text: 'Unknown' },
  { id: 'label.route', role: 'epistemic-disclosure', kind: 'label', text: 'Route:' },
  { id: 'label.action-route', role: 'epistemic-disclosure', kind: 'label', text: 'Materialize preview' },
  { id: 'label.also', role: 'epistemic-disclosure', kind: 'label', text: 'Also:' },
  { id: 'label.declarations-kept', role: 'epistemic-disclosure', kind: 'label', text: 'Declarations kept:' },
  { id: 'label.limit-breaches', role: 'project-fact', kind: 'label', text: 'Limit breaches:' },
  { id: 'label.authority', role: 'epistemic-disclosure', kind: 'label', text: 'Authority:' },
  { id: 'label.deferred', role: 'epistemic-disclosure', kind: 'label', text: 'deferred' },
  { id: 'label.no-route', role: 'epistemic-disclosure', kind: 'label', text: 'No route declared' },
  { id: 'label.evaluated-as', role: 'epistemic-disclosure', kind: 'label', text: 'evaluated as' },
  // PWB-RECON-02: phase-A discovery per pillar and the observation's degradation state.
  { id: 'label.discovery', role: 'epistemic-disclosure', kind: 'label', text: 'Discovery:' },
  { id: 'label.degradation', role: 'epistemic-disclosure', kind: 'label', text: 'Degradation:' },
  { id: 'sentence.no-degradation', role: 'epistemic-disclosure', kind: 'sentence', text: 'No degradation state was recorded for this evaluation.' },
  // PWB-REQ-021/022: the owner's cold-open walkthrough judgment, as carried.
  { id: 'evidence.walkthrough', role: 'epistemic-disclosure', kind: 'heading', text: 'Owner cold-open walkthrough judgment' },
  { id: 'sentence.judgment-not-evaluated', role: 'epistemic-disclosure', kind: 'sentence', text: 'No walkthrough run record and judgment pair reached this evaluation:' },
  { id: 'sentence.judgment-absent', role: 'epistemic-disclosure', kind: 'sentence', text: 'No owner judgment is carried' },
  { id: 'sentence.judgment-unlawful', role: 'epistemic-disclosure', kind: 'sentence', text: 'The recorded judgment is not lawful, so no verdict is carried:' },
  { id: 'label.judgment-evaluation', role: 'epistemic-disclosure', kind: 'label', text: 'Judgment evaluation' },
  { id: 'label.at', role: 'epistemic-disclosure', kind: 'label', text: 'at' },
  { id: 'label.outcome', role: 'epistemic-disclosure', kind: 'label', text: 'outcome' },
  { id: 'label.criterion', role: 'epistemic-disclosure', kind: 'label', text: '— criterion' },
  { id: 'label.contradiction', role: 'epistemic-disclosure', kind: 'label', text: 'Contradiction:' },
  { id: 'label.run-record', role: 'epistemic-disclosure', kind: 'label', text: 'Run record' },
  { id: 'label.judgment-digest', role: 'epistemic-disclosure', kind: 'label', text: 'judgment digest' },
  { id: 'label.verdict', role: 'epistemic-disclosure', kind: 'label', text: 'Verdict' },
  { id: 'label.judged-by', role: 'epistemic-disclosure', kind: 'label', text: 'judged by' },
  { id: 'label.independently-verified', role: 'epistemic-disclosure', kind: 'label', text: 'independently verified:' },
  { id: 'label.act', role: 'epistemic-disclosure', kind: 'label', text: 'Act' },
  { id: 'label.traversed', role: 'epistemic-disclosure', kind: 'label', text: 'traversed' },
  { id: 'label.rationale', role: 'epistemic-disclosure', kind: 'label', text: 'Rationale:' },
  // PWB-REQ-021 (amended 2026-09-05): readiness of the retained walkthrough
  // record — an execution fact, never a verdict or a score.
  { id: 'evidence.walkthrough-readiness', role: 'epistemic-disclosure', kind: 'heading', text: 'Walkthrough record readiness' },
  { id: 'sentence.readiness-not-evaluated', role: 'epistemic-disclosure', kind: 'sentence', text: 'Readiness was not assessed:' },
  { id: 'sentence.readiness-no-run-record', role: 'epistemic-disclosure', kind: 'sentence', text: 'No walkthrough run record to assess:' },
  { id: 'label.readiness', role: 'epistemic-disclosure', kind: 'label', text: 'Readiness:' },
  { id: 'sentence.readiness-execution-fact', role: 'epistemic-disclosure', kind: 'sentence', text: 'An execution fact about the record, not a verdict and not a score.' },
  { id: 'label.expected-binding', role: 'epistemic-disclosure', kind: 'label', text: 'A record for this evaluation must name:' },
  { id: 'label.surface-version', role: 'epistemic-disclosure', kind: 'label', text: 'surface' },
  { id: 'label.evaluation-identity', role: 'epistemic-disclosure', kind: 'label', text: 'evaluation' },
  { id: 'label.readiness-findings', role: 'epistemic-disclosure', kind: 'label', text: 'Why not ready:' },
  { id: 'label.answers', role: 'epistemic-disclosure', kind: 'label', text: 'Recorded answers, in the owner’s words, unjudged:' },
  { id: 'label.sources', role: 'epistemic-disclosure', kind: 'label', text: 'Sources:' },
  { id: 'label.cited-authority', role: 'epistemic-disclosure', kind: 'label', text: 'Cited authority:' },
  // The exact-source route (PWB-REQ-011 as amended): one Git object of the
  // evaluated revision, byte-for-byte or nothing, never as authority.
  { id: 'source.heading', role: 'project-fact', kind: 'heading', text: 'Exact source text' },
  { id: 'source.lede', role: 'scope-instruction', kind: 'lede', text: 'Requirement and scenario text byte-for-byte from one Git object of the evaluated revision, or nothing at all.' },
  { id: 'source.not-authority', role: 'epistemic-disclosure', kind: 'notice', text: 'Polaris is not the authority for this text; the owning artifact in Butlers is. Nothing is restated or summarized.' },
  { id: 'label.identity', role: 'project-fact', kind: 'label', text: 'Identity:' },
  { id: 'label.back-to-source-row', role: 'action-label', kind: 'label', text: 'Back to its source row' },
  { id: 'sentence.no-identity-named', role: 'epistemic-disclosure', kind: 'sentence', text: 'No source identity was named; nothing was read.' },
  { id: 'sentence.identity-not-in-population', role: 'epistemic-disclosure', kind: 'sentence', text: 'No admitted source of this evaluation carries this identity; nothing was read.' },
] as const satisfies readonly PolarisCopyRow[];

export type PolarisCopyId = (typeof POLARIS_COPY)[number]['id'];

const BY_ID: ReadonlyMap<string, PolarisCopyRow> = new Map(POLARIS_COPY.map((row) => [row.id, row]));

function copyRow(id: PolarisCopyId): PolarisCopyRow {
  const row = BY_ID.get(id);
  if (row === undefined) throw new Error(`no Polaris copy row ${id}`);
  return row;
}

export function hasCopyRow(id: string): id is PolarisCopyId {
  return BY_ID.has(id);
}

export function copyText(id: PolarisCopyId): string {
  return copyRow(id).text;
}

/** The attribute the human output exposes the role through. */
/** Default claim role per copy role (PWB-REQ-014): disclosures are
 * epistemic claims; everything else is non-normative framing unless a
 * renderer marks the unit as an anchored project fact. */
const DEFAULT_CLAIM_ROLE: Readonly<Record<CopyRole, NarrativeClaimRole>> = {
  'project-fact': 'non-normative-framing',
  'epistemic-disclosure': 'epistemic-claim',
  'action-label': 'non-normative-framing',
  'scope-instruction': 'non-normative-framing',
};

export function roleAttr(role: CopyRole, claimRole: NarrativeClaimRole = DEFAULT_CLAIM_ROLE[role]): string {
  return ` data-copy-role="${role}"${claimRoleAttrs(claimRole)}`;
}

/** Attribute for the element carrying a table row: its role. */
export function copyAttr(id: PolarisCopyId): string {
  return roleAttr(copyRow(id).role);
}
