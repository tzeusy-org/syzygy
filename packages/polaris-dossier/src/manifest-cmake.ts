import { lineIndex, type RawFact, type Recognized } from './manifest-model.js';

/** Rule `cmake-lists` version 1 (REQ-polaris-generation-034, infrastructure recognizers, syzygy-3efd.26): every blob whose basename is exactly
 * `CMakeLists.txt`, read in the CMake language (cmake-language(7)), whose whole grammar this reader reads: command invocations, bracket,
 * quoted and unquoted arguments with nested parentheses, line and bracket comments, and line continuation in a quoted argument. For each
 * invocation named `project` (compared without regard to ASCII case) it yields one `cmake-project` fact, its name the first argument; for
 * each named `add_executable`, `add_library` or `add_custom_target`, one `cmake-target` fact, its target the first argument and its
 * `targetKind` `executable`, `library` or `custom`; wherever the invocation stands, inside an `if`, `function` or `macro` body or not.
 * An argument is taken without a quoted or bracket argument's delimiters and with a quoted (or unquoted) argument's escape sequences
 * resolved; a variable reference or generator expression in it is never expanded. A fact spans its invocation from the line of its
 * command name through the line of its closing parenthesis. Faults: an unterminated quoted argument, bracket argument, bracket comment or
 * parenthesis, and text that is not a command invocation, a comment or white space, are `syntax`; one of the four commands with no
 * argument is `field-type`. An empty file has zero facts. Pure. */

export const isCMakeListsPath = (path: string): boolean => path.slice(path.lastIndexOf('/') + 1) === 'CMakeLists.txt';

const TARGET_KINDS: Readonly<Record<string, string>> = { add_executable: 'executable', add_library: 'library', add_custom_target: 'custom' };

class SyntaxStop {}

export function recognizeCMakeLists(text: string): Recognized {
  if (text.charCodeAt(0) === 0xfeff) return { ok: false, parseFault: 'syntax' };
  const lineOf = lineIndex(text);
  const n = text.length;
  let i = 0, fieldType = false;
  const facts: RawFact[] = [];
  const fail = (): never => { throw new SyntaxStop(); };
  const isNewline = (c: string | undefined): boolean => c === '\n' || c === '\r';

  /** At `[`: the length of `=` signs of a bracket opening `[=*[`, or -1 where there is none. */
  const bracketOpen = (at: number): number => {
    if (text[at] !== '[') return -1;
    let j = at + 1;
    while (text[j] === '=') j++;
    return text[j] === '[' ? j - at - 1 : -1;
  };
  /** A bracket argument or comment from `i` (at its `[`): its content, the first line end after the opening dropped. */
  const bracket = (): string => {
    const equals = bracketOpen(i);
    const close = `]${'='.repeat(equals)}]`;
    const start = i + equals + 2;
    const end = text.indexOf(close, start);
    if (end < 0) fail();
    i = end + close.length;
    const content = text.slice(start, end);
    return content.startsWith('\r\n') ? content.slice(2) : isNewline(content[0]) ? content.slice(1) : content;
  };
  /** An escape sequence from `i` (at its backslash): its value; `\;` keeps itself. */
  const escape = (): string => {
    const e = text[i + 1];
    if (e === undefined) fail();
    i += 2;
    if (e === 't') return '\t';
    if (e === 'n') return '\n';
    if (e === 'r') return '\r';
    if (e === ';') return '\\;';
    if (/[A-Za-z0-9]/u.test(e!)) fail();
    return e!;
  };
  /** White space, line ends and comments between arguments and invocations. */
  const skip = (): void => {
    for (;;) {
      const c = text[i];
      if (c === ' ' || c === '\t' || isNewline(c)) { i++; continue; }
      if (c === '#') {
        if (bracketOpen(i + 1) >= 0) { i++; bracket(); continue; }
        while (i < n && !isNewline(text[i])) i++;
        continue;
      }
      return;
    }
  };

  try {
    for (;;) {
      skip();
      if (i >= n) break;
      const nameStart = i;
      const name = /^[A-Za-z_][A-Za-z0-9_]*/u.exec(text.slice(i, i + 256))?.[0];
      if (name === undefined) fail();
      i += name!.length;
      while (text[i] === ' ' || text[i] === '\t') i++;
      if (text[i] !== '(') fail();
      i++;
      // The arguments, to the parenthesis that closes the invocation; nested parentheses count, and are not arguments read here.
      const args: string[] = [];
      let depth = 1;
      while (depth > 0) {
        skip();
        const c = text[i];
        if (c === undefined) fail();
        if (c === '(') { depth++; i++; continue; }
        if (c === ')') { depth--; i++; continue; }
        if (c === '[' && bracketOpen(i) >= 0) { args.push(bracket()); continue; }
        if (c === '"') {
          i++;
          let out = '';
          for (;;) {
            const q = text[i];
            if (q === undefined) fail();
            if (q === '"') { i++; break; }
            if (q === '\\') {
              // A backslash before a line end continues the line and adds nothing.
              if (text[i + 1] === '\r' && text[i + 2] === '\n') { i += 3; continue; }
              if (isNewline(text[i + 1])) { i += 2; continue; }
              out += escape();
              continue;
            }
            out += q;
            i++;
          }
          args.push(out);
          continue;
        }
        // An unquoted argument: up to white space, a parenthesis, `#` or `"`, escapes resolved, `${...}` and `$<...>` kept as written.
        let out = '';
        while (i < n) {
          const u = text[i]!;
          if (u === ' ' || u === '\t' || isNewline(u) || u === '(' || u === ')' || u === '#' || u === '"') break;
          if (u === '\\') { out += escape(); continue; }
          out += u;
          i++;
        }
        if (out === '') fail();
        args.push(out);
      }
      const lines = { first: lineOf(nameStart), last: lineOf(i - 1) };
      const command = name!.toLowerCase();
      if (command === 'project' || Object.hasOwn(TARGET_KINDS, command)) {
        if (args.length === 0) { fieldType = true; continue; }
        if (command === 'project') facts.push({ fact: 'cmake-project', lines, values: [args[0]!] });
        else facts.push({ fact: 'cmake-target', lines, values: [args[0]!, TARGET_KINDS[command]!] });
      }
    }
  } catch (stop) {
    if (!(stop instanceof SyntaxStop)) throw stop;
    return { ok: false, parseFault: 'syntax' };
  }
  if (fieldType) return { ok: false, parseFault: 'field-type' };
  return { ok: true, facts };
}
