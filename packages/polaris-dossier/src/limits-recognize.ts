import { LIMIT_DEFAULT } from './derive-rules.js';
import { lineStarts } from './rough-edges-recognize.js';
import { scanCLike, scanPython, type Scanned, type StringToken } from './test-names-lexer.js';

/** The limits-and-defaults recognizer (REQ-polaris-generation-034 version 2.49, syzygy-5dhm.116), version 1: a path rule saying which blobs
 * are candidates and in which form, and a lexical reading of one body that returns every limit constant it defines and every configuration
 * entry it sets, each with its line, that line's text, its value exactly as written and the value's type. Pure.
 *
 * A source body goes through the test-name lexer (`test-names-lexer.ts`) first, and the definition forms are matched in its code text, in
 * which comments and string interiors are blanks: so a definition written in a comment or a string is never one. The value is read from the
 * body at the same offsets and typed by the value forms; a value no form takes (a call, another name, an object) is kept as Unknown, never
 * guessed. Nothing is evaluated: an expression's value is the text written, not its result. A configuration body is read by its form's line
 * grammar; a line outside that grammar makes the whole file Unknown rather than read past. Every expression is published in the
 * requirement (`LIMIT_PATTERNS`). */

export type LimitLanguage = keyof typeof LIMIT_DEFAULT.languages;
export type ConfigForm = 'ini' | 'yaml';
export type LimitKind = (typeof LIMIT_DEFAULT.kinds)[number];
export type ValueType = (typeof LIMIT_DEFAULT.valueTypes)[number];
export type LimitCandidate = { readonly source: 'code'; readonly language: LimitLanguage } | { readonly source: 'config'; readonly form: ConfigForm };

export interface RawLimit {
  readonly source: 'code' | 'config';
  /** A constant's kind by its name; `entry` for a configuration entry. */
  readonly kind: LimitKind | 'entry';
  /** The constant's name, or the entry's key path: its section or its parent keys and its key, joined by `.`. */
  readonly name: string;
  /** The value exactly as written (a string with its quotes), or null where no value form takes it. */
  readonly value: string | null;
  readonly valueType: ValueType | null;
  readonly line: number;
  /** The line's text with its terminator, its leading and trailing spaces and tabs, and on line 1 a leading byte-order mark removed. */
  readonly quote: string;
}
export type RecognizedLimits =
  | { readonly ok: true; readonly limits: readonly RawLimit[]; readonly sequenceItems: number }
  | { readonly ok: false; readonly parseFault: 'unterminated' | 'outside-grammar' };

/** The candidate a path is, by its basename, or undefined where it is none. A source extension is tried first. */
export function limitCandidateOf(path: string): LimitCandidate | undefined {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const ends = (e: string): boolean => base.endsWith(e) && base.length > e.length;
  for (const [language, extensions] of Object.entries(LIMIT_DEFAULT.languages) as [LimitLanguage, readonly string[]][]) {
    if (extensions.some(ends)) return { source: 'code', language };
  }
  const c = LIMIT_DEFAULT.configuration;
  if (c.ini.some(ends)) return { source: 'config', form: 'ini' };
  // `config.example.yaml` both starts with the prefix and ends with the extension: the two share its last dot.
  if ((c.yamlNames as readonly string[]).includes(base) || (base.startsWith(c.yamlPrefix) && c.yamlExtensions.some((e) => base.endsWith(e)))) {
    return { source: 'config', form: 'yaml' };
  }
  return undefined;
}

const NAME = '(?<name>_*[A-Z][A-Z0-9_]*)';
const NUM = '(?:0[xX][0-9A-Fa-f_]+|0[bB][01_]+|0[oO][0-7_]+|(?:[0-9][0-9_]*(?:\\.[0-9_]*)?|\\.[0-9][0-9_]*)(?:[eE][-+]?[0-9]+)?)[uUlLnNfFdD]{0,3}';

/** Every expression the recognizer runs, published verbatim in the requirement. */
export const LIMIT_PATTERNS = {
  /** A constant's kinds, tried in `LIMIT_DEFAULT.kinds` order; a name none matches is no limit. */
  timeout: /(?:^|_)TIMEOUT/, threshold: /(?:^|_)THRESHOLD/, limit: /(?:^|_)LIMIT/, max: /(?:^|_)MAX/, default: /^_*DEFAULT_/,
  /** The definition forms, matched against one line of the code text. */
  python: new RegExp(`^[ \\t]*${NAME}[ \\t]*(?::[^=\\r\\n]*)?=(?!=)[ \\t]*(?<value>.*?)[ \\t]*$`, 'd'),
  javascript: new RegExp(`^[ \\t]*(?:export[ \\t]+)?(?:declare[ \\t]+)?(?:const|let|var)[ \\t]+${NAME}[ \\t]*(?::[^=\\r\\n]*)?=(?![=>])[ \\t]*(?<value>.*?)[ \\t]*;?[ \\t]*$`, 'd'),
  javascriptField: new RegExp(`^[ \\t]*(?:(?:public|private|protected|static|readonly)[ \\t]+)+${NAME}[ \\t]*(?::[^=\\r\\n]*)?=(?![=>])[ \\t]*(?<value>.*?)[ \\t]*;?[ \\t]*$`, 'd'),
  go: new RegExp(`^[ \\t]*(?:(?:const|var)[ \\t]+)?${NAME}(?:[ \\t]+[A-Za-z_][A-Za-z0-9_.]*)?[ \\t]*=(?!=)[ \\t]*(?<value>.*?)[ \\t]*$`, 'd'),
  java: new RegExp(`^[ \\t]*(?:(?:public|private|protected|static|final)[ \\t]+)+[A-Za-z_][A-Za-z0-9_.<>\\[\\]]*[ \\t]+${NAME}[ \\t]*=(?!=)[ \\t]*(?<value>.*?)[ \\t]*;[ \\t]*$`, 'd'),
  cDefine: new RegExp(`^[ \\t]*#[ \\t]*define[ \\t]+${NAME}[ \\t]+(?<value>[^ \\t].*?)[ \\t]*$`, 'd'),
  cDeclaration: new RegExp(`^[ \\t]*(?:(?:static|const|constexpr|extern|inline|unsigned|signed|long|short|volatile)[ \\t]+)*[A-Za-z_][A-Za-z0-9_:]*[ \\t]+(?:const[ \\t]+)?${NAME}[ \\t]*=(?!=)[ \\t]*(?<value>.*?)[ \\t]*;[ \\t]*$`, 'd'),
  /** The value forms. A number may carry a sign; an expression is numbers joined by these operators, with parentheses. */
  number: new RegExp(`^[-+]?${NUM}$`),
  decimal: /^[-+]?(?:[0-9][0-9_]*\.|\.[0-9]|[0-9][0-9_]*[eE])/,
  boolean: /^(?:true|false|True|False)$/,
  /** A string literal with a formatting prefix (Python's `f`), whose value is not its text. */
  formatted: /^[A-Za-z]*[fF]/,
  expressionToken: new RegExp(`[ \\t]*(?:(?<number>${NUM})|(?<operator>\\*\\*|<<|>>|[-+*/%])|(?<open>\\()|(?<close>\\)))`, 'y'),
  /** The `ini` form's lines: a comment, a section, an entry. */
  iniComment: /^[ \t]*(?:[#;]|$)/,
  iniSection: /^[ \t]*\[(?<section>[^\]\r\n]+)\][ \t]*$/,
  iniEntry: /^[ \t]*(?<name>[A-Za-z_][A-Za-z0-9_.-]*)(?:[ \t]*[=:][ \t]*|[ \t]+)(?<value>[^ \t].*?)[ \t]*$/,
  iniKeyOnly: /^[ \t]*[A-Za-z_][A-Za-z0-9_.-]*[ \t]*(?:[=:][ \t]*)?$/,
  iniBoolean: /^(?:true|false|yes|no|on|off)$/i,
  iniString: /^(?:"(?:[^"\\]|\\.)*"|'[^']*')$/,
  /** The `yaml` form's lines: a comment or a document marker, a sequence item, an entry. */
  yamlSkip: /^(?:[ \t]*(?:#.*)?|---[ \t]*|\.\.\.[ \t]*)$/,
  yamlItem: /^(?<indent> *)-(?:[ \t]|$)/,
  yamlEntry: /^(?<indent> *)(?<name>[A-Za-z0-9_][A-Za-z0-9_.\/-]*)[ \t]*:(?:[ \t]+(?<value>.*?))?[ \t]*$/,
  yamlComment: /[ \t]+#.*$/,
  /** A tab in a line's indentation; an anchor, an alias or a tag opening a value. */
  yamlTab: /^ *\t/,
  yamlNode: /^[&*!]/,
  yamlBlock: /^[|>][-+0-9]*$/,
  yamlDouble: /^(?<quoted>"(?:[^"\\]|\\.)*")(?:[ \t]+#.*)?$/,
  yamlSingle: /^(?<quoted>'(?:[^']|'')*')(?:[ \t]+#.*)?$/,
  yamlBoolean: /^(?:true|false|True|False|TRUE|FALSE)$/,
  yamlNull: /^(?:null|Null|NULL|~)$/,
} as const;

const DEFINITIONS: Readonly<Record<LimitLanguage, readonly RegExp[]>> = {
  python: [LIMIT_PATTERNS.python],
  javascript: [LIMIT_PATTERNS.javascript, LIMIT_PATTERNS.javascriptField],
  go: [LIMIT_PATTERNS.go],
  java: [LIMIT_PATTERNS.java],
  c: [LIMIT_PATTERNS.cDefine, LIMIT_PATTERNS.cDeclaration],
};

/** A constant's kind by its name, or undefined where the name is no limit. */
export function kindOf(name: string): LimitKind | undefined {
  return LIMIT_DEFAULT.kinds.find((kind) => LIMIT_PATTERNS[kind].test(name));
}

/** A number's type: decimal where it has a fraction or an exponent, integer otherwise (a hexadecimal, binary or octal number among them). */
const numberType = (text: string): ValueType => (LIMIT_PATTERNS.decimal.test(text) ? 'decimal' : 'integer');

/** The text inside every pair of parentheses that encloses all of it. */
function withoutEnclosingParentheses(text: string): string {
  let t = text;
  while (t.startsWith('(') && t.endsWith(')')) {
    let depth = 0, closesEarly = false;
    for (let i = 0; i < t.length - 1; i++) {
      if (t[i] === '(') depth++;
      else if (t[i] === ')' && --depth === 0) { closesEarly = true; break; }
    }
    if (closesEarly) break;
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** Whether the text is numbers joined by binary operators, each operand optionally signed and parenthesised. */
function isExpression(text: string): boolean {
  const token = new RegExp(LIMIT_PATTERNS.expressionToken.source, 'y');
  let expectOperand = true, depth = 0, operators = 0, at = 0;
  while (at < text.length) {
    token.lastIndex = at;
    const m = token.exec(text);
    if (m === null) return false;
    at = token.lastIndex;
    const g = m.groups!;
    if (expectOperand) {
      if (g['open'] !== undefined) depth++;
      else if (g['number'] !== undefined) expectOperand = false;
      else if (g['operator'] !== '-' && g['operator'] !== '+') return false;
    } else if (g['close'] !== undefined) {
      if (--depth < 0) return false;
    } else if (g['operator'] !== undefined) { operators++; expectOperand = true; } else return false;
    if (at < text.length && /^[ \t]*$/u.test(text.slice(at))) at = text.length;
  }
  return !expectOperand && depth === 0 && operators > 0;
}

/** A source value's type, or null where no value form takes it. A string is one literal the lexer read as plain, spanning the value. */
function codeValueType(value: string, string: StringToken | undefined): ValueType | null {
  if (string !== undefined) return string.value !== null && !LIMIT_PATTERNS.formatted.test(value) ? 'string' : null;
  const inner = withoutEnclosingParentheses(value);
  if (LIMIT_PATTERNS.boolean.test(inner)) return 'boolean';
  if (LIMIT_PATTERNS.number.test(inner)) return numberType(inner);
  return isExpression(inner) ? 'expression' : null;
}

interface Lines { readonly starts: readonly number[]; readonly text: string }
const lineText = (lines: Lines, index: number, source: string = lines.text): string =>
  source.slice(index === 0 && lines.text.startsWith('﻿') ? 1 : lines.starts[index]!, index + 1 < lines.starts.length ? lines.starts[index + 1]! : lines.text.length).replace(/(?:\r\n|\r|\n)$/u, '');
const quoteOf = (lines: Lines, index: number): string => lineText(lines, index).replace(/^[ \t]+|[ \t]+$/gu, '');

const scan = (text: string, language: LimitLanguage): Scanned =>
  language === 'python' ? scanPython(text)
    : scanCLike(text, language === 'javascript' ? { javascript: true } : language === 'go' ? { go: true } : language === 'java' ? { java: true } : {});

/** Every limit constant one source body defines, in line order. */
export function recognizeConstants(text: string, language: LimitLanguage): RecognizedLimits {
  const scanned = scan(text, language);
  if (!scanned.ok) return { ok: false, parseFault: scanned.fault };
  const lines: Lines = { starts: lineStarts(text), text };
  const stringAt = new Map(scanned.strings.map((s) => [s.start, s]));
  const limits: RawLimit[] = [];
  for (let index = 0; index < lines.starts.length; index++) {
    const code = lineText(lines, index, scanned.code);
    const offset = index === 0 && text.startsWith('﻿') ? 1 : lines.starts[index]!;
    for (const form of DEFINITIONS[language]) {
      const m = form.exec(code);
      if (m === null) continue;
      const name = m.groups!['name']!;
      const kind = kindOf(name);
      if (kind === undefined) break;
      const [from, to] = m.indices!.groups!['value']!;
      const value = text.slice(offset + from, offset + to);
      const string = stringAt.get(offset + from);
      const valueType = value === '' ? null : codeValueType(value, string !== undefined && string.end === offset + to ? string : undefined);
      limits.push({ source: 'code', kind, name, value: valueType === null ? null : value, valueType, line: index + 1, quote: quoteOf(lines, index) });
      break;
    }
  }
  return { ok: true, limits, sequenceItems: 0 };
}

const iniValueType = (value: string): ValueType => {
  if (LIMIT_PATTERNS.iniBoolean.test(value)) return 'boolean';
  if (LIMIT_PATTERNS.number.test(value)) return numberType(value);
  return LIMIT_PATTERNS.iniString.test(value) ? 'string' : 'text';
};

/** Every entry an `ini`-form body sets: a key and a value after `=`, `:` or white space, under the last section. A line that is neither a
 * comment, a section, a key alone nor an entry, or an entry whose value opens a block (`{`) or a line that closes one, is outside the
 * grammar. */
function recognizeIni(text: string): RecognizedLimits {
  const lines: Lines = { starts: lineStarts(text), text };
  const limits: RawLimit[] = [];
  let section: string | null = null;
  for (let index = 0; index < lines.starts.length; index++) {
    const line = lineText(lines, index);
    if (LIMIT_PATTERNS.iniComment.test(line) || LIMIT_PATTERNS.iniKeyOnly.test(line)) continue;
    const s = LIMIT_PATTERNS.iniSection.exec(line);
    if (s !== null) { section = s.groups!['section']!.trim(); continue; }
    const e = LIMIT_PATTERNS.iniEntry.exec(line);
    if (e === null || e.groups!['value']!.endsWith('{')) return { ok: false, parseFault: 'outside-grammar' };
    const key = e.groups!['name']!, value = e.groups!['value']!;
    limits.push({ source: 'config', kind: 'entry', name: section === null ? key : `${section}.${key}`, value, valueType: iniValueType(value), line: index + 1, quote: quoteOf(lines, index) });
  }
  return { ok: true, limits, sequenceItems: 0 };
}

/** Every entry a `yaml`-form body sets, in the subset this version reads: block mappings of plain keys whose values are scalars on their
 * own line. A key with no value opens a mapping; a sequence item and every line indented under it is skipped and counted; a block scalar
 * (`|`, `>`) is an entry whose value is Unknown, and the lines under it are skipped; a flow collection closed on its line is an entry
 * whose value is Unknown. An anchor, an alias, a tag, a flow collection or a quoted scalar not closed on its line, a tab in indentation and
 * any other line are outside the grammar. */
function recognizeYaml(text: string): RecognizedLimits {
  const lines: Lines = { starts: lineStarts(text), text };
  const limits: RawLimit[] = [];
  const parents: { readonly indent: number; readonly name: string }[] = [];
  let sequenceItems = 0;
  let skipUnder: { readonly indent: number; readonly items: boolean } | null = null;
  for (let index = 0; index < lines.starts.length; index++) {
    const line = lineText(lines, index);
    if (LIMIT_PATTERNS.yamlSkip.test(line)) continue;
    if (LIMIT_PATTERNS.yamlTab.test(line)) return { ok: false, parseFault: 'outside-grammar' };
    const indent = /^ */u.exec(line)![0].length;
    const item = LIMIT_PATTERNS.yamlItem.exec(line);
    if (skipUnder !== null) {
      if (indent > skipUnder.indent || (skipUnder.items && indent === skipUnder.indent && item !== null)) {
        if (item !== null && indent === skipUnder.indent) sequenceItems++;
        continue;
      }
      skipUnder = null;
    }
    if (item !== null) { sequenceItems++; skipUnder = { indent, items: true }; continue; }
    const e = LIMIT_PATTERNS.yamlEntry.exec(line);
    if (e === null) return { ok: false, parseFault: 'outside-grammar' };
    while (parents.length > 0 && parents.at(-1)!.indent >= indent) parents.pop();
    const key = e.groups!['name']!;
    const name = [...parents.map((p) => p.name), key].join('.');
    const raw = e.groups!['value'] ?? '';
    if (raw === '' || raw.startsWith('#')) { parents.push({ indent, name: key }); continue; }
    const entry = (value: string | null, valueType: ValueType | null): void => {
      limits.push({ source: 'config', kind: 'entry', name, value, valueType, line: index + 1, quote: quoteOf(lines, index) });
    };
    if (LIMIT_PATTERNS.yamlNode.test(raw)) return { ok: false, parseFault: 'outside-grammar' };
    if (raw.startsWith('"') || raw.startsWith('\'')) {
      const q = (raw.startsWith('"') ? LIMIT_PATTERNS.yamlDouble : LIMIT_PATTERNS.yamlSingle).exec(raw);
      if (q === null) return { ok: false, parseFault: 'outside-grammar' };
      entry(q.groups!['quoted']!, 'string');
      continue;
    }
    const plain = raw.replace(LIMIT_PATTERNS.yamlComment, '');
    if (LIMIT_PATTERNS.yamlBlock.test(plain)) { entry(null, null); skipUnder = { indent, items: false }; continue; }
    if (plain.startsWith('[') || plain.startsWith('{')) {
      if (!plain.endsWith(plain.startsWith('[') ? ']' : '}')) return { ok: false, parseFault: 'outside-grammar' };
      entry(null, null);
      continue;
    }
    entry(plain, LIMIT_PATTERNS.yamlBoolean.test(plain) ? 'boolean' : LIMIT_PATTERNS.yamlNull.test(plain) ? 'null'
      : LIMIT_PATTERNS.number.test(plain) ? numberType(plain) : 'text');
  }
  return { ok: true, limits, sequenceItems };
}

/** Every entry one configuration body sets, in line order. */
export const recognizeConfig = (text: string, form: ConfigForm): RecognizedLimits => (form === 'ini' ? recognizeIni(text) : recognizeYaml(text));
