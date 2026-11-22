import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { figureFit, type FigureLayout } from './figure-fit.js';

// Figure fit (syzygy-3efd.20; dossier figure homes and fit 2.2). Expected values are literals worked by hand from the stated constants:
// columns 966 px at 1440 and 261 px at 390, 13 px text, an 11 px minimum, and the one shrinking width 1048 px with its 860 px floor.
const figure = (id: string, kind = 'produced') => ({ id, title: id, kind: 'flow', relationship: 'Order.', disposition: kind === 'produced' ? { kind, assetIds: [id] } : { kind, reason: 'Later.', citations: [] },
  nodes: [{ id: `${id}-a`, label: 'A', epistemic: 'inferred', citations: [] }, { id: `${id}-b`, label: 'B', epistemic: 'observed', citations: [] }],
  edges: [{ id: `${id}-e`, from: `${id}-a`, to: `${id}-b`, label: 'calls', epistemic: 'inferred', citations: [] }] });
/** A layout that reads each figure's width from its first node's identity's prefix: `w240-…` lays out 240 px wide. */
const firstId = (shape: Parameters<FigureLayout>[0]): string => ('nodes' in shape ? shape.nodes[0]!.id : '');
const byName: FigureLayout = (shape) => Number(/^w(\d+)-/u.exec(firstId(shape))![1]);
const draft = (...diagrams: unknown[]) => ({ diagrams });
const HEAD = { textPx: 13, minTextPx: 11, viewports: [{ viewportPx: 1440, columnPx: 966 }, { viewportPx: 390, columnPx: 261 }] };

describe('figure fit (syzygy-3efd.20)', () => {
  it('reports nothing for a figure that fits both columns, and counts it examined', () => {
    expect(figureFit(draft(figure('w240')), byName)).toEqual({ ...HEAD, examined: 1, entries: [] });
    expect(figureFit(draft(figure('w261')), byName)).toEqual({ ...HEAD, examined: 1, entries: [] });
  });

  it('reports a figure wider than the phone column at 390 px only, drawn at its own width', () => {
    expect(figureFit(draft(figure('w262')), byName).entries).toEqual([
      { diagram: 'w262', viewportPx: 390, laidOutPx: 262, drawnPx: 262, columnPx: 261, textPx: 13, minTextPx: 11, failed: ['width'] }]);
  });

  it('reports the shrinking three-column width at 390 px for both rules, and fits it at 1440 px', () => {
    expect(figureFit(draft(figure('w1048')), byName).entries).toEqual([
      { diagram: 'w1048', viewportPx: 390, laidOutPx: 1048, drawnPx: 860, columnPx: 261, textPx: 10.67, minTextPx: 11, failed: ['width', 'text-size'] }]);
  });

  it('reports a figure wider than both columns that does not shrink, at both viewports, in viewport order', () => {
    expect(figureFit(draft(figure('w1200')), byName).entries).toEqual([
      { diagram: 'w1200', viewportPx: 1440, laidOutPx: 1200, drawnPx: 1200, columnPx: 966, textPx: 13, minTextPx: 11, failed: ['width'] },
      { diagram: 'w1200', viewportPx: 390, laidOutPx: 1200, drawnPx: 1200, columnPx: 261, textPx: 13, minTextPx: 11, failed: ['width'] }]);
  });

  it('examines produced figures only, keeps the draft order, and lists an unlaid figure once as Unknown in its place', () => {
    const failing: FigureLayout = (shape) => { if (firstId(shape).startsWith('w0-')) throw new Error('no layout'); return byName(shape); };
    expect(figureFit(draft(figure('w300'), figure('w100', 'unresolved'), figure('w0'), figure('w262')), failing)).toEqual({ ...HEAD, examined: 3, entries: [
      { diagram: 'w300', viewportPx: 390, laidOutPx: 300, drawnPx: 300, columnPx: 261, textPx: 13, minTextPx: 11, failed: ['width'] },
      { diagram: 'w0', unknown: 'the figure could not be laid out' },
      { diagram: 'w262', viewportPx: 390, laidOutPx: 262, drawnPx: 262, columnPx: 261, textPx: 13, minTextPx: 11, failed: ['width'] }] });
  });

  it('lists every produced figure Unknown when no layout is supplied: Unknown, never fitting', () => {
    expect(figureFit(draft(figure('w240'), figure('w100', 'unresolved')), undefined)).toEqual({ ...HEAD, examined: 1, entries: [
      { diagram: 'w240', unknown: 'no figure layout was supplied to this check, so its width is not known' }] });
  });

  it('treats a non-finite or non-positive width as Unknown', () => {
    for (const width of [Number.NaN, 0, -5, Number.POSITIVE_INFINITY]) {
      expect(figureFit(draft(figure('w1')), () => width).entries).toEqual([{ diagram: 'w1', unknown: 'the figure could not be laid out' }]);
    }
  });

  it('hands the layout the figure\'s nodes and edges as the draft states them', () => {
    const seen: unknown[] = [];
    figureFit(draft(figure('w240')), (shape) => { seen.push(shape); return 240; });
    expect(seen).toEqual([{ nodes: [{ id: 'w240-a', label: 'A', epistemic: 'inferred' }, { id: 'w240-b', label: 'B', epistemic: 'observed' }],
      edges: [{ id: 'w240-e', from: 'w240-a', to: 'w240-b', label: 'calls', epistemic: 'inferred' }] }]);
  });

  it('is the same bytes for the same draft', () => {
    const doc = draft(figure('w1048'), figure('w262'), figure('w240'));
    expect(JSON.stringify(figureFit(JSON.parse(JSON.stringify(doc)), byName))).toBe(JSON.stringify(figureFit(doc, byName)));
  });

  it('examines nothing in a draft with no diagrams or a malformed diagrams member', () => {
    for (const doc of [{}, { diagrams: 'x' }, { diagrams: [null, 3, { id: 'x' }] }, null]) expect(figureFit(doc, byName)).toEqual({ ...HEAD, examined: 0, entries: [] });
  });
});

// Figure kinds (REQ-polaris-generation-034 version 2.5, syzygy-3efd.30): a sequence or swimlane shows its drawing where W <= C and its phone
// form otherwise, at 13 px either way, so it fits at 1440 and 390 and has no entry. The layout here returns the spec's W = 40 + 184 n.
describe('figure fit: sequence and swimlane (syzygy-3efd.30)', () => {
  const V7 = 'polaris-dossier-local-draft-v7';
  const el = (id: string) => ({ id, label: id, epistemic: 'inferred', citations: [] });
  const produced = { kind: 'produced', assetIds: [] };
  const sequence = (id: string, n: number) => ({ id, kind: 'sequence', disposition: produced, participants: Array.from({ length: n }, (_, i) => el(`${id}-p${i}`)),
    messages: [{ ...el(`${id}-m`), from: `${id}-p0`, to: `${id}-p1` }] });
  const swimlane = (id: string, n: number) => ({ id, kind: 'swimlane', disposition: produced, lanes: Array.from({ length: n }, (_, i) => el(`${id}-l${i}`)),
    steps: [{ ...el(`${id}-s0`), lane: `${id}-l0` }, { ...el(`${id}-s1`), lane: `${id}-l1` }] });
  const seen: unknown[] = [];
  const columns: FigureLayout = (shape) => {
    seen.push(shape);
    if (shape.kind === 'sequence') return 40 + 184 * shape.participants.length;
    if (shape.kind === 'swimlane') return 40 + 184 * shape.lanes.length;
    throw new Error('graph');
  };
  const v7 = (...diagrams: unknown[]) => ({ schemaVersion: V7, diagrams });

  it('reports no entry for figures 408 to 960 px wide, the drawing at 1440 px and the phone form at 390 px', () => {
    expect(figureFit(v7(sequence('a', 2), sequence('b', 5), swimlane('c', 3), swimlane('d', 4)), columns)).toEqual({ ...HEAD, examined: 4, entries: [] });
  });

  it('hands the layout the figure\'s own members, in draft order', () => {
    seen.length = 0;
    figureFit(v7(swimlane('c', 2)), columns);
    expect(seen).toEqual([{ kind: 'swimlane', lanes: [{ id: 'c-l0', label: 'c-l0', epistemic: 'inferred' }, { id: 'c-l1', label: 'c-l1', epistemic: 'inferred' }],
      steps: [{ id: 'c-s0', label: 'c-s0', epistemic: 'inferred', lane: 'c-l0' }, { id: 'c-s1', label: 'c-s1', epistemic: 'inferred', lane: 'c-l1' }] }]);
  });

  it('lists Unknown a figure with a member its kind does not take, a missing member, a count out of bounds, or a layout that throws', () => {
    const { messages: _messages, ...noMessages } = sequence('b', 2);
    const throwing: FigureLayout = () => { throw new Error('unknown-node'); };
    expect(figureFit(v7({ ...sequence('a', 2), nodes: [] }, noMessages, sequence('c', 6), swimlane('d', 1)), columns).entries).toEqual([
      { diagram: 'a', unknown: 'the figure could not be laid out' }, { diagram: 'b', unknown: 'the figure could not be laid out' },
      { diagram: 'c', unknown: 'the figure could not be laid out' }, { diagram: 'd', unknown: 'the figure could not be laid out' }]);
    expect(figureFit(v7(sequence('e', 2)), throwing).entries).toEqual([{ diagram: 'e', unknown: 'the figure could not be laid out' }]);
  });

  it('lays out a sequence in a v6 draft as a graph, as version 2.4 does', () => {
    seen.length = 0;
    expect(figureFit({ schemaVersion: 'polaris-dossier-local-draft-v6', diagrams: [sequence('a', 2)] }, columns).entries).toEqual([{ diagram: 'a', unknown: 'the figure could not be laid out' }]);
    expect(seen).toEqual([{ nodes: [], edges: [] }]);
  });

  // The site's own layout, loaded by file URL as the synthetic-shapes tests load it, so this package keeps no build edge to the app.
  let siteLayout: FigureLayout;
  beforeAll(async () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    siteLayout = ((await import(pathToFileURL(path.join(root, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href)) as { figureLaidOutWidth: FigureLayout }).figureLaidOutWidth;
  });

  it('with the site\'s layout: a three-participant sequence and a three-lane swimlane fit both viewports; an unknown participant is Unknown', () => {
    const three = sequence('a', 3);
    const fitting = { ...three, messages: [...three.messages, { ...el('a-m2'), from: 'a-p1', to: 'a-p2' }] };
    const lanes = swimlane('b', 3);
    const allLanes = { ...lanes, steps: [...lanes.steps, { ...el('b-s2'), lane: 'b-l2' }] };
    expect(figureFit(v7(fitting, allLanes), siteLayout)).toEqual({ ...HEAD, examined: 2, entries: [] });
    expect(figureFit(v7({ ...fitting, messages: [{ ...el('a-m9'), from: 'a-p0', to: 'a-p9' }] }), siteLayout).entries).toEqual([{ diagram: 'a', unknown: 'the figure could not be laid out' }]);
  });
});
