import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createDaemon, type RunningDaemon } from '@syzygy/http-host';
import type { PocModel } from '@syzygy/three-surface-poc-core';
import { tempDir } from '@syzygy/test-kit';

import { TAILNET_HOST } from './browser-origin.js';
import { findBrowserExecutable, launchBrowser, withBrowserPage, type Browser, type BrowserPage } from './cdp-browser.js';
import { ORRERY_HUMAN_PATH } from './orrery.js';
import { renderOrreryPage } from './orrery.js';
import { POLARIS_HUMAN_PATH, renderPolarisPage } from './polaris.js';
import { POC_HUMAN_PATH, pocRoutes } from './routes.js';
import { TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { fetchWithHost } from './test-http-client.js';
import { buildFixtureModel } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, projectShapeFixtureGit } from './test-project-shape-fixture.js';
import { TRAJECTORY_HUMAN_PATH } from './trajectory.js';
import { renderTrajectoryPage } from './trajectory.js';

const cleanups: string[] = [];
const running: RunningDaemon[] = [];
const browserExecutable = findBrowserExecutable();

afterEach(async () => {
  for (const daemon of running.splice(0)) {
    await daemon.close().catch(() => undefined);
  }
  for (const directory of cleanups.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

interface CrossLink {
  readonly href: string;
  readonly className: string;
  readonly source: string;
  readonly target: string;
  readonly text: string;
  readonly accessibleName: string;
  readonly tabIndex: number;
  readonly insideDetails: boolean;
}

/** A second population method walks every native anchor in the runtime DOM,
 * independent of the link marker emitted by the renderer. */
async function runtimeCrossLinks(page: BrowserPage): Promise<{ readonly all: number; readonly unmarked: number; readonly links: readonly CrossLink[] }> {
  return page.evaluate(`(() => {
    const route = /^\\/(?:butlers-syzygy\\/)?(?:polaris|trajectory|orrery)(?:#|$)/;
    const all = [...document.querySelectorAll('a[href]')].filter(a => !a.closest('.site-nav') && route.test(a.getAttribute('href') || ''));
    const marked = [...document.querySelectorAll('a[data-cross-surface-class]')];
    return { all: all.length, unmarked: all.filter(a => !a.hasAttribute('data-cross-surface-class')).length,
      links: marked.map(a => ({ href: a.getAttribute('href'), className: a.dataset.crossSurfaceClass,
        source: a.dataset.crossSource, target: a.dataset.crossTarget, text: a.textContent.trim(),
        accessibleName: a.getAttribute('aria-label') || '', tabIndex: a.tabIndex,
        insideDetails: !!a.closest('details') })) };
  })()`);
}

type Family = 'badge' | 'tuple' | 'disclosure';
interface EncodingMember { readonly family: Family; readonly label: string; readonly tag: string }
const EXPECTED = {
  Observed: { token: '--observed', symbol: '●' },
  Unknown: { token: '--unknown', symbol: '?' },
} as const;

/** Parse served tags independently of the renderer and carry the nearest scope. */
function encodingMembers(html: string): EncodingMember[] {
  const body = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const members: EncodingMember[] = [];
  const scopes: { tag: string; label?: string }[] = [];
  for (const match of body.matchAll(/<(\/)?([a-z][a-z0-9-]*)([^<>]*)>/gi)) {
    const [, closing, name, attrs = ''] = match;
    if (name === undefined) continue;
    if (closing !== undefined) {
      let index = -1;
      for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i]?.tag === name) { index = i; break; }
      if (index >= 0) scopes.splice(index);
      continue;
    }
    const attribute = (key: string): string | undefined => new RegExp(`(?:^|\\s)${key}="([^"]*)"`).exec(attrs)?.[1];
    const classes = (attribute('class') ?? '').split(/\s+/);
    let inherited: string | undefined;
    for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i]?.label !== undefined) { inherited = scopes[i]?.label; break; }
    const own = attribute('data-epistemic-label');
    // An element may carry a badge and the shared disclosure marker at once
    // (Trajectory's verification badges, M4 slice 1): it is a member of both.
    const families: Family[] = [
      ...(classes.includes('epistemic') ? ['badge' as const] : classes.includes('claim-tuple') ? ['tuple' as const] : []),
      ...(attribute('data-unknown-disclosure') !== undefined ? ['disclosure' as const] : []),
    ];
    for (const family of families) {
      const label = family === 'badge' ? classes.find((cls) => cls.startsWith('epistemic-') && cls !== 'epistemic')?.slice('epistemic-'.length)
        : family === 'disclosure' ? 'Unknown' : own ?? inherited;
      if (label === undefined) throw new Error(`${family} has no local or inherited label: ${match[0]}`);
      members.push({ family, label: label[0]!.toUpperCase() + label.slice(1), tag: match[0] });
    }
    if (!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(name) && !attrs.trimEnd().endsWith('/')) {
      scopes.push({ tag: name, label: attribute('data-epistemic-scope-label') });
    }
  }
  return members;
}

function verifyEncodingPopulation(html: string, checkTokenExclusivity = true, omitFamily?: Family): Record<Family, number> {
  const css = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1];
  if (css === undefined) throw new Error('served page has no stylesheet');
  const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const members = encodingMembers(html).filter((member) => member.family !== omitFamily);
  const counts: Record<Family, number> = { badge: 0, tuple: 0, disclosure: 0 };
  for (const member of members) {
    counts[member.family]++;
    const expected = EXPECTED[member.label as keyof typeof EXPECTED];
    if (expected === undefined) throw new Error(`undeclared label ${member.label}`);
    if (/\sstyle=/.test(member.tag)) throw new Error(`ad hoc inline treatment: ${member.tag}`);
    const scoped = member.family === 'tuple' && !member.tag.includes('data-epistemic-label=');
    const selector = member.family === 'badge' ? `.epistemic.epistemic-${member.label.toLowerCase()}`
      : member.family === 'tuple' ? scoped
        ? `[data-epistemic-scope-label="${member.label}"]`
        : `.claim-tuple[data-epistemic-label="${member.label}"]`
        : '[data-unknown-disclosure]';
    const rules = [...cleanCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    if (scoped) {
      const declaration = rules.find((rule) => rule[1]?.trim() === selector);
      const inheritedColor = rules.find((rule) => rule[1]?.trim() === '.claim-tuple:not([data-epistemic-label])');
      const inheritedSymbol = rules.find((rule) => rule[1]?.trim() === '.claim-tuple:not([data-epistemic-label])::before');
      if (!declaration?.[2]?.includes(`--claim-color: var(${expected.token});`) || !declaration[2].includes(`--claim-symbol: "${expected.symbol} ";`)) throw new Error(`wrong scope declaration for ${selector}`);
      if (!inheritedColor?.[2]?.includes('color: var(--claim-color);') || !inheritedSymbol?.[2]?.includes('content: var(--claim-symbol);')) throw new Error('scope inheritance consumer missing');
    } else {
      const color = rules.find((rule) => rule[1]?.includes(selector) && !rule[1]?.includes('::before') && /\bcolor:\s*var\(/.test(rule[2] ?? ''));
      const symbol = rules.find((rule) => rule[1]?.includes(`${selector}::before`) && rule[2]?.includes(`content: "${expected.symbol} "`));
      if (color?.[2]?.includes(`color: var(${expected.token});`) !== true) throw new Error(`wrong color for ${selector}`);
      if (symbol === undefined) throw new Error(`missing symbol for ${selector}`);
    }
  }
  const body = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const independent = {
    badge: [...body.matchAll(/class="[^"]*\bepistemic epistemic-(?:observed|unknown)\b/g)].length,
    tuple: [...body.matchAll(/class="[^"]*\bclaim-tuple\b/g)].length,
    disclosure: [...body.matchAll(/\sdata-unknown-disclosure="/g)].length,
  };
  expect(counts).toEqual(independent);
  for (const rule of checkTokenExclusivity ? cleanCss.matchAll(/([^{}]+)\{([^{}]*)\}/g) : []) {
    if (!/var\(--(?:observed|unknown)\)/.test(rule[2] ?? '')) continue;
    const selector = rule[1] ?? '';
    if (!/(?:\.epistemic\.epistemic-|\.claim-tuple|\[data-unknown-disclosure\]|\[data-epistemic-scope-label=)/.test(selector)) {
      throw new Error(`epistemic token outside declared families: ${selector}`);
    }
  }
  return counts;
}

interface BrowserEncodingCensus {
  readonly query: Record<Family, number>;
  readonly walked: Record<Family, number>;
  readonly unmapped: number;
  readonly markedUnmapped: number;
  readonly treatmentFailures: readonly string[];
  readonly unnamedUnknowns: number;
}

/** Enumerates the actual post-script DOM and computed treatments in Chrome. */
async function browserEncodingCensus(page: BrowserPage): Promise<BrowserEncodingCensus> {
  return page.evaluate<BrowserEncodingCensus>(`(() => {
    const query = {
      badge: document.querySelectorAll('.epistemic.epistemic-observed, .epistemic.epistemic-unknown').length,
      tuple: document.querySelectorAll('.claim-tuple').length,
      disclosure: document.querySelectorAll('[data-unknown-disclosure]').length,
    };
    const walked = { badge: 0, tuple: 0, disclosure: 0 };
    const treatmentFailures = [];
    let unnamedUnknowns = 0;
    const nodes = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (nodes.nextNode()) {
      const element = nodes.currentNode;
      const badge = element.classList.contains('epistemic') &&
        (element.classList.contains('epistemic-observed') || element.classList.contains('epistemic-unknown'));
      const tuple = element.classList.contains('claim-tuple');
      const disclosure = element.hasAttribute('data-unknown-disclosure');
      const families = [...(badge ? ['badge'] : tuple ? ['tuple'] : []), ...(disclosure ? ['disclosure'] : [])];
      if (families.length === 0) continue;
      const label = badge ? (element.classList.contains('epistemic-observed') ? 'Observed' : 'Unknown')
        : tuple ? (element.getAttribute('data-epistemic-label') || element.closest('[data-epistemic-scope-label]')?.getAttribute('data-epistemic-scope-label'))
        : 'Unknown';
      const color = getComputedStyle(element).color;
      const symbol = getComputedStyle(element, '::before').content;
      const expectedColor = label === 'Observed' ? 'rgb(120, 225, 209)' : 'rgb(243, 197, 111)';
      const expectedSymbol = label === 'Observed' ? '●' : '?';
      for (const family of families) {
        walked[family]++;
        if ((label !== 'Observed' && label !== 'Unknown') || color !== expectedColor || !symbol.includes(expectedSymbol)) {
          treatmentFailures.push(family + ':' + (label || 'missing'));
        }
      }
      if (element.classList.contains('orrery-block') && element.classList.contains('unmapped') && !element.textContent.includes('Unknown')) unnamedUnknowns++;
    }
    const unmapped = [...document.querySelectorAll('.orrery-block.unmapped')];
    return {
      query,
      walked,
      unmapped: unmapped.length,
      // Marked, and carrying its closed reason and route (M4 slice 1).
      markedUnmapped: unmapped.filter((element) => element.getAttribute('data-unknown-disclosure') === element.querySelector('a')?.getAttribute('href')?.slice(1)
        && element.getAttribute('data-unknown-reason') === 'mapping-coverage-absent'
        && element.querySelector('[data-unknown-route="mapping-coverage-absent"]')?.textContent === 'Run or declare the mapping').length,
      treatmentFailures,
      unnamedUnknowns,
    };
  })()`);
}

function verifyRuntimeCensus(server: Record<Family, number>, runtime: BrowserEncodingCensus, orrery: boolean): void {
  expect(runtime.query).toEqual(runtime.walked);
  expect(runtime.treatmentFailures).toEqual([]);
  expect(runtime.unnamedUnknowns).toBe(0);
  expect(runtime.query.badge).toBe(server.badge);
  expect(runtime.query.tuple).toBe(server.tuple);
  expect(runtime.query.disclosure).toBe(server.disclosure + (orrery ? runtime.unmapped : 0));
  expect(runtime.markedUnmapped).toBe(runtime.unmapped);
}

describe('surface routes', () => {
  it('serves Polaris, Trajectory, and Orrery as human-open, same-origin-guarded pages', async () => {
    const model = buildFixtureModel(cleanups);
    const start = await createDaemon({
      stateDir: join(tempDir('syzygy-poc-surface-state-'), 'state'),
      routes: pocRoutes(() => model),
      port: 0,
    });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    running.push(start.daemon);
    const baseUrl = `http://${start.daemon.host}:${start.daemon.port}`;

    for (const path of [POLARIS_HUMAN_PATH, TRAJECTORY_HUMAN_PATH, ORRERY_HUMAN_PATH]) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
      const html = await response.text();
      expect(html).toContain('<nav class="site-nav" aria-label="Three-surface POC sections">');
      expect(html).toContain('class="legend"');

      const rebound = await fetch(`${baseUrl}${path}`, {
        headers: { host: 'poc.attacker.invalid', origin: 'http://poc.attacker.invalid' },
      });
      expect(rebound.status).toBe(403);
    }
  });

  describe('15-link cross-surface exhaustion', () => {
    // syzygy-8hr: this case timed out at 15,000ms under hosted CI load
    // (runs 36214865515 / 36215589451, 2026-09-26) though the identical
    // case measured 2,969ms/1,929ms (direct/tailnet) on prior hosted CI
    // (syzygy-bul). Phase timing (added and removed temporarily, 2026-09-27)
    // showed one Chrome launch+newPage+close cycle inside `withBrowserPage`
    // was 70-95%+ of this case's own wall time in every scenario tried,
    // dwarfing the 15-link fetch loop and four-page navigation/DOM-census
    // loop below (tens to a few hundred ms even under load) — and each of
    // 'direct'/'tailnet' used to pay for its own separate launch+close.
    // Measured on this branch after moving the shared model/daemon/browser
    // build into this describe's beforeAll/afterAll (so one launch+close
    // pays for both forms, outside either form's own 15,000ms budget), 5
    // runs each:
    //   unloaded:                        direct 236-383ms, tailnet 195-256ms
    //   `taskset -c 0,1` + 24 competing
    //   busy loops pinned to the same
    //   two cores (~12x oversubscription,
    //   approximating a starved 2-vCPU
    //   hosted runner):                  direct 1056-2099ms, tailnet 739-1433ms
    // Worst observed under synthetic load (2099ms) is ~7x under the
    // 15,000ms per-case budget, which is kept as the stated margin rather
    // than lowered, since real hosted-runner contention cannot be
    // reproduced exactly locally.
    // This block's own fixture directories are cleaned up here, in its
    // afterAll, rather than through the top-level `cleanups` array (which
    // the file-level afterEach drains after *every* test, including the
    // first ('direct') of the two it.each cases sharing this fixture —
    // that drain deleted the fixture git repo and the rendered-page
    // directory out from under the still-pending 'tailnet' case).
    // Both forms share one model, daemon and ServedResponseRecorder, so a
    // response-ceiling breach in 'direct' would stay visible to 'tailnet'.
    // Served bodies here are 21-86 KB against the 2 MB ceiling. Hooks
    // budget 60,000ms, matching the other browser suites' launchBrowser.
    const localCleanups: string[] = [];
    let model: PocModel;
    let daemon: RunningDaemon;
    let baseUrl: string;
    let directory: string;
    let browser: Browser | undefined;
    let page: BrowserPage | undefined;

    beforeAll(async () => {
      if (browserExecutable === undefined) return;
      model = buildFixtureModel(localCleanups);
      const stateDir = tempDir('syzygy-cross-links-state-');
      const start = await createDaemon({ stateDir: join(stateDir, 'state'), routes: pocRoutes(() => model), port: 0 });
      if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
      daemon = start.daemon;
      baseUrl = `http://${daemon.host}:${daemon.port}`;
      directory = tempDir('syzygy-cross-links-pages-');
      browser = await launchBrowser(browserExecutable);
      page = await browser.newPage();
    }, 60_000); // a fixture model, a daemon and Chrome: at most 0.5 s in 5 alone runs, but hosted run 40428762919 spent at least 9.0 s in this beforeAll and the afterAll together (docs/evidence/syzygy-bpyt-4-31/ci-durations.json)

    afterAll(async () => {
      // browser.close() is left to throw: closeDisposableBrowser reports a
      // private Chrome profile that failed to drain (9162d62), and that
      // failure must fail this file, as it does in the other browser suites.
      try {
        if (page !== undefined) await page.close().catch(() => undefined);
        if (browser !== undefined) await browser.close();
      } finally {
        if (daemon !== undefined) await daemon.close().catch(() => undefined);
        for (const directoryToRemove of localCleanups.splice(0)) {
          rmSync(directoryToRemove, { recursive: true, force: true });
        }
      }
    }, 60_000); // closes Chrome and the daemon: at most 1.1 s in 5 alone runs, but hosted run 40428762919 spent at least 9.0 s in the beforeAll and this afterAll together (docs/evidence/syzygy-bpyt-4-31/ci-durations.json)

    it.skipIf(browserExecutable === undefined).each(['direct', 'tailnet'] as const)('exhausts 15 runtime cross-surface links over six classes and fetches every %s target', async (form) => {
      if (page === undefined) throw new Error('shared browser page not initialized');
      const activePage = page;
      // M4 slice 1 adds intent-to-work's action route on Polaris and Orrery.
      const expected = { 'work-count': 1, 'code-count': 1, 'reality-entity': 9, 'governing-intent': 1, 'mapped-capability': 1, 'action-route': 2 };
      const mount = form === 'direct' ? '' : TAILNET_MOUNT_PREFIX;
      const request = (path: string) => form === 'direct' ? fetch(`${baseUrl}${path}`)
        : fetchWithHost(`${baseUrl}${path}`, TAILNET_HOST, { origin: `https://${TAILNET_HOST}` });
      const links: CrossLink[] = [];
      const sizes: Record<string, number> = {};
      for (const path of ['/', POLARIS_HUMAN_PATH, TRAJECTORY_HUMAN_PATH, ORRERY_HUMAN_PATH]) {
        const response = await request(path);
        expect(response.status, `${form} ${path}`).toBe(200);
        const html = await response.text();
        sizes[path] = Buffer.byteLength(html, 'utf8');
        if (path === '/') continue;
        expect(html).toContain('a:focus-visible');
        expect(html).toContain('@media (prefers-reduced-motion: reduce)');
        const file = join(directory, `${form}-${path.slice(1)}.html`);
        writeFileSync(file, html);
        await activePage.navigate(pathToFileURL(file).href);
        const census = await runtimeCrossLinks(activePage);
        expect(census.unmarked, `${form} ${path} unmarked native links`).toBe(0);
        expect(census.links.length, `${form} ${path} marked population`).toBe(census.all);
        links.push(...census.links);
      }
      expect(links.length, `${form} cross-surface denominator`).toBe(15);
      const classes = Object.fromEntries(Object.keys(expected).map(key => [key, links.filter(link => link.className === key).length]));
      expect(classes).toEqual(expected);
      // The action route is the same link on Polaris and Orrery, so 14 distinct.
      expect(new Set(links.map(link => `${link.className}:${link.source}:${link.target}`)).size).toBe(14);

      // Every one of the 15 links still gets its own real HTTP fetch of its
      // target (preserving the identical-content check below byte for
      // byte) — only the *sequencing* changes, from 15 chained awaits to
      // one concurrent batch, since the sequential chain (not the fetch
      // cost itself, measured at 1-30ms per link even under heavy
      // synthetic load above) was what scaled with scheduler contention.
      const targetPaths = links.map((link) => new URL(link.href, baseUrl).pathname.slice(mount.length));
      const targetResponses = await Promise.all(targetPaths.map((path) => request(path)));
      const targetHtmls = await Promise.all(targetResponses.map((response) => response.text()));

      const runtimeTargets = new Map<string, { html: string; fragments: { href: string; id: string }[] }>();
      for (const [index, link] of links.entries()) {
        expect(link.href.startsWith(`${mount}/`), `${form} ${link.className} mount`).toBe(true);
        expect(link.insideDetails, link.href).toBe(false);
        expect(link.tabIndex, link.href).toBe(0);
        expect(link.text.length, link.href).toBeGreaterThan(3);
        const url = new URL(link.href, baseUrl);
        const targetPath = targetPaths[index]!;
        expect([POLARIS_HUMAN_PATH, TRAJECTORY_HUMAN_PATH, ORRERY_HUMAN_PATH]).toContain(targetPath);
        expect(link.accessibleName, link.href).toContain(targetPath.slice(1)[0]!.toUpperCase() + targetPath.slice(2));
        const targetResponse = targetResponses[index]!;
        expect(targetResponse.status, `${form} target ${link.href}`).toBe(200);
        const targetHtml = targetHtmls[index]!;
        if (url.hash === '') {
          expect(link.target).toBe(targetPath.slice(1));
          continue;
        }
        const fragment = decodeURIComponent(url.hash.slice(1));
        expect(link.target).toBe(fragment);
        const ids = [...targetHtml.matchAll(/\sid="([^"]+)"/g)].filter(match => match[1] === fragment);
        expect(ids, `${form} dangling/duplicate ${link.href}`).toHaveLength(1);
        const existing = runtimeTargets.get(targetPath);
        if (existing !== undefined) {
          expect(targetHtml, `${form} target changed between fetches ${link.href}`).toBe(existing.html);
          existing.fragments.push({ href: link.href, id: fragment });
        } else runtimeTargets.set(targetPath, { html: targetHtml, fragments: [{ href: link.href, id: fragment }] });
      }
      // Polaris and Orrery, plus Trajectory's materialize panel (the action route).
      expect(runtimeTargets.size, `${form} distinct fragment target pages`).toBe(3);
      for (const [targetPath, target] of runtimeTargets) {
        const targetFile = join(directory, `${form}-target-${targetPath.slice(1)}.html`);
        writeFileSync(targetFile, target.html);
        await activePage.navigate(pathToFileURL(targetFile).href);
        const results = await activePage.evaluate<readonly boolean[]>(`(() => {
          const fragments = ${JSON.stringify(target.fragments.map(fragment => fragment.id))};
          return fragments.map(id => {
            const matches = [...document.querySelectorAll('[id]')].filter(node => node.id === id);
            return matches.length !== 1 || !!matches[0].closest('details');
          });
        })()`);
        expect(results).toHaveLength(target.fragments.length);
        for (const [index, fragment] of target.fragments.entries()) {
          expect(results[index], `${form} target hidden in details ${fragment.href}`).toBe(false);
        }
      }
      // Readable capture for the dated size evidence, from the same served
      // evaluation and exactly the three-surface link population above.
      process.stdout.write(`[M9 cross links] ${JSON.stringify({ form, links: links.length, classes, sizes })}\n`);
    }, 15_000); // hosted runs timed out at the 5 s default (docs/evidence/syzygy-bul-browser-ci-correction-2026-09-23.json)
  });

  it('withholds hrefs and discloses unavailable targets instead of defaulting identities', () => {
    const model = buildFixtureModel(cleanups);
    const withoutOrrery = { ...model, surfaces: model.surfaces.filter(surface => surface.id !== 'orrery') };
    const polaris = renderPolarisPage(withoutOrrery);
    expect(polaris).toContain('data-cross-surface-unavailable="reality-entity"');
    expect(polaris).toContain('data-cross-surface-unavailable="code-count"');
    expect(polaris).not.toMatch(/<a[^>]+data-cross-surface-class="reality-entity"/);
    const withoutCapability = { ...model, entities: model.entities.filter(entity => entity.id !== model.capabilityId) };
    const trajectory = renderTrajectoryPage(withoutCapability);
    const orrery = renderOrreryPage(withoutCapability);
    expect(trajectory).toContain('data-cross-surface-unavailable="governing-intent"');
    expect(trajectory).not.toMatch(/<a[^>]+data-cross-surface-class="governing-intent"/);
    expect(orrery).toContain('"capabilityHref":null');
    expect(orrery).not.toContain('"capabilityHref":"/polaris#');
  });

  it.skipIf(browserExecutable === undefined)('withholds the post-script Orrery capability href when that exact capability is absent', async () => {
    const model = buildFixtureModel(cleanups);
    const missing = { ...model, entities: model.entities.filter(entity => entity.id !== model.capabilityId) };
    const file = join(tempDir('syzygy-missing-capability-'), 'orrery.html');
    writeFileSync(file, renderOrreryPage(missing));
    await withBrowserPage(browserExecutable as string, async page => {
      await page.navigate(pathToFileURL(file).href);
      const result = await page.evaluate(`(() => ({
        hrefs: document.querySelectorAll('.orrery-block.mapped a[data-cross-surface-class="mapped-capability"]').length,
        unavailable: document.querySelectorAll('.orrery-block.mapped [data-cross-surface-unavailable="mapped-capability"]').length,
        exactTableLinks: document.querySelectorAll('.orrery-block.mapped a[data-parity-field="orrery-mapped-region"]').length,
      }))()`);
      expect(result).toEqual({ hrefs: 0, unavailable: 1, exactTableLinks: 1 });
    });
  }, 10_000); // a hosted run timed out at the 5 s default (docs/evidence/syzygy-bul-browser-ci-correction-2026-09-23.json)

  it('exhausts every served badge, tuple and Unknown disclosure on the three surfaces; Home is a separate diagnostic (POC-REQ-060)', async () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    const start = await createDaemon({
      stateDir: join(tempDir('syzygy-poc-surface-state-'), 'state'),
      routes: pocRoutes(() => model),
      port: 0,
    });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    running.push(start.daemon);
    const baseUrl = `http://${start.daemon.host}:${start.daemon.port}`;

    const pages = await Promise.all(
      ['/', POLARIS_HUMAN_PATH, TRAJECTORY_HUMAN_PATH, ORRERY_HUMAN_PATH].map(async (path) => ({
        path,
        html: await (await fetch(`${baseUrl}${path}`)).text(),
      })),
    );

    const counts = pages.map(({ path, html }) => ({ path, counts: verifyEncodingPopulation(html, path !== '/') }));
    const surfaces = counts.filter(({ path }) => path !== '/');
    expect(surfaces).toHaveLength(3);
    const total = surfaces.reduce((sum, page) => sum + Object.values(page.counts).reduce((a, b) => a + b, 0), 0);
    expect(total).toBeGreaterThan(80);
    expect(surfaces.find(({ path }) => path === POLARIS_HUMAN_PATH)?.counts.tuple).toBeGreaterThan(40);
    expect(counts.find(({ path }) => path === '/')?.counts.badge).toBeGreaterThan(0);
  });

  it.skipIf(browserExecutable === undefined)('counts the post-JavaScript DOM on all three served surfaces and kills an unmarked Orrery region', async () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    if (model.orrery.kind !== 'observed' || model.orrery.unmappedFileCount < 1) throw new Error('fixture needs an unmapped Orrery region');
    const start = await createDaemon({
      stateDir: join(tempDir('syzygy-poc-runtime-state-'), 'state'),
      routes: pocRoutes(() => model),
      port: 0,
    });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    running.push(start.daemon);
    const baseUrl = `http://${start.daemon.host}:${start.daemon.port}`;
    const directory = tempDir('syzygy-poc-runtime-pages-');
    await withBrowserPage(browserExecutable as string, async page => {
      let total = 0;
      let serverTotal = 0;
      for (const form of ['direct', 'tailnet'] as const) {
        for (const path of [POLARIS_HUMAN_PATH, TRAJECTORY_HUMAN_PATH, ORRERY_HUMAN_PATH]) {
          const response = form === 'direct' ? await fetch(`${baseUrl}${path}`)
            : await fetchWithHost(`${baseUrl}${path}`, TAILNET_HOST, { origin: `https://${TAILNET_HOST}` });
          expect(response.status).toBe(200);
          const html = await response.text();
          const server = verifyEncodingPopulation(html);
          const file = join(directory, `${form}-${path.slice(1)}.html`);
          writeFileSync(file, html);
          await page.navigate(pathToFileURL(file).href);
          const runtime = await browserEncodingCensus(page);
          verifyRuntimeCensus(server, runtime, path === ORRERY_HUMAN_PATH);
          total += Object.values(runtime.query).reduce((a, b) => a + b, 0);
          serverTotal += Object.values(server).reduce((a, b) => a + b, 0);
          if (path !== ORRERY_HUMAN_PATH) continue;
          expect(runtime.unmapped).toBe(1);
          expect(runtime.query.disclosure).toBe(server.disclosure + 1);
          const oldFragment = 'unmapped.dataset.unknownDisclosure = data.unmappedRegionEntityId;';
          expect(html).toContain(oldFragment);
          const mutant = html.replace(oldFragment, '');
          const mutantFile = join(directory, `${form}-orrery-unmarked.html`);
          writeFileSync(mutantFile, mutant);
          await page.navigate(pathToFileURL(mutantFile).href);
          const unmarked = await browserEncodingCensus(page);
          expect(() => verifyRuntimeCensus(server, unmarked, true)).toThrow();
          expect(unmarked.unmapped).toBe(1);
          expect(unmarked.markedUnmapped).toBe(0);
          // M4 slice 1: a marked block that drops its closed reason fails too.
          const reasonFragment = 'unmapped.dataset.unknownReason = known.reason;';
          expect(html).toContain(reasonFragment);
          const reasonlessFile = join(directory, `${form}-orrery-reasonless.html`);
          writeFileSync(reasonlessFile, html.replace(reasonFragment, ''));
          await page.navigate(pathToFileURL(reasonlessFile).href);
          const reasonless = await browserEncodingCensus(page);
          expect(() => verifyRuntimeCensus(server, reasonless, true)).toThrow();
          expect(reasonless.markedUnmapped).toBe(0);
        }
      }
      expect(total).toBe(serverTotal + 2);
    });
  }, 45_000); // timed out at the 5 s default in 4 of 5 full-suite runs at load1 38-71 (docs/evidence/syzygy-bpyt-4-31/full-runs.json), and took up to 5.1 s in 5 alone runs at load1 30-37 (docs/evidence/syzygy-bpyt-4-31/head-durations/surface-routes.test.tests.json)

  it.each([
    ['wrong Unknown token', (html: string) => html.replace('color: var(--unknown);', 'color: var(--observed);')],
    ['missing Unknown symbol', (html: string) => html.replace('content: "? ";', 'content: "";')],
    ['missing badge selector', (html: string) => html.replace('.epistemic.epistemic-observed, ', '')],
    ['missing local tuple selector', (html: string) => html.replace('.claim-tuple[data-epistemic-label="Observed"] { color:', '.missing-tuple { color:')],
    ['missing Unknown disclosure selector', (html: string) => html.replace(', [data-unknown-disclosure] { color:', ' { color:')],
    ['ad hoc inline tuple color', (html: string) => html.replace('class="claim-tuple"', 'class="claim-tuple" style="color:red"')],
    ['epistemic token outside the three families', (html: string) => html.replace('</style>', '.rogue { color: var(--unknown); }</style>')],
  ] as const)('rejects %s', (_name, mutate) => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    const html = renderPolarisPage(model);
    expect(verifyEncodingPopulation(html).tuple).toBeGreaterThan(40);
    const mutant = mutate(html);
    expect(mutant).not.toBe(html);
    expect(() => verifyEncodingPopulation(mutant)).toThrow();
  });

  it('rejects a checker that drops any one family or substitutes page count for element count', () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    const html = renderPolarisPage(model);
    const counts = verifyEncodingPopulation(html);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBeGreaterThan(1);
    for (const family of ['badge', 'tuple', 'disclosure'] as const) {
      expect(counts[family]).toBeGreaterThan(0);
      expect(() => verifyEncodingPopulation(html, true, family)).toThrow();
    }
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).not.toBe(1);
  });

  it('resolves a tuple without a local label from its nearest declaring scope', () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    const html = renderPolarisPage(model);
    const hoisted = html.replace(
      /<p class="tuple-line"([^>]*)><span class="claim-tuple"([^>]*) data-epistemic-label="Observed"/,
      '<p class="tuple-line" data-epistemic-scope-label="Observed"$1><span class="claim-tuple"$2',
    );
    expect(hoisted).not.toBe(html);
    expect(verifyEncodingPopulation(hoisted)).toEqual(verifyEncodingPopulation(html));
    const nested = hoisted.replace(/(<p class="tuple-line" data-epistemic-scope-label="Observed"[^>]*>[^<]*<span class="claim-tuple"[^>]*>[\s\S]*?<\/span><\/p>)/, '<div data-epistemic-scope-label="Unknown">$1</div>');
    expect(nested).not.toBe(hoisted);
    expect(verifyEncodingPopulation(nested)).toEqual(verifyEncodingPopulation(html));
  });

  it('serves the exact state-(1) authority sentence on Polaris both directly and through the tailnet Host mount (PWB-REQ-005; PWB-RECON-01)', async () => {
    const sentence = "Owner-trusted only; same-tree forgeable from Syzygy&#39;s perspective. Digest detects drift, not authorship or attendance.";
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    if (model.projectShape.kind !== 'observed') throw new Error(`fixture shape is ${model.projectShape.kind}`);
    const start = await createDaemon({
      stateDir: join(tempDir('syzygy-poc-surface-state-'), 'state'),
      routes: pocRoutes(() => model),
      port: 0,
    });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    running.push(start.daemon);
    const baseUrl = `http://${start.daemon.host}:${start.daemon.port}`;
    const direct = await (await fetch(`${baseUrl}${POLARIS_HUMAN_PATH}`)).text();
    const mounted = await (await fetchWithHost(`${baseUrl}${POLARIS_HUMAN_PATH}`, TAILNET_HOST, { origin: `https://${TAILNET_HOST}` })).text();
    for (const html of [direct, mounted]) {
      const sentences = Array.from(html.matchAll(/data-parity-field="authority-disclosure"[^>]*>([^<]*)</g), (match) => match[1]);
      expect(sentences).toEqual([sentence, sentence, sentence]);
    }
  });

  it('nav links stay inside the current mount — root-relative for direct loopback access, prefixed for the tailnet-Host-headered request `tailscale serve` actually forwards', async () => {
    // `tailscale serve --set-path` strips the mount prefix from the
    // forwarded path (verified empirically — see tailnet.ts), so the
    // signal this test exercises is the Host header, never the request
    // path: every tailnet-routed request the daemon ever actually
    // receives arrives at one of the plain (unprefixed) paths below, with
    // Host set to the tailnet hostname.
    const model = buildFixtureModel(cleanups);
    const start = await createDaemon({
      stateDir: join(tempDir('syzygy-poc-surface-state-'), 'state'),
      routes: pocRoutes(() => model),
      port: 0,
    });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    running.push(start.daemon);
    const baseUrl = `http://${start.daemon.host}:${start.daemon.port}`;

    function navHrefs(html: string): string[] {
      const nav = html.match(/<nav class="site-nav" aria-label="Three-surface POC sections">.*?<\/nav>/s)?.[0] ?? '';
      return [...nav.matchAll(/href="([^"]*)"/g)].map((match) => match[1] ?? '');
    }

    const paths = [POC_HUMAN_PATH, POLARIS_HUMAN_PATH, TRAJECTORY_HUMAN_PATH, ORRERY_HUMAN_PATH];
    for (const path of paths) {
      const directHtml = await (await fetch(`${baseUrl}${path}`)).text();
      const directHrefs = navHrefs(directHtml);
      expect(directHrefs.length).toBeGreaterThan(0);
      for (const href of directHrefs) {
        expect(href.startsWith(TAILNET_MOUNT_PREFIX)).toBe(false);
      }

      const tailnetHtml = await (
        await fetchWithHost(`${baseUrl}${path}`, TAILNET_HOST, { origin: `https://${TAILNET_HOST}` })
      ).text();
      const tailnetHrefs = navHrefs(tailnetHtml);
      expect(tailnetHrefs.length).toBeGreaterThan(0);
      for (const href of tailnetHrefs) {
        expect(href.startsWith(TAILNET_MOUNT_PREFIX)).toBe(true);
      }
    }
  });
});
