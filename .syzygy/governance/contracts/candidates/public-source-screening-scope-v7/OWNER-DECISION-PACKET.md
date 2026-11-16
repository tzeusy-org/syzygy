# Owner decision packet — public-source screening scope, version 7

> **Candidate — binds nothing.** It carries no digest. Nothing here is a
> decision, and reading it performs no act. It is offered to you only after a
> confirming independent review; until then it is not offered.

## What this is, in plain words

On 2026-11-06 you wrote "Give up no-scripts but should still be a perfectly
functional static-site." Today the screening policy says a dossier page may
carry no script at all, or the code and documentation it shows lose their
exemption and are scanned as before, and in a dossier a finding from that scan
stops the render. Version 7 relaxes exactly that.

- **A page may carry one or more inline scripts that the renderer itself
  writes**, each allowed by the hash of its bytes. Nothing else may run.
- **The browser blocks ordinary loading, not every network path.** The policy
  becomes a closed list of directives, tighter than version 6. It stops fetch,
  images, forms and similar. It does not stop a script using WebRTC or creating a
  few kinds of element; a review test got packets out that way. The new text
  forbids those uses, and that rests on the renderer's fixed script, a source scan
  and review, not on the browser or a network test.
- **Trusted types block the code-injection family.** On a page with a script,
  `innerHTML`, `eval` and similar throw. A browser that ignores trusted types runs
  the script without that guard; which browsers do is untested.
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

Recommended: sign. It is what you asked for, source text stays inert, and the
directive list is tighter than today's. The no-network promise for a page with a
script rests partly on review, as described above.

## What it costs

- **Pages run code.** A bug in the renderer's script is a bug on every page. CSP
  and trusted types catch some kinds of bug, not all, and cannot stop a script
  navigating away; that rests on
  the script's fixed bytes, its tests and review.
- **Signing alone adds no script.** It needs a dossier spec version as well,
  which comes to you separately, and the install is subject to the surface
  merge freeze.
- **Tried on one browser:** a hash-allowed inline script ran over `file://`, which
  is how you open pages, on Chrome 120. Other browsers are untried. If one refuses
  the script, pages fall back to static.
- **Diagram click-through is not granted.** Two other specs still require
  diagrams with no link or script, so that needs a separate step.

## If you decline

Version 6 stays in force and dossiers stay script-free. Diagram zoom,
click-through and Esc dismissal then need other means, or do not happen.
