import type { RawFact, Recognized } from './manifest-model.js';

/** Rule `makefile` version 1 (REQ-polaris-generation-034 version 2.12, syzygy-3efd.26): every blob whose basename is exactly `Makefile`,
 * `makefile` or `GNUmakefile`, read as a makefile in GNU make's syntax, yielding one `make-target` fact for each distinct target an
 * explicit rule names, spanning the physical lines of the first rule's logical line. Make has no grammar in the sense TOML or YAML do:
 * this reader classifies each logical line (physical lines joined by a trailing backslash) and reads no prerequisite and no recipe. Pure.
 *
 * - A recipe line is a physical line that begins with a tab and follows a rule's logical line or another recipe line, with only blank
 *   lines, comment lines and recipe lines between; it is never read. A tab-led line anywhere else is read as any other logical line.
 * - A `define` body runs to its matching `endef` and is never read.
 * - A rule is a logical line holding a `:` outside a variable reference (`$(...)`, `${...}`) that is not part of an assignment operator,
 *   with no assignment operator before it outside a variable reference (`A := b: c` is an assignment). Its targets are the words before
 *   its separator (`:` or `::`); a word holding `%` or `$`, and a word that begins with `.` and holds no `/` (a special target or a suffix
 *   rule), yields no fact. A rule whose text after its separator holds an assignment operator before any `;` is a target-specific
 *   variable assignment: no fact, and no recipe follows it. A target named inside a conditional is declared all the same.
 * - Directives read: `include`, `-include`, `sinclude`, `override`, `export`, `unexport`, `private`, `vpath`, `undefine`, `define` and
 *   `endef`, `ifeq`, `ifneq`, `ifdef`, `ifndef`, `else` and `endif`; assignment operators `=`, `:=`, `::=`, `:::=`, `?=`, `+=` and `!=`.
 *
 * Faults: a recipe line before the first rule (a tab-led line that is no other line), a `define` with no matching `endef`, an `else`,
 * `endif` or `endef` with nothing open, a conditional still open at the end, an unbalanced variable reference, and a logical line that is
 * none of a comment, a rule, an assignment, a directive and a recipe line and does not begin with `$(` or `${`, are `syntax`; a logical
 * line beginning with `$(` or `${` that is neither a rule nor an assignment (a function call such as `$(eval ...)`, which may declare a
 * rule no reader sees without expanding it), and an assignment to `.RECIPEPREFIX`, are `beyond-reader`. An empty file has zero facts. */

export const MAKEFILE_BASENAMES: readonly string[] = ['Makefile', 'makefile', 'GNUmakefile'];
export const isMakefilePath = (path: string): boolean => MAKEFILE_BASENAMES.includes(path.slice(path.lastIndexOf('/') + 1));

const CONDITIONALS = ['ifeq', 'ifneq', 'ifdef', 'ifndef'];
const PREFIXES = ['override', 'export', 'private', 'unexport'];
const DIRECTIVES = ['include', '-include', 'sinclude', 'override', 'export', 'unexport', 'private', 'vpath', 'undefine'];

/** Where a scan of a logical line found its first separator `:` and its first assignment operator outside variable references. */
interface Scan { readonly colon: number; readonly colonWidth: number; readonly op: number; readonly balanced: boolean }

/** Scans `s` from `from` to `to` (exclusive): the first `:` that is no part of an assignment operator, and the first assignment operator,
 * each outside variable references (-1 where none), and whether every variable reference closes. */
function scan(s: string, from = 0, to = s.length): Scan {
  let colon = -1, colonWidth = 0, op = -1;
  const closers: string[] = [];
  for (let i = from; i < to; i++) {
    const c = s[i]!;
    if (c === '$') {
      const next = s[i + 1];
      if (next === '(' || next === '{') { closers.push(next === '(' ? ')' : '}'); i++; continue; }
      i++;
      continue;
    }
    if (closers.length > 0) {
      if (c === '(' || c === '{') closers.push(c === '(' ? ')' : '}');
      else if (c === closers[closers.length - 1]) closers.pop();
      continue;
    }
    // The first assignment operator wherever it stands; a separator only where it comes first.
    if (op >= 0) continue;
    if (s.startsWith(':::=', i) || s.startsWith('::=', i) || s.startsWith(':=', i)) { op = i; continue; }
    if (c === ':') { if (colon < 0) { colon = i; colonWidth = s[i + 1] === ':' ? 2 : 1; } if (s[i + 1] === ':') i++; continue; }
    if (c === '=' || ((c === '?' || c === '+' || c === '!') && s[i + 1] === '=')) { op = i; continue; }
  }
  return { colon, colonWidth, op, balanced: closers.length === 0 };
}

/** The first `;` of `s` from `from` outside variable references, or `s.length`. */
function semicolonOf(s: string, from: number): number {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const c = s[i]!;
    if (c === '$' && (s[i + 1] === '(' || s[i + 1] === '{')) { depth++; i++; continue; }
    if (c === '$') { i++; continue; }
    if (depth > 0) { if (c === '(' || c === '{') depth++; else if (c === ')' || c === '}') depth--; continue; }
    if (c === ';') return i;
  }
  return s.length;
}

/** A logical line without its comment: an unescaped `#` starts one. */
function withoutComment(s: string): string {
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === '#') return s.slice(0, i);
  }
  return s;
}

const firstWord = (s: string): string => /^[^\s(]*/u.exec(s)![0];

export function recognizeMakefile(text: string): Recognized {
  if (text.charCodeAt(0) === 0xfeff) return { ok: false, parseFault: 'syntax' };
  // Physical lines by the path-and-range check's line rule (CRLF, CR or LF; a final terminator opens no line).
  const lines: string[] = [];
  for (let start = 0, i = 0; ; i++) {
    if (i >= text.length) { if (start < text.length) lines.push(text.slice(start)); break; }
    const c = text[i];
    if (c === '\r' || c === '\n') { lines.push(text.slice(start, i)); if (c === '\r' && text[i + 1] === '\n') i++; start = i + 1; }
  }
  const continues = (line: string): boolean => (/\\+$/u.exec(line)?.[0].length ?? 0) % 2 === 1;

  let syntax = false, beyond = false;
  let inRecipe = false, conditionals = 0;
  const facts: RawFact[] = [];
  const seen = new Set<string>();

  for (let ln = 0; ln < lines.length;) {
    const first = ln;
    // A logical line: physical lines joined while one ends in an odd run of backslashes.
    let logical = lines[ln]!;
    while (continues(lines[ln]!) && ln + 1 < lines.length) { logical = `${logical.slice(0, -1)} ${lines[ln + 1]!.replace(/^[ \t]+/u, '')}`; ln++; }
    ln++;
    const last = ln - 1;
    const physical = lines[first]!;
    if (/^[ \t]*$/u.test(logical)) continue;
    if (physical.startsWith('\t') && inRecipe) continue;
    const trimmed = logical.replace(/^[ \t]+/u, '');
    if (trimmed.startsWith('#')) continue;
    inRecipe = false;
    const content = withoutComment(trimmed).trimEnd();
    if (content === '') continue;

    // Prefix words (`override`, `export`, `private`, `unexport`) before a `define` or an assignment.
    let rest = content;
    for (;;) { const word = firstWord(rest); if (!PREFIXES.includes(word) || rest.length === word.length) break; rest = rest.slice(word.length).replace(/^[ \t]+/u, ''); }
    const word = firstWord(rest);

    if (CONDITIONALS.includes(word) && (rest.length === word.length || /[\s(]/u.test(rest[word.length]!))) { conditionals++; continue; }
    if (word === 'else') { if (conditionals === 0) syntax = true; continue; }
    if (word === 'endif') { if (conditionals === 0) syntax = true; else conditionals--; continue; }
    if (word === 'endef') { syntax = true; continue; }
    if (word === 'define' && (rest.length === word.length || /\s/u.test(rest[word.length]!))) {
      if (/^define\s+\.RECIPEPREFIX(?:\s|$)/u.test(rest)) beyond = true;
      // The body, never read, to its matching `endef`; a `define` inside it nests.
      let depth = 1;
      while (ln < lines.length && depth > 0) {
        const bodyLine = lines[ln]!.replace(/^[ \t]+/u, '');
        const w = firstWord(bodyLine);
        if (w === 'endef') depth--;
        else if (w === 'define' || (PREFIXES.includes(w) && /^\S+\s+define(?:\s|$)/u.test(bodyLine))) depth++;
        ln++;
      }
      if (depth > 0) syntax = true;
      continue;
    }

    const found = scan(content);
    if (!found.balanced) { syntax = true; continue; }
    if (found.op >= 0 && (found.colon < 0 || found.op < found.colon)) {
      // An assignment; one to `.RECIPEPREFIX` changes which lines are recipe lines.
      let name = content.slice(0, found.op).trim();
      for (;;) { const w = firstWord(name); if (!PREFIXES.includes(w) || name.length === w.length) break; name = name.slice(w.length).trim(); }
      if (name === '.RECIPEPREFIX') beyond = true;
      continue;
    }
    if (found.colon >= 0) {
      const after = found.colon + found.colonWidth;
      const tail = scan(content, after, semicolonOf(content, after));
      if (!tail.balanced) { syntax = true; continue; }
      // A target-specific variable assignment: an assignment operator after the separator and before any `;`.
      if (tail.op >= 0) continue;
      inRecipe = true;
      for (const target of content.slice(0, found.colon).split(/[ \t]+/u)) {
        if (target === '' || /[%$]/u.test(target) || (target.startsWith('.') && !target.includes('/'))) continue;
        if (seen.has(target)) continue;
        seen.add(target);
        facts.push({ fact: 'make-target', lines: { first: first + 1, last: last + 1 }, values: [target] });
      }
      continue;
    }
    if (DIRECTIVES.includes(word)) continue;
    if (content.startsWith('$(') || content.startsWith('${')) { beyond = true; continue; }
    // A tab-led line before the first rule is a recipe before any target; any other line is no line this syntax holds.
    syntax = true;
  }
  if (conditionals > 0) syntax = true;
  if (syntax) return { ok: false, parseFault: 'syntax' };
  if (beyond) return { ok: false, parseFault: 'beyond-reader' };
  return { ok: true, facts };
}
