// Distinct accessible names and heading order over every Polaris page —
// PWB-REQ-016 as amended by `pwb-accessible-name-amendment` v1.0 (P-99,
// syzygy-u05.22).
//
// The signed text binds three checks:
//
// - **Distinct accessible names.** Two interactive elements (links, buttons,
//   `summary` disclosures, form controls) whose targets differ have
//   different browser-computed accessible names; where differently targeted
//   elements share a visible label, each name begins with that label and,
//   for an exact-source route target, the words after it include the
//   repository-relative path the machine answer carries for that source.
// - **Heading order.** Exactly one level-1 heading, and no heading more than
//   one level deeper than the heading before it in document order.
// - **Whole-surface population.** Both checks run over the entry page and one
//   exact-source route response per source the machine answer lists, with
//   page and per-page population denominators.
//
// Oracle independence: the populations come from the live post-script DOM
// and every name from the browser's own accessibility computation
// (`BrowserPage.accessibleNames`); the page list and each expected source
// path come from the machine answer, never from the rendered page. The
// grouping logic below is pure and is tested against hand-typed inputs.

import type { BrowserPage } from './cdp-browser.js';
import { POLARIS_SOURCE_PATH, SOURCE_IDENTITY_PARAM } from './polaris-source.js';

// ---------------------------------------------------------------------------
// In-page scripts.

/** True when the element, or an ancestor, is hidden by the `hidden`
 * attribute, `aria-hidden="true"` or a computed `display: none`. A closed
 * `details` hides by none of these, so its content stays in the population. */
const HIDDEN_FUNCTION = `function HIDDEN(start) {
  for (let node = start; node && node.nodeType === 1; node = node.parentElement) {
    if (node.hasAttribute('hidden')) return true;
    if (node.getAttribute('aria-hidden') === 'true') return true;
    if (getComputedStyle(node).display === 'none') return true;
  }
  return false;
}`;

const INTERACTIVE_SELECTOR = 'a[href], area[href], button, summary, input, select, textarea';

/** Holds the interactive population, enumerated on the page as loaded, so
 * its names are computed for exactly those elements. */
const HELD_POPULATION = '__pwbReq016Interactive';

const HOLD_POPULATION_SCRIPT = `(() => {
  ${HIDDEN_FUNCTION}
  window[${JSON.stringify(HELD_POPULATION)}] = Array.from(document.querySelectorAll(${JSON.stringify(INTERACTIVE_SELECTOR)})).filter((e) => !HIDDEN(e));
  return window[${JSON.stringify(HELD_POPULATION)}].length;
})()`;

/** Chrome computes no name for a node a closed `details` leaves
 * unrendered (it reports ''). An accessible name does not depend on a
 * disclosure's open state, so every disclosure is opened after the
 * populations are taken and before the names are read. */
const OPEN_DISCLOSURES_SCRIPT = `(() => { document.querySelectorAll('details').forEach((details) => { details.open = true; }); return null; })()`;

/** The same population described by value: tag, target and visible label. */
const INTERACTIVE_DESCRIPTION_SCRIPT = `(() => {
  ${HIDDEN_FUNCTION}
  const all = Array.from(document.querySelectorAll('*'));
  return Array.from(document.querySelectorAll(${JSON.stringify(INTERACTIVE_SELECTOR)})).filter((e) => !HIDDEN(e)).map((e) => {
    const tag = e.tagName.toLowerCase();
    let target;
    if ((tag === 'a' || tag === 'area') && e.hasAttribute('href')) {
      target = { kind: 'href', value: e.href };
    } else if (tag === 'summary') {
      const details = e.parentElement && e.parentElement.tagName === 'DETAILS' ? e.parentElement : null;
      target = details ? { kind: 'details', value: String(all.indexOf(details)) } : { kind: 'self', value: String(all.indexOf(e)) };
    } else {
      const controls = (e.getAttribute('aria-controls') || '').trim().split(/\\s+/).filter(Boolean);
      target = controls.length > 0 ? { kind: 'controls', value: controls.join(' ') } : { kind: 'self', value: String(all.indexOf(e)) };
    }
    return {
      index: all.indexOf(e),
      tag,
      target,
      label: (e.textContent || '').replace(/\\s+/g, ' ').trim(),
    };
  });
})()`;

/** Every heading in document order with its level. */
const HEADING_SCRIPT = `(() => {
  ${HIDDEN_FUNCTION}
  const all = Array.from(document.querySelectorAll('*'));
  return all.filter((e) => /^H[1-6]$/.test(e.tagName) || e.getAttribute('role') === 'heading').filter((e) => !HIDDEN(e)).map((e) => {
    const role = e.getAttribute('role') === 'heading';
    const parsed = Number.parseInt(e.getAttribute('aria-level') || '', 10);
    const level = role ? (Number.isInteger(parsed) && parsed > 0 ? parsed : 2) : Number(e.tagName.slice(1));
    return { index: all.indexOf(e), tag: e.tagName.toLowerCase(), level, text: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80) };
  });
})()`;

// Read the existing shell footer, outside the document's rendered source
// content. Recheck the same document after opening disclosures and reading AX.
const EVALUATION_DOCUMENT = '__pwbReq016EvaluationDocument';
const READ_EVALUATION = `(initial) => {
  const marker = ${JSON.stringify(EVALUATION_DOCUMENT)};
  if (initial) window[marker] = document;
  else if (window[marker] !== document) return { kind: 'document-replaced' };
  const footers = document.querySelectorAll('body > footer, body > .reading-layout > footer');
  if (footers.length === 0) return { kind: 'missing-footer' };
  if (footers.length !== 1) return { kind: 'ambiguous-footer' };
  const nodes = [...footers[0].childNodes];
  const text = (node, expected) => node?.nodeType === Node.TEXT_NODE && node.textContent === expected;
  const code = (node) => node?.nodeName === 'CODE' && node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE;
  if (nodes.length !== 5 || !text(nodes[0], 'Evaluation ') || !code(nodes[1]) || !text(nodes[2], ' as of ') ||
      !code(nodes[3]) || !text(nodes[4], '.')) return { kind: 'malformed-footer' };
  return { kind: 'read', url: location.href, snapshot: nodes[1].textContent, asOf: nodes[3].textContent };
}`;

// ---------------------------------------------------------------------------
// Shapes.

interface InteractiveTarget {
  /** `href` — a link's resolved `href`; `details` — a summary's `details`
   * element; `controls` — the `aria-controls` ids; `self` — the control. */
  readonly kind: 'href' | 'details' | 'controls' | 'self';
  readonly value: string;
}

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface InteractiveElement {
  readonly index: number;
  readonly tag: string;
  readonly target: InteractiveTarget;
  /** Text content, whitespace runs collapsed, ends trimmed. */
  readonly label: string;
  /** The browser-computed accessible name. */
  readonly name: string;
}

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface HeadingElement {
  readonly index: number;
  readonly tag: string;
  readonly level: number;
  readonly text: string;
}

type NameHeadingViolationKind =
  | 'shared-name-different-targets'
  | 'shared-label-name-does-not-begin-with-label'
  | 'shared-label-exact-source-name-omits-path'
  | 'shared-label-exact-source-path-unknown'
  | 'level-one-heading-count'
  | 'heading-level-skipped'
  | 'page-not-swept'
  | 'page-not-in-machine-answer'
  | 'page-not-served'
  | 'page-evaluation-unbound';

export interface NameHeadingViolation {
  readonly kind: NameHeadingViolationKind;
  readonly where: string;
  readonly detail: string;
}

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface PageNameHeadingReport {
  readonly page: string;
  readonly url: string;
  readonly interactive: number;
  readonly headings: number;
  readonly levelOneHeadings: number;
  readonly sharedLabelGroups: number;
  readonly exactSourceTargets: number;
  readonly exactSourceTargetsWithoutMachinePath: number;
  readonly violations: readonly NameHeadingViolation[];
}

// ---------------------------------------------------------------------------
// Pure checks.

function targetKey(target: InteractiveTarget): string {
  return `${target.kind}:${target.value}`;
}

function describeElement(element: InteractiveElement): string {
  return `${element.tag}[${element.index}] "${element.label.slice(0, 60)}"`;
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** The identity an exact-source route href names, or undefined when the
 * href is not that route. The route is matched by pathname under any mount
 * (`…/polaris/source`). */
export function exactSourceIdentity(href: string): string | undefined {
  let url: URL;
  try { url = new URL(href); } catch { return undefined; }
  if (!url.pathname.endsWith(POLARIS_SOURCE_PATH)) return undefined;
  return url.searchParams.get(SOURCE_IDENTITY_PARAM) ?? '';
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/**
 * The distinct-name rules over one page's interactive population.
 * `sourcePaths` maps each source identity the machine answer lists to the
 * repository-relative path it carries for that source.
 */
export function distinctNameViolations(elements: readonly InteractiveElement[], sourcePaths: ReadonlyMap<string, string>): Pick<PageNameHeadingReport, 'violations' | 'sharedLabelGroups' | 'exactSourceTargets' | 'exactSourceTargetsWithoutMachinePath'> {
  const violations: NameHeadingViolation[] = [];
  const byName = new Map<string, InteractiveElement[]>();
  for (const element of elements) byName.set(element.name, [...(byName.get(element.name) ?? []), element]);
  for (const [name, group] of byName) {
    const targets = new Set(group.map((element) => targetKey(element.target)));
    if (targets.size > 1) {
      violations.push({ kind: 'shared-name-different-targets', where: `name "${name.slice(0, 80)}"`, detail: `${group.length} elements over ${targets.size} targets: ${group.slice(0, 4).map(describeElement).join(', ')}` });
    }
  }
  const byLabel = new Map<string, InteractiveElement[]>();
  for (const element of elements) byLabel.set(element.label, [...(byLabel.get(element.label) ?? []), element]);
  let sharedLabelGroups = 0;
  let exactSourceTargets = 0;
  let exactSourceTargetsWithoutMachinePath = 0;
  for (const [label, group] of byLabel) {
    const targets = new Set(group.map((element) => targetKey(element.target)));
    if (targets.size < 2) continue;
    sharedLabelGroups += 1;
    for (const element of group) {
      const identity = element.target.kind === 'href' ? exactSourceIdentity(element.target.value) : undefined;
      const mappedPath = identity ? sourcePaths.get(identity) : undefined;
      const path = typeof mappedPath === 'string' && mappedPath.length > 0 ? mappedPath : undefined;
      if (identity !== undefined) {
        exactSourceTargets += 1;
        if (!path) {
          exactSourceTargetsWithoutMachinePath += 1;
          violations.push({ kind: 'shared-label-exact-source-path-unknown', where: describeElement(element), detail: 'Unknown: exact-source target has no path in the machine answer' });
        }
      }
      if (!element.name.startsWith(label)) {
        violations.push({ kind: 'shared-label-name-does-not-begin-with-label', where: describeElement(element), detail: `name "${element.name.slice(0, 80)}" does not begin with the shared label "${label.slice(0, 60)}"` });
        continue;
      }
      if (path && !element.name.slice(label.length).includes(path)) {
        violations.push({ kind: 'shared-label-exact-source-name-omits-path', where: describeElement(element), detail: `name "${element.name.slice(0, 80)}" omits the source path ${path} after the label` });
      }
    }
  }
  return { violations, sharedLabelGroups, exactSourceTargets, exactSourceTargetsWithoutMachinePath };
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** The heading-order rules over one page's heading population. */
export function headingOrderViolations(headings: readonly HeadingElement[]): readonly NameHeadingViolation[] {
  const violations: NameHeadingViolation[] = [];
  const levelOne = headings.filter((heading) => heading.level === 1);
  if (levelOne.length !== 1) {
    violations.push({ kind: 'level-one-heading-count', where: 'page', detail: `${levelOne.length} level-1 headings${levelOne.length === 0 ? '' : `: ${levelOne.map((heading) => `"${heading.text.slice(0, 40)}"`).join(', ')}`}` });
  }
  for (let position = 1; position < headings.length; position += 1) {
    const previous = headings[position - 1] as HeadingElement;
    const heading = headings[position] as HeadingElement;
    if (heading.level > previous.level + 1) {
      violations.push({ kind: 'heading-level-skipped', where: `${heading.tag}[${heading.index}] "${heading.text.slice(0, 60)}"`, detail: `level ${heading.level} follows level ${previous.level} ("${previous.text.slice(0, 40)}")` });
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// The page list, from the machine answer.

/** The minimal slice of the machine answer the page list reads. */
export interface MachineAnswerSources {
  readonly projectShape: { readonly kind: string; readonly sources?: readonly { readonly identity: string; readonly path: string }[] };
}

interface EvaluationIdentity {
  readonly snapshot: string;
  readonly inputsDigest: string;
  readonly asOf: string;
}

export interface MachineAnswerEvaluation extends MachineAnswerSources {
  readonly evaluation: EvaluationIdentity;
}

interface PolarisPage {
  /** `entry`, or the source identity the exact-source route response serves. */
  readonly page: string;
  /** The path and query to request, relative to the daemon (and its mount). */
  readonly path: string;
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** The entry page and one exact-source route response per source the
 * machine answer lists — never the links the renderer emits. */
export function polarisPagesFromMachineAnswer(answer: MachineAnswerSources, entryPath: string, sourcePath: string): { readonly pages: readonly PolarisPage[]; readonly sourcePaths: ReadonlyMap<string, string> } {
  const sources = answer.projectShape.sources ?? [];
  const pages: PolarisPage[] = [{ page: 'entry', path: entryPath }];
  for (const source of sources) pages.push({ page: source.identity, path: `${sourcePath}?${SOURCE_IDENTITY_PARAM}=${encodeURIComponent(source.identity)}` });
  return { pages, sourcePaths: new Map(sources.map((source) => [source.identity, source.path])) };
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** Whole-surface coverage: every listed page swept, none extra. */
export function coverageViolations(listed: readonly PolarisPage[], swept: readonly string[]): readonly NameHeadingViolation[] {
  const violations: NameHeadingViolation[] = [];
  const sweptSet = new Set(swept);
  const listedSet = new Set(listed.map((page) => page.page));
  for (const page of listed) if (!sweptSet.has(page.page)) violations.push({ kind: 'page-not-swept', where: page.page, detail: `${page.path} is listed by the machine answer and was not swept` });
  for (const page of swept) if (!listedSet.has(page)) violations.push({ kind: 'page-not-in-machine-answer', where: page, detail: 'swept a page the machine answer does not list' });
  return violations;
}

// ---------------------------------------------------------------------------
// The browser-driven sweep of one page.

// Test seam: exported for the tests; production code reaches it only inside this file.
/** Both populations of the page at `url`, each interactive element with
 * its browser-computed name. */
export async function measurePage(page: BrowserPage, url: string): Promise<{ readonly elements: readonly InteractiveElement[]; readonly headings: readonly HeadingElement[] }> {
  await page.navigate(url);
  return measureLoadedPage(page, url);
}

async function measureLoadedPage(page: BrowserPage, url: string): ReturnType<typeof measurePage> {
  const described = await page.evaluate<readonly Omit<InteractiveElement, 'name'>[]>(INTERACTIVE_DESCRIPTION_SCRIPT);
  const headings = await page.evaluate<readonly HeadingElement[]>(HEADING_SCRIPT);
  const held = await page.evaluate<number>(HOLD_POPULATION_SCRIPT);
  await page.evaluate<null>(OPEN_DISCLOSURES_SCRIPT);
  const names = await page.accessibleNames(`window[${JSON.stringify(HELD_POPULATION)}]`);
  if (held !== described.length || names.length !== described.length) throw new Error(`${url}: ${names.length} computed names for ${described.length} interactive elements (${held} held)`);
  return { elements: described.map((element, position) => ({ ...element, name: names[position] as string })), headings };
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** Measures one page and reports the violations of both checks beside
 * their denominators. */
export async function checkNamesAndHeadings(page: BrowserPage, url: string, label: string, sourcePaths: ReadonlyMap<string, string>): Promise<PageNameHeadingReport> {
  return namesAndHeadings(await measurePage(page, url), url, label, sourcePaths);
}

function namesAndHeadings({ elements, headings }: Awaited<ReturnType<typeof measurePage>>, url: string, label: string, sourcePaths: ReadonlyMap<string, string>): PageNameHeadingReport {
  const distinct = distinctNameViolations(elements, sourcePaths);
  return {
    page: label,
    url,
    interactive: elements.length,
    headings: headings.length,
    levelOneHeadings: headings.filter((heading) => heading.level === 1).length,
    ...distinct,
    violations: [...distinct.violations, ...headingOrderViolations(headings)],
  };
}

type BrowserEvaluation =
  | { readonly kind: 'read'; readonly url: string; readonly snapshot: string; readonly asOf: string }
  | { readonly kind: 'document-replaced' | 'missing-footer' | 'ambiguous-footer' | 'malformed-footer' };

type EvaluationFailure = Exclude<BrowserEvaluation['kind'], 'read'>
  | 'unexpected-location' | 'invalid-machine-evaluation' | 'snapshot-mismatch' | 'observation-time-mismatch';

function isObservationTime(value: string): boolean {
  const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,3}))?Z$/.exec(value);
  return match !== null && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`;
}

function snapshotDigest(snapshot: string): string | undefined {
  return /^.+\|inputs:sha256:([0-9a-f]{64})$/.exec(snapshot)?.[1];
}

function machineEvaluationValid(evaluation: EvaluationIdentity | undefined): boolean {
  return evaluation != null && typeof evaluation.snapshot === 'string' && typeof evaluation.inputsDigest === 'string' &&
    snapshotDigest(evaluation.snapshot) === evaluation.inputsDigest && typeof evaluation.asOf === 'string' && isObservationTime(evaluation.asOf);
}

function evaluationFailure(document: BrowserEvaluation, url: string, expected: EvaluationIdentity): EvaluationFailure | undefined {
  if (document.kind !== 'read') return document.kind;
  if (document.url !== url) return 'unexpected-location';
  const digest = snapshotDigest(document.snapshot);
  if (!digest || !isObservationTime(document.asOf)) return 'malformed-footer';
  if (document.snapshot !== expected.snapshot || digest !== expected.inputsDigest) return 'snapshot-mismatch';
  if (document.asOf !== expected.asOf) return 'observation-time-mismatch';
  return undefined;
}

export interface WholeSurfaceReport {
  readonly pagesListed: number;
  readonly pagesSwept: number;
  readonly interactive: number;
  readonly headings: number;
  readonly exactSourceTargetsWithoutMachinePath: number;
  readonly machineEvaluationValid: boolean;
  readonly pages: readonly PageNameHeadingReport[];
  readonly unboundPages: readonly { readonly page: string; readonly reason: EvaluationFailure }[];
  readonly violations: readonly NameHeadingViolation[];
}

/**
 * Sweeps every page `answer` lists, served under `baseUrl` (`entryPath` and
 * `sourcePath` carry any mount prefix). A page answering other than 200 is
 * a `page-not-served` violation, never a skip.
 */
export async function sweepPolarisNamesAndHeadings(page: BrowserPage, baseUrl: string, answer: MachineAnswerEvaluation, entryPath: string, sourcePath: string, status: (url: string) => Promise<number>): Promise<WholeSurfaceReport> {
  const { pages, sourcePaths } = polarisPagesFromMachineAnswer(answer, entryPath, sourcePath);
  const reports: PageNameHeadingReport[] = [];
  const unboundPages: { page: string; reason: EvaluationFailure }[] = [];
  const violations: NameHeadingViolation[] = [];
  const evaluation = answer.evaluation;
  const validEvaluation = machineEvaluationValid(evaluation);
  const unbound = (listed: PolarisPage, reason: EvaluationFailure) => {
    unboundPages.push({ page: listed.page, reason });
    violations.push({ kind: 'page-evaluation-unbound', where: listed.page, detail: `Unknown: ${reason}` });
  };
  for (const listed of pages) {
    const url = new URL(listed.path, baseUrl).href;
    const code = await status(url);
    if (code !== 200) {
      violations.push({ kind: 'page-not-served', where: listed.page, detail: `${listed.path} answered ${code}` });
      continue;
    }
    if (!validEvaluation) {
      unbound(listed, 'invalid-machine-evaluation');
      continue;
    }
    await page.navigate(url);
    const started = evaluationFailure(await page.evaluate<BrowserEvaluation>(`(${READ_EVALUATION})(true)`), url, evaluation);
    if (started !== undefined) {
      unbound(listed, started);
      continue;
    }
    // A replacement can discard the held elements before AX reads them.
    // Recheck the document even when measurement failed.
    const measured = await measureLoadedPage(page, url).then(
      (populations) => ({ kind: 'measured' as const, populations }),
      (error: unknown) => ({ kind: 'failed' as const, error }),
    );
    let finished: EvaluationFailure | undefined;
    try {
      finished = evaluationFailure(await page.evaluate<BrowserEvaluation>(`(${READ_EVALUATION})(false)`), url, evaluation);
    } catch (error) {
      throw measured.kind === 'failed' ? measured.error : error;
    }
    if (finished !== undefined) {
      unbound(listed, finished);
      continue;
    }
    if (measured.kind === 'failed') throw measured.error;
    const report = namesAndHeadings(measured.populations, url, listed.page, sourcePaths);
    reports.push(report);
    for (const violation of report.violations) {
      violations.push({ ...violation, where: `${listed.page}: ${violation.where}` });
    }
  }
  for (const violation of coverageViolations(pages, reports.map((report) => report.page))) {
    violations.push(violation);
  }
  return {
    pagesListed: pages.length,
    pagesSwept: reports.length,
    interactive: reports.reduce((sum, report) => sum + report.interactive, 0),
    headings: reports.reduce((sum, report) => sum + report.headings, 0),
    exactSourceTargetsWithoutMachinePath: reports.reduce((sum, report) => sum + report.exactSourceTargetsWithoutMachinePath, 0),
    machineEvaluationValid: validEvaluation,
    pages: reports,
    unboundPages,
    violations,
  };
}
