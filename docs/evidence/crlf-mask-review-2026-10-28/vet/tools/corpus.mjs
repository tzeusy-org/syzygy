// V-CRLF-MASK-1 synthetic corpus. Every case is written here by the vetter;
// nothing is read from any observed repository. A case is a list of logical
// lines (no terminators). `final` says whether the last line carries a
// terminator. Variants (`variants`) are extra renderings with an explicit
// per-line terminator list, compared against the case's LF rendering.

export const PAYLOAD = '<script>x</script>';

export const CASES = [
  { id: 'K01', label: 'plain backtick fence', lines: ['# T', '```', 'code', '```', 'after'] },
  { id: 'K02', label: 'backtick fence with info string', lines: ['```js', 'code', '```', 'after'] },
  { id: 'K03', label: 'backtick opener whose info string holds a backtick (lane fail-open 1)', lines: ['# T', '```a`b', 'code', '```', 'after'] },
  { id: 'K04', label: 'closer with a trailing tab (lane fail-open 2)', lines: ['```', 'code', '```\t', 'after'] },
  { id: 'K05', label: 'fence inside a list item (lane fail-open 3)', lines: ['- item', '- ```', '  code', '  ```', 'after'] },
  { id: 'K06', label: 'tilde fence (lane fail-closed)', lines: ['~~~', 'code', '~~~', 'after'] },
  { id: 'K07', label: 'tilde fence with info string', lines: ['~~~ html', 'code', '~~~', 'after'] },
  { id: 'K08', label: 'opener and closer indented three spaces', lines: ['   ```', 'code', '   ```', 'after'] },
  { id: 'K09', label: 'opener and closer indented four spaces (not a fence)', lines: ['    ```', 'code', '    ```', 'after'] },
  { id: 'K10', label: 'closer indented four spaces', lines: ['```', 'code', '    ```', 'after'] },
  { id: 'K11', label: 'closer followed by text', lines: ['```', 'code', '``` x', 'after'] },
  { id: 'K12', label: 'closer with trailing spaces', lines: ['```', 'code', '```   ', 'after'] },
  { id: 'K13', label: 'closer longer than opener', lines: ['```', 'code', '`````', 'after'] },
  { id: 'K14', label: 'four-backtick fence nesting a three-backtick fence', lines: ['````', '```', 'inner', '```', '````', 'after'] },
  { id: 'K15', label: 'tilde fence nesting a backtick fence', lines: ['~~~', '```', 'inner', '```', '~~~', 'after'] },
  { id: 'K16', label: 'two tilde fences each showing a lone backtick-fence line', lines: ['~~~', '```', '~~~', 'mid', '~~~', '```', '~~~'] },
  { id: 'K17', label: 'inline span left open across a fence', lines: ['a `b', '```', 'code', '```', 'c` d'] },
  { id: 'K18', label: 'unclosed backtick fence', lines: ['```', 'code'] },
  { id: 'K19', label: 'unclosed tilde fence', lines: ['~~~', 'code'] },
  { id: 'K20', label: 'inline spans only', lines: ['use `<b>` and ``x``', 'plain'] },
  { id: 'K21', label: 'inline span across two lines', lines: ['a `b', 'c` d'] },
  { id: 'K22', label: 'inline span holding a shorter run', lines: ['a ``b ` c`` d'] },
  { id: 'K23', label: 'no code context at all', lines: ['plain text', 'more'] },
  { id: 'K24', label: 'tilde opener whose info string holds a backtick', lines: ['~~~ a`b', 'code', '~~~', 'after'] },
  { id: 'K25', label: 'fence holding a blank line and inline code', lines: ['```', 'x `y`', '', '```', 'after'] },
  { id: 'K26', label: 'two consecutive backtick fences', lines: ['```', 'a', '```', 'between', '```', 'b', '```'] },
  { id: 'K27', label: 'opener two spaces, closer flush', lines: ['  ```', 'code', '```', 'after'] },
  { id: 'K28', label: 'fence inside a blockquote', lines: ['> ```', '> code', '> ```', 'after'] },
  { id: 'K29', label: 'ordered-list fence indented four spaces', lines: ['1. x', '    ```', '    code', '    ```'] },
  { id: 'K30', label: 'fence content holding an inline run of three backticks', lines: ['```', 'use ``` here', '```', 'after'] },
  { id: 'K31', label: 'five-tilde fence nesting a three-tilde fence', lines: ['~~~~~', '~~~', 'inner', '~~~', '~~~~~', 'after'] },
  { id: 'K32', label: 'opener with trailing spaces only', lines: ['```   ', 'code', '```', 'after'] },
  { id: 'K33', label: 'closer shorter than opener (unclosed)', lines: ['````', 'code', '```', 'after'] },
  { id: 'K34', label: 'plain backtick fence, last line is the closer, no final terminator', lines: ['```', 'code', '```'], final: false },
  { id: 'K35', label: 'tilde fence, last line is the closer, no final terminator', lines: ['~~~', 'code', '~~~'], final: false },
  { id: 'K36', label: 'mixed backtick and tilde fences', lines: ['```', 'a', '```', 'mid', '~~~', 'b', '~~~', 'end'] },
];

// Explicit-terminator variants. `terms[i]` follows line i; '' means none.
// `ins` is the terminator of an inserted payload line.
export const VARIANTS = [
  { id: 'M1', base: 'K01', label: 'mixed: LF opener, CRLF closer', terms: ['\n', '\n', '\r\n', '\r\n', '\n'], ins: '\n' },
  { id: 'M2', base: 'K01', label: 'mixed: CRLF opener, LF closer', terms: ['\n', '\r\n', '\n', '\n', '\n'], ins: '\n' },
  { id: 'M3', base: 'K06', label: 'mixed: tilde LF opener, CRLF closer', terms: ['\n', '\n', '\r\n', '\n'], ins: '\n' },
  { id: 'M4', base: 'K06', label: 'mixed: tilde CRLF opener, LF closer', terms: ['\r\n', '\n', '\n', '\n'], ins: '\n' },
  { id: 'M5', base: 'K01', label: 'mixed: one CRLF content line inside an LF fence', terms: ['\n', '\n', '\r\n', '\n', '\n'], ins: '\n' },
  { id: 'M6', base: 'K03', label: 'mixed: CRLF only on the backtick-info opener', terms: ['\n', '\r\n', '\n', '\n', '\n'], ins: '\n' },
  { id: 'M7', base: 'K15', label: 'mixed: CRLF only on the tilde lines', terms: ['\r\n', '\n', '\n', '\n', '\r\n', '\n'], ins: '\n' },
  { id: 'R1', base: 'K01', label: 'bare CR throughout', terms: ['\r', '\r', '\r', '\r', '\r'], ins: '\r' },
  { id: 'R2', base: 'K06', label: 'bare CR throughout, tilde', terms: ['\r', '\r', '\r', '\r'], ins: '\r' },
  { id: 'R3', base: 'K03', label: 'bare CR throughout, backtick info', terms: ['\r', '\r', '\r', '\r', '\r'], ins: '\r' },
  { id: 'R4', base: 'K01', label: 'bare CR only after the closer', terms: ['\n', '\n', '\n', '\r', '\n'], ins: '\n' },
  { id: 'T1', base: 'K34', label: 'trailing CR on the last line (closer), LF elsewhere', terms: ['\n', '\n', '\r'], ins: '\n' },
  { id: 'T2', base: 'K35', label: 'trailing CR on the last line (tilde closer), LF elsewhere', terms: ['\n', '\n', '\r'], ins: '\n' },
  { id: 'T3', base: 'K34', label: 'CRLF throughout, no terminator on the last line', terms: ['\r\n', '\r\n', ''], ins: '\r\n' },
  { id: 'T4', base: 'K35', label: 'CRLF throughout, tilde, no terminator on the last line', terms: ['\r\n', '\r\n', ''], ins: '\r\n' },
];
