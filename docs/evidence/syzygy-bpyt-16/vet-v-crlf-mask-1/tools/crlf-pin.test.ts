// V-CRLF-MASK-1 pin tests for the recommended arm (CRLF, CR and LF all end a
// line in the code-context mask). Vetter's scratch file, run in a scratch
// clone only; expected values are hand-typed literals.
import { describe, expect, it } from 'vitest';

import { scanActiveContent } from './git-object-reader.js';
import { maskMarkdownCodeContexts } from './markdown-code-context.js';

const P = '<script>x</script>';
const join = (lines: readonly string[], end: string): string => lines.map((l) => l + end).join('');
const decision = (text: string): string => {
  const f = scanActiveContent(text);
  return f.length === 0 ? 'admit' : [...new Set(f.map((x) => (x.context ? `${x.form}:${x.context}` : x.form)))].sort().join(',');
};

describe('code-context mask line ends (V-CRLF-MASK-1 pins)', () => {
  it('P1 a CRLF backtick opener whose info string holds a backtick is malformed at line 2', () => {
    expect(maskMarkdownCodeContexts(join(['# T', '```a`b', P, '```'], '\r\n'))).toEqual({ kind: 'malformed', reason: 'backtick-fence-with-backtick-in-info-string', line: 2 });
  });

  it('P2 CRLF: a script between two tilde fences that each show a lone backtick-fence line is found', () => {
    expect(decision(join(['~~~', '```', '~~~', P, '~~~', '```', '~~~'], '\r\n'))).toBe('script-element');
  });

  it('P3 CRLF: a script inside a closed tilde fence is inert', () => {
    expect(decision(join(['~~~', P, '~~~', 'after'], '\r\n'))).toBe('admit');
  });

  it('P4 bare CR ends a line too', () => {
    expect(maskMarkdownCodeContexts(join(['# T', '```a`b', P, '```'], '\r'))).toEqual({ kind: 'malformed', reason: 'backtick-fence-with-backtick-in-info-string', line: 2 });
    expect(decision(join(['~~~', P, '~~~', 'after'], '\r'))).toBe('admit');
  });

  it('P5 CRLF with no final line end: a fence closed on the last line is closed', () => {
    expect(decision(['```', P, '```'].join('\r\n'))).toBe('admit');
  });

  it('P6 the mask keeps the length and every CR and LF at its offset', () => {
    const text = 'a\r\n```\r\nx\ry\n```\rb\r\n';
    const mask = maskMarkdownCodeContexts(text);
    expect(mask).toEqual({ kind: 'masked', masked: 'a\r\n   \r\n \r \n   \rb\r\n', fences: 1, spans: 0 });
  });

  it('P7 LF, CRLF and CR give one decision for every case', () => {
    const cases: readonly (readonly string[])[] = [
      ['```', P, '```', 'after'],
      ['```', 'code', '```\t', P],
      ['- ```', P, '  ```'],
      ['~~~ a`b', P, '~~~'],
      ['```', 'use ``` here', '```', P],
      ['````', '`````', P],
      ['a `b', '```', P, '```', 'c` d'],
      ['~~~', P],
    ];
    for (const lines of cases) {
      const lf = decision(join(lines, '\n'));
      expect([decision(join(lines, '\r\n')), decision(join(lines, '\r'))]).toEqual([lf, lf]);
    }
  });
});
