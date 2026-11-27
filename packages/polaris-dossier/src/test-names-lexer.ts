/** The lexical layer under the test-name recognizers (REQ-polaris-generation-034 version 2.42, syzygy-5dhm.45). Pure.
 *
 * A scan reads one body and returns its code text: the body with every comment and every string literal's interior replaced by spaces,
 * newlines kept, so every offset and line of the code text is the body's. A string keeps its delimiters in the code text, and the scan
 * lists each string with its opening offset and, where it is a plain literal, its value. A recognizer matches the code text alone, so a
 * name written inside a comment or a string is never matched. The scan states a fault instead of guessing when the body ends inside a
 * comment or a string (`unterminated`). It never throws on its input. */

export interface StringToken {
  /** The offset of the opening delimiter. */
  readonly start: number;
  /** The offset one past the closing delimiter. */
  readonly end: number;
  /** The literal's value with `\\`, `\'`, `\"` and `` \` `` unescaped; null where it holds another escape, a substitution (`${`) or a
   * line break, which the recognizers do not read. */
  readonly value: string | null;
}
/** A comment's span (version 2.43, syzygy-5dhm.46): the whole comment, and its content between the delimiters (`#`, `//`, or `/*` and
 * `*\/`). A regular-expression literal is blanked in the code text and is no comment. */
export interface CommentToken { readonly start: number; readonly end: number; readonly contentStart: number; readonly contentEnd: number }
export type Scanned = { readonly ok: true; readonly code: string; readonly strings: readonly StringToken[]; readonly comments: readonly CommentToken[] } | { readonly ok: false; readonly fault: 'unterminated' };

/** Every UTF-16 code unit but a line break becomes one space, so the code text keeps every offset of the body: no `u` flag, which
 * would turn a surrogate pair into one space and move every later offset (R-TEST-NAMES-1 F1). */
const blank = (text: string): string => text.replace(/[^\r\n]/g, ' ');

/** A plain literal's value: the simple escapes resolved, or null for anything else. */
function plainValue(inner: string): string | null {
  if (/[\r\n]/u.test(inner) || inner.includes('${')) return null;
  let out = '';
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]!;
    if (c !== '\\') { out += c; continue; }
    const next = inner[i + 1];
    if (next === '\\' || next === '\'' || next === '"' || next === '`') { out += next; i++; continue; }
    return null;
  }
  return out;
}

class Builder {
  readonly parts: string[] = [];
  readonly strings: StringToken[] = [];
  readonly comments: CommentToken[] = [];
  code(text: string): void { this.parts.push(text); }
  comment(text: string, start: number, open: number, close: number): void {
    this.parts.push(blank(text));
    this.comments.push({ start, end: start + text.length, contentStart: start + open, contentEnd: start + text.length - close });
  }
  regex(text: string): void { this.parts.push(blank(text)); }
  string(open: string, inner: string, close: string, start: number, raw = false): void {
    this.parts.push(open + blank(inner) + close);
    this.strings.push({ start, end: start + open.length + inner.length + close.length, value: raw ? (/[\r\n]/u.test(inner) ? null : inner) : plainValue(inner) });
  }
  done(): Scanned { return { ok: true, code: this.parts.join(''), strings: this.strings, comments: this.comments }; }
}

/** The end of a quoted literal opened at `from` (after its opening quote) by `quote`, honouring backslash escapes; -1 when the body ends
 * first, or, where `singleLine`, when a line break comes first. */
function closeOf(text: string, from: number, quote: string, singleLine: boolean): number {
  for (let i = from; i < text.length; i++) {
    const c = text[i]!;
    if (c === '\\') { i++; continue; }
    if (singleLine && (c === '\n' || c === '\r')) return -1;
    if (text.startsWith(quote, i)) return i;
  }
  return -1;
}

export interface CLikeOptions {
  /** JavaScript and TypeScript: template literals and regular-expression literals. */
  readonly javascript?: boolean;
  /** Go: raw strings in backquotes and rune literals. */
  readonly go?: boolean;
  /** Java: text blocks (`"""`) and character literals. */
  readonly java?: boolean;
}

/** The character before `at` that is not white space, or '' at the start. */
function previousSignificant(text: string, at: number): string {
  for (let i = at - 1; i >= 0; i--) if (!/\s/u.test(text[i]!)) return text[i]!;
  return '';
}

/** Whether a `/` at `at` opens a regular-expression literal: by the character before it, as a heuristic a lexer without a parser uses. */
function opensRegex(text: string, at: number): boolean {
  const before = previousSignificant(text, at);
  if (before === '' || '(,=:[!&|?{};+-*%<>~^'.includes(before)) return true;
  // After a keyword that takes an expression.
  const word = /([A-Za-z_$][\w$]*)\s*$/u.exec(text.slice(Math.max(0, at - 16), at))?.[1];
  return word === 'return' || word === 'typeof' || word === 'case' || word === 'in' || word === 'of' || word === 'delete' || word === 'void' || word === 'yield' || word === 'await';
}

/** The end of a regular-expression literal opened at `at`, past its flags; -1 when a line ends first. */
function regexEnd(text: string, at: number): number {
  let inClass = false;
  for (let i = at + 1; i < text.length; i++) {
    const c = text[i]!;
    if (c === '\n' || c === '\r') return -1;
    if (c === '\\') { i++; continue; }
    if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    else if (c === '/' && !inClass) {
      let j = i + 1;
      while (j < text.length && /[A-Za-z]/u.test(text[j]!)) j++;
      return j;
    }
  }
  return -1;
}

/** Scan a JavaScript, TypeScript, Go or Java body: `//` and `/* *\/` comments, and the language's string forms. */
export function scanCLike(text: string, options: CLikeOptions = {}): Scanned {
  const out = new Builder();
  let codeStart = 0;
  const flush = (to: number): void => { if (to > codeStart) out.code(text.slice(codeStart, to)); };
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    const next = text[i + 1];
    if (c === '/' && next === '/') {
      flush(i);
      let end = i;
      while (end < text.length && text[end] !== '\n' && text[end] !== '\r') end++;
      out.comment(text.slice(i, end), i, 2, 0);
      i = codeStart = end;
      continue;
    }
    if (c === '/' && next === '*') {
      flush(i);
      const end = text.indexOf('*/', i + 2);
      if (end < 0) return { ok: false, fault: 'unterminated' };
      out.comment(text.slice(i, end + 2), i, 2, 2);
      i = codeStart = end + 2;
      continue;
    }
    if (options.java === true && text.startsWith('"""', i)) {
      flush(i);
      const end = closeOf(text, i + 3, '"""', false);
      if (end < 0) return { ok: false, fault: 'unterminated' };
      out.string('"""', text.slice(i + 3, end), '"""', i);
      i = codeStart = end + 3;
      continue;
    }
    if (c === '"' || c === '\'' || (c === '`' && (options.javascript === true || options.go === true))) {
      flush(i);
      if (c === '`' && options.go === true) {
        const end = text.indexOf('`', i + 1);
        if (end < 0) return { ok: false, fault: 'unterminated' };
        out.string('`', text.slice(i + 1, end), '`', i, true);
        i = codeStart = end + 1;
        continue;
      }
      // A template literal may span lines; its substitutions are left blank with it, so a call inside one is never read.
      const end = closeOf(text, i + 1, c, c !== '`');
      if (end < 0) return { ok: false, fault: 'unterminated' };
      out.string(c, text.slice(i + 1, end), c, i);
      i = codeStart = end + 1;
      continue;
    }
    if (c === '/' && options.javascript === true && opensRegex(text, i)) {
      const end = regexEnd(text, i);
      if (end > 0) {
        flush(i);
        out.regex(text.slice(i, end));
        i = codeStart = end;
        continue;
      }
    }
    i++;
  }
  flush(text.length);
  return out.done();
}

/** Scan a Python body: `#` comments, and string literals with any prefix of r, b, u and f, in single, double or triple quotes. */
export function scanPython(text: string): Scanned {
  const out = new Builder();
  let codeStart = 0;
  const flush = (to: number): void => { if (to > codeStart) out.code(text.slice(codeStart, to)); };
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if (c === '#') {
      flush(i);
      let end = i;
      while (end < text.length && text[end] !== '\n' && text[end] !== '\r') end++;
      out.comment(text.slice(i, end), i, 1, 0);
      i = codeStart = end;
      continue;
    }
    // A prefix belongs to the literal only where it does not end a longer name.
    const prefix = /^[rRbBuUfF]{0,2}(?=['"])/u.exec(text.slice(i, i + 3))?.[0];
    if (prefix !== undefined && (i === 0 || !/[\w]/u.test(text[i - 1]!))) {
      const q = i + prefix.length;
      const quote = text.startsWith(text[q]!.repeat(3), q) ? text[q]!.repeat(3) : text[q]!;
      flush(i);
      const end = closeOf(text, q + quote.length, quote, quote.length === 1);
      if (end < 0) return { ok: false, fault: 'unterminated' };
      out.string(text.slice(i, q + quote.length), text.slice(q + quote.length, end), quote, i, /[rR]/u.test(prefix));
      i = codeStart = end + quote.length;
      continue;
    }
    // Skip a whole name, so a prefix letter inside one never opens a literal.
    if (/[A-Za-z0-9_]/u.test(c)) { let end = i; while (end < text.length && /[A-Za-z0-9_]/u.test(text[end]!)) end++; i = end; continue; }
    i++;
  }
  flush(text.length);
  return out.done();
}
