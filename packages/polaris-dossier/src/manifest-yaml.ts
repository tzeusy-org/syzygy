import type { MEntry, MKey, MNode, Parsed } from './manifest-model.js';

/** A position-aware reader of one YAML 1.2 text under the core schema, for `github-actions-workflow` version 1
 * (REQ-polaris-generation-034 version 2.7). It reads comments, blank lines, block and flow mappings and sequences (compact forms
 * included, and a sequence at its mapping key's indentation), plain, single- and double-quoted scalars across lines, and literal and
 * folded block scalars with their chomping and indentation indicators. Pure.
 *
 * The forms it does not read (`beyond`), as the requirement lets it refuse: an alias, an anchor, an explicit tag, a merge key (`<<`), a
 * directive and a second document; and also a complex (`?`) key, a flow collection as a key, content on a `---` line, and nesting deeper
 * than 256 collections. A single-pair mapping inside a flow sequence (`[cron: "x"]`) is read as a one-entry mapping, and a flow-mapping
 * entry with no `:` (`{a, b: 1}`) as a key whose value is null, as YAML 1.2 reads both; either key on one line. Everything else it does not accept
 * is `syntax`, including a tab in indentation, a character YAML does not print, any U+FEFF, an empty or whitespace-only text, and a
 * repeated key (recorded with the path of its mapping). A plain scalar resolves by the core schema: `null`, `~` and empty are null; `true`
 * and `false` in three cases are booleans; integers and floats in the core forms are numbers; everything else (`on` included) is a string. */

class Stop { constructor(readonly beyond: boolean) {} }
const MAX_DEPTH = 256;
/** Characters a YAML stream may not hold: C0 controls but tab, LF and CR; DEL; C1 controls but NEL; lone surrogates; U+FEFF; U+FFFE; U+FFFF. */
const NOT_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFEFF\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const NON_STRING = [
  /^(?:~|null|Null|NULL|)$/u, /^(?:true|True|TRUE|false|False|FALSE)$/u,
  /^[-+]?[0-9]+$/u, /^0o[0-7]+$/u, /^0x[0-9a-fA-F]+$/u,
  /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+)?$/u, /^[-+]?\.(?:inf|Inf|INF)$/u, /^\.(?:nan|NaN|NAN)$/u,
];
const isString = (plain: string): boolean => !NON_STRING.some((pattern) => pattern.test(plain));
/** The core schema's integer forms (the infrastructure recognizers keep such a plain scalar's text, which `compose-file` reads as a port). */
const INTEGER = /^(?:[-+]?[0-9]+|0o[0-7]+|0x[0-9a-fA-F]+)$/u;
/** A plain scalar's node: a string, or another scalar, keeping an integer's text as written. */
const plainNode = (plain: string, lines: { readonly first: number; readonly last: number }): MNode =>
  isString(plain) ? { kind: 'string', value: plain, lines } : INTEGER.test(plain) ? { kind: 'other', lines, int: plain } : { kind: 'other', lines };
const DOUBLE_ESCAPES: Readonly<Record<string, string>> = {
  '0': '\0', a: '\x07', b: '\b', t: '\t', '\t': '\t', n: '\n', v: '\v', f: '\f', r: '\r', e: '\x1b', ' ': ' ', '"': '"', '/': '/', '\\': '\\',
  N: '\x85', _: '\xa0', L: '\u2028', P: '\u2029',
};
const FLOW_INDICATOR = /[,[\]{}]/u;

/** `multi` (infrastructure recognizers, `kubernetes-manifest` alone): read a stream of several documents, each root in `documents`; otherwise a second
 * document is `beyond`, as for a workflow and a Compose file. */
export function readYaml(text: string, multi = false): Parsed {
  const duplicates: string[][] = [];
  let beyond = false;
  if (/^[ \t\r\n]*$/u.test(text) || NOT_PRINTABLE.test(text)) return { root: null, syntax: true, beyond: false, duplicates };
  const lines: string[] = [];
  for (let start = 0, i = 0; ; i++) {
    if (i >= text.length) { if (start < text.length) lines.push(text.slice(start)); break; }
    const c = text[i];
    if (c === '\r' || c === '\n') { lines.push(text.slice(start, i)); if (c === '\r' && text[i + 1] === '\n') i++; start = i + 1; }
  }
  const N = lines.length;
  let ln = 0, col = 0, mid = false;
  const syntax = (): never => { throw new Stop(false); };
  const line = (): string => lines[ln] ?? '';
  const ch = (offset = 0): string | undefined => line()[col + offset];
  const blankAt = (n: number): boolean => /^[ \t]*$/u.test(lines[n]!);
  const commentAt = (n: number): boolean => /^[ \t]*#/u.test(lines[n]!);
  const markerAt = (n: number): boolean => /^(?:---|\.\.\.)(?:[ \t]|$)/u.test(lines[n]!);
  const spacesAt = (n: number): number => /^ */u.exec(lines[n]!)![0].length;
  const skipVoid = (): void => { while (ln < N && (blankAt(ln) || commentAt(ln))) ln++; col = 0; };
  /** The indentation of a content line: spaces only, so a tab before content is `syntax`. */
  const indentAt = (n: number): number => { const spaces = spacesAt(n); if (lines[n]![spaces] === '\t') syntax(); return spaces; };
  const ws = (): void => { while (ch() === ' ' || ch() === '\t') col++; };
  const restEmpty = (): boolean => {
    let j = col;
    const s = line();
    while (s[j] === ' ' || s[j] === '\t') j++;
    return j >= s.length || (s[j] === '#' && (j === 0 || s[j - 1] === ' ' || s[j - 1] === '\t'));
  };
  const finishLine = (): void => {
    if (!mid) return;
    if (!restEmpty()) syntax();
    ln++; col = 0; mid = false;
  };
  const spaced = (offset: number): boolean => { const c = ch(offset); return c === undefined || c === ' ' || c === '\t'; };
  const seqAt = (n: number, indent: number): boolean => lines[n]![indent] === '-' && (lines[n]![indent + 1] === undefined || lines[n]![indent + 1] === ' ' || lines[n]![indent + 1] === '\t');
  const nullAt = (n: number): MNode => ({ kind: 'other', lines: { first: n + 1, last: n + 1 } });
  /** Skip anchors and tags at a node's start; each makes the text `beyond`. */
  const properties = (): void => {
    while (ch() === '&' || ch() === '!') {
      beyond = true;
      while (ch() !== undefined && ch() !== ' ' && ch() !== '\t') col++;
      ws();
    }
  };

  /** A quoted scalar from `col` (at its quote). With `singleLine`, undefined when it does not close on this line (not an implicit key). */
  const quoted = (parentIndent: number, singleLine: boolean): string | undefined => {
    const double = ch() === '"';
    col++;
    // `kept` is where the last escape's output ends: white space an escape wrote is content, never trimmed when the line folds.
    let out = '', lineStart = 0, kept = 0;
    for (;;) {
      const c = ch();
      if (c === undefined) {
        if (singleLine) return undefined;
        const from = Math.max(lineStart, kept);
        out = out.slice(0, from) + out.slice(from).replace(/[ \t]+$/u, '');
        let empties = 0;
        ln++;
        while (ln < N && blankAt(ln)) { empties++; ln++; }
        if (ln >= N || (markerAt(ln) && spacesAt(ln) === 0) || spacesAt(ln) <= parentIndent) syntax();
        out += empties > 0 ? '\n'.repeat(empties) : ' ';
        col = 0; ws(); lineStart = out.length;
        continue;
      }
      if (double && c === '\\') {
        const e = ch(1);
        if (e === undefined) {
          if (singleLine) return undefined;
          ln++;
          if (ln >= N) syntax();
          col = 0; ws(); lineStart = out.length;
          continue;
        }
        if (DOUBLE_ESCAPES[e] !== undefined) { out += DOUBLE_ESCAPES[e]; col += 2; kept = out.length; continue; }
        const width = e === 'x' ? 2 : e === 'u' ? 4 : e === 'U' ? 8 : 0;
        const hex = line().slice(col + 2, col + 2 + width);
        if (width === 0 || !new RegExp(`^[0-9A-Fa-f]{${width}}$`, 'u').test(hex)) syntax();
        const code = parseInt(hex, 16);
        if (code > 0x10ffff) syntax();
        out += String.fromCodePoint(code);
        col += 2 + width;
        kept = out.length;
        continue;
      }
      if (c === (double ? '"' : "'")) {
        if (!double && ch(1) === "'") { out += "'"; col += 2; continue; }
        col++;
        return out;
      }
      out += c; col++;
    }
  };

  /** An implicit key at `col`: its key and text, with `col` after its `:`; or undefined, the position unchanged, when there is none. */
  const implicitKey = (): { readonly key: MKey; readonly text: string } | undefined => {
    const at = col;
    if (ch() === '?' && spaced(1)) throw new Stop(true);
    if (ch() === '&' || ch() === '!') { properties(); }
    const c = ch();
    if (c === undefined) { col = at; return undefined; }
    const colon = (): boolean => { ws(); if (ch() === ':' && spaced(1)) { col++; return true; } return false; };
    if (c === '*') {
      while (ch() !== undefined && ch() !== ' ' && ch() !== '\t' && ch() !== ':') col++;
      if (colon()) { beyond = true; return { key: { kind: 'beyond' }, text: '*' }; }
      col = at; return undefined;
    }
    if (c === '"' || c === "'") {
      const startLine = ln;
      const value = quoted(-1, true);
      if (value !== undefined && ln === startLine && colon()) return { key: { kind: 'string', value }, text: value };
      ln = startLine; col = at; return undefined;
    }
    if (/[,[\]{}#&*!|>'"%@`]/u.test(c) || (/[-?:]/u.test(c) && spaced(1))) { col = at; return undefined; }
    const s = line();
    for (let j = col; j < s.length; j++) {
      if (s[j] === '#' && j > col && (s[j - 1] === ' ' || s[j - 1] === '\t')) break;
      if (s[j] === ':' && (j + 1 === s.length || s[j + 1] === ' ' || s[j + 1] === '\t')) {
        const raw = s.slice(col, j).trimEnd();
        col = j + 1;
        if (raw === '<<') beyond = true;
        return { key: isString(raw) ? { kind: 'string', value: raw } : { kind: 'other' }, text: raw };
      }
    }
    col = at;
    return undefined;
  };
  const keyId = (key: MKey, text: string): string | undefined => key.kind === 'string' ? `s${key.value}` : key.kind === 'other' ? `o${text}` : undefined;

  /** A plain scalar in block context from `col`, continued on lines indented past `parentIndent`. */
  const plainBlock = (parentIndent: number): MNode => {
    const first = ln;
    const scan = (s: string, from: number): { end: number; comment: boolean } => {
      for (let j = from; j < s.length; j++) {
        if (s[j] === '#' && j > from && (s[j - 1] === ' ' || s[j - 1] === '\t')) return { end: j, comment: true };
        if (s[j] === ':' && (j + 1 === s.length || s[j + 1] === ' ' || s[j + 1] === '\t')) return { end: j, comment: false };
      }
      return { end: s.length, comment: false };
    };
    const head = scan(line(), col);
    let out = line().slice(col, head.end).trimEnd();
    let last = ln, lastEnd = head.end;
    if (head.end === line().length) {
      let k = ln + 1, empties = 0;
      while (k < N) {
        if (blankAt(k)) { empties++; k++; continue; }
        if (commentAt(k) || (markerAt(k) && spacesAt(k) === 0) || spacesAt(k) <= parentIndent) break;
        const s = lines[k]!;
        const from = /^[ \t]*/u.exec(s)![0].length;
        const part = scan(s, from);
        if (part.end < s.length && !part.comment) syntax();
        out += (empties > 0 ? '\n'.repeat(empties) : ' ') + s.slice(from, part.end).trimEnd();
        last = k; lastEnd = part.end; empties = 0; k++;
        if (part.comment) break;
      }
    }
    ln = last; col = lastEnd; mid = true;
    return plainNode(out, { first: first + 1, last: last + 1 });
  };

  const blockScalar = (parentIndent: number): MNode => {
    const folded = ch() === '>';
    const headerLine = ln;
    col++;
    let chomp: '' | '+' | '-' = '', digit = 0;
    for (let k = 0; k < 2; k++) {
      const c = ch();
      if ((c === '+' || c === '-') && chomp === '') { chomp = c; col++; } else if (c !== undefined && /[1-9]/u.test(c) && digit === 0) { digit = Number(c); col++; }
    }
    if (!spaced(0) || !restEmpty()) syntax();
    ln++; col = 0; mid = false;
    let indent = digit > 0 ? Math.max(parentIndent, 0) + digit : -1;
    if (indent < 0) {
      for (let k = ln; k < N; k++) if (!/^ *$/u.test(lines[k]!)) { indent = spacesAt(k); break; }
      if (indent <= parentIndent) indent = Number.MAX_SAFE_INTEGER;
    }
    const content: string[] = [];
    let lastContent = -1;
    while (ln < N) {
      const s = lines[ln]!;
      if (/^ *$/u.test(s)) { content.push(''); ln++; continue; }
      // A blank line holding a tab short of the scalar's indentation: a tab where indentation is expected.
      if (/^[ \t]*$/u.test(s) && spacesAt(ln) < indent) syntax();
      if (spacesAt(ln) < indent) break;
      content.push(s.slice(indent));
      lastContent = ln; ln++;
    }
    const kept = content.slice(0, lastContent < 0 ? 0 : content.length - (ln - 1 - lastContent));
    const trailing = content.length - kept.length;
    let value: string;
    if (!folded) value = kept.join('\n');
    else {
      value = '';
      let prev: 'none' | 'normal' | 'more' = 'none', empties = 0;
      for (const l of kept) {
        if (l === '') { empties++; continue; }
        const kind = /^[ \t]/u.test(l) ? 'more' : 'normal';
        value += prev === 'none' ? '\n'.repeat(empties) : prev === 'normal' && kind === 'normal' ? (empties === 0 ? ' ' : '\n'.repeat(empties)) : '\n'.repeat(empties + 1);
        value += l; prev = kind; empties = 0;
      }
    }
    if (kept.length > 0 && chomp !== '-') value += '\n';
    if (chomp === '+') value += '\n'.repeat(trailing);
    const end = lastContent < 0 ? headerLine : lastContent;
    return { kind: 'string', value, lines: { first: headerLine + 1, last: end + 1 } };
  };

  /** Whitespace, comments and line breaks inside a flow collection; every continued line indented past `parentIndent`. */
  const flowSkip = (parentIndent: number): void => {
    for (;;) {
      ws();
      const c = ch();
      if (c === '#' && (col === 0 || line()[col - 1] === ' ' || line()[col - 1] === '\t')) col = line().length;
      if (ch() !== undefined) return;
      ln++; col = 0;
      if (ln >= N || (markerAt(ln) && spacesAt(ln) === 0)) syntax();
      // A continued line is indented past the block, except one that opens with the closing bracket, which may sit at the block's own column.
      if (!blankAt(ln) && !commentAt(ln) && (spacesAt(ln) < parentIndent || (spacesAt(ln) === parentIndent && !/^ *[\]}]/u.test(line())))) syntax();
    }
  };
  const flowStop = (offset: number): boolean => { const c = ch(offset); return c === undefined || FLOW_INDICATOR.test(c) || c === ' ' || c === '\t'; };

  const flowPlain = (parentIndent: number): MNode => {
    const first = ln;
    let out = '', last = ln;
    const c = ch()!;
    if (/[#&*!|>'"%@`]/u.test(c) || FLOW_INDICATOR.test(c) || (/[-?:]/u.test(c) && flowStop(1))) syntax();
    for (;;) {
      const start = col;
      while (ch() !== undefined && !FLOW_INDICATOR.test(ch()!) && !(ch() === ':' && flowStop(1)) && !(ch() === '#' && (line()[col - 1] === ' ' || line()[col - 1] === '\t'))) col++;
      out += line().slice(start, col).trimEnd();
      last = ln;
      if (ch() !== undefined) break;
      // The line ended inside the scalar: it continues on the next line that is not blank, unless that line starts with an indicator.
      let k = ln + 1, empties = 0;
      while (k < N && blankAt(k)) { empties++; k++; }
      if (k >= N || commentAt(k) || (markerAt(k) && spacesAt(k) === 0) || spacesAt(k) <= parentIndent) { col = line().length; break; }
      const from = /^[ \t]*/u.exec(lines[k]!)![0].length;
      const next = lines[k]![from]!;
      if (FLOW_INDICATOR.test(next) || (next === ':' && (lines[k]![from + 1] === undefined || /[ \t,[\]{}]/u.test(lines[k]![from + 1]!)))) { col = line().length; break; }
      out += empties > 0 ? '\n'.repeat(empties) : ' ';
      ln = k; col = from;
    }
    const lines_ = { first: first + 1, last: last + 1 };
    return plainNode(out, lines_);
  };

  const flowItem = (parentIndent: number, path: readonly string[], depth: number): MNode => {
    properties();
    const c = ch();
    if (c === '*') {
      beyond = true;
      const at = ln;
      while (ch() !== undefined && !FLOW_INDICATOR.test(ch()!) && ch() !== ' ' && ch() !== '\t') col++;
      return { kind: 'beyond', lines: { first: at + 1, last: at + 1 } };
    }
    if (c === '[' || c === '{') return flow(parentIndent, path, depth + 1);
    if (c === '"' || c === "'") { const at = ln; const value = quoted(parentIndent, false)!; return { kind: 'string', value, lines: { first: at + 1, last: ln + 1 } }; }
    return flowPlain(parentIndent);
  };

  const flow = (parentIndent: number, path: readonly string[], depth: number): MNode => {
    if (depth > MAX_DEPTH) throw new Stop(true);
    const first = ln, map = ch() === '{';
    col++;
    if (!map) {
      const items: MNode[] = [];
      for (;;) {
        flowSkip(parentIndent);
        if (ch() === ']') { col++; return { kind: 'array', items, lines: { first: first + 1, last: ln + 1 } }; }
        if (ch() === '?' && flowStop(1)) throw new Stop(true);
        const keyLine = ln;
        const item = flowItem(parentIndent, [...path, '#'], depth);
        flowSkip(parentIndent);
        if (ch() === ':') {
          // A single-pair mapping: the item is its key, which YAML holds to one line; a collection as a key is beyond this reader.
          if (item.kind === 'array' || item.kind === 'map') throw new Stop(true);
          if (item.lines.first !== item.lines.last || ln + 1 !== item.lines.last) syntax();
          const key: MKey = item.kind === 'string' ? { kind: 'string', value: item.value } : item.kind === 'beyond' ? { kind: 'beyond' } : { kind: 'other' };
          if (key.kind === 'string' && key.value === '<<') beyond = true;
          col++;
          flowSkip(parentIndent);
          const value: MNode = ch() === ',' || ch() === ']' ? nullAt(ln) : flowItem(parentIndent, [...path, '#', item.kind === 'string' ? item.value : ''], depth + 1);
          const lines_ = { first: keyLine + 1, last: value.lines.last };
          items.push({ kind: 'map', entries: [{ key, value, lines: lines_ }], lines: lines_ });
          flowSkip(parentIndent);
        } else items.push(item);
        if (ch() === ',') { col++; continue; }
        if (ch() === ']') { col++; return { kind: 'array', items, lines: { first: first + 1, last: ln + 1 } }; }
        return syntax();
      }
    }
    const entries: MEntry[] = [], seen = new Set<string>();
    for (;;) {
      flowSkip(parentIndent);
      if (ch() === '}') { col++; return { kind: 'map', entries, lines: { first: first + 1, last: ln + 1 } }; }
      if ((ch() === '?' && flowStop(1)) || ch() === '[' || ch() === '{') throw new Stop(true);
      const keyLine = ln;
      const keyNode = flowItem(parentIndent, path, depth);
      const raw = keyNode.kind === 'string' ? keyNode.value : '';
      const key: MKey = keyNode.kind === 'string' ? { kind: 'string', value: keyNode.value } : keyNode.kind === 'beyond' ? { kind: 'beyond' } : { kind: 'other' };
      if (key.kind === 'string' && key.value === '<<') beyond = true;
      flowSkip(parentIndent);
      let value: MNode;
      if (ch() === ':') {
        col++;
        flowSkip(parentIndent);
        value = ch() === ',' || ch() === '}' ? nullAt(ln) : flowItem(parentIndent, [...path, raw], depth);
      } else if (ch() === ',' || ch() === '}') {
        // An entry with no `:` is a key whose value is null (YAML 1.2, 7.4.1); its span is the key's.
        value = { kind: 'other', lines: { first: keyNode.lines.last, last: keyNode.lines.last } };
      } else return syntax();
      const id = keyId(key, `${keyNode.kind}:${keyNode.lines.first}`);
      if (id !== undefined && key.kind === 'string') { if (seen.has(id)) duplicates.push([...path]); seen.add(id); }
      entries.push({ key, value, lines: { first: keyLine + 1, last: value.lines.last } });
      flowSkip(parentIndent);
      if (ch() === ',') { col++; continue; }
      if (ch() === '}') { col++; return { kind: 'map', entries, lines: { first: first + 1, last: ln + 1 } }; }
      return syntax();
    }
  };

  /** A value after `key: ` or `- ` on the same line, in a block of indentation `parentIndent`. */
  const inlineValue = (parentIndent: number, path: readonly string[], depth: number, seqAtParent: boolean): MNode => {
    const at = ln;
    properties();
    if (restEmpty()) { mid = true; finishLine(); return blockNode(parentIndent, seqAtParent, path, depth) ?? nullAt(at); }
    const c = ch()!;
    let node: MNode;
    if (c === '|' || c === '>') return blockScalar(parentIndent);
    if (c === '"' || c === "'") { const value = quoted(parentIndent, false)!; node = { kind: 'string', value, lines: { first: at + 1, last: ln + 1 } }; mid = true; }
    else if (c === '[' || c === '{') {
      node = flow(parentIndent, path, depth + 1);
      mid = true;
      ws();
      if (ch() === ':' && spaced(1)) throw new Stop(true);
    } else if (c === '*') {
      beyond = true;
      while (ch() !== undefined && ch() !== ' ' && ch() !== '\t') col++;
      node = { kind: 'beyond', lines: { first: at + 1, last: at + 1 } };
      mid = true;
    } else if (/[,\]}%@`]/u.test(c) || (/[-?:]/u.test(c) && spaced(1))) return syntax();
    else node = plainBlock(parentIndent);
    return node;
  };

  /** A node whose first character is at `col` on a line it may share with a `- ` before it: a block sequence or mapping starting here,
   * or an inline value. */
  const nodeHere = (parentIndent: number, path: readonly string[], depth: number): MNode => {
    if (depth > MAX_DEPTH) throw new Stop(true);
    if (ch() === '-' && spaced(1)) return blockSeq(col, path, depth + 1);
    const at = col;
    if (implicitKey() !== undefined) { col = at; return blockMap(col, path, depth + 1); }
    return inlineValue(parentIndent, path, depth, false);
  };

  /** The node on the next content line, when it is indented past `parentIndent` (or, with `seqAtParent`, a sequence at it); else null. */
  const blockNode = (parentIndent: number, seqAtParent: boolean, path: readonly string[], depth: number): MNode | null => {
    finishLine();
    skipVoid();
    if (ln >= N || (markerAt(ln) && spacesAt(ln) === 0)) return null;
    const indent = indentAt(ln);
    if (indent < parentIndent || (indent === parentIndent && !(seqAtParent && seqAt(ln, indent)))) return null;
    col = indent;
    const node = nodeHere(parentIndent, path, depth);
    finishLine();
    return node;
  };

  const nextAt = (indent: number): boolean => {
    finishLine();
    skipVoid();
    if (ln >= N || (markerAt(ln) && spacesAt(ln) === 0)) return false;
    const found = indentAt(ln);
    if (found > indent) syntax();
    if (found < indent) return false;
    col = indent;
    return true;
  };

  const blockSeq = (indent: number, path: readonly string[], depth: number): MNode => {
    const items: MNode[] = [];
    const first = ln;
    do {
      if (!seqAt(ln, indent)) break;
      const itemLine = ln;
      col = indent + 1;
      ws();
      if (restEmpty()) { mid = true; items.push(blockNode(indent, false, [...path, '#'], depth) ?? nullAt(itemLine)); }
      else { mid = true; items.push(nodeHere(indent, [...path, '#'], depth)); }
    } while (nextAt(indent));
    let last = first + 1;
    for (const item of items) if (item.lines.last > last) last = item.lines.last;
    return { kind: 'array', items, lines: { first: first + 1, last } };
  };

  const blockMap = (indent: number, path: readonly string[], depth: number): MNode => {
    const entries: MEntry[] = [], seen = new Set<string>();
    const first = ln;
    do {
      if (seqAt(ln, indent)) break;
      const keyLine = ln;
      const found = implicitKey();
      if (found === undefined) return syntax();
      const childPath = [...path, found.text];
      ws();
      mid = true;
      const value = restEmpty() ? (blockNode(indent, true, childPath, depth) ?? nullAt(keyLine)) : inlineValue(indent, childPath, depth, true);
      const id = keyId(found.key, found.text);
      if (id !== undefined) { if (seen.has(id)) duplicates.push([...path]); seen.add(id); }
      entries.push({ key: found.key, value, lines: { first: keyLine + 1, last: Math.max(keyLine + 1, value.lines.last) } });
    } while (nextAt(indent));
    let last = first + 1;
    for (const entry of entries) if (entry.lines.last > last) last = entry.lines.last;
    return { kind: 'map', entries, lines: { first: first + 1, last } };
  };

  try {
    let root: MNode | null = null, documents = 0;
    const roots: (MNode | null)[] = [];
    for (;;) {
      skipVoid();
      while (ln < N && line().startsWith('%')) { beyond = true; ln++; skipVoid(); }
      if (ln >= N) break;
      if (/^\.\.\.(?:[ \t]|$)/u.test(line())) { col = 3; mid = true; finishLine(); continue; }
      if (/^---(?:[ \t]|$)/u.test(line())) { col = 3; if (!restEmpty()) throw new Stop(true); mid = true; finishLine(); }
      documents++;
      if (documents > 1 && !multi) beyond = true;
      const node = blockNode(-1, false, [], 0);
      if (documents === 1) root = node;
      roots.push(node);
      skipVoid();
      if (ln < N && !(markerAt(ln) && spacesAt(ln) === 0)) syntax();
    }
    return { root, syntax: false, beyond, duplicates, documents: roots };
  } catch (stop) {
    if (!(stop instanceof Stop)) throw stop;
    return { root: null, syntax: !stop.beyond, beyond: beyond || stop.beyond, duplicates, documents: [] };
  }
}

