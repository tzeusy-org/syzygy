// Round-3 reviewer candidates (R-GP-IMPL-CRLF-MASK-3, notes N1 and N2): the general pin's two siblings, one at a closing-fence
// position and one for reported positions. Copied into packages/three-surface-poc-core/src/ of a scratch clone by
// candidate-pins.py, run, and deleted.
import { describe, expect, it } from 'vitest';
import { scanActiveContent } from './git-object-reader.js';
import { maskMarkdownCodeContexts } from './markdown-code-context.js';

describe('round-3 candidates', () => {
  // A closer followed by any code unit but a space or the fence character is a closer followed by text, so the fence stays
  // unclosed; the failure lists, in hex, each unit after which the mask closed the fence.
  it('no code unit but a space after a closing fence leaves it closed', () => {
    const closed: string[] = [];
    for (let unit = 0; unit <= 0xffff; unit += 1) {
      if (unit === 0x0a || unit === 0x0d || unit === 0x20 || unit === 0x60) continue;
      const mask = maskMarkdownCodeContexts(['```', 'x', '```' + String.fromCharCode(unit)].join('\n'));
      if (mask.kind !== 'malformed' || mask.reason !== 'unclosed-fence' || mask.line !== 1) closed.push(unit.toString(16));
    }
    expect(closed).toEqual([]);
  });

  // positionOf counts LF only, so a script element after one code unit that is not LF is reported on line 1, at column 3;
  // the failure lists, in hex, each unit that moved a finding.
  it('no code unit but LF moves a reported position to another line', () => {
    const moved: string[] = [];
    for (let unit = 0; unit <= 0xffff; unit += 1) {
      if (unit === 0x0a || unit === 0x60) continue;
      const findings = scanActiveContent('a' + String.fromCharCode(unit) + '<script>x</script>');
      const first = findings.find((f) => f.form === 'script-element');
      if (first === undefined || first.line !== 1 || first.column !== 3) moved.push(unit.toString(16));
    }
    expect(moved).toEqual([]);
  });
});
