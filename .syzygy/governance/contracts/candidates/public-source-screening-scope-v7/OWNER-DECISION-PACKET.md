# Owner decision packet — public-source screening scope, version 7

> **Candidate — binds nothing.** It carries no digest. Nothing here is a
> decision, and reading it performs no act. It is offered to you only after a
> confirming independent review; until then it is not offered.

## What this is, in plain words

On 2026-11-06 you wrote "Give up no-scripts but should still be a perfectly
functional static-site." Today the screening policy says a dossier page may
carry no script at all, or the code and documentation it shows lose their
exemption and are withheld. Version 7 relaxes exactly that.

- **A page may carry one or more inline scripts that the renderer itself
  writes**, each allowed by the hash of its bytes. Nothing else may run.
- **Pages still load nothing from anywhere.** `default-src 'none'` stays, and
  the new text also forbids the directives that could reopen a network path.
- **Source text stays inert.** Every byte is still written as escaped text. A
  script injected through a source file would not match a hash, so it would not
  run.
- **Every page must still read and navigate with scripts off.**

It changes no detector and no withheld line, as you answered on 2026-11-06.

## The one question

**Sign screening scope version 7? Sign, or decline.**

The words, if you sign: **"Sign screening scope version 7, variant s"**. There
is only one variant, `s`; the words name the package's one manifest row. A
recorder takes that row as the act's argument (phrase
`APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY`, as for versions 2–6).
It supersedes the version-6 act.

Recommended: sign. It is what you asked for, and the wall that matters most,
no network, stays.

## What it costs

- **Pages run code.** A bug in the renderer's script is a bug on every page. CSP
  cannot catch it, and it cannot stop a script navigating away; that rests on
  the script's fixed bytes, its tests and review.
- **Signing alone adds no script.** It needs a dossier spec version as well,
  which comes to you separately, and the install is subject to the surface
  merge freeze.
- **Unknown until tried:** hash-allowed inline scripts over `file://`, which is
  how you open pages. If a browser refuses them, pages fall back to static.

## If you decline

Version 6 stays in force and dossiers stay script-free. Diagram zoom,
click-through and Esc dismissal then need other means, or do not happen.
