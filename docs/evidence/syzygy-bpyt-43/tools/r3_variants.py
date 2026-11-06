"""rev-532c (round 3): main.ts variants aimed at PR 532's compiler-API text row. Reviewer data, not authority.

Loaded by path (exec) from the other rev-532c tools. Each variant is an ordered list of (old, new) edits of
apps/syzygy/src/main.ts as it stands at d0467aeb (blob 0c03e8bf, unchanged from main d38d7a3c); every `old` must occur
exactly once in the text it is applied to. `kind`:
  load       a daemon-path load that the base's old pin (d38d7a3c's text row) is expected to fail: the brief's class;
  load-both  a daemon-path load that adds no line naming the POC app, so the old pin passes it too (a shared residual);
  inert      code that names the POC app inside a branch but loads nothing on any daemon path;
  shape      a legitimate shape of the two branches (nothing on the daemon path loads the app).
`demo` names how a load is shown at runtime: argv after the entry, and extra env.
"""
SITE = "'@syzygy/three-surface-poc-app/dossier-site'"
FLAG = "process.env.SYZYGY_PRELOAD_RENDERER === '1'"
ARGV = "  const argv = process.argv.slice(2);\n"
DOSSIER_OPEN = "  if (argv[0] === 'dossier') {\n"
DOSSIER_IMPORT = f"    const {{ renderLocalDossier }} = await import({SITE});\n"
DOSSIER_RETURN = "    return runDossierCli(argv.slice(1), {\n"
DOSSIER_END = "    }, { renderer: renderLocalDossier });\n  }\n"
POLARIS_COMMENT = "  // `syzygy polaris <url>` is the one-command launched run"
POLARIS_HEAD = ("  }\n\n"
                "  // `syzygy polaris <url>` is the one-command launched run (prototype under\n"
                "  // owner direction POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14): it runs the\n"
                "  // `dossier` steps in process and starts the agent sessions in views.\n"
                "  if (argv[0] === 'polaris') {\n")
POLARIS_OPEN = "  if (argv[0] === 'polaris') {\n"
POLARIS_BODY = ("    const { runPolarisCli } = await import('@syzygy/polaris-dossier');\n"
                f"    const {{ renderLocalDossier }} = await import({SITE});\n"
                "    return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });\n")
DAEMON = "  let parsed = parseCli(process.argv.slice(2), process.env);\n"
SERVE = ['dossier', 'serve', '--root', '{ROOT}', '--state-dir', '{STATE}', '--port', '0']
PLAIN = ['--root', '{ROOT}', '--state-dir', '{STATE}', '--port', '0']


def swap_order(text):
    """G3: the polaris branch first, the dossier branch as its `else if`."""
    i, j, k = text.index(DOSSIER_OPEN), text.index("  // `syzygy polaris <url>`"), text.index(DAEMON)
    dossier, polaris = text[i:j], text[j:k]
    dossier_body = dossier[len(DOSSIER_OPEN):dossier.rindex("  }\n")]
    head = polaris[:polaris.index(POLARIS_OPEN)] + POLARIS_OPEN
    polaris_body = polaris[len(head):polaris.rindex("  }\n")]
    new = head + polaris_body + "  } else if (argv[0] === 'dossier') {\n" + dossier_body + "  }\n\n"
    return [(text[i:k], new)]


VARIANTS = {
    # The brief's class: code inside a then-block that reaches the daemon path in the same process.
    'Y1-dossier-serve-falls-through': {
        'kind': 'load', 'demo': {'argv': SERVE, 'env': {}},
        'note': 'a missing `return`: `dossier serve` loads the app in the dossier then-block, drops its two words from process.argv and falls through to the daemon path',
        'edits': [(DOSSIER_RETURN, "    if (argv[1] === 'serve') {\n"
                                   "      // `syzygy dossier serve …` serves the daemon below, with the renderer loaded for its routes.\n"
                                   f"      await import({SITE});\n"
                                   "      process.argv.splice(2, 2);\n"
                                   "    } else return runDossierCli(argv.slice(1), {\n")]},
    'Y1b-dossier-serve-falls-through-no-new-mention': {
        'kind': 'load-both', 'demo': {'argv': SERVE, 'env': {}},
        'note': "Y1 without a new line naming the app: the branch's own import has already loaded it",
        'edits': [(DOSSIER_RETURN, "    if (argv[1] === 'serve') process.argv.splice(2, 2); // `syzygy dossier serve …`: the daemon below\n"
                                   "    else return runDossierCli(argv.slice(1), {\n")]},
    'Y2-dossier-serve-reenters-main': {
        'kind': 'load', 'demo': {'argv': SERVE, 'env': {}},
        'note': 'the then-block returns, but through `return main()` after loading the app, so the daemon path runs in the same process',
        'edits': [(DOSSIER_OPEN, DOSSIER_OPEN + "    if (argv[1] === 'serve') {\n"
                                 "      // `syzygy dossier serve …`: load the renderer, then serve the daemon with the rest of argv.\n"
                                 f"      await import({SITE});\n"
                                 "      process.argv.splice(2, 2);\n"
                                 "      return main();\n"
                                 "    }\n")]},
    'Y3-flag-rewrites-argv-into-dossier': {
        'kind': 'load', 'demo': {'argv': PLAIN, 'env': {'SYZYGY_PRELOAD_RENDERER': '1'}},
        'note': "a rewritten argv: with the flag set, a plain daemon invocation enters the dossier then-block, loads the app and re-enters main() as the daemon (round 1's R1 scenario, inside a branch)",
        'edits': [(ARGV + DOSSIER_OPEN, f"  const argv = {FLAG} ? ['dossier', '--preload'] : process.argv.slice(2);\n" + DOSSIER_OPEN +
                   "    if (argv[1] === '--preload') {\n"
                   "      // SYZYGY_PRELOAD_RENDERER=1 warms the renderer, then serves the daemon as asked.\n"
                   f"      await import({SITE});\n"
                   "      delete process.env.SYZYGY_PRELOAD_RENDERER;\n"
                   "      return main();\n"
                   "    }\n")]},
    'Y4-polaris-labelled-break': {
        'kind': 'load', 'demo': {'argv': ['polaris', '--serve', *PLAIN], 'env': {}},
        'note': 'a nested labelled block in the polaris then-block: `break` leaves the branch after loading the app, and control falls through to the daemon path',
        'edits': [(POLARIS_BODY + "  }\n", "    polaris: {\n"
                                           "      if (argv[1] === '--serve') {\n"
                                           "        // `syzygy polaris --serve …`: the daemon below, with the renderer loaded for its routes.\n"
                                           f"        await import({SITE});\n"
                                           "        process.argv.splice(2, 2);\n"
                                           "        break polaris;\n"
                                           "      }\n"
                                           "      const { runPolarisCli } = await import('@syzygy/polaris-dossier');\n"
                                           f"      const {{ renderLocalDossier }} = await import({SITE});\n"
                                           "      return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });\n"
                                           "    }\n"
                                           "  }\n")]},
    'Y5-dossier-serve-callback-after-branch': {
        'kind': 'load', 'demo': {'argv': SERVE, 'env': {}},
        'note': 'a callback scheduled in the dossier then-block that runs after the branch, while the daemon starts',
        'edits': [(DOSSIER_RETURN, "    if (argv[1] === 'serve') {\n"
                                   "      // `syzygy dossier serve …` serves the daemon below; the renderer loads once it is up.\n"
                                   f"      setImmediate(() => void import({SITE}));\n"
                                   "      process.argv.splice(2, 2);\n"
                                   "    } else return runDossierCli(argv.slice(1), {\n")]},
    # Loads aimed at the predicate's other edges, outside any then-block.
    'Z1-eager-import-held-in-variable-before-if': {
        'kind': 'load', 'demo': {'argv': ['--help'], 'env': {'SYZYGY_PRELOAD_RENDERER': '1'}},
        'note': 'an import() started before the dossier `if` and held in a variable',
        'edits': [(ARGV, ARGV + f"  const renderer = {FLAG} ? import({SITE}) : undefined;\n  void renderer;\n")]},
    'Z2-conditional-expression-between-branches': {
        'kind': 'load', 'note': 'a conditional expression statement between the branches',
        'edits': [(POLARIS_COMMENT, f"  {FLAG} ? await import({SITE}) : undefined;\n\n" + POLARIS_COMMENT)]},
    'Z3-comma-in-polaris-condition': {
        'kind': 'load', 'note': "a comma expression in the polaris condition that loads the app before testing argv[0]",
        'edits': [(POLARIS_OPEN, f"  if (({FLAG} && void import({SITE}), argv[0] === 'polaris')) {{\n")]},
    'Z4-second-if-same-condition': {
        'kind': 'load', 'note': "a second top-level `if (argv[0] === 'dossier')` before the daemon path, on an argv the flag rewrites",
        'edits': [(ARGV, "  let argv = process.argv.slice(2);\n"),
                  (DAEMON, f"  argv = {FLAG} ? ['dossier'] : argv;\n  if (argv[0] === 'dossier') await import({SITE});\n" + DAEMON)]},
    'Z5-switch-before-daemon': {
        'kind': 'load', 'note': 'a switch on the flag just before the daemon path',
        'edits': [(DAEMON, f"  switch (process.env.SYZYGY_PRELOAD_RENDERER) {{\n    case '1':\n      await import({SITE});\n  }}\n" + DAEMON)]},
    'Z6-shadowed-argv-in-block': {
        'kind': 'load', 'note': "a block between the branches that shadows argv and loads the app on `argv[0] === 'dossier'`",
        'edits': [(POLARIS_COMMENT, f"  {{\n    const argv = {FLAG} ? ['dossier'] : [];\n    if (argv[0] === 'dossier') await import({SITE});\n  }}\n\n" + POLARIS_COMMENT)]},
    'Z7-template-literal-before-daemon': {
        'kind': 'load', 'note': 'a template-literal specifier behind the flag before the daemon path',
        'edits': [(DAEMON, f"  if ({FLAG}) await import(`@syzygy/three-surface-poc-app/${{'dossier-site'}}`);\n" + DAEMON)]},
    'Z8-concatenated-specifier-between-branches': {
        'kind': 'load-both', 'demo': {'argv': ['--help'], 'env': {'SYZYGY_PRELOAD_RENDERER': '1'}},
        'note': "round 1's R1 with the specifier split in two: no line names the app, and no else is involved",
        'edits': [(POLARIS_COMMENT, f"  if ({FLAG}) await import('@syzygy/three-surface-' + 'poc-app/dossier-site');\n\n" + POLARIS_COMMENT)]},
    'Z9-function-in-branch-called-later': {
        'kind': 'load', 'note': 'a function declared in the dossier then-block and called on the daemon path (block-scoped in a module: tsc must refuse it)',
        'edits': [(DOSSIER_OPEN, DOSSIER_OPEN + f"    function warm(): Promise<unknown> {{ return import({SITE}); }}\n"),
                  (DAEMON, f"  if ({FLAG}) await warm();\n" + DAEMON)]},
    'Z10-hoisted-var-in-branch-called-later': {
        'kind': 'inert', 'demo': {'argv': ['--help'], 'env': {'SYZYGY_PRELOAD_RENDERER': '1'}},
        'note': 'a `var` arrow declared in the dossier then-block and called (optionally) on the daemon path: hoisted but unassigned there, so nothing loads',
        'edits': [(DOSSIER_OPEN, DOSSIER_OPEN + f"    var warm = (): Promise<unknown> => import({SITE});\n"),
                  (DAEMON, f"  if ({FLAG}) await warm?.();\n" + DAEMON)]},
    # Legitimate shapes the row should accept.
    'G1-allman-brace-and-wrapped-import': {
        'kind': 'shape', 'note': "the dossier brace on its own line and the import wrapped over three lines, as a formatter would print it",
        'edits': [(DOSSIER_OPEN, "  if (argv[0] === 'dossier')\n  {\n"),
                  (DOSSIER_IMPORT + DOSSIER_RETURN, f"    const {{ renderLocalDossier }} = await import(\n      {SITE}\n    );\n" + DOSSIER_RETURN)]},
    'G2-commented-else-if-chain': {
        'kind': 'shape', 'note': 'the two branches chained, with block comments around `else` and inside the condition',
        'edits': [(POLARIS_HEAD, "  } /* else: the one-command launched run */ else if (/* exact */ argv[0] === 'polaris' /* only */) {\n"
                                 "    // `syzygy polaris <url>` is the one-command launched run (prototype under\n"
                                 "    // owner direction POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14): it runs the\n"
                                 "    // `dossier` steps in process and starts the agent sessions in views.\n")]},
    'G3-else-if-order-swap': {'kind': 'shape', 'note': "the polaris branch first, with the dossier branch as its `else if`", 'edits': swap_order},
    'G4-trailing-comments-and-return-await': {
        'kind': 'shape', 'note': 'a trailing line comment after each close, a blank line, and `return await`',
        'edits': [(DOSSIER_RETURN, "    return await runDossierCli(argv.slice(1), {\n"),
                  (DOSSIER_END, "    }, { renderer: renderLocalDossier });\n  } // the dossier branch returns above\n\n"),
                  (POLARIS_BODY + "  }\n", POLARIS_BODY + "  } // the polaris branch returns above\n")]},
    'G5-double-quoted-condition': {
        'kind': 'shape', 'note': 'the dossier condition written with double quotes',
        'edits': [(DOSSIER_OPEN, '  if (argv[0] === "dossier") {\n')]},
    'G6-unspaced-condition': {
        'kind': 'shape', 'note': "the dossier condition written `argv[0]==='dossier'`",
        'edits': [(DOSSIER_OPEN, "  if (argv[0]==='dossier') {\n")]},
    'G7-parenthesised-condition': {
        'kind': 'shape', 'note': "the dossier condition in a second pair of parentheses",
        'edits': [(DOSSIER_OPEN, "  if ((argv[0] === 'dossier')) {\n")]},
}


def apply(text, edits):
    if callable(edits): edits = edits(text)
    for old, new in edits:
        if text.count(old) != 1: raise ValueError(f'old occurs {text.count(old)} times: {old[:60]!r}')
        text = text.replace(old, new)
    return text


def edits_of(text, edits):
    """The (old, new) pairs as applied to `text`, for the record."""
    return [list(p) for p in (edits(text) if callable(edits) else edits)]
