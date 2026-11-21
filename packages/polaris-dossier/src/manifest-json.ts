import { lineIndex, type MEntry, type MNode, type Parsed } from './manifest-model.js';

/** A position-aware reader of one JSON text (RFC 8259), for `npm-package-manifest` version 1 (REQ-polaris-generation-034 version 2.7).
 * Strict: whitespace is space, tab, LF and CR only, so a leading U+FEFF, an empty text, a comment, a trailing comma, a control character
 * in a string or a bad escape is `syntax`. A repeated name is valid JSON and is recorded with the path of its object, so the recognizer
 * decides whether it reads that object. The form it does not read (`beyond`): nesting deeper than 256 arrays and objects. Pure. */

const MAX_DEPTH = 256;
class Stop { constructor(readonly beyond: boolean) {} }
const NUMBER = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
const ESCAPES: Readonly<Record<string, string>> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

export function readJson(text: string): Parsed {
  const lineOf = lineIndex(text);
  const duplicates: string[][] = [];
  let i = 0;
  const syntax = (): never => { throw new Stop(false); };
  const ws = (): void => { while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r')) i++; };
  const lines = (start: number) => ({ first: lineOf(start), last: lineOf(i - 1) });

  const string = (): string => {
    i++;
    let out = '';
    for (;;) {
      if (i >= text.length) syntax();
      const c = text[i]!;
      if (c === '"') { i++; return out; }
      if (c.charCodeAt(0) < 0x20) syntax();
      if (c !== '\\') { out += c; i++; continue; }
      const e = text[i + 1];
      if (e === 'u') {
        const hex = text.slice(i + 2, i + 6);
        if (!/^[0-9A-Fa-f]{4}$/u.test(hex)) syntax();
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
      } else if (e !== undefined && ESCAPES[e] !== undefined) { out += ESCAPES[e]; i += 2; } else syntax();
    }
  };

  const value = (path: readonly string[], depth: number): MNode => {
    if (depth > MAX_DEPTH) throw new Stop(true);
    ws();
    const start = i, c = text[i];
    if (c === '{') {
      i++; ws();
      const entries: MEntry[] = [], seen = new Set<string>();
      if (text[i] === '}') { i++; return { kind: 'map', entries, lines: lines(start) }; }
      for (;;) {
        ws();
        if (text[i] !== '"') syntax();
        const keyAt = i, key = string();
        ws();
        if (text[i] !== ':') syntax();
        i++;
        const child = value([...path, key], depth + 1);
        if (seen.has(key)) duplicates.push([...path]);
        seen.add(key);
        entries.push({ key: { kind: 'string', value: key }, value: child, lines: { first: lineOf(keyAt), last: child.lines.last } });
        ws();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === '}') { i++; return { kind: 'map', entries, lines: lines(start) }; }
        return syntax();
      }
    }
    if (c === '[') {
      i++; ws();
      const items: MNode[] = [];
      if (text[i] === ']') { i++; return { kind: 'array', items, lines: lines(start) }; }
      for (;;) {
        items.push(value([...path, '#'], depth + 1));
        ws();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === ']') { i++; return { kind: 'array', items, lines: lines(start) }; }
        return syntax();
      }
    }
    if (c === '"') { const s = string(); return { kind: 'string', value: s, lines: lines(start) }; }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, i)) { i += literal.length; return { kind: 'other', lines: lines(start) }; }
    }
    NUMBER.lastIndex = i;
    if (NUMBER.exec(text) !== null && NUMBER.lastIndex > i) { i = NUMBER.lastIndex; return { kind: 'other', lines: lines(start) }; }
    return syntax();
  };

  try {
    const root = value([], 0);
    ws();
    if (i !== text.length) syntax();
    return { root, syntax: false, beyond: false, duplicates };
  } catch (stop) {
    if (!(stop instanceof Stop)) throw stop;
    return { root: null, syntax: !stop.beyond, beyond: stop.beyond, duplicates };
  }
}
