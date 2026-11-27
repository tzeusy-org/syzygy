// P-74 limb 1 describes the installed built-in grammar without loading a profile.
import { deepFreeze } from '@syzygy/support';

import {
  CATALOG_HEADINGS,
  CRAFT_POLICY_FILE_COLUMN,
  CRAFT_POLICY_HEADING,
  DESIGN_CONTRACT_HEADING,
  LAYER_ROWS,
  PROJECT_ACCOUNT_KEYS,
  V1_HEADINGS,
  VISION_HEADINGS,
} from './project-shape-extraction.js';
import {
  EXTRACTION_CLASSES,
  PILLAR_KEYS,
  PWB_INDEX_DEPTH,
  PWB_ROOT_INDEX_PATH,
  SOURCE_RULE_NEEDS_ROOT_INDEX,
  type ExtractionClass,
  type PillarKey,
  type SourceRule,
} from './project-shape-manifest.js';
import {
  PILLAR_LABELS,
  PRECEDENCE_COLUMNS,
  PRECEDENCE_HEADING,
  ROOT_SUMMARY_HEADING,
  STATED_COUNT_FACTS,
} from './project-shape-profile-vocabulary.js';

type TreeRule = Extract<SourceRule, 'baseline-spec-tree' | 'roster-tree'>;

type GrammarSource =
  | { readonly rule: 'pillar-index'; readonly pillar: PillarKey }
  | { readonly rule: 'pillar-named-file'; readonly pillar: PillarKey; readonly relativePath: string }
  | { readonly rule: TreeRule };

type Heading = { readonly text: string; readonly level?: 1 | 2 | 3 | 4 | 5 | 6 };

type Container =
  | { readonly kind: 'heading-section'; readonly headings: readonly [Heading] | readonly [Heading, Heading] }
  | {
      readonly kind: 'top-level-decimal-list' | 'top-level-list' | 'top-level-bulleted-list' | 'first-table-rows';
      readonly headings: readonly [Heading, ...Heading[]];
    }
  | { readonly kind: 'every-level-2-section' | 'ordinal-section-table-rows' | 'tree-path' }
  | { readonly kind: 'toml-table-field'; readonly table: string; readonly field: string };

type ItemKey =
  | { readonly kind: 'fixed'; readonly key: string }
  | { readonly kind: 'prefixed-ordinal'; readonly prefix: string }
  | { readonly kind: 'link-target-basename'; readonly column: string }
  | { readonly kind: 'leading-bold' | 'leading-bold-or-code' | 'first-cell-link-text' | 'tree-key' | 'ordinal-and-label' };

interface GrammarRow {
  readonly class: ExtractionClass;
  readonly source: GrammarSource;
  readonly container: Container;
  readonly itemKey: ItemKey;
}

export interface ProjectShapeProfile {
  readonly profileVersion: 'project-shape-profile-v1';
  readonly rootIndex: string;
  readonly indexDepth: number;
  readonly pillars: readonly { readonly key: PillarKey; readonly label: string }[];
  readonly sourceRules: Readonly<Record<SourceRule, boolean>>;
  readonly treePopulations: readonly {
    readonly rule: TreeRule;
    readonly pathPattern: string;
    readonly companion?: string;
  }[];
  readonly extractionClasses: readonly ExtractionClass[];
  readonly grammarRows: readonly GrammarRow[];
  readonly projectAccountKeys: readonly string[];
  readonly catalogKeys: readonly string[];
  readonly rootSummary: {
    readonly heading: Heading;
    readonly statedCountFacts: readonly string[];
  };
  readonly precedence: {
    readonly heading: Heading;
    readonly columns: readonly string[];
    readonly rows: typeof LAYER_ROWS;
  };
}

const vision = { rule: 'pillar-named-file', pillar: 'heart-and-soul', relativePath: 'vision.md' } as const;
const architecture = { ...vision, relativePath: 'architecture.md' };
const v1 = { ...vision, relativePath: 'v1.md' };
const [firstCatalogHeading, ...otherCatalogHeadings] = CATALOG_HEADINGS;

function account(key: string, source: GrammarSource, container: Container): GrammarRow {
  return { class: 'project-account-section', source, container, itemKey: { kind: 'fixed', key } };
}

const grammarRows: readonly GrammarRow[] = [
  account('purpose', vision, { kind: 'heading-section', headings: [{ text: VISION_HEADINGS.purpose, level: 2 }] }),
  account('promises', vision, { kind: 'heading-section', headings: [{ text: VISION_HEADINGS.promises, level: 2 }] }),
  account('refusals', vision, { kind: 'heading-section', headings: [{ text: VISION_HEADINGS.refusals, level: 2 }] }),
  account('architecture', architecture, { kind: 'every-level-2-section' }),
  account('v1-scope', v1, { kind: 'heading-section', headings: [{ text: V1_HEADINGS.ships, level: 2 }, { text: V1_HEADINGS.defers, level: 2 }] }),
  account('v1-success', v1, { kind: 'heading-section', headings: [{ text: V1_HEADINGS.success, level: 2 }] }),
  {
    class: 'principle',
    source: vision,
    container: { kind: 'top-level-decimal-list', headings: [{ text: VISION_HEADINGS.principles, level: 2 }] },
    itemKey: { kind: 'leading-bold' },
  },
  {
    class: 'success-criterion',
    source: vision,
    container: { kind: 'top-level-list', headings: [{ text: VISION_HEADINGS.promises, level: 2 }] },
    itemKey: { kind: 'prefixed-ordinal', prefix: 'vision' },
  },
  {
    class: 'success-criterion',
    source: v1,
    container: { kind: 'top-level-list', headings: [{ text: V1_HEADINGS.success, level: 2 }] },
    itemKey: { kind: 'prefixed-ordinal', prefix: 'v1' },
  },
  {
    class: 'catalog-entry',
    source: v1,
    container: {
      kind: 'top-level-bulleted-list',
      headings: [{ text: firstCatalogHeading, level: 3 }, ...otherCatalogHeadings.map((text): Heading => ({ text, level: 3 }))],
    },
    itemKey: { kind: 'leading-bold-or-code' },
  },
  {
    class: 'design-contract',
    source: { rule: 'pillar-index', pillar: 'legends-and-lore' },
    container: { kind: 'first-table-rows', headings: [{ text: DESIGN_CONTRACT_HEADING }] },
    itemKey: { kind: 'first-cell-link-text' },
  },
  {
    class: 'baseline-spec',
    source: { rule: 'baseline-spec-tree' },
    container: { kind: 'tree-path' },
    itemKey: { kind: 'tree-key' },
  },
  {
    class: 'topology-component',
    source: { ...vision, pillar: 'lay-and-land', relativePath: 'components.md' },
    container: { kind: 'ordinal-section-table-rows' },
    itemKey: { kind: 'ordinal-and-label' },
  },
  {
    class: 'craft-policy',
    source: { rule: 'pillar-index', pillar: 'craft-and-care' },
    container: { kind: 'first-table-rows', headings: [{ text: CRAFT_POLICY_HEADING }] },
    itemKey: { kind: 'link-target-basename', column: CRAFT_POLICY_FILE_COLUMN },
  },
  {
    class: 'roster-identity',
    source: { rule: 'roster-tree' },
    container: { kind: 'toml-table-field', table: 'butler', field: 'name' },
    itemKey: { kind: 'tree-key' },
  },
];

// Copy the current vocabulary before freezing. Existing callers still
// consume the same built-in constants from manifest and extraction.
export const BUILT_IN_PROJECT_SHAPE_PROFILE: ProjectShapeProfile = deepFreeze({
  profileVersion: 'project-shape-profile-v1',
  rootIndex: PWB_ROOT_INDEX_PATH,
  indexDepth: PWB_INDEX_DEPTH,
  pillars: PILLAR_KEYS.map(key => ({ key, label: PILLAR_LABELS[key] })),
  sourceRules: { ...SOURCE_RULE_NEEDS_ROOT_INDEX },
  treePopulations: [
    { rule: 'baseline-spec-tree', pathPattern: 'openspec/specs/<key>/spec.md' },
    { rule: 'roster-tree', pathPattern: 'roster/<key>/butler.toml', companion: 'MANIFESTO.md' },
  ],
  extractionClasses: [...EXTRACTION_CLASSES],
  grammarRows,
  projectAccountKeys: [...PROJECT_ACCOUNT_KEYS],
  catalogKeys: [...CATALOG_HEADINGS],
  rootSummary: {
    heading: { text: ROOT_SUMMARY_HEADING, level: 2 },
    statedCountFacts: [...STATED_COUNT_FACTS],
  },
  precedence: {
    heading: { text: PRECEDENCE_HEADING, level: 3 },
    columns: [...PRECEDENCE_COLUMNS],
    rows: LAYER_ROWS.map(row => ({ ...row })),
  },
} satisfies ProjectShapeProfile);
