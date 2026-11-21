import { describe, expect, it } from 'vitest';
import { figureFit, type FigureLayout } from './figure-fit.js';

// Figure fit (syzygy-3efd.20; dossier figure homes and fit 2.2). Expected values are literals worked by hand from the stated constants:
// columns 966 px at 1440 and 261 px at 390, 13 px text, an 11 px minimum, and the one shrinking width 1048 px with its 860 px floor.
const figure = (id: string, kind = 'produced') => ({ id, title: id, kind: 'flow', relationship: 'Order.', disposition: kind === 'produced' ? { kind, assetIds: [id] } : { kind, reason: 'Later.', citations: [] },
  nodes: [{ id: `${id}-a`, label: 'A', epistemic: 'inferred', citations: [] }, { id: `${id}-b`, label: 'B', epistemic: 'observed', citations: [] }],
  edges: [{ id: `${id}-e`, from: `${id}-a`, to: `${id}-b`, label: 'calls', epistemic: 'inferred', citations: [] }] });
/** A layout that reads each figure's width from its first node's identity's prefix: `w240-…` lays out 240 px wide. */
const byName: FigureLayout = (shape) => Number(/^w(\d+)-/u.exec(shape.nodes[0]!.id)![1]);
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
    const failing: FigureLayout = (shape) => { if (shape.nodes[0]!.id.startsWith('w0-')) throw new Error('no layout'); return byName(shape); };
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
