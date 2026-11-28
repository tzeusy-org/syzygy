import { isRecord } from '@syzygy/support';
import type { CheckFinding } from './check-model.js';
import type { Admit, BaseMaps } from './derived-base.js';
import { hasWalkForm } from './draft-schema.js';
import { isViewKind, modelIndex } from './system-model.js';
import { GRAPH_KINDS, baseStep, paragraphsOf, walksOf, wellFormed } from './walk.js';

/** Walk advice (REQ-polaris-generation-034 version 2.51, syzygy-3efd.35).
 *
 * Rule `walk-step-restates-label` version 1 advises the author on a walk step whose paragraph adds no word to the label of the element the
 * step names. It is report-only advice in the manner of version 2.33's figure advice: check carries it on its report as `walkAdvice` and
 * writes it nowhere else, it gates nothing, and no advisory carries a word of a paragraph or a label, a base path or a display name. */

type Doc = Readonly<Record<string, unknown>>;
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export const WALK_ADVICE_RULE = 'walk-step-restates-label';
export const WALK_ADVICE_RULES = Object.freeze([Object.freeze({ id: WALK_ADVICE_RULE, version: 1 })]);

/** The 30 paragraph words that count as no word (version 2.51). */
export const WALK_FILLER: ReadonlySet<string> = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'here', 'in', 'is', 'it',
  'its', 'of', 'on', 'or', 'see', 'shown', 'shows', 'step', 'that', 'the', 'then', 'these', 'this', 'those', 'to', 'with']);

export interface WalkAdvisory { readonly rule: typeof WALK_ADVICE_RULE; readonly at: string; readonly detail: string }
export interface WalkAdvice {
  readonly rules: typeof WALK_ADVICE_RULES;
  /** The steps the rule read. */
  readonly examined: number;
  readonly advisories: readonly WalkAdvisory[];
}

export const walkAdviceDetail = (diagram: string, n: number, block: string): string =>
  `${diagram} step ${n}: paragraph ${block} adds no word to its element's label; say what a reader learns about that element at this step`;

/** A letter or a number by the Unicode general categories L and N of this runtime's Unicode version. */
const WORD_CODE_POINT = /^[\p{L}\p{N}]$/u;

/** A text's words: read code point by code point (a lone surrogate is one code point, neither L nor N), A to Z lowercased, every code point
 * that is neither a letter nor a number a space, split at runs of spaces, empty strings dropped; no other code point changes and no
 * normalization form is applied. */
export function adviceWords(value: string): string[] {
  let out = '';
  for (const ch of value) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x41 && c <= 0x5a) out += String.fromCodePoint(c + 0x20);
    else out += WORD_CODE_POINT.test(ch) ? ch : ' ';
  }
  return out.split(' ').filter((word) => word !== '');
}

/** Whether a paragraph word matches a label word: equal, or one is the other followed by `s` or `es`. */
const matches = (word: string, label: string): boolean =>
  word === label || word === `${label}s` || word === `${label}es` || label === `${word}s` || label === `${word}es`;

/** Whether a paragraph restates a label: every paragraph word that is not filler matches some word of the label (zero new words). */
export function restates(paragraph: string, label: string): boolean {
  const labelWords = adviceWords(label);
  return adviceWords(paragraph).every((word) => WALK_FILLER.has(word) || labelWords.some((other) => matches(word, other)));
}

/** A step paragraph's text: the block's `text`, then each child's `text` in order, joined by one space (the RS-19 reading). */
function paragraphText(block: Doc): string {
  return [text(block['text']) ?? '', ...list(block['children']).map((child) => (isRecord(child) ? text(child['text']) ?? '' : ''))].join(' ');
}

/** Whether a finding lies at or below a walk's path. */
const under = (at: string, walkAt: string): boolean => at === walkAt || at.startsWith(`${walkAt}.`) || at.startsWith(`${walkAt}[`);

/** What check knows of a base element's screening: `hidden` for a path left out or denied, `deniesBelow` for a directory every path below
 * which a denied-directory rule denies, `admit` for a label it would carry. */
export interface WalkAdviceScreen { readonly admit: Admit; readonly hidden: (repositoryPath: string) => boolean; readonly deniesBelow: (directory: string) => boolean }

/** The walk advice of a draft at check (version 2.51), or undefined where it carries none: a draft not of a walk schema, or one with a
 * `schema` finding. `findings` are every finding check reports for the draft; `maps` the base maps as check derived them, each absent where
 * not established; `screen` what check knows of a base element's screening. A walk with any finding at or below its path is not read.
 * Called directly, it reads only what it can read: a walk that is malformed, whose figure is missing or of no graph kind, or a step whose
 * element or block it cannot find, is skipped and counted nowhere; check passes `findings` that hold the walk findings of the same draft,
 * which already name each of those. */
export function walkAdvice(doc: Doc, findings: readonly CheckFinding[], maps: BaseMaps, screen: WalkAdviceScreen): WalkAdvice | undefined {
  if (!hasWalkForm(doc['schemaVersion']) || findings.some((finding) => finding.kind === 'schema')) return undefined;
  const diagrams = list(doc['diagrams']);
  const elements = modelIndex(doc).elementById;
  const advisories: WalkAdvisory[] = [];
  let examined = 0;
  for (const { place, part, at, walk } of walksOf(doc)) {
    if (findings.some((finding) => under(finding.at, at))) continue;
    const read = wellFormed(walk);
    const diagram = read === undefined ? undefined : diagrams.find((entry): entry is Doc => isRecord(entry) && entry['id'] === read.figure);
    if (read === undefined || diagram === undefined || !GRAPH_KINDS.has(diagram['kind'])) continue;
    const paragraphs = paragraphsOf(place, part);
    read.steps.forEach((step, k) => {
      const label = stepLabel(doc, diagram, step.element, elements, maps, screen);
      const block = paragraphs.get(step.block);
      if (label === undefined || block === undefined) return;
      examined++;
      if (restates(paragraphText(block), label)) {
        advisories.push({ rule: WALK_ADVICE_RULE, at: `${at}.steps[${k}]`, detail: walkAdviceDetail(read.figure, k + 1, step.block) });
      }
    });
  }
  return { rules: WALK_ADVICE_RULES, examined, advisories };
}

/** The label a step's element carries for the rule, or undefined where the step is not read: a base element whose map is not established at
 * check, or that is withheld at check. A base element is withheld at check where its path (a unit's manifest path) is left out or denied
 * as a file path, where it is a directory a denied-directory rule names (so every file below it is denied: `.ssh`, `.kube`), or where its
 * path or its label is withheld or Unknown in screening. A model element's and a node's label are the draft's words. */
function stepLabel(doc: Doc, diagram: Doc, element: Parameters<typeof baseStep>[2] | { readonly kind: 'identity'; readonly id: string },
  elements: ReturnType<typeof modelIndex>['elementById'], maps: BaseMaps, screen: WalkAdviceScreen): string | undefined {
  if (element.kind === 'identity') {
    if (isViewKind(diagram) && isRecord(diagram['view'])) return text(elements.get(element.id)?.element['label']);
    const node = list(diagram['nodes']).find((entry) => isRecord(entry) && entry['id'] === element.id);
    return isRecord(node) ? text(node['label']) : undefined;
  }
  const found = baseStep(doc, diagram, element, maps);
  if (found.state !== 'shown') return undefined;
  const base = maps[element.map === 'units' ? 'units' : 'directories']?.elements.find((entry) => entry.factId === found.factId);
  if (base === undefined) return undefined;
  const repositoryPath = base.manifest ?? base.path;
  if (screen.hidden(repositoryPath) || (base.manifest === undefined && screen.deniesBelow(repositoryPath))) return undefined;
  if (screen.admit(repositoryPath) !== 'admitted' || screen.admit(base.label) !== 'admitted') return undefined;
  return base.label;
}
