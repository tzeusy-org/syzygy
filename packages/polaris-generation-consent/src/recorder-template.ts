/** A recorder's fixed output as a template: the literal text it writes, with a `{slot}` for each value it fills in, and a pattern per
 * slot. A record is in the recorder's form only when the slots read out of it render the template back to the record, byte for byte
 * (R-POLARIS-DOSSIER-GATE-SOURCES-2 finding 2): every fixed line and section is then the recorder's, and a slot the template repeats
 * (a date, an argument) carries the same text each time. */
export interface RecorderTemplate {
  /** The slots read out of `text`, or null when `text` does not have the template's shape. */
  readonly fields: (text: string) => Readonly<Record<string, string>> | null;
  readonly render: (fields: Readonly<Record<string, string>>) => string;
}

const escape = (literal: string): string => literal.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

export function recorderTemplate(template: string, slots: Readonly<Record<string, string>>): RecorderTemplate {
  const parts = template.split(/\{([A-Za-z]+)\}/);   // even indexes literal text, odd indexes slot names
  const seen = new Set<string>();
  let source = '^';
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]!;
    if (i % 2 === 0) { source += escape(part); continue; }
    const pattern = slots[part];
    if (pattern === undefined) throw new Error(`template slot {${part}} has no pattern`);
    const tail = lineReadOnce(parts, i, slots);
    if (tail !== null) {
      const between = escape(parts[i + 1]!), next = parts[i + 2]!;
      source += `(?=[^\\r\\n]*${tail})(?=(?<${part}>${SLOT.line})${between}(?<${next}>${SLOT.line})${tail})\\k<${part}>${between}\\k<${next}>`;
      seen.add(part).add(next);
      i += 2;
      continue;
    }
    source += seen.has(part) ? `\\k<${part}>` : `(?<${part}>${pattern})`;
    seen.add(part);
  }
  const re = new RegExp(`${source}$`, 'u');
  return Object.freeze({
    fields: (text: string) => { const m = re.exec(text); return m === null ? null : Object.freeze({ ...m.groups }); },
    render: (fields: Readonly<Record<string, string>>) => parts.map((part, i) => (i % 2 === 0 ? part : fields[part] ?? '')).join(''),
  });
}

/** The rest of the line after `{x}B{y}` (x at `parts[i]`, B and y the next two parts) as a pattern, when that line is read once; null
 * otherwise. The line is read once when x and y both take `SLOT.line`, neither occurs anywhere else in the template, B holds no CR or
 * LF, and the literal after y holds an LF or ends the template. TAIL, the pattern returned, is that literal up to and including its
 * first LF, or all of it then the end of input, and `recorderTemplate` writes
 *
 *     (?=[^\r\n]*TAIL)(?=(?<x>LINE)B(?<y>LINE)TAIL)\k<x>B\k<y>      in place of      (?<x>LINE)B(?<y>LINE)
 *
 * The plain form lets x end before any B on its line, and after each such end y scans to the end of the line, so a record that failed
 * after a label holding B k times cost about k times its line: the sitting forms' row `| "{label}" | "{description}" |`
 * (syzygy-bpyt.8.21, from R-GP-IMPL-RECORDER-LINE-SLOT-1 note 1).
 *
 * The same answers. Wherever x starts, y holds no line break and TAIL ends at the line's LF or at the end of input, so y ends at the
 * same offset whatever the split, and the template after the line starts there. That template never names x or y, so whether it
 * matches does not depend on the split either. The plain form tries the splits in order, the longest x first, and keeps the first
 * the rest of the template accepts: when the rest matches, that is the first split to reach TAIL, and when it does not, no split
 * is kept and the regex backtracks into the slots before x. An ECMAScript lookahead keeps the first way it matches, never backtracks
 * into it, and keeps its captures (ECMA-262 2025, 22.2.2.4 CompileAssertion, note 3: "there is no backtracking into a (?= form",
 * shown with `/(?=(a+))a*b\1/`). So the second lookahead keeps that same first split, the backreferences consume exactly its text,
 * and a failure after the line backtracks into the slots before x, as before. The first lookahead holds for any text the line
 * matches (x, B and y hold no CR or LF), so it refuses nothing the plain form accepts.
 *
 * Linear. The first lookahead settles in one pass whether the line ends with TAIL. If it does, the second tries the ends of x from
 * the right, each followed by B, and a y fails only when no non-space lies between its B and TAIL. A B holding a non-space is
 * followed by such a blank only when it starts within its own length of the line's last non-space before TAIL, or of TAIL, or
 * inside TAIL, so at most twice B's length plus TAIL's of the y's fail, each scanning at most the rest of the line. A B of spaces
 * only (`{a} {b}`, in no recorder's template) keeps the same answers without that bound. */
function lineReadOnce(parts: readonly string[], i: number, slots: Readonly<Record<string, string>>): string | null {
  const x = parts[i]!, between = parts[i + 1], y = parts[i + 2], after = parts[i + 3];
  if (between === undefined || y === undefined || after === undefined) return null;
  const uses = (slot: string) => parts.filter((part, j) => j % 2 === 1 && part === slot).length;
  if (slots[x] !== SLOT.line || slots[y] !== SLOT.line || uses(x) !== 1 || uses(y) !== 1 || /[\r\n]/.test(between)) return null;
  const lf = after.indexOf('\n');
  if (lf >= 0) return `${escape(after.slice(0, lf))}\\n`;
  return i + 3 === parts.length - 1 ? `${escape(after)}$` : null;
}

/** The slots of `text` when the template renders them back to exactly `text`; null otherwise. */
export function templateFields(template: RecorderTemplate, text: string): Readonly<Record<string, string>> | null {
  const fields = template.fields(text);
  return fields !== null && template.render(fields) === text ? fields : null;
}

/** Slot patterns the recorders' values take. A `line` holds a non-space character and no line break of either kind: the recorders
 * refuse a blank selection (R-POLARIS-DOSSIER-GATE-SOURCES-3 note 3).
 *
 * `line` names its first non-space character: only spaces other than CR and LF come before it. The language is the earlier
 * `[^\r\n]*\S[^\r\n]*` one (CR and LF are both `\s`, so the leading run is still free of breaks, and any such line splits at its
 * first `\S`), and a slot followed by more template still captures the longest value the rest accepts. But the earlier pattern could
 * place its `\S` at any of the line's characters, so a record that failed late was retried once per placement in every slot; this one
 * places it once (syzygy-bpyt.8.17). */
export const SLOT = Object.freeze({
  date: '\\d{4}-\\d{2}-\\d{2}',
  instant: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z',
  sha256: '[0-9a-f]{64}',
  commit: '[0-9a-f]{40}',
  verdict: 'CONFIRM WITH EXCEPTIONS|CONFIRM',
  line: '[^\\S\\r\\n]*\\S[^\\r\\n]*',
});
