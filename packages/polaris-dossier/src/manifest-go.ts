import { lineIndex, type RawFact, type Recognized } from './manifest-model.js';

/** Rule `go-module-manifest` version 1 (REQ-polaris-generation-034 version 2.7): every blob whose basename is `go.mod`, read line by line
 * under the go.mod grammar. It reads the `module` directive (exactly one: one `module` fact, its name the module path, unquoted where it
 * is quoted) and the `require` directives, single-line or in a block (one `dependency` per required module path, section `require`, or
 * `require-indirect` where the line's comment is exactly `// indirect`, group null), each fact spanning its directive's own line. The
 * directives `go`, `toolchain`, `godebug`, `replace`, `exclude`, `retract`, `tool` and `ignore`, single-line or in a block, are skipped.
 *
 * Faults, first that applies: `syntax` (a leading U+FEFF, a NUL, an unterminated quote, a block left open, a `)` outside a block, a
 * `require` line that is not a path and a version); `field-type` (no `module` directive, or more than one); `beyond-reader` (any other
 * line that is not blank or a comment, a `module` block, or a double-quoted path holding a backslash escape, which this reader does not
 * decode). Under declared-source policies 1.0.0 and 2.0.0 no `go.mod` is admitted, so this rule reads no file there. Pure. */

export const isGoModulePath = (path: string): boolean => path === 'go.mod' || path.endsWith('/go.mod');

const SKIPPED = new Set(['go', 'toolchain', 'godebug', 'replace', 'exclude', 'retract', 'tool', 'ignore']);

/** One line's tokens (quoted ones kept with their quotes) and its comment from `//`, or undefined for an unterminated quote. */
function lex(line: string): { readonly tokens: readonly string[]; readonly comment: string | null } | undefined {
  const tokens: string[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i]!;
    if (c === ' ' || c === '\t') { i++; continue; }
    if (line.startsWith('//', i)) return { tokens, comment: line.slice(i).trimEnd() };
    if (c === '"' || c === '`') {
      let j = i + 1;
      while (j < line.length && line[j] !== c) j += c === '"' && line[j] === '\\' ? 2 : 1;
      if (j >= line.length) return undefined;
      tokens.push(line.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (c === '(' || c === ')') { tokens.push(c); i++; continue; }
    let j = i;
    while (j < line.length && !/[\s()"`]/u.test(line[j]!) && !line.startsWith('//', j)) j++;
    tokens.push(line.slice(i, j));
    i = j;
  }
  return { tokens, comment: null };
}

export function recognizeGoModule(text: string): Recognized {
  if (text.startsWith('\uFEFF') || text.includes('\0')) return { ok: false, parseFault: 'syntax' };
  const lineOf = lineIndex(text);
  const facts: RawFact[] = [];
  let block: string | null = null, modules = 0, beyond = false;
  const unquote = (token: string): string | undefined => {
    if (token.startsWith('`')) return token.slice(1, -1);
    if (token.startsWith('"')) { if (token.includes('\\')) { beyond = true; return undefined; } return token.slice(1, -1); }
    return token;
  };
  const readRequirement = (tokens: readonly string[], comment: string | null, line: number): boolean => {
    if (tokens.length !== 2 || tokens.some((token) => token === '(' || token === ')')) return false;
    const path = unquote(tokens[0]!);
    if (path !== undefined) facts.push({ fact: 'dependency', lines: { first: line, last: line }, values: [path, comment === '// indirect' ? 'require-indirect' : 'require', null] });
    return true;
  };
  for (let start = 0; start <= text.length;) {
    let end = start;
    while (end < text.length && text[end] !== '\n' && text[end] !== '\r') end++;
    const lineText = text.slice(start, end), line = lineOf(start);
    const next = text[end] === '\r' && text[end + 1] === '\n' ? end + 2 : end + 1;
    start = next;
    const lexed = lex(lineText);
    if (lexed === undefined) return { ok: false, parseFault: 'syntax' };
    const { tokens, comment } = lexed;
    if (tokens.length === 0) continue;
    if (block !== null) {
      if (tokens.length === 1 && tokens[0] === ')') { block = null; continue; }
      if (block === 'require' && !readRequirement(tokens, comment, line)) return { ok: false, parseFault: 'syntax' };
      continue;
    }
    const verb = tokens[0]!;
    if (verb === ')') return { ok: false, parseFault: 'syntax' };
    const opensBlock = tokens.length === 2 && tokens[1] === '(';
    if (verb === 'module') {
      if (opensBlock) { beyond = true; block = 'module'; continue; }
      if (tokens.length !== 2) return { ok: false, parseFault: 'syntax' };
      modules++;
      const name = unquote(tokens[1]!);
      if (name !== undefined) facts.push({ fact: 'module', lines: { first: line, last: line }, values: [name] });
    } else if (verb === 'require') {
      if (opensBlock) block = 'require';
      else if (!readRequirement(tokens.slice(1), comment, line)) return { ok: false, parseFault: 'syntax' };
    } else if (SKIPPED.has(verb)) {
      if (opensBlock) block = verb;
    } else beyond = true;
  }
  if (block !== null) return { ok: false, parseFault: 'syntax' };
  if (modules !== 1) return { ok: false, parseFault: 'field-type' };
  if (beyond) return { ok: false, parseFault: 'beyond-reader' };
  return { ok: true, facts };
}
