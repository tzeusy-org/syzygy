# Semantic delta — public-source screening scope, version 7

> **Candidate — binds nothing.** Drafted 2026-11-06 (`syzygy-pdja.5`). It
> carries no digest; the argument comes only from the manifest row. Nothing
> here is approved. It is offered to the owner only after a confirming review.

## Authority and subject

- **Directions:** `.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-VOICE-AND-SCRIPTS-2026-11-06.md`
  item 2 ("Give up no-scripts but should still be a perfectly functional
  static-site."), and `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06.md`
  item 3, answer A: this version proposes no withheld-line change. Neither
  binds a policy; this package binds nothing either.
- **Subject:** the policy file
  `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`,
  at the bytes the version-6 act applied (variant `p`). The builder refuses
  any other base.
- **Change class:** normative; a security posture change, so one superseding
  `approve-policy` act (SEC-5, VIS-4).

## The change, in full

One clause of `publicSourceScope.activeContent.codeContentExemption.renderCondition`,
and `policyVersion`. `projectDocumentationExemption.renderCondition` reads that
condition, so it follows with no edit of its own.

Current:

````text
whose default-src source list is exactly 'none' and which carries no script-src, script-src-elem, script-src-attr or object-src directive.
````

Proposed:

````text
whose directives are exactly default-src 'none', style-src 'unsafe-inline', base-uri 'none' and form-action 'none', each once with that one source, and at most one script-src, which comes with require-trusted-types-for 'script' and only then; no other directive is lawful, and a policy holding any non-ASCII byte, whitespace included, fails this condition. A script-src's source list is one or more 'sha256-<base64>' hash sources and nothing else. Each such hash is of one inline script with no src attribute that the renderer itself writes: its bytes are fixed in the renderer and derive from no body; it opens no connection and loads nothing (no fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource, WebTransport, RTCPeerConnection, Worker or window.open); it creates no element outside a list the renderer fixes, which never holds script, link, meta, base, form, iframe, object, embed, img, audio, video, source, track or style, and it sets no attribute that holds a URL; it never turns page text into code or markup (no eval, no Function, no string timer, no innerHTML, outerHTML, insertAdjacentHTML, document.write, DOMParser or createContextualFragment, no handler attribute); it writes page text only as text; it navigates only by a fragment of the current page or an href the renderer wrote; and it stores no page text. Every page reads and navigates completely with scripts off.
````

## What this keeps

- Every body byte is still written as a character reference and never parsed.
- The directive set is closed. A page's policy is the four directives it has
  today, plus at most a hash-only `script-src` with trusted types. Version 6
  named only what it forbade, so it left `img-src` and similar directives open;
  this closes that gap, which round 1 of review showed a page could use.
- A script that matches no hash does not run, so an injected script still fails
  at the CSP.
- A page with no script stays lawful with no change: today's bytes pass.
- A consumer that cannot confirm the condition still scans as before and
  excludes whole on a finding.

## What the policy can and cannot enforce

- **[Observed]** In round 1, `default-src 'none'` with `form-action 'none'` stopped
  fetch, image, beacon, WebSocket and form loads from a script on Chrome 120
  over `file://`. Hash-allowed inline script ran there.
- **[Observed]** The same policy did not stop `RTCPeerConnection` sending STUN
  packets, a created `link rel=preconnect` opening a TCP connection, or a created
  `meta` refresh navigating. A markup `meta` refresh also navigates, and a markup
  `script src` carrying an allowed `integrity` hash loads. CSP does not close
  these paths.
- **[Inferred]** So "no network" is not a browser guarantee on a page with a
  script. The clause forbids those uses, and they rest on the renderer's fixed
  bytes, the tests below and a reviewer. Body bytes cannot reach these paths
  because body text is never parsed as markup and the script takes no code from it.

## What this gives up

- **[Inferred]** Pages now run code. A defect in the fixed script is a defect
  on every page, and no CSP directive catches it.
- **[Inferred]** CSP cannot stop a script navigating away. That limb rests on
  the renderer's fixed bytes alone.
- **[Observed]** `navigate-to` is forbidden only because the set is closed; in
  round 1 `navigate-to 'none'` did not stop a `location` navigation on Chrome 120,
  so it would not have helped.

## Mechanical and judged halves

- Mechanical, by CSP string: `csp_finding` in the builder reads the directive
  half over a 55-row table (`--score`), splitting on ASCII whitespace only.
  Non-ASCII whitespace stays inside a token and so fails the closed set, which is
  how a browser reads it too. `--selftest` holds one source-fragment mutant per
  predicate. The install implements the same reading in `pageSinkCspFinding`,
  whose split must change from `/\s+/u` to ASCII whitespace; that is also a
  repair of today's reader.
- Mechanical, per page, in the consumer (this is the install's job, see the
  ledger): a new renderer contract id declares the script half, so the current
  contract with a `script-src` is unconfirmed. Every `<script>` on a page has no
  `src` and hashes to one of the renderer's pinned hashes.
- Mechanical, by test: with scripts on, a canary page's DOM text is compared
  with scripts off; a browser test with a request listener sees no connection or
  navigation off the page; a storage dump after a run holds no page text.
- Judged: the rest of the script's conduct. The install pins its hash against its
  bytes and scans its source for the named sinks; a reviewer reads it.

## What this does not do

- It adds no script. It changes no spec: the dossier spec's no-script text
  changes through a dossier spec version. Diagram rules in
  `polaris-manifesto-understanding-amendment` and
  `polaris-project-wide-butlers-model` still require static SVG with no script
  or link, so diagram click-through needs its own owner step. No script ships until both are signed and installed.
- It changes no detector, placement or withheld line (answer A above). It has
  no bearing on option E.
- It decides no feature. Zoom, click-through, remembered state and Esc dismissal
  are progressive enhancements behind this.
