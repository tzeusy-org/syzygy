import { lineIndex, type Lines, type MEntry, type MNode, type Parsed } from './manifest-model.js';

/** A position-aware reader of one TOML v1.0.0 document, for `cargo-manifest` and `python-project-manifest` version 1
 * (REQ-polaris-generation-034 version 2.7). It reads comments, blank lines, bare, quoted and dotted keys, standard tables, arrays of
 * tables, basic, literal and multi-line strings, integers (decimal, hexadecimal, octal and binary), floats, booleans, arrays across lines
 * and inline tables. The one form it does not read (`beyond`) is a valid date-time, date or time value, wherever it occurs; one whose
 * fields are out of range (`9999-99-99`) is invalid TOML, `syntax`. Pure.
 *
 * A key defined twice is recorded with the path of the table that holds it, and the reader stops there: a table header redefining a
 * table, a header over a key that holds a value, and a dotted key or header over a defined key all count. Other misuse of the table
 * model (extending an inline table, a dotted key through a table a header defined) is `syntax`, as is anything TOML does not allow.
 *
 * Lines: a key and its value run from the key's line to the value's last line; a table from each of its pieces, a header's line through
 * the last key and value under it, and each dotted key and value that passes through it, to its last; every table includes the tables
 * under it. */

class Stop { constructor(readonly beyond: boolean) {} }
type Origin = 'root' | 'header' | 'implicit' | 'dotted' | 'inline' | 'element';
interface TTable { readonly kind: 'table'; readonly path: readonly string[]; origin: Origin; readonly entries: Map<string, TItem>; readonly pieces: Lines[] }
interface TValue { readonly kind: 'value'; readonly node: MNode; readonly lines: Lines }
interface TArrayOfTables { readonly kind: 'aot'; readonly items: TTable[] }
type TItem = TTable | TValue | TArrayOfTables;

const MAX_DEPTH = 256;
const BARE_KEY = /[A-Za-z0-9_-]+/y;
/** Whether a date-time, date or time `DATE_TIME` matched names a real instant: month 1-12, a day the month has (29 February in a leap
 * year alone), hour 0-23, minute and second 0-59, an offset's hour 0-23 and minute 0-59. One that does not is invalid TOML (`syntax`). */
export function validDateTime(s: string): boolean {
  const date = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/u.exec(s);
  if (date !== null) {
    const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    if (days === undefined || day < 1 || day > days) return false;
  }
  const time = /([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?/u.exec(date === null ? s : s.slice(10));
  if (time !== null && (Number(time[1]) > 23 || Number(time[2]) > 59 || Number(time[3] ?? 0) > 59)) return false;
  const offset = /[+-]([0-9]{2}):([0-9]{2})$/u.exec(date === null ? '' : s.slice(10));
  return offset === null || (Number(offset[1]) <= 23 && Number(offset[2]) <= 59);
}
const DATE_TIME = /(?:[0-9]{4}-[0-9]{2}-[0-9]{2}(?:[Tt ][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]+)?)?(?:[Zz]|[+-][0-9]{2}:[0-9]{2})?)?|[0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]+)?)?)/y;
const DEC = '(?:0|[1-9](?:_?[0-9])*)';
const DIGITS = '[0-9](?:_?[0-9])*';
const INTEGER = new RegExp(`(?:0x[0-9A-Fa-f](?:_?[0-9A-Fa-f])*|0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*|[+-]?${DEC})`, 'y');
const FLOAT = new RegExp(`(?:[+-]?${DEC}(?:\\.${DIGITS}(?:[eE][+-]?${DIGITS})?|[eE][+-]?${DIGITS})|[+-]?(?:inf|nan))`, 'y');
/** A control character no TOML text holds outside a newline: U+0000 to U+0008, U+000A to U+001F and U+007F (tab allowed). */
const isControl = (code: number): boolean => (code <= 0x08) || (code >= 0x0a && code <= 0x1f) || code === 0x7f;

export function readToml(text: string): Parsed {
  const lineOf = lineIndex(text);
  const duplicates: string[][] = [];
  let i = 0;
  const syntax = (): never => { throw new Stop(false); };
  let beyond = false;
  const root: TTable = { kind: 'table', path: [], origin: 'root', entries: new Map(), pieces: [] };
  let section: { table: TTable; piece: { first: number; last: number } | null } = { table: root, piece: null };

  const ws = (): void => { while (text[i] === ' ' || text[i] === '\t') i++; };
  const atNewline = (): boolean => text[i] === '\n' || (text[i] === '\r' && text[i + 1] === '\n');
  const newline = (): void => { if (text[i] === '\r') i++; if (text[i] !== '\n') syntax(); i++; };
  const comment = (): void => {
    if (text[i] !== '#') return;
    while (i < text.length && !atNewline()) { if (isControl(text.charCodeAt(i))) syntax(); i++; }
  };
  /** Whitespace, comments and newlines, as an array allows between its values. */
  const wsCommentNewline = (): void => {
    for (;;) { ws(); comment(); if (atNewline()) newline(); else return; }
  };
  /** Record a repeated name under `table` and read on, so a later repeat in a table a recognizer reads is still found (a repeat in a
   * table it does not read must not hide one it does). The repeated definition is dropped, and a repeated table header opens a table
   * outside the tree, so what follows it repeats nothing by accident. The text is invalid either way: resolveFaults decides which fault. */
  const duplicate = (table: TTable): void => { duplicates.push([...table.path]); };
  const detached = (path: readonly string[], origin: TTable['origin']): TTable => ({ kind: 'table', path: [...path], origin, entries: new Map(), pieces: [] });

  const basicString = (multi: boolean): string => {
    let out = '';
    for (;;) {
      if (i >= text.length) syntax();
      const c = text[i]!;
      if (multi && text.startsWith('"""', i)) {
        let quotes = 3;
        while (text[i + quotes] === '"') quotes++;
        if (quotes > 5) syntax();
        out += '"'.repeat(quotes - 3);
        i += quotes;
        return out;
      }
      if (!multi && c === '"') { i++; return out; }
      if (c === '\\') {
        const e = text[i + 1];
        const simple: Readonly<Record<string, string>> = { b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', '"': '"', '\\': '\\' };
        if (e !== undefined && simple[e] !== undefined) { out += simple[e]; i += 2; continue; }
        if (e === 'u' || e === 'U') {
          const width = e === 'u' ? 4 : 8, hex = text.slice(i + 2, i + 2 + width);
          if (!new RegExp(`^[0-9A-Fa-f]{${width}}$`, 'u').test(hex)) syntax();
          const code = parseInt(hex, 16);
          if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) syntax();
          out += String.fromCodePoint(code);
          i += 2 + width;
          continue;
        }
        if (multi) {
          // A line-ending backslash: whitespace to the end of the line, the newline and every whitespace and newline after it are trimmed.
          let j = i + 1;
          while (text[j] === ' ' || text[j] === '\t') j++;
          if (text[j] === '\n' || (text[j] === '\r' && text[j + 1] === '\n')) {
            i = j;
            while (text[i] === ' ' || text[i] === '\t' || atNewline()) { if (atNewline()) newline(); else i++; }
            continue;
          }
        }
        return syntax();
      }
      if (multi && atNewline()) { const start = i; newline(); out += text.slice(start, i).replace('\r\n', '\n'); continue; }
      if (isControl(c.charCodeAt(0))) syntax();
      out += c; i++;
    }
  };
  const literalString = (multi: boolean): string => {
    const start = i;
    for (;;) {
      if (i >= text.length) syntax();
      if (multi && text.startsWith("'''", i)) {
        let quotes = 3;
        while (text[i + quotes] === "'") quotes++;
        if (quotes > 5) syntax();
        const out = text.slice(start, i) + "'".repeat(quotes - 3);
        i += quotes;
        return out.replace(/\r\n/gu, '\n');
      }
      if (!multi && text[i] === "'") { const out = text.slice(start, i); i++; return out; }
      if (multi && atNewline()) { newline(); continue; }
      if (isControl(text.charCodeAt(i))) syntax();
      i++;
    }
  };
  /** A string value or key starting at `i`, with the newline right after a multi-line opening trimmed. */
  const stringAt = (allowMulti: boolean): string | undefined => {
    if (text.startsWith('"""', i) || text.startsWith("'''", i)) {
      if (!allowMulti) syntax();
      const basic = text[i] === '"';
      i += 3;
      if (atNewline()) newline();
      return basic ? basicString(true) : literalString(true);
    }
    if (text[i] === '"') { i++; return basicString(false); }
    if (text[i] === "'") { i++; return literalString(false); }
    return undefined;
  };

  /** A key, simple or dotted: its parts and the line it starts on. */
  const key = (): { readonly parts: readonly string[]; readonly line: number } => {
    const line = lineOf(i), parts: string[] = [];
    for (;;) {
      ws();
      const quoted = stringAt(false);
      if (quoted !== undefined) parts.push(quoted);
      else {
        BARE_KEY.lastIndex = i;
        if (BARE_KEY.exec(text) === null) syntax();
        parts.push(text.slice(i, BARE_KEY.lastIndex));
        i = BARE_KEY.lastIndex;
      }
      ws();
      if (text[i] !== '.') return { parts, line };
      if (parts.length >= MAX_DEPTH) throw new Stop(true);
      i++;
    }
  };

  const delimited = (): boolean => i >= text.length || /[\s,\]}#]/u.test(text[i]!);

  const value = (path: readonly string[], depth: number): MNode => {
    if (depth > MAX_DEPTH) throw new Stop(true);
    const start = i;
    const span = (): Lines => ({ first: lineOf(start), last: lineOf(i - 1) });
    const s = stringAt(true);
    if (s !== undefined) return { kind: 'string', value: s, lines: span() };
    if (text[i] === '[') {
      i++;
      const items: MNode[] = [];
      for (;;) {
        wsCommentNewline();
        if (text[i] === ']') { i++; return { kind: 'array', items, lines: span() }; }
        items.push(value([...path, '#'], depth + 1));
        wsCommentNewline();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === ']') { i++; return { kind: 'array', items, lines: span() }; }
        return syntax();
      }
    }
    if (text[i] === '{') {
      i++;
      const table: TTable = { kind: 'table', path, origin: 'inline', entries: new Map(), pieces: [] };
      ws();
      if (text[i] === '}') { i++; table.pieces.push(span()); return toNode(table); }
      for (;;) {
        ws();
        const k = key();
        if (text[i] !== '=') syntax();
        i++; ws();
        const v = value([...path, ...k.parts], depth + 1);
        assign(table, k.parts, v, { first: k.line, last: v.lines.last }, true);
        ws();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === '}') { i++; table.pieces.push(span()); return toNode(table); }
        return syntax();
      }
    }
    for (const literal of ['true', 'false']) {
      if (text.startsWith(literal, i)) { i += literal.length; if (!delimited()) syntax(); return { kind: 'other', lines: span() }; }
    }
    DATE_TIME.lastIndex = i;
    const dateTime = DATE_TIME.exec(text);
    if (dateTime !== null) {
      i = DATE_TIME.lastIndex;
      if (!delimited() || !validDateTime(dateTime[0])) syntax();
      beyond = true;
      return { kind: 'beyond', lines: span() };
    }
    for (const pattern of [FLOAT, INTEGER]) {
      pattern.lastIndex = i;
      if (pattern.exec(text) !== null && pattern.lastIndex > i) {
        i = pattern.lastIndex;
        if (!delimited()) syntax();
        return { kind: 'other', lines: span() };
      }
    }
    return syntax();
  };

  /** Define `parts` = `node` in `table`: each part but the last a table dotted keys create or extend, the last a new key. */
  const assign = (table: TTable, parts: readonly string[], node: MNode, lines: Lines, inline: boolean): void => {
    let t = table;
    for (const part of parts.slice(0, -1)) {
      const found = t.entries.get(part);
      if (found === undefined) {
        const created: TTable = { kind: 'table', path: [...t.path, part], origin: inline ? 'inline' : 'dotted', entries: new Map(), pieces: [] };
        t.entries.set(part, created);
        t = created;
      } else if (found.kind === 'table' && found.origin === (inline ? 'inline' : 'dotted') && found.pieces.length > 0) t = found;
      else if (found.kind === 'value' && found.node.kind !== 'map') { duplicate(t); return; }
      else return syntax();
      t.pieces.push(lines);
    }
    const last = parts[parts.length - 1]!;
    if (t.entries.has(last)) { duplicate(t); return; }
    t.entries.set(last, { kind: 'value', node, lines });
  };

  /** Walk a header's parts but the last: create implicit tables, step into the last element of an array of tables. */
  const walkHeader = (parts: readonly string[]): TTable => {
    let t = root;
    for (const part of parts) {
      const found = t.entries.get(part);
      if (found === undefined) {
        const created: TTable = { kind: 'table', path: [...t.path, part], origin: 'implicit', entries: new Map(), pieces: [] };
        t.entries.set(part, created);
        t = created;
      } else if (found.kind === 'table' && found.origin !== 'inline') t = found;
      else if (found.kind === 'aot') t = found.items[found.items.length - 1]!;
      else if (found.kind === 'value' && found.node.kind === 'map') return syntax();
      else { duplicate(t); t = detached([...t.path, part], 'implicit'); }
    }
    return t;
  };

  const header = (): void => {
    const line = lineOf(i);
    const array = text[i + 1] === '[';
    i += array ? 2 : 1;
    const k = key();
    if (array ? !text.startsWith(']]', i) : text[i] !== ']') syntax();
    i += array ? 2 : 1;
    const parent = walkHeader(k.parts.slice(0, -1));
    const last = k.parts[k.parts.length - 1]!;
    const found = parent.entries.get(last);
    let table: TTable;
    if (array) {
      table = { kind: 'table', path: [...parent.path, last, '#'], origin: 'element', entries: new Map(), pieces: [] };
      if (found === undefined) parent.entries.set(last, { kind: 'aot', items: [table] });
      else if (found.kind === 'aot') found.items.push(table);
      else duplicate(parent);
    } else if (found === undefined) {
      table = { kind: 'table', path: [...parent.path, last], origin: 'header', entries: new Map(), pieces: [] };
      parent.entries.set(last, table);
    } else if (found.kind === 'table' && found.origin === 'implicit') {
      table = found;
      table.origin = 'header';
    } else { duplicate(parent); table = detached([...parent.path, last], 'header'); }
    const piece = { first: line, last: line };
    table.pieces.push(piece);
    section = { table, piece };
  };

  const keyValue = (): void => {
    const k = key();
    if (text[i] !== '=') syntax();
    i++; ws();
    const v = value([...section.table.path, ...k.parts], 0);
    const lines = { first: k.line, last: v.lines.last };
    assign(section.table, k.parts, v, lines, false);
    if (section.piece !== null) section.piece.last = Math.max(section.piece.last, lines.last);
  };

  try {
    while (i < text.length) {
      ws();
      if (i >= text.length) break;
      if (text[i] === '#') comment();
      else if (atNewline()) { newline(); continue; }
      else if (text[i] === '[') header();
      else keyValue();
      ws(); comment();
      if (i < text.length) newline();
    }
    return { root: toNode(root), syntax: false, beyond, duplicates };
  } catch (stop) {
    if (!(stop instanceof Stop)) throw stop;
    return { root: null, syntax: !stop.beyond, beyond: beyond || stop.beyond, duplicates };
  }
}

/** The smallest span holding every span given, or null for none. A loop, never a spread: a table may hold more pieces than a call's
 * argument list can. */
function union(spans: readonly Lines[]): Lines | null {
  if (spans.length === 0) return null;
  let first = spans[0]!.first, last = spans[0]!.last;
  for (const s of spans) { if (s.first < first) first = s.first; if (s.last > last) last = s.last; }
  return { first, last };
}

function spanOf(item: TItem): Lines | null {
  if (item.kind === 'value') return item.lines;
  if (item.kind === 'aot') return union(item.items.flatMap((table) => { const s = spanOf(table); return s === null ? [] : [s]; }));
  const spans: Lines[] = [...item.pieces];
  for (const child of item.entries.values()) { const s = spanOf(child); if (s !== null) spans.push(s); }
  return union(spans);
}

function toNode(item: TItem): MNode {
  if (item.kind === 'value') return item.node;
  const lines = spanOf(item) ?? { first: 1, last: 1 };
  if (item.kind === 'aot') return { kind: 'array', items: item.items.map(toNode), lines };
  const entries: MEntry[] = [];
  for (const [name, child] of item.entries) entries.push({ key: { kind: 'string', value: name }, value: toNode(child), lines: spanOf(child) ?? lines });
  return { kind: 'map', entries, lines };
}
