import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { tempDir } from '@syzygy/test-kit';
import type { PocModel } from '@syzygy/three-surface-poc-core';

import { findBrowserExecutable, withBrowserPage, type BrowserPage } from './cdp-browser.js';
import { DESIGN_TOKENS_CSS, PROPOSAL_DISCLOSURE } from './design-tokens.js';
import { copyText } from './polaris-copy.js';
import { renderPolarisPage } from './polaris.js';
import { buildFixtureModel } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, REJECTING_AUTHORITY, projectShapeFixtureGit } from './test-project-shape-fixture.js';

// syzygy-dov.3.2 (P-70 M3 slice 6): proposed-not-authority is a declared
// disclosure row with a generated legend, never a claim state. The oracle is
// hand-typed; `--proposed` and its contrast evidence are M3 slice 1-4's.

const PROPOSED_RGB = 'rgb(170, 144, 238)'; // --proposed #aa90ee, unchanged
const OTHER_SYMBOLS = ['●', '?', '◆', '◇', '◒', '✎', '○', '‖', '∅', '▲', '△', '✕', '»', '◌'];
const UNREACHABLE = 'Not on this page at this evaluation';

const cleanups: string[] = [];
const browserExecutable = findBrowserExecutable();
afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function decode(text: string): string {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function populated(authority = ADMITTING_AUTHORITY): PocModel {
  return buildFixtureModel(cleanups, { projectShape: { authority, runGit: projectShapeFixtureGit() } });
}

/** The same model with its one proposal moved off every capability shown. */
function zero(model: PocModel): PocModel {
  return { ...model, proposedWork: { ...model.proposedWork, capabilityId: 'capability:none-shown' } };
}

interface ServedProposals {
  readonly sections: number;
  readonly labels: number;
  readonly legend: { readonly served: number; readonly text: string; readonly className: string } | undefined;
}

/** Both directions: every served proposal section carries exactly one
 * declared label, and the legend's served count and note agree with them. */
function servedProposals(html: string): ServedProposals {
  const body = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const sections = [...body.matchAll(/<section class="([^"]*)" data-proposed-work-part="proposal"[^>]*>([\s\S]*?)<\/section>/g)];
  let labels = 0;
  for (const section of sections) {
    if (!(section[1] as string).split(' ').includes('proposal')) throw new Error('a served proposal lacks the declared class');
    const own = [...(section[2] as string).matchAll(/<p class="proposal-label" data-proposal-label[^>]*>([^<]*)<\/p>/g)];
    if (own.length !== 1 || own[0]?.[1] !== 'Proposed change — not current authority.') throw new Error('a served proposal lacks its one text marker');
    if (/data-epistemic-(?:label|tier|freshness)=/.test(section[0].split('>')[0] as string)) throw new Error('a proposal carries an epistemic state');
    labels += own.length;
  }
  if ([...body.matchAll(/data-proposal-label/g)].length !== labels) throw new Error('a proposal label outside a proposal section');
  const legend = /<li class="([^"]*)" data-disclosure-legend="proposed" data-disclosure-served="(\d+)"[^>]*>([^<]*)<\/li>/.exec(body);
  return { sections: sections.length, labels, legend: legend === null ? undefined : { className: legend[1] as string, served: Number(legend[2]), text: decode(legend[3] as string) } };
}

function verifyLegend(html: string): ServedProposals {
  const served = servedProposals(html);
  if (served.legend === undefined) throw new Error('no proposal legend row');
  if (served.legend.className !== 'proposal-label') throw new Error('the legend row lacks the declared class');
  if (served.legend.served !== served.sections) throw new Error(`legend counts ${served.legend.served}, page serves ${served.sections}`);
  if (served.legend.text.includes(UNREACHABLE) !== (served.sections === 0)) throw new Error('the legend reachability note disagrees with the served population');
  return served;
}

describe('proposal disclosure row (syzygy-dov.3.2; P-70 M3 slice 6)', () => {
  it('declares proposed-not-authority apart from every claim state, on the unchanged --proposed token', () => {
    expect(PROPOSAL_DISCLOSURE).toEqual({
      value: 'proposed',
      className: 'proposal',
      labelClassName: 'proposal-label',
      symbol: '✧',
      token: '--proposed',
      description: 'states.proposed',
      unreachable: 'Not on this page at this evaluation: no proposed change names a capability shown here.',
    });
    expect(OTHER_SYMBOLS).not.toContain(PROPOSAL_DISCLOSURE.symbol);
    expect(DESIGN_TOKENS_CSS).toContain('--proposed: #aa90ee;');
    expect(copyText('states.proposed').startsWith('Proposed change — not current authority')).toBe(true);
    expect(copyText('label.proposed')).toBe('Proposed change — not current authority.');
  });

  it('generates the proposal treatment from the declaration and spends --proposed nowhere else', () => {
    const css = (/<style>([\s\S]*?)<\/style>/.exec(renderPolarisPage(populated()))?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('.claim-section.proposal { border-left: 4px solid var(--proposed); padding-left: 1rem; }');
    expect(css).toContain('.proposal-label { color: var(--proposed); }');
    expect(css).toContain('.proposal-label::before { content: "✧ " / ""; }');
    const spenders = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((rule) => (rule[2] ?? '').includes('var(--proposed)')).map((rule) => (rule[1] as string).trim());
    expect(spenders.sort()).toEqual(['.claim-section.proposal', '.proposal-label']);
  });

  it('agrees with the served proposal population in zero and populated fixtures, and sits outside the claim-state lists', () => {
    for (const authority of [ADMITTING_AUTHORITY, REJECTING_AUTHORITY]) {
      const full = verifyLegend(renderPolarisPage(populated(authority)));
      expect(full.sections).toBe(1);
      expect(full.labels).toBe(1);
      expect(full.legend?.text).toBe(copyText('states.proposed'));
      const none = verifyLegend(renderPolarisPage(zero(populated(authority))));
      expect(none.sections).toBe(0);
      expect(none.labels).toBe(0);
      expect(none.legend?.text).toBe(`${copyText('states.proposed')} ${UNREACHABLE}: no proposed change names a capability shown here.`);
    }
    const html = renderPolarisPage(populated());
    const block = /<details id="polaris-claim-states"[^>]*>([\s\S]*?)<\/details>/.exec(html)?.[1] as string;
    const lists = [...block.matchAll(/<p[^>]*>([^<]*)<\/p><ul>([\s\S]*?)<\/ul>/g)].map((match) => ({ label: match[1] as string, rows: match[2] as string }));
    const own = lists.filter((list) => list.rows.includes('data-disclosure-legend'));
    expect(own.map((list) => list.label)).toEqual([copyText('states.disclosures')]);
    expect(own[0]?.rows.split('<li').length).toBe(2);
    for (const list of lists.filter((candidate) => candidate !== own[0])) expect(list.rows).not.toContain('proposal');
  });

  it('rejects a legend that disagrees with the page, a proposal without its marker, or a proposal carrying an epistemic state', () => {
    const html = renderPolarisPage(populated());
    verifyLegend(html);
    expect(() => verifyLegend(html.replace('data-disclosure-served="1"', 'data-disclosure-served="0"'))).toThrow();
    expect(() => verifyLegend(html.replace(/(data-disclosure-legend="proposed"[^>]*>[^<]*)/, `$1 ${UNREACHABLE}.`))).toThrow();
    expect(() => verifyLegend(html.replace(/<li class="proposal-label" data-disclosure-legend[^>]*>[^<]*<\/li>/, ''))).toThrow();
    expect(() => verifyLegend(html.replace(/<p class="proposal-label" data-proposal-label[^>]*>[^<]*<\/p>/, ''))).toThrow();
    expect(() => verifyLegend(html.replace('data-proposed-work-part="proposal"', 'data-proposed-work-part="proposal" data-epistemic-label="Observed"'))).toThrow();
  });

  it.skipIf(browserExecutable === undefined)('renders every served proposal and the legend row in the declared token and symbol after scripts', async () => {
    const directory = tempDir('syzygy-dov32-proposal-');
    await withBrowserPage(browserExecutable as string, async (page) => {
      for (const [name, model, expected] of [['populated', populated(), 1], ['zero', zero(populated()), 0]] as const) {
        const file = join(directory, `${name}.html`);
        writeFileSync(file, renderPolarisPage(model));
        await page.navigate(pathToFileURL(file).href);
        const runtime = await browserProposals(page);
        expect(runtime.failures, name).toEqual([]);
        expect(runtime.sections, name).toBe(expected);
        expect(runtime.walkedSections, name).toBe(expected);
        expect(runtime.legendRows, name).toBe(1);
      }
    });
  }, 45_000); // two rendered pages in a real browser: worst 8.3 s over 5 alone runs at load1 59-69 (docs/evidence/syzygy-bpyt-4-31/durations/proposal-disclosure.test.tests.json)
});

async function browserProposals(page: BrowserPage): Promise<{ sections: number; walkedSections: number; legendRows: number; failures: string[] }> {
  return page.evaluate(`(() => {
    const failures = [];
    const sections = document.querySelectorAll('section[data-proposed-work-part="proposal"]').length;
    let walkedSections = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const element = walker.currentNode;
      if (element.getAttribute('data-proposed-work-part') !== 'proposal') continue;
      walkedSections++;
      if (getComputedStyle(element).borderLeftColor !== ${JSON.stringify(PROPOSED_RGB)}) failures.push('section border ' + getComputedStyle(element).borderLeftColor);
      const labels = element.querySelectorAll('[data-proposal-label]');
      if (labels.length !== 1) failures.push('labels ' + labels.length);
      for (const label of labels) {
        if (getComputedStyle(label).color !== ${JSON.stringify(PROPOSED_RGB)}) failures.push('label colour ' + getComputedStyle(label).color);
        if (!getComputedStyle(label, '::before').content.includes('✧')) failures.push('label symbol');
      }
    }
    const legend = [...document.querySelectorAll('[data-disclosure-legend="proposed"]')];
    for (const row of legend) {
      if (getComputedStyle(row).color !== ${JSON.stringify(PROPOSED_RGB)}) failures.push('legend colour ' + getComputedStyle(row).color);
      if (!getComputedStyle(row, '::before').content.includes('✧')) failures.push('legend symbol');
      if (Number(row.getAttribute('data-disclosure-served')) !== sections) failures.push('legend count');
    }
    return { sections, walkedSections, legendRows: legend.length, failures };
  })()`);
}
