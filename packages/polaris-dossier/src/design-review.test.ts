import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { withoutReviewStatusRegion } from '@syzygy/polaris-generation-core';
import { buildDesignPacket, outsideRegion, readLatestSite } from './design-review.js';
import { tempDir } from '@syzygy/test-kit';

// syzygy-qkea.10 (S9b): the design packet's pure parts. Pages are literals written here; the end-to-end scenario runs in render.test.ts.

const OPEN = '<aside class="review-status" data-review-status-region="review-status" aria-label="Review status">';
const page = (body: string, region = `${OPEN}<h2>Review status</h2><ul><li>Fidelity review: none counts.</li></ul></aside>`): string =>
  `<!doctype html><html><body><main>${body}${region}</main></body></html>`;
const machine = (reviewStatus: unknown): string => `${JSON.stringify({ format: 'polaris-dossier-local-machine-view/1', title: 'Kestrel', reviewStatus, pages: ['index.html'] }, null, 2)}\n`;

describe('the review-status region', () => {
  it('is removed whole, and only when the page holds exactly one', () => {
    expect(withoutReviewStatusRegion(page('<p>Body.</p>'))).toBe('<!doctype html><html><body><main><p>Body.</p></main></body></html>');
    expect(withoutReviewStatusRegion(page('<p>Body.</p>', ''))).toBeUndefined();
    expect(withoutReviewStatusRegion(page('<p>Body.</p>', `${OPEN}</aside>${OPEN}</aside>`))).toBeUndefined();
    expect(withoutReviewStatusRegion(page('<p>Body.</p>', `${OPEN}<ul>`))).toBeUndefined();
    // A look-alike with other attributes is not the region.
    expect(withoutReviewStatusRegion(page('', '<aside class="review-status">x</aside>'))).toBeUndefined();
    // Only the first </aside> after the opening tag closes it; an aside after the region stays.
    expect(withoutReviewStatusRegion(page('', `${OPEN}a</aside><aside>b</aside>`))).toBe('<!doctype html><html><body><main><aside>b</aside></main></body></html>');
  });
});

describe('outsideRegion and buildDesignPacket', () => {
  const site = (region: string, status: unknown): Map<string, string> => new Map([
    ['index.html', page('<p>Overview.</p>', region)], ['sources/a.html', page('<p>A.</p>', region)], ['dossier.json', '{"pages":[]}\n'], ['machine.json', machine(status)],
  ]);
  const input = (files: ReadonlyMap<string, string>) => ({ run: '/state/run-x', runId: 'run-x', pinnedRevision: 'a'.repeat(40), files });

  it('gives the same packet for two renders that differ only in the region and the machine view\'s reviewStatus', () => {
    const one = buildDesignPacket(input(site(`${OPEN}<ul><li>none</li></ul></aside>`, [{ id: 'review-status/design', text: 'none' }])));
    const two = buildDesignPacket(input(site(`${OPEN}<ul><li>one counts, at length</li></ul></aside>`, [{ id: 'review-status/design', text: 'one counts' }])));
    if (!one.ok || !two.ok) throw new Error('packet refused');
    expect(two.sha256).toBe(one.sha256);
    expect(one.pages).toEqual(['index.html', 'sources/a.html']);
    expect(one.files).toEqual(['dossier.json', 'index.html', 'machine.json', 'sources/a.html']);
    const packet = JSON.parse(one.bytes);
    expect(packet.files.find((file: { path: string }) => file.path === 'machine.json').content).toBe(`${JSON.stringify({ format: 'polaris-dossier-local-machine-view/1', title: 'Kestrel', pages: ['index.html'] }, null, 2)}\n`);
    expect(packet).toMatchObject({ format: 'polaris-dossier-design-packet/1', kind: 'design', runId: 'run-x', pinnedRevision: 'a'.repeat(40) });
  });

  it('changes the packet for a change outside the region on any file', () => {
    const base = buildDesignPacket(input(site(`${OPEN}</aside>`, [])));
    for (const [file, change] of [['index.html', (t: string) => t.replace('Overview.', 'Overview!')], ['dossier.json', (t: string) => t.replace('[]', '[1]')], ['machine.json', (t: string) => t.replace('Kestrel', 'Kestrel.')]] as const) {
      const files = site(`${OPEN}</aside>`, []);
      files.set(file, change(files.get(file)!));
      const changed = buildDesignPacket(input(files));
      expect(changed.ok && base.ok && changed.sha256 !== base.sha256, file).toBe(true);
    }
  });

  it('refuses a page without its region, a machine view without the member or out of the renderer\'s form, and a site with no machine view', () => {
    const noRegion = site(`${OPEN}</aside>`, []);
    noRegion.set('sources/a.html', page('<p>A.</p>', ''));
    expect(outsideRegion(noRegion)).toEqual({ ok: false, reason: 'sources/a.html does not hold exactly one review-status region' });
    const noMember = site(`${OPEN}</aside>`, []);
    noMember.set('machine.json', '{"title":"Kestrel"}\n');
    expect(outsideRegion(noMember)).toEqual({ ok: false, reason: 'machine.json is not a machine view with a reviewStatus member' });
    const compact = site(`${OPEN}</aside>`, []);
    compact.set('machine.json', `${JSON.stringify(JSON.parse(machine([])))}\n`);
    expect(outsideRegion(compact)).toEqual({ ok: false, reason: 'machine.json is not in the renderer\'s serialization' });
    const noMachine = site(`${OPEN}</aside>`, []);
    noMachine.delete('machine.json');
    expect(outsideRegion(noMachine)).toEqual({ ok: false, reason: 'the site has no machine.json' });
    expect(buildDesignPacket(input(noRegion))).toEqual({ ok: false, stage: 'region', reason: 'sources/a.html does not hold exactly one review-status region' });
  });
});

describe('readLatestSite', () => {
  const run = (): string => {
    const dir = tempDir('dossier-design-site-');
    return dir;
  };
  const write = (file: string, text: string | Uint8Array): void => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

  it('reads the highest-numbered site whole, by path within it, and nothing beside it', () => {
    const dir = run();
    write(path.join(dir, 'site', '2', 'index.html'), 'two');
    write(path.join(dir, 'site', '10', 'index.html'), 'ten');
    write(path.join(dir, 'site', '10', 'sources', 'a.html'), 'a');
    write(path.join(dir, 'site', '.partial-ab', 'index.html'), 'partial');
    const read = readLatestSite(dir);
    expect(read).toMatchObject({ ok: true, number: 10, directory: path.join(dir, 'site', '10') });
    expect(read.ok && [...read.files]).toEqual([['index.html', 'ten'], ['sources/a.html', 'a']]);
  });

  it('refuses no site, a file the renderer would not write, and text that is not UTF-8', () => {
    const dir = run();
    expect(readLatestSite(dir)).toMatchObject({ ok: false });
    fs.mkdirSync(path.join(dir, 'site'));
    expect(readLatestSite(dir)).toEqual({ ok: false, reason: `no site has been rendered: run \`syzygy dossier render ${dir}\` first` });
    write(path.join(dir, 'site', '0', 'index.html'), new Uint8Array([0xff]));
    expect(readLatestSite(dir)).toEqual({ ok: false, reason: 'index.html in site 0 is not UTF-8 text' });
    write(path.join(dir, 'site', '1', 'a\\b.html'), 'x');
    expect(readLatestSite(dir)).toMatchObject({ ok: false, reason: 'a\\b.html in site 1 is not a path the renderer writes' });
  });
});
