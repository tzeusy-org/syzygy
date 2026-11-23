import { lineIndex, type RawFact, type Recognized } from './manifest-model.js';

/** Rule `terraform-configuration` version 1 (REQ-polaris-generation-034, infrastructure recognizers, syzygy-3efd.26): every blob whose basename ends
 * in `.tf` after at least one other character (never `.tf.json`, `.tfvars`, `.tfstate` or `.terraform.lock.hcl`), read as HCL native
 * syntax by the small lexer below, and only its top-level blocks: each `resource` block (exactly two labels: one `terraform-resource`
 * fact, its type and name) and each `module` block (exactly one label and a body attribute `source` whose expression is one quoted string
 * holding no template sequence: one `terraform-module` fact, its name and its source, decoded). Every other block, attribute and
 * expression, nested blocks included, is skipped. A fact spans its block from the line of its type keyword through the line of its
 * closing brace. Pure.
 *
 * The lexer reads `#`, `//` and `/* *\/` comments; blocks with identifier or quoted labels, nested to `MAX_DEPTH`; attributes whose
 * expressions run across lines inside brackets, braces and parentheses; quoted templates holding `${...}` and `%{...}` sequences with
 * strings nested in them (and the `$${` and `%%{` escapes); and heredoc templates opened by `<<ID` or `<<-ID`, whose lines it never reads
 * as blocks. It is iterative, so no input exhausts the stack. Faults, in order: an attribute repeated in a top-level `module` block's body
 * is `duplicate-key`; an unbalanced brace, bracket or parenthesis, an unterminated string, heredoc or comment, an attribute repeated in
 * any other body, and any text that is not a block, an attribute, a comment or white space are `syntax`; a `resource` block with other
 * than two labels, a `module` block with other than one, or whose `source` is absent or not one quoted string free of template
 * sequences, is `field-type`; and a block nested deeper than `MAX_DEPTH` is `beyond-reader`. An empty or whitespace-only file is
 * Inferred with zero facts. */

export const isTerraformPath = (path: string): boolean => /^.+\.tf$/u.test(path.slice(path.lastIndexOf('/') + 1));

/** The deepest block the reader reads: a top-level block is at depth 1. */
export const MAX_DEPTH = 256;

const IDENT_START = /[\p{L}_]/u;
const IDENT_PART = /[\p{L}\p{N}_-]/u;

class SyntaxStop {}

interface Body {
  /** The attribute names this body holds, to find a repeated one. */
  readonly attributes: Set<string>;
  /** The top-level block this body belongs to, where it is one (depth 1). */
  readonly block?: TopBlock;
}
interface TopBlock { readonly type: string; readonly labels: readonly string[]; readonly firstLine: number; source?: { readonly literal: string | undefined } }

export function recognizeTerraform(text: string): Recognized {
  if (text.charCodeAt(0) === 0xfeff) return { ok: false, parseFault: 'syntax' };
  const lineOf = lineIndex(text);
  const n = text.length;
  let i = 0;
  let duplicateKey = false, syntax = false, fieldType = false, beyond = false;
  const facts: RawFact[] = [];
  const stack: Body[] = [{ attributes: new Set() }];
  const fail = (): never => { throw new SyntaxStop(); };
  const isNewline = (c: string | undefined): boolean => c === '\n' || c === '\r';

  /** Skips spaces, tabs and comments on this line (a `/* *\/` comment may run across lines); with `newlines`, line ends too. */
  const skip = (newlines: boolean): void => {
    for (;;) {
      const c = text[i];
      if (c === ' ' || c === '\t' || (newlines && isNewline(c))) { i++; continue; }
      if (c === '#' || (c === '/' && text[i + 1] === '/')) { while (i < n && !isNewline(text[i])) i++; continue; }
      if (c === '/' && text[i + 1] === '*') {
        const end = text.indexOf('*/', i + 2);
        if (end < 0) fail();
        i = end + 2;
        continue;
      }
      return;
    }
  };

  const identifier = (): string | undefined => {
    if (i >= n || !IDENT_START.test(text[i]!)) return undefined;
    const start = i;
    i++;
    while (i < n && IDENT_PART.test(text[i]!)) i++;
    return text.slice(start, i);
  };

  /** A quoted label from `i` (at its quote): its decoded value; a template sequence or a line end in it is `syntax`. */
  const label = (): string => {
    const literal = quotedLiteral();
    if (literal === undefined) fail();
    return literal!;
  };

  /** A quoted string from `i` (at its quote) that holds no template sequence: its decoded value, with `i` after the closing quote; or
   * undefined (the position unchanged) where it holds one. An unterminated string is `syntax`. */
  const quotedLiteral = (): string | undefined => {
    const start = i;
    let out = '';
    i++;
    for (;;) {
      const c = text[i];
      if (c === undefined || isNewline(c)) fail();
      if (c === '"') { i++; return out; }
      if (c === '\\') {
        const e = text[i + 1];
        const simple: Record<string, string> = { n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' };
        if (e !== undefined && simple[e] !== undefined) { out += simple[e]; i += 2; continue; }
        const width = e === 'u' ? 4 : e === 'U' ? 8 : 0;
        const hex = text.slice(i + 2, i + 2 + width);
        if (width === 0 || !new RegExp(`^[0-9A-Fa-f]{${width}}$`, 'u').test(hex) || parseInt(hex, 16) > 0x10ffff) fail();
        out += String.fromCodePoint(parseInt(hex, 16));
        i += 2 + width;
        continue;
      }
      if ((c === '$' || c === '%') && text[i + 1] === c && text[i + 2] === '{') { out += `${c}{`; i += 3; continue; }
      if ((c === '$' || c === '%') && text[i + 1] === '{') { skipString(start); return undefined; }
      out += c;
      i++;
    }
  };

  /** Moves `i` past the quoted template that opens at `start`, its sequences and the strings nested in them included. */
  const skipString = (start: number): void => {
    i = start;
    expression(true);
  };

  /** Reads a heredoc from `i` (at `<<`): `<<ID` or `<<-ID`, then lines up to one whose text, white space trimmed, is ID. */
  const heredoc = (): void => {
    i += 2;
    if (text[i] === '-') i++;
    const id = identifier();
    if (id === undefined) fail();
    while (text[i] === ' ' || text[i] === '\t') i++;
    if (!isNewline(text[i])) fail();
    for (;;) {
      // At a line end: step past it, then read the next line.
      if (text[i] === '\r' && text[i + 1] === '\n') i += 2; else i++;
      if (i >= n) fail();
      let end = i;
      while (end < n && !isNewline(text[end])) end++;
      const line = text.slice(i, end);
      i = end;
      if (line.trim() === id) return;
      if (i >= n) fail();
    }
  };

  /** An expression from `i`. At the top (`stringOnly` false), it ends before a line end or a `}` that closes no bracket it opened; with
   * `stringOnly`, `i` is at a quote and it ends after that string closes. Brackets, strings, template sequences and heredocs nest by an
   * explicit stack. */
  const expression = (stringOnly: boolean): void => {
    const frames: ('(' | '[' | '{' | '"' | '${')[] = [];
    if (stringOnly) { frames.push('"'); i++; }
    for (;;) {
      const top = frames[frames.length - 1];
      if (top === '"') {
        const c = text[i];
        if (c === undefined || isNewline(c)) fail();
        if (c === '"') { i++; frames.pop(); if (stringOnly && frames.length === 0) return; continue; }
        if (c === '\\') { i += 2; continue; }
        if ((c === '$' || c === '%') && text[i + 1] === c && text[i + 2] === '{') { i += 3; continue; }
        if ((c === '$' || c === '%') && text[i + 1] === '{') { frames.push('${'); i += 2; continue; }
        i++;
        continue;
      }
      skip(frames.length > 0);
      const c = text[i];
      if (c === undefined) { if (frames.length > 0) fail(); return; }
      if (isNewline(c)) return;
      if (c === '"') { frames.push('"'); i++; continue; }
      if (c === '<' && text[i + 1] === '<' && (text[i + 2] === '-' || IDENT_START.test(text[i + 2] ?? ''))) { heredoc(); continue; }
      if (c === '(' || c === '[' || c === '{') { frames.push(c); i++; continue; }
      if (c === ')' || c === ']' || c === '}') {
        if (frames.length === 0) { if (c === '}') return; fail(); }
        const want = c === ')' ? '(' : c === ']' ? '[' : top === '${' ? '${' : '{';
        if (top !== want) fail();
        frames.pop();
        i++;
        continue;
      }
      i++;
    }
  };

  /** The decoded value of an attribute's expression where it is one quoted string free of template sequences, else undefined. */
  const literalExpression = (): string | undefined => {
    const start = i;
    skip(false);
    let literal: string | undefined;
    if (text[i] === '"') {
      literal = quotedLiteral();
      if (literal !== undefined) {
        skip(false);
        if (!(i >= n || isNewline(text[i]) || text[i] === '}')) literal = undefined;
      }
    }
    i = start;
    expression(false);
    return literal;
  };

  try {
    for (;;) {
      skip(true);
      const body = stack[stack.length - 1]!;
      if (i >= n) { if (stack.length > 1) fail(); break; }
      if (text[i] === '}') {
        if (stack.length === 1) fail();
        const closing = lineOf(i);
        i++;
        stack.pop();
        if (body.block !== undefined) closeTop(body.block, closing);
        continue;
      }
      const at = i;
      const name = identifier();
      if (name === undefined) fail();
      skip(false);
      if (text[i] === '=' && text[i + 1] !== '=') {
        i++;
        if (body.attributes.has(name!)) { if (body.block?.type === 'module') duplicateKey = true; else fail(); }
        body.attributes.add(name!);
        if (body.block?.type === 'module' && name === 'source') body.block.source = { literal: literalExpression() };
        else expression(false);
        continue;
      }
      const labels: string[] = [];
      for (;;) {
        if (text[i] === '"') labels.push(label());
        else { const word = identifier(); if (word === undefined) break; labels.push(word); }
        skip(false);
      }
      if (text[i] !== '{') fail();
      i++;
      const depth = stack.length;
      if (depth > MAX_DEPTH) beyond = true;
      stack.push({ attributes: new Set(), ...(depth === 1 ? { block: { type: name!, labels, firstLine: lineOf(at) } } : {}) });
    }
  } catch (stop) {
    if (!(stop instanceof SyntaxStop)) throw stop;
    syntax = true;
  }

  function closeTop(block: TopBlock, lastLine: number): void {
    const lines = { first: block.firstLine, last: lastLine };
    if (block.type === 'resource') {
      if (block.labels.length !== 2) { fieldType = true; return; }
      facts.push({ fact: 'terraform-resource', lines, values: [block.labels[0]!, block.labels[1]!] });
    } else if (block.type === 'module') {
      if (block.labels.length !== 1 || block.source?.literal === undefined) { fieldType = true; return; }
      facts.push({ fact: 'terraform-module', lines, values: [block.labels[0]!, block.source.literal] });
    }
  }

  if (duplicateKey) return { ok: false, parseFault: 'duplicate-key' };
  if (syntax) return { ok: false, parseFault: 'syntax' };
  if (fieldType) return { ok: false, parseFault: 'field-type' };
  if (beyond) return { ok: false, parseFault: 'beyond-reader' };
  return { ok: true, facts };
}
