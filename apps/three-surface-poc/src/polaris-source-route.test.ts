// The exact-source route (PWB-REQ-011 as amended; RFC7-1, RFC7-13):
// `/polaris/source?identity=<repo@rev:path#oid>` renders requirement and
// scenario text byte-for-byte from the one Git object the signed population
// names, or an Unknown with its reason and nothing else. The route is
// authenticated by revision and digest, not by bearer: it is human-open like
// `/polaris`, refuses browser origins the same way, rebinds under the
// tailnet mount and is bounded by the human response ceiling.
//
// Bead syzygy-1z3.24.5 (PWB-LIVE-06, PWB-LIVE-11, PWB-LIVE-13).

import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDaemon, escapeHtml, type RunningDaemon } from '@syzygy/http-host';
import { tempDir } from '@syzygy/test-kit';
import { PWB_RESOURCE_LIMITS, type PocModel, type ProjectShape } from '@syzygy/three-surface-poc-core';

import { TAILNET_HOST } from './browser-origin.js';
import { exactSourceIdentities, renderPolarisPage } from './polaris.js';
import { POLARIS_SOURCE_PATH, POLARIS_SOURCE_TAILNET_PATH, renderPolarisSourcePage, resolveSourceRoute, sourceRouteHref, sourceRouteIdentities, sourceSlug } from './polaris-source.js';
import { pocRoutes } from './routes.js';
import { TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { fetchWithHost } from './test-http-client.js';
import { buildFixtureModel } from './test-model-fixture.js';
import {
  ADMITTING_AUTHORITY,
  PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH,
  PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PURPOSE,
  PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC,
  REJECTING_AUTHORITY,
  SECRET_SENTINEL,
  UNREADABLE_GIT,
  forgedBlobGit,
  projectShapeFixtureGit,
} from './test-project-shape-fixture.js';
import { verbatimRouteReader } from './verbatim-route.js';

const cleanups: string[] = [];
const running: RunningDaemon[] = [];

afterEach(async () => {
  for (const daemon of running.splice(0)) await daemon.close().catch(() => undefined);
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

type Observed = Extract<ProjectShape, { kind: 'observed' }>;

const SPEC_TEXT = PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC[PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH] as string;
/** The same tree, the baseline spec carrying a token the policy excludes. */
const TEXTS_WITH_SECRET_SPEC: Readonly<Record<string, string>> = {
  ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC,
  [PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH]: `${SPEC_TEXT}\nkey AKIA${'B'.repeat(16)} ${SECRET_SENTINEL}\n`,
};

/** A blob reader over the fixture texts: the exact bytes Git would serve. */

function observed(texts: Readonly<Record<string, string>> = PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC): { model: PocModel; shape: Observed; identity: string } {
  const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(texts) } });
  if (model.projectShape.kind !== 'observed') throw new Error(`fixture shape is ${model.projectShape.kind}`);
  const source = model.projectShape.sources.find((candidate) => candidate.path === PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH);
  if (source === undefined) throw new Error('fixture carries no baseline spec');
  return { model, shape: model.projectShape, identity: source.identity };
}

function decode(text: string): string {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function verbatimBlocks(html: string): { title: string; identity: string; text: string }[] {
  return [...html.matchAll(/<pre class="verbatim" data-verbatim-text data-verbatim-requirement="([^"]*)" data-verbatim-identity="([^"]*)"[^>]*>([\s\S]*?)<\/pre>/g)]
    .map((match) => ({ title: decode(match[1] as string), identity: decode(match[2] as string), text: decode(match[3] as string) }));
}

async function startPoc(model: PocModel, limits = PWB_RESOURCE_LIMITS): Promise<{ readonly baseUrl: string; readonly token: string }> {
  const stateDir = tempDir('syzygy-poc-source-route-');
  const start = await createDaemon({
    stateDir: join(stateDir, 'state'),
    routes: pocRoutes(() => model, limits, (m) => ({ verbatim: verbatimRouteReader(m, projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC)) })),
    port: 0,
  });
  if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
  running.push(start.daemon);
  return { baseUrl: `http://${start.daemon.host}:${start.daemon.port}`, token: readFileSync(start.daemon.credentialPath, 'utf8').trim() };
}

describe('Polaris exact-source route (PWB-REQ-011 as amended; RFC7-1, RFC7-13)', () => {
  it('renders each requirement block byte-for-byte from the digest-verified object, escaped, with the identity, the not-authority notice and a keyboard route back to the source row; never the purpose prose', () => {
    const { model, identity } = observed();
    const reader = verbatimRouteReader(model, projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC));
    const html = renderPolarisSourcePage(model, identity, '', { verbatim: reader });

    expect(html).toMatch(/<h1[^>]*>Exact source text<\/h1>/);
    expect(html).toContain('data-verbatim="rendered"');
    expect(html).toContain(`data-source-path="${PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH}"`);
    expect(html).toContain('Polaris is not the authority for this text');
    expect(html).toContain(`<code data-verbatim-identity="${identity}">${identity}</code>`);
    // Hand-typed oracle: the fixture's two blocks, in order, byte-equal.
    const blocks = verbatimBlocks(html);
    expect(blocks.map((block) => block.title)).toEqual(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS.map((requirement) => requirement.title));
    expect(blocks.map((block) => block.text)).toEqual(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS.map((requirement) => requirement.text));
    expect(new Set(blocks.map((block) => block.identity))).toEqual(new Set([identity]));
    // Markdown markers are escaped text, never markup: the raw `**WHEN**`
    // survives and no tag from the source appears unescaped.
    expect(html).toContain('- **WHEN** the owner sends a message');
    expect(html).not.toContain(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PURPOSE);
    expect(html).not.toContain('## Purpose');
    expect(html).toContain(`href="/polaris#polaris-source-${sourceSlug(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH)}"`);
    expect(html).toContain('>Back to its source row</a>');
    expect(html.replace(/<style>[\s\S]*?<\/style>/, '')).not.toContain('data-unknown-disclosure');
  });

  it('is Unknown with a stated reason and no bytes for an identity outside the population, an empty identity, and an unobserved shape', () => {
    const { model, identity } = observed();
    const reader = verbatimRouteReader(model, projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC));

    const foreign = renderPolarisSourcePage(model, 'nobody@0000:openspec/specs/x.md#0000', '', { verbatim: reader });
    expect(foreign).toContain('data-verbatim="not-rendered"');
    expect(foreign).toContain('data-unknown-disclosure="source-route" data-unknown-reason="reference-unresolvable"');
    expect(foreign).toContain('No admitted source of this evaluation carries this identity; nothing was read.');
    expect(foreign).not.toContain('data-verbatim-text');
    expect(foreign).not.toContain('data-source-path=');
    expect(foreign).toContain('href="/polaris#polaris-shape-sources"');

    const empty = renderPolarisSourcePage(model, '', '', { verbatim: reader });
    expect(empty).toContain('data-unknown-reason="reference-unresolvable"');
    expect(empty).toContain('No source identity was named; nothing was read.');
    expect(empty).not.toContain('data-verbatim-identity');
    expect(empty).not.toContain('data-verbatim-text');

    const rejected = buildFixtureModel(cleanups, { projectShape: { authority: REJECTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) } });
    expect(rejected.projectShape.kind).not.toBe('observed');
    const unobserved = renderPolarisSourcePage(rejected, identity, '', { verbatim: reader });
    expect(unobserved).toContain('data-verbatim="not-rendered"');
    expect(unobserved).toContain(`data-unknown-reason="${rejected.projectShape.kind === 'observed' ? '' : 'reasons' in rejected.projectShape.claim.epistemic ? rejected.projectShape.claim.epistemic.reasons.primary : 'unconsented-source-or-provider'}"`);
    expect(unobserved).not.toContain('data-verbatim-text');
    for (const page of [foreign, empty, unobserved]) {
      for (const requirement of PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS) expect(page).not.toContain(requirement.text.split('\n')[2]);
    }
  });

  it('renders nothing when the served bytes do not hash to the exact object, when no reader exists, or when the policy excludes the body — the excluded token never reaches the page', () => {
    const { model, identity } = observed();
    const forged = verbatimRouteReader(model, forgedBlobGit(new TextEncoder().encode(`${SPEC_TEXT}\n<!-- tampered -->\n`)));
    const forgedPage = renderPolarisSourcePage(model, identity, '', { verbatim: forged });
    expect(forgedPage).toContain('data-unknown-reason="reference-unresolvable"');
    expect(forgedPage).toContain('do not hash to this evaluation');
    expect(forgedPage).not.toContain('data-verbatim-text');
    expect(forgedPage).not.toContain('tampered');
    expect(forgedPage).not.toContain('The switchboard SHALL resolve');

    // No reader at all: the leaf stays outside the consented class. A reader
    // whose object store cannot serve the blob: uncaptured, nothing rendered.
    const noReader = renderPolarisSourcePage(model, identity, '', {});
    expect(noReader).toContain('data-unknown-reason="unconsented-source-or-provider"');
    expect(noReader).not.toContain('data-verbatim-text');
    expect(resolveSourceRoute(model, identity, undefined)).toMatchObject({ kind: 'not-rendered', path: PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH, reason: 'unconsented-source-or-provider' });
    const unreadable = renderPolarisSourcePage(model, identity, '', { verbatim: verbatimRouteReader(model, UNREADABLE_GIT) });
    expect(unreadable).toContain('data-unknown-reason="source-uncaptured-or-unreachable"');
    expect(unreadable).not.toContain('data-verbatim-text');

    const secret = observed(TEXTS_WITH_SECRET_SPEC);
    // The baseline spec is admitted path-only at evaluation, so the token is
    // only met at render: the route's own whole-body policy pass must refuse.
    expect(exactSourceIdentities(secret.shape).has(secret.identity)).toBe(true);
    const guarded = verbatimRouteReader(secret.model, projectShapeFixtureGit(TEXTS_WITH_SECRET_SPEC));
    const secretPage = renderPolarisSourcePage(secret.model, secret.identity, '', { verbatim: guarded });
    expect(secretPage).toContain('data-verbatim="not-rendered"');
    expect(secretPage).toContain('data-unknown-reason="excluded-content"');
    expect(secretPage).not.toContain('data-verbatim-text');
    expect(secretPage).not.toContain(SECRET_SENTINEL);
    expect(secretPage).not.toContain('AKIA');
    expect(secretPage).not.toContain('The switchboard SHALL resolve');
    // And the reader is the only path to bytes: without it the same identity
    // is Unknown, never a fall-through to the raw fixture text.
    expect(renderPolarisSourcePage(secret.model, secret.identity)).not.toContain(SECRET_SENTINEL);
  });

  it('links to the route from the page only for admitted baseline-spec identities: each source row, item row, current-authority citation and depth-list dive names the same href', () => {
    const { model, shape, identity } = observed();
    const html = renderPolarisPage(model);
    const linked = sourceRouteIdentities(html);
    expect(linked.length).toBeGreaterThanOrEqual(3);
    // Both fixture baseline specs are admitted and routed; nothing else is.
    const admitted = exactSourceIdentities(model.projectShape);
    expect(admitted.size).toBe(2);
    expect(new Set(linked)).toEqual(admitted);
    expect(linked).toContain(identity);
    expect(sourceRouteHref('', identity)).toBe(`${POLARIS_SOURCE_PATH}?identity=${encodeURIComponent(identity)}`);
    // The href is the one carrier of the identity: it round-trips exactly.
    const anchors = [...html.matchAll(/<a href="([^"]*\/polaris\/source\?identity=[^"]*)"[^>]*>([^<]*)<\/a>/g)];
    expect(anchors.length).toBe(linked.length);
    const pathByIdentity = new Map(shape.sources.map(source => [source.identity, source.path]));
    anchors.forEach((anchor, index) => {
      expect(decode(anchor[1] as string)).toBe(sourceRouteHref('', linked[index] as string));
      expect(anchor[2]).toBe(`Exact text — ${pathByIdentity.get(linked[index] as string)}`);
    });
    // The source row, the item rows of the baseline spec, and the depth list.
    const sourceRow = html.slice(html.indexOf(`id="polaris-source-${sourceSlug(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH)}"`));
    expect(sourceRouteIdentities(sourceRow.slice(0, sourceRow.indexOf('</tr>')))).toEqual([identity]);
    expect(html).toMatch(/data-depth-source="[^"]+"/);
    // No other source (the root index, the layer indexes) is routed: a tree
    // with no baseline spec carries no route link at all.
    const withoutSpecs = Object.fromEntries(Object.entries(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC).filter(([path]) => !path.startsWith('openspec/specs/')));
    const withoutSpec = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(withoutSpecs) } });
    expect(withoutSpec.projectShape.kind).toBe('observed');
    expect(exactSourceIdentities(withoutSpec.projectShape).size).toBe(0);
    expect(sourceRouteIdentities(renderPolarisPage(withoutSpec))).toEqual([]);
  });

  it('reads back every identity character the href can carry, under both mounts', () => {
    // Round trip through the exact renderer chain: percent-encode, then
    // HTML-escape the attribute (an apostrophe survives encodeURIComponent
    // and is escaped as &#39; — the reader must unescape before decoding).
    const identities = ["a'b", 'a&b', 'a#b', 'a%b', 'a+b', 'a@b', 'a b', 'a"b', 'a<b>c', 'path/with/ü.md', 'openspec/specs/x/spec.md@abc:7'];
    const html = identities.map((identity) => `<a href="${escapeHtml(sourceRouteHref('', identity))}">x</a>`).join('') + identities.map((identity) => `<a href="${escapeHtml(sourceRouteHref(TAILNET_MOUNT_PREFIX, identity))}">y</a>`).join('');
    expect(sourceRouteIdentities(html)).toEqual([...identities, ...identities]);
  });

  it('serves the route human-open: direct GET renders the text, the tailnet Host rebinds the back link, a browser origin off the allow-list gets 403 and nothing, a script in the identity is escaped, and the human ceiling fails closed', async () => {
    const { model, identity } = observed();
    const { baseUrl } = await startPoc(model);
    const url = `${baseUrl}${sourceRouteHref('', identity)}`;

    const direct = await fetch(url);
    expect(direct.status).toBe(200);
    expect(direct.headers.get('content-type')).toBe('text/html; charset=utf-8');
    const html = await direct.text();
    expect(verbatimBlocks(html).map((block) => block.text)).toEqual(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS.map((requirement) => requirement.text));
    expect(html).toContain('href="/polaris#polaris-source-');

    const tailnet = await fetchWithHost(`${baseUrl}${sourceRouteHref(TAILNET_MOUNT_PREFIX, identity)}`, TAILNET_HOST);
    expect(tailnet.status).toBe(200);
    const tailnetHtml = await tailnet.text();
    expect(tailnetHtml).toContain(`href="${TAILNET_MOUNT_PREFIX}/polaris#polaris-source-`);
    expect(verbatimBlocks(tailnetHtml).length).toBe(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS.length);
    expect(POLARIS_SOURCE_TAILNET_PATH).toBe(`${TAILNET_MOUNT_PREFIX}${POLARIS_SOURCE_PATH}`);

    const rebound = await fetch(url, { headers: { host: 'poc.attacker.invalid', origin: 'http://poc.attacker.invalid' } });
    expect(rebound.status).toBe(403);
    expect(await rebound.json()).toEqual({ served: 'nothing', reason: 'browser-origin-refused' });

    const hostile = '<script>alert(1)</script>';
    const escaped = await (await fetch(`${baseUrl}${sourceRouteHref('', hostile)}`)).text();
    expect(escaped).not.toContain(hostile);
    expect(escaped).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escaped).toContain('data-unknown-reason="reference-unresolvable"');

    const tiny = await startPoc(model, { ...PWB_RESOURCE_LIMITS, maxHumanResponseBytes: 64 });
    const bounded = await fetch(`${tiny.baseUrl}${sourceRouteHref('', identity)}`);
    expect(bounded.status).toBe(503);
    expect(await bounded.json()).toMatchObject({ served: 'nothing', failure: 'response-limit-breached', limit: 'maxHumanResponseBytes' });
  });
});
