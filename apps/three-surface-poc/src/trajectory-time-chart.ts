import { escapeHtml } from '@syzygy/http-host';
import type { DurationMeasure, TrajectoryTimeMeasures } from '@syzygy/three-surface-poc-core';

/**
 * POC-REQ-045 (syzygy-t3jk.17): Trajectory's elapsed-time measures, drawn
 * as two charts (weekly counts, and hours: two units never share an axis)
 * and given again as tables carrying every number the charts draw. No
 * script: hover detail is each mark's SVG <title>. Everything is computed
 * from the served measures, never a render-time clock (POC-REQ-041).
 *
 * Series colours are the dataviz reference palette's dark slots 1 and 2,
 * validated on this page's panel (#0c181b): adjacent CVD ΔE 26.8, normal
 * ΔE 31.8, both >= 3:1. Neither is an epistemic colour (--observed,
 * --unknown); text stays in ink tokens, and each series is direct-labelled.
 */
const ARRIVALS = '#3987e5';
const CLOSURES = '#d95926';

/** The smallest 1, 2 or 5 × 10^k at or above `value` (at least 1). */
function niceMax(value: number): number {
  if (value <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) if (step * magnitude >= value) return step * magnitude;
  return 10 * magnitude;
}

/** Integer ticks from 0 to `max`, at a 1, 2 or 5 × 10^k step (counts and whole hours only). */
function ticksTo(max: number): number[] {
  const step = niceMax(max / 5);
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  return ticks;
}

function fixed(value: number): string {
  return value.toFixed(1);
}

function weeklyChart(measures: TrajectoryTimeMeasures): string {
  const weeks = measures.weeks;
  if (weeks.length === 0) {
    return '<p class="time-empty">No weekly chart: no served item has a valid created or closed instant.</p>';
  }
  const width = 720;
  const height = 260;
  const left = 52;
  const right = 84;
  const top = 16;
  const bottom = 56;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const maxY = niceMax(Math.max(...weeks.map((week) => Math.max(week.arrivals, week.closures))));
  const x = (i: number): number => left + (weeks.length === 1 ? plotW / 2 : (i * plotW) / (weeks.length - 1));
  const y = (v: number): number => top + plotH - (v * plotH) / maxY;
  const ticks = ticksTo(maxY);
  const grid = ticks
    .map((t) => `<line class="tc-grid" x1="${left}" x2="${left + plotW}" y1="${fixed(y(t))}" y2="${fixed(y(t))}"/><text class="tc-tick" x="${left - 6}" y="${fixed(y(t) + 4)}" text-anchor="end">${t}</text>`)
    .join('');
  const labelEvery = Math.max(1, Math.ceil(weeks.length / 6));
  const xTicks = weeks
    .map((week, i) => (i % labelEvery === 0 || i === weeks.length - 1 ? `<text class="tc-tick" x="${fixed(x(i))}" y="${top + plotH + 18}" text-anchor="middle">${escapeHtml(week.week)}</text>` : ''))
    .join('');
  const line = (key: 'arrivals' | 'closures', colour: string): string =>
    `<polyline class="tc-line" data-parity-field="trajectory-time-chart-${key}" fill="none" stroke="${colour}" stroke-width="2" stroke-linejoin="round" points="${weeks.map((week, i) => `${fixed(x(i))},${fixed(y(week[key]))}`).join(' ')}"/>`;
  const last = weeks[weeks.length - 1]!;
  let arrivalsY = y(last.arrivals);
  let closuresY = y(last.closures);
  if (Math.abs(arrivalsY - closuresY) < 14) {
    const mid = (arrivalsY + closuresY) / 2;
    [arrivalsY, closuresY] = last.arrivals >= last.closures ? [mid - 7, mid + 7] : [mid + 7, mid - 7];
  }
  const step = weeks.length === 1 ? plotW : plotW / (weeks.length - 1);
  const hits = weeks
    .map((week, i) => `<rect class="tc-hit" x="${fixed(x(i) - step / 2)}" y="${top}" width="${fixed(step)}" height="${plotH}"><title>${escapeHtml(week.week)}: ${week.arrivals} arrived, ${week.closures} closed</title></rect>`)
    .join('');
  return `<svg class="time-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="tc-weekly-title tc-weekly-desc">
      <title id="tc-weekly-title">Work items arriving and closing per ISO week (UTC)</title>
      <desc id="tc-weekly-desc">${weeks.length} weeks from ${escapeHtml(weeks[0]!.week)} to ${escapeHtml(last.week)}; the weekly table below gives every value.</desc>
      ${grid}
      <line class="tc-axis" x1="${left}" x2="${left + plotW}" y1="${top + plotH}" y2="${top + plotH}"/>
      ${xTicks}
      <text class="tc-axis-title" x="${left + plotW / 2}" y="${height - 8}" text-anchor="middle">ISO week (UTC)</text>
      <text class="tc-axis-title" transform="translate(14 ${top + plotH / 2}) rotate(-90)" text-anchor="middle">Items per week</text>
      ${line('arrivals', ARRIVALS)}${line('closures', CLOSURES)}
      <text class="tc-label" x="${fixed(x(weeks.length - 1) + 8)}" y="${fixed(arrivalsY + 4)}">Arrivals</text>
      <text class="tc-label" x="${fixed(x(weeks.length - 1) + 8)}" y="${fixed(closuresY + 4)}">Closures</text>
      ${hits}
    </svg>`;
}

const DURATION_ROWS = [
  ['leadTime', 'median', 'Lead time, median'],
  ['leadTime', 'p90', 'Lead time, 90th percentile'],
  ['age', 'median', 'Age, median'],
  ['age', 'p90', 'Age, 90th percentile'],
] as const;

function hoursOf(measure: DurationMeasure, which: 'median' | 'p90'): number | null {
  return which === 'median' ? measure.medianHours : measure.p90Hours;
}

function hoursChart(measures: TrajectoryTimeMeasures): string {
  const values = DURATION_ROWS.map(([key, which]) => hoursOf(measures[key], which));
  const width = 720;
  const rowH = 30;
  const left = 190;
  const right = 90;
  const top = 10;
  const plotW = width - left - right;
  const height = top + rowH * DURATION_ROWS.length + 50;
  const maxX = niceMax(Math.max(0, ...values.filter((v): v is number => v !== null)));
  const x = (v: number): number => left + (v * plotW) / maxX;
  const ticks = ticksTo(maxX);
  const plotBottom = top + rowH * DURATION_ROWS.length;
  const grid = ticks
    .map((t) => `<line class="tc-grid" x1="${fixed(x(t))}" x2="${fixed(x(t))}" y1="${top}" y2="${plotBottom}"/><text class="tc-tick" x="${fixed(x(t))}" y="${plotBottom + 16}" text-anchor="middle">${t}</text>`)
    .join('');
  const bars = DURATION_ROWS.map(([key, which, label], i) => {
    const value = values[i]!;
    const cy = top + i * rowH + rowH / 2;
    const name = `<text class="tc-tick" x="${left - 8}" y="${fixed(cy + 4)}" text-anchor="end">${escapeHtml(label)}</text>`;
    if (value === null) return `${name}<text class="tc-label" x="${left + 6}" y="${fixed(cy + 4)}">not measurable (0 covered)</text>`;
    const w = Math.max(x(value) - left, 1);
    return `${name}<rect class="tc-bar" data-parity-field="trajectory-time-chart-${key}-${which}" x="${left}" y="${fixed(cy - 7)}" width="${fixed(w)}" height="14" rx="2"><title>${escapeHtml(label)}: ${value} hours</title></rect><text class="tc-label" x="${fixed(left + w + 6)}" y="${fixed(cy + 4)}">${value} h</text>`;
  }).join('');
  return `<svg class="time-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="tc-hours-title tc-hours-desc">
      <title id="tc-hours-title">Lead time of closed items and age of open items, in hours</title>
      <desc id="tc-hours-desc">Median and 90th percentile by nearest rank, whole hours; the measures table below gives every value with its coverage.</desc>
      ${grid}
      <line class="tc-axis" x1="${left}" x2="${left}" y1="${top}" y2="${plotBottom}"/>
      ${bars}
      <text class="tc-axis-title" x="${left + plotW / 2}" y="${height - 8}" text-anchor="middle">Hours</text>
    </svg>`;
}

function hoursCell(field: string, value: number | null): string {
  return value === null ? `<td data-parity-field="${field}">not measurable</td>` : `<td data-parity-field="${field}">${value}</td>`;
}

function durationRow(field: 'lead' | 'age', label: string, measure: DurationMeasure): string {
  return `<tr><th scope="row">${label}</th><td><span data-parity-field="time-${field}-covered">${measure.covered}</span> of <span data-parity-field="time-${field}-total">${measure.total}</span></td>${hoursCell(`time-${field}-median`, measure.medianHours)}${hoursCell(`time-${field}-p90`, measure.p90Hours)}</tr>`;
}

/** The region: two charts, the measures table and the weekly table. */
export function timeMeasuresRegion(measures: TrajectoryTimeMeasures): string {
  const weeklyRows = measures.weeks
    .map((week) => `<tr data-week="${escapeHtml(week.week)}"><th scope="row">${escapeHtml(week.week)}</th><td data-parity-field="time-week-arrivals">${week.arrivals}</td><td data-parity-field="time-week-closures">${week.closures}</td></tr>`)
    .join('');
  return `<section class="time-measures" id="time-measures" aria-labelledby="time-measures-heading" data-parity-field="trajectory-time-measures">
      <h2 id="time-measures-heading" class="answers-heading">Elapsed time, over every served work item</h2>
      <p class="time-note">Measured from recorded instants only; age runs to the observation's capture instant, <time data-parity-field="time-measured-at" datetime="${escapeHtml(measures.measuredAt)}">${escapeHtml(measures.measuredAt)}</time>. An item whose instants are missing, invalid, without a timezone or reversed is not covered. Each measure stands alone; none is combined into a score. Source: <code data-parity-field="time-source">${escapeHtml(measures.source)}</code>, the tracker's created and closed instants, not checked against version control; evidence class <code data-parity-field="time-evidence-class">${escapeHtml(measures.evidenceClass)}</code>. Elapsed time is the only cost measured here; effort, tokens and money stay Unknown.</p>
      <p class="tc-legend"><span class="tc-swatch" style="background:${ARRIVALS}"></span>Arrivals <span class="tc-swatch" style="background:${CLOSURES}"></span>Closures</p>
      ${weeklyChart(measures)}
      ${hoursChart(measures)}
      <table class="time-table">
        <caption>Lead time and age, whole hours by nearest rank</caption>
        <thead><tr><th scope="col">Measure</th><th scope="col">Items covered</th><th scope="col">Median</th><th scope="col">90th percentile</th></tr></thead>
        <tbody>${durationRow('lead', 'Lead time (closed items, created to closed)', measures.leadTime)}${durationRow('age', 'Age (open items, created to capture)', measures.age)}</tbody>
      </table>
      <p class="time-note">Arrivals: <span data-parity-field="time-arrivals-covered">${measures.arrivals.covered}</span> of <span data-parity-field="time-arrivals-total">${measures.arrivals.total}</span> served items have a valid created instant. Closures: <span data-parity-field="time-closures-covered">${measures.closures.covered}</span> of <span data-parity-field="time-closures-total">${measures.closures.total}</span> closed items have a valid closed instant not before their created instant.</p>
      <details class="time-weeks"><summary>Weekly arrivals and closures, ${measures.weeks.length} weeks</summary>
        <table class="time-table"><thead><tr><th scope="col">ISO week (UTC)</th><th scope="col">Arrivals</th><th scope="col">Closures</th></tr></thead><tbody>${weeklyRows}</tbody></table>
      </details>
    </section>`;
}

export const TIME_MEASURES_STYLE = `
  .time-measures { margin: 0 0 1.5rem; max-width: 96ch; }
  .time-chart { display: block; width: 100%; max-width: 720px; height: auto; margin: .5rem 0; background: var(--panel); }
  .tc-grid { stroke: var(--line); stroke-width: 1; }
  .tc-axis { stroke: var(--muted); stroke-width: 1; }
  .tc-tick { fill: var(--muted); font-family: var(--font-mono); font-size: 11px; }
  .tc-label { fill: var(--ink); font-size: 12px; }
  .tc-axis-title { fill: var(--ink); font-size: 12px; }
  .tc-bar { fill: var(--muted); }
  .tc-hit { fill: transparent; }
  .tc-hit:hover { fill: rgba(223, 233, 231, .06); }
  .tc-legend { font-size: .85rem; margin: .4rem 0 0; }
  .tc-swatch { display: inline-block; width: .9rem; height: .2rem; vertical-align: middle; margin: 0 .3rem 0 .6rem; }
  .tc-swatch:first-child { margin-left: 0; }
  .time-note { color: var(--muted); max-width: 78ch; }
  .time-table { border-collapse: collapse; margin: .5rem 0; font-size: .85rem; }
  .time-table th, .time-table td { border-bottom: 1px solid var(--line); padding: .25rem .6rem; text-align: left; }
  .time-table td { font-family: var(--font-mono); }
  .time-table caption { text-align: left; color: var(--muted); padding-bottom: .3rem; }
  .time-weeks summary { cursor: pointer; }
  .time-weeks summary:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
`;
