/** Applies a unified diff of one file to `text`, line by line: each hunk's context and removed lines must stand at the hunk's stated
 * old line number exactly, or it throws. For fixtures that need a candidate package's proposed bytes (a policy successor's patch applied
 * to the policy on disk); the caller compares the result with the package's own digest, so a misapplied patch cannot pass unseen. */
export function applyUnifiedPatch(text: string, patch: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let at = 0;
  const rows = patch.split('\n');
  let i = rows.findIndex(row => row.startsWith('@@'));
  if (i < 0) throw new Error('the patch has no hunk');
  while (i < rows.length && rows[i]!.startsWith('@@')) {
    const m = /^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@/.exec(rows[i]!);
    if (m === null) throw new Error(`malformed hunk header: ${rows[i]}`);
    const start = Number(m[1]) - 1;
    if (start < at) throw new Error('hunks overlap or are out of order');
    out.push(...lines.slice(at, start));
    at = start;
    i++;
    for (; i < rows.length && !rows[i]!.startsWith('@@'); i++) {
      const row = rows[i]!;
      if (row === '' && i === rows.length - 1) break;
      const mark = row[0], body = row.slice(1);
      if (mark === ' ' || mark === '-') {
        if (lines[at] !== body) throw new Error(`the patch does not apply at line ${at + 1}`);
        at++;
        if (mark === ' ') out.push(body);
      } else if (mark === '+') out.push(body);
      else if (row !== '\\ No newline at end of file') throw new Error(`malformed hunk line: ${row.slice(0, 40)}`);
    }
  }
  out.push(...lines.slice(at));
  return out.join('\n');
}
