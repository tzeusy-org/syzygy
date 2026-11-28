/** The lexical scan of import facts (REQ-polaris-generation-034 version 2.39, syzygy-3efd.89): a TypeScript body read as tokens from its
 * first code point, the top-level static import and re-export statements it holds, and the forms outside the grammar it counts.
 *
 * The scan reads tokens only. Text inside a comment, a string literal, a template literal outside its substitutions or a regular-expression
 * literal is never a statement and never an outside-grammar form; where a `/` begins a regular-expression literal is decided by the
 * previous significant token alone, and where that token cannot tell a division from a literal the scan stops rather than guess. At a stop
 * (that point, an unterminated comment, string, template or literal, or a code point the TypeScript lexical grammar does not allow) the
 * body is `incomplete`: the forms whose last token ends before the stop are kept, and nothing after it is read. */

export type ImportForm = 'import' | 'import-type' | 'side-effect' | 're-export' | 're-export-type';

/** A statement of the grammar: its form, its module operand's text, and the offsets of its first code point and its operand's closing quote. */
export interface ScannedStatement { readonly form: ImportForm; readonly operand: string; readonly start: number; readonly end: number }

export interface ImportScan {
  readonly complete: boolean;
  readonly statements: readonly ScannedStatement[];
  /** How many forms outside the grammar the kept text holds (statements whose operand a rule calls outside the grammar are the caller's). */
  readonly outsideGrammar: number;
}

type TokenKind = 'word' | 'punct' | 'string' | 'number' | 'template' | 'regex' | 'private';
interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  readonly start: number;
  readonly end: number;
  /** Open braces, parentheses, brackets and template substitutions around the token. */
  readonly depth: number;
  /** For a string: whether its raw text holds a backslash or a line terminator. */
  readonly plain?: boolean;
  /** For a `)`: whether it closes the parenthesised head of `if`, `while`, `for` or `with`. */
  readonly headClose?: boolean;
}

const LINE_TERMINATORS = new Set([0x0a, 0x0d, 0x2028, 0x2029]);
const isLineTerminator = (c: number): boolean => LINE_TERMINATORS.has(c);
const WHITESPACE = /^[\t\v\f \u00a0\ufeff\p{Zs}]$/u;
const ID_START = /^[\p{ID_Start}$_]$/u;
const ID_PART = /^[\p{ID_Continue}$\u200c\u200d]$/u;
const NUMBER = /(?:0[xXoObB][0-9a-fA-F_]+n?|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?n?)/y;
const PUNCTUATORS = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '??',
  '++', '--', '+=', '-=', '*=', '%=', '&=', '|=', '^=', '<<', '>>', '**', '{', '}', '(', ')', '[', ']', ';', ',', '<', '>', '+', '-', '*', '%', '&',
  '|', '^', '!', '~', '?', ':', '=', '.', '@'];
/** Words after which a `/` begins a regular-expression literal. */
const REGEX_WORDS = new Set(['return', 'typeof', 'case', 'default', 'do', 'else', 'in', 'instanceof', 'new', 'delete', 'void', 'throw', 'extends', 'break', 'continue']);
/** Tokens after which a `/` cannot be read either way. */
const UNDECIDABLE_PUNCT = new Set(['}', '>', '!', '++', '--']);
const UNDECIDABLE_WORDS = new Set(['of', 'yield', 'await']);
/** Punctuators after which a `/` is a division. */
const DIVISION_PUNCT = new Set([')', ']']);
const HEAD_WORDS = new Set(['if', 'while', 'for', 'with']);

const codePointAt = (text: string, i: number): { readonly ch: string } => ({ ch: String.fromCodePoint(text.codePointAt(i)!) });

/** The tokens of `text`, and the offset at which the scan stopped, or null where it read the text to its end. */
export function tokenize(text: string): { readonly tokens: readonly Token[]; readonly stop: number | null } {
  const tokens: Token[] = [];
  /** Open brackets: the closing character each awaits, and for a `(` whether it opened a statement head; `t` marks a template substitution. */
  const stack: { readonly close: string; readonly head: boolean }[] = [];
  let i = 0;
  const significant = (back = 1): Token | undefined => tokens[tokens.length - back];
  const push = (kind: TokenKind, start: number, end: number, extra: Partial<Token> = {}): void => {
    tokens.push({ kind, value: text.slice(start, end), start, end, depth: stack.length, ...extra });
  };
  const stopAt = (at: number) => ({ tokens, stop: at });

  /** Scan a template literal from `from` (just after a backtick or a substitution's closing brace) to its end or its next substitution. */
  const templatePart = (from: number): number | 'unterminated' => {
    let j = from;
    while (j < text.length) {
      const c = text.charCodeAt(j);
      if (c === 0x5c) { j += 2; continue; }
      if (c === 0x60) return j + 1;
      if (c === 0x24 && text.charCodeAt(j + 1) === 0x7b) { stack.push({ close: 't', head: false }); return j + 2; }
      j++;
    }
    return 'unterminated';
  };

  if (text.startsWith('#!')) {
    while (i < text.length && !isLineTerminator(text.charCodeAt(i))) i++;
  }
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (isLineTerminator(c)) { i++; continue; }
    const { ch } = codePointAt(text, i);
    if (WHITESPACE.test(ch)) { i += ch.length; continue; }
    const start = i;
    if (c === 0x2f) {
      const next = text.charCodeAt(i + 1);
      if (next === 0x2f) { while (i < text.length && !isLineTerminator(text.charCodeAt(i))) i++; continue; }
      if (next === 0x2a) {
        const close = text.indexOf('*/', i + 2);
        if (close < 0) return stopAt(start);
        i = close + 2;
        continue;
      }
      const before = significant();
      const regex = regexContext(before, significant(2));
      if (regex === 'undecidable') return stopAt(start);
      if (regex) {
        let j = i + 1, inClass = false;
        for (;;) {
          if (j >= text.length || isLineTerminator(text.charCodeAt(j))) return stopAt(start);
          const d = text.charCodeAt(j);
          if (d === 0x5c) {
            if (j + 1 >= text.length || isLineTerminator(text.charCodeAt(j + 1))) return stopAt(start);
            j += 2;
            continue;
          }
          if (d === 0x5b) inClass = true; else if (d === 0x5d) inClass = false; else if (d === 0x2f && !inClass) break;
          j++;
        }
        j++;
        while (j < text.length && ID_PART.test(codePointAt(text, j).ch)) j += codePointAt(text, j).ch.length;
        push('regex', start, j);
        i = j;
        continue;
      }
      i += text.charCodeAt(i + 1) === 0x3d ? 2 : 1;
      push('punct', start, i);
      continue;
    }
    if (c === 0x27 || c === 0x22) {
      let j = i + 1, plain = true;
      for (;;) {
        if (j >= text.length) return stopAt(start);
        const d = text.charCodeAt(j);
        if (d === c) break;
        if (d === 0x0a || d === 0x0d) return stopAt(start);
        if (d === 0x2028 || d === 0x2029) plain = false;
        if (d === 0x5c) {
          plain = false;
          if (j + 1 >= text.length) return stopAt(start);
          j += text.charCodeAt(j + 1) === 0x0d && text.charCodeAt(j + 2) === 0x0a ? 3 : 2;
          continue;
        }
        j++;
      }
      push('string', start, j + 1, { plain });
      i = j + 1;
      continue;
    }
    if (c === 0x60) {
      const end = templatePart(i + 1);
      if (end === 'unterminated') return stopAt(start);
      push('template', start, end);
      i = end;
      continue;
    }
    if (ID_START.test(ch) || c === 0x5c) {
      let j = i;
      for (;;) {
        if (j >= text.length) break;
        if (text.charCodeAt(j) === 0x5c) {
          const escape = /\\u(?:[0-9a-fA-F]{4}|\{[0-9a-fA-F]+\})/y;
          escape.lastIndex = j;
          const m = escape.exec(text);
          if (m === null) return stopAt(j);
          j += m[0].length;
          continue;
        }
        const part = codePointAt(text, j).ch;
        if (!(j === i ? ID_START.test(part) : ID_PART.test(part))) break;
        j += part.length;
      }
      push('word', start, j);
      i = j;
      continue;
    }
    if (c === 0x23) {
      const after = i + 1 < text.length ? codePointAt(text, i + 1).ch : '';
      if (!ID_START.test(after)) return stopAt(start);
      let j = i + 1;
      while (j < text.length && ID_PART.test(codePointAt(text, j).ch)) j += codePointAt(text, j).ch.length;
      push('private', start, j);
      i = j;
      continue;
    }
    NUMBER.lastIndex = i;
    if ((c >= 0x30 && c <= 0x39) || (c === 0x2e && text.charCodeAt(i + 1) >= 0x30 && text.charCodeAt(i + 1) <= 0x39)) {
      const m = NUMBER.exec(text);
      if (m !== null) { push('number', start, i + m[0].length); i += m[0].length; continue; }
    }
    if (c === 0x3f && text.charCodeAt(i + 1) === 0x2e && !(text.charCodeAt(i + 2) >= 0x30 && text.charCodeAt(i + 2) <= 0x39)) {
      push('punct', start, i + 2);
      i += 2;
      continue;
    }
    const punct = PUNCTUATORS.find((p) => text.startsWith(p, i));
    if (punct === undefined) return stopAt(start);
    if (punct === '}' && stack.length > 0 && stack[stack.length - 1]!.close === 't') {
      stack.pop();
      const end = templatePart(i + 1);
      if (end === 'unterminated') return stopAt(start);
      push('template', start, end);
      i = end;
      continue;
    }
    if (punct === '(') {
      const before = significant();
      const head = before?.kind === 'word' && (HEAD_WORDS.has(before.value) || (before.value === 'await' && significant(2)?.kind === 'word' && significant(2)!.value === 'for'));
      push('punct', start, i + 1);
      stack.push({ close: ')', head });
      i++;
      continue;
    }
    if (punct === '{' || punct === '[') {
      push('punct', start, i + 1);
      stack.push({ close: punct === '{' ? '}' : ']', head: false });
      i++;
      continue;
    }
    if (punct === ')' || punct === '}' || punct === ']') {
      const top = stack[stack.length - 1];
      let headClose = false;
      if (top !== undefined && top.close === punct) { stack.pop(); headClose = top.head; }
      push('punct', start, i + 1, punct === ')' ? { headClose } : {});
      i++;
      continue;
    }
    push('punct', start, i + punct.length);
    i += punct.length;
  }
  return { tokens, stop: null };
}

/** Whether a `/` after `before` (and the token before it) begins a regular-expression literal, a division, or cannot be read either way. */
function regexContext(before: Token | undefined, beforeThat: Token | undefined): boolean | 'undecidable' {
  if (before === undefined) return true;
  switch (before.kind) {
    case 'number': case 'string': case 'template': case 'regex': case 'private': return false;
    case 'word':
      if (UNDECIDABLE_WORDS.has(before.value)) return 'undecidable';
      if (beforeThat?.kind === 'word' && (beforeThat.value === 'break' || beforeThat.value === 'continue')) return 'undecidable';
      return REGEX_WORDS.has(before.value);
    case 'punct':
      if (UNDECIDABLE_PUNCT.has(before.value)) return 'undecidable';
      if (before.value === ')') return before.headClose === true;
      if (DIVISION_PUNCT.has(before.value)) return false;
      return true;
  }
}

const isWord = (t: Token | undefined, value?: string): boolean => t !== undefined && t.kind === 'word' && (value === undefined || t.value === value);
const isPunct = (t: Token | undefined, value: string): boolean => t !== undefined && t.kind === 'punct' && t.value === value;
const isName = (t: Token | undefined): boolean => t !== undefined && (t.kind === 'word' || t.kind === 'string');

/** The index after a `{ … }` import or export specifier list starting at `j`, or -1 where it is not one, or undefined where tokens run out. */
function specifiers(tokens: readonly Token[], j: number): number | undefined {
  if (!isPunct(tokens[j], '{')) return -1;
  j++;
  for (;;) {
    const t = tokens[j];
    if (t === undefined) return undefined;
    if (isPunct(t, '}')) return j + 1;
    if (!isName(t)) return -1;
    // TypeScript's `type` before a specifier's name.
    if (isWord(t, 'type') && isName(tokens[j + 1]) && !isWord(tokens[j + 1], 'as')) j++;
    j++;
    if (isWord(tokens[j], 'as')) {
      if (tokens[j + 1] === undefined) return undefined;
      if (!isName(tokens[j + 1])) return -1;
      j += 2;
    }
    if (tokens[j] === undefined) return undefined;
    if (isPunct(tokens[j], ',')) { j++; continue; }
    if (isPunct(tokens[j], '}')) return j + 1;
    return -1;
  }
}

type FormMatch =
  | { readonly kind: 'form'; readonly form: ImportForm; readonly operand: number }
  | { readonly kind: 'none' }
  | { readonly kind: 'short' };

/** An `import` token at `i`: the form it begins through its operand token, or none, or `short` where the tokens run out first. */
function importForm(tokens: readonly Token[], i: number): FormMatch {
  let j = i + 1;
  const t = tokens[j];
  if (t === undefined) return { kind: 'short' };
  if (t.kind === 'string') return { kind: 'form', form: 'side-effect', operand: j };
  let typeOnly = false;
  if (isWord(t, 'type')) {
    const next = tokens[j + 1];
    if (next === undefined) return { kind: 'short' };
    if (isPunct(next, '{') || isPunct(next, '*') || (next.kind === 'word' && next.value !== 'from')) { typeOnly = true; j++; }
  }
  const head = tokens[j];
  if (head === undefined) return { kind: 'short' };
  const namespace = (k: number): number | undefined =>
    !isPunct(tokens[k], '*') ? -1 : tokens[k + 1] === undefined || tokens[k + 2] === undefined ? undefined : isWord(tokens[k + 1], 'as') && isWord(tokens[k + 2]) ? k + 3 : -1;
  let after: number | undefined;
  if (isPunct(head, '*')) after = namespace(j);
  else if (isPunct(head, '{')) after = specifiers(tokens, j);
  else if (head.kind === 'word') {
    after = j + 1;
    if (tokens[after] === undefined) return { kind: 'short' };
    if (isPunct(tokens[after], ',')) {
      const k = after + 1;
      if (tokens[k] === undefined) return { kind: 'short' };
      after = isPunct(tokens[k], '*') ? namespace(k) : specifiers(tokens, k);
    }
  } else return { kind: 'none' };
  if (after === undefined) return { kind: 'short' };
  if (after < 0) return { kind: 'none' };
  if (tokens[after] === undefined) return { kind: 'short' };
  if (!isWord(tokens[after], 'from')) return { kind: 'none' };
  if (tokens[after + 1] === undefined) return { kind: 'short' };
  return { kind: 'form', form: typeOnly ? 'import-type' : 'import', operand: after + 1 };
}

/** An `export` token at `i`: the re-export form it begins through its operand token, or none, or `short`. */
function exportForm(tokens: readonly Token[], i: number): FormMatch {
  let j = i + 1;
  let typeOnly = false;
  if (tokens[j] === undefined) return { kind: 'short' };
  if (isWord(tokens[j], 'type')) { typeOnly = true; j++; }
  const head = tokens[j];
  if (head === undefined) return { kind: 'short' };
  let after: number | undefined;
  if (isPunct(head, '*')) {
    after = j + 1;
    if (tokens[after] === undefined) return { kind: 'short' };
    if (isWord(tokens[after], 'as')) {
      if (tokens[after + 1] === undefined) return { kind: 'short' };
      after = isName(tokens[after + 1]) ? after + 2 : -1;
    }
  } else if (isPunct(head, '{')) after = specifiers(tokens, j);
  else return { kind: 'none' };
  if (after === undefined) return { kind: 'short' };
  if (after < 0) return { kind: 'none' };
  if (tokens[after] === undefined) return { kind: 'short' };
  if (!isWord(tokens[after], 'from')) return { kind: 'none' };
  if (tokens[after + 1] === undefined) return { kind: 'short' };
  return { kind: 'form', form: typeOnly ? 're-export-type' : 're-export', operand: after + 1 };
}

/** The statements and outside-grammar forms of a TypeScript body, by the grammar of version 2.39. */
export function scanImports(text: string): ImportScan {
  const { tokens, stop } = tokenize(text);
  const statements: ScannedStatement[] = [];
  let outsideGrammar = 0;
  /** `require` tokens that are the right side of an import-equals declaration. */
  const equalsRequire = new Set<number>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== 'word' || (t.value !== 'import' && t.value !== 'export' && t.value !== 'require')) continue;
    const prev = tokens[i - 1];
    if (isPunct(prev, '.') || isPunct(prev, '?.')) continue;
    const next = tokens[i + 1];
    if (t.value === 'require') {
      if (equalsRequire.has(i) || isWord(prev, 'function')) continue;
      if (isPunct(next, '(')) outsideGrammar++;
      continue;
    }
    if (t.value === 'import') {
      if (next === undefined) continue;
      if (isPunct(next, '.')) continue;
      if (isPunct(next, '(')) { outsideGrammar++; continue; }
      // An import-equals declaration: a module (`require(`) is outside the grammar; a namespace alias is nothing.
      // Inside a block, an import token followed by an identifier is counted whatever follows (a namespace alias there too).
      if (next.kind === 'word' && isPunct(tokens[i + 2], '=')) {
        const right = tokens[i + 3];
        const module = isWord(right, 'require') && isPunct(tokens[i + 4], '(');
        if (module) equalsRequire.add(i + 3);
        if (t.depth > 0) outsideGrammar++;
        else if (module) outsideGrammar++;
        continue;
      }
      const match = importForm(tokens, i);
      if (match.kind === 'short') continue;
      if (t.depth > 0) {
        if (match.kind === 'form' || next.kind === 'word' || next.kind === 'string' || isPunct(next, '{') || isPunct(next, '*')) outsideGrammar++;
        continue;
      }
      if (match.kind === 'none') { outsideGrammar++; continue; }
      const kept = operandOf(tokens, match.operand);
      if (kept === 'outside') { outsideGrammar++; continue; }
      statements.push({ form: match.form, operand: kept, start: t.start, end: tokens[match.operand]!.end });
      continue;
    }
    const match = exportForm(tokens, i);
    if (match.kind !== 'form') continue;
    if (t.depth > 0) { outsideGrammar++; continue; }
    const kept = operandOf(tokens, match.operand);
    if (kept === 'outside') { outsideGrammar++; continue; }
    statements.push({ form: match.form, operand: kept, start: t.start, end: tokens[match.operand]!.end });
  }
  return { complete: stop === null, statements, outsideGrammar };
}

/** The operand text where the token at `k` is a plain string literal with no import-attributes clause after it; `outside` otherwise. */
function operandOf(tokens: readonly Token[], k: number): string | 'outside' {
  const t = tokens[k]!;
  if (t.kind !== 'string' || t.plain !== true) return 'outside';
  const next = tokens[k + 1];
  if ((isWord(next, 'with') || isWord(next, 'assert')) && isPunct(tokens[k + 2], '{')) return 'outside';
  return t.value.slice(1, -1);
}
