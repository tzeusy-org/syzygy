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
whose directives are exactly default-src 'none', style-src 'unsafe-inline', base-uri 'none' and form-action 'none', each once with that one source, and at most one script-src, which comes with require-trusted-types-for 'script' and trusted-types 'none' and only then; no other directive is lawful, every token is written exactly as here in lower case, and a policy holding any non-ASCII byte, whitespace included, fails this condition. A script-src's source list is one or more 'sha256-<base64>' hash sources and nothing else. Each such hash is of one inline script with no src attribute that the renderer itself writes: its bytes are fixed in the renderer and derive from no body; it opens no connection and loads nothing (no fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource, WebTransport, RTCPeerConnection, Worker or window.open); it creates no element outside a list the renderer fixes, which never holds script, link, meta, base, form, iframe, object, embed, img, audio, video, source, track or style, and it sets no attribute that holds a URL; it never turns page text into code or markup (no eval, no Function, no string timer, no innerHTML, outerHTML, insertAdjacentHTML, setHTMLUnsafe, document.write, DOMParser or createContextualFragment, no handler attribute); it writes page text only as text; it navigates only by a fragment of the current page or an href the renderer wrote; and it stores no page text. Every page reads and navigates completely with scripts off.
````

## What this keeps

- Every body byte is still written as a character reference and never parsed.
- The directive set is closed. A page's policy is the four directives it has
  today, plus at most a hash-only `script-src` with two trusted-types directives. Version 6
  named only what it forbade, so it left `img-src` and similar directives open;
  this closes that gap, which round 1 of review showed a page could use.
- A script that matches no hash does not run, so an injected script still fails
  at the CSP.
- A page with no script stays lawful with no change: today's bytes pass.
- A consumer that cannot confirm the condition still scans as before and
  excludes whole on a finding. The check runs only where a cited body relies on the
  exemption, so a site with none gets no script check from this route.

## What the policy can and cannot enforce

Results below are **[Observed]** in rounds 1 and 2 of review, on Chrome 120 only,
over `file://` and one loopback origin.

- **The policy stops these for a script:** fetch, XHR, beacon, WebSocket,
  EventSource, images, CSS backgrounds, stylesheets, prefetch, iframes, workers,
  `import()`, unhashed inline scripts and a form request (under `form-action 'none'`
  a bare TCP accept was seen in 3 of 15 submits, with no HTTP request or form data).
- **Trusted types make these throw:** `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
  `document.write`, `DOMParser`, `createContextualFragment`, `eval`, `Function`,
  string timers, setting a script's text or `src`, `srcdoc` and handler attributes.
  `trusted-types 'none'` stops a script making a policy to get round that.
  Text writes still work. `innerHTML = ''` throws too, which is a trap for the author.
- **Nothing in the policy stops these:** `RTCPeerConnection` STUN packets, a created
  `link rel=preconnect` opening a TCP connection, a created `meta` refresh, a
  created link's click, `location`, and `window.open` on a user click. The clause
  forbids what the script does here, so they rest on the renderer's fixed bytes, a
  source scan and a reviewer.
- **A page's own markup is outside the clause's script limbs, with or without a
  script:** a markup `meta` refresh navigates, a markup `preconnect` connects, and a
  markup `script src` carrying an allowed `integrity` hash loads. This is true today
  too. **[Inferred]** A body cannot mint them, because body text is never parsed as
  markup, so these rest on the renderer writing none.
- **[Inferred]** So "no network" is not a browser guarantee for a dossier page. Body
  text cannot reach these paths unless a limb of the script's conduct fails: a
  defective script that read page text could send it by a path the browser allows.
- **[Unknown]** A browser that ignores trusted types runs the script without that
  guard. Which browsers do so is untested.

## What this gives up

- **[Inferred]** Pages now run code. A defect in the fixed script is a defect on every
  page. The policy and trusted types catch the classes listed above and not the rest.
- **[Observed]** `navigate-to` is refused only because the set is closed; `navigate-to
  'none'` did not stop a `location` navigation, so it would not have helped.

## Mechanical and judged halves

- Mechanical, by CSP string: `csp_finding` in the builder reads the directive half
  over a 70-row table (`--score`). Every token must match exactly, in lower case,
  because Chrome drops `'SCRIPT'` as invalid while accepting `'NONE'`. `--selftest`
  holds source-fragment mutants; one that makes the reading raise counts as seen.
- Mechanical, per page, in the consumer (the install's job, in the ledger): the
  pinned hash set sits beside `PAGE_SINK_CONTRACT` in the core package, not in the
  injected renderer, or a renderer could confirm itself. Both directions hold: every
  script's hash is in the set and every `script-src` hash is in the set. A real HTML
  tokenizer finds scripts, since `<SCRIPT>`, `<script/x>`, `<svg><script>` and
  `</script` plus a newline all ran under a matching hash. This confirms the bytes.
  Review confirms what those bytes do.
- Tests: a canary page's text with scripts on against scripts off; a crawl with
  scripts off reaching every page; a request listener seeing no request to a URL the
  renderer did not write; a storage dump holding no page text. **A request listener
  cannot see WebRTC or a bare preconnect**, so those rest on a source scan for the
  named constructors and element names, and on a reviewer.
- Judged: the rest of the script's conduct.

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
