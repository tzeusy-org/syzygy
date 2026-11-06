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
whose default-src source list is exactly 'none', which carries no script-src-elem, script-src-attr, object-src, connect-src, worker-src, child-src, frame-src or navigate-to directive, and which carries either no script-src directive or exactly one whose source list is one or more 'sha256-<base64>' hash sources and nothing else (no 'unsafe-inline', 'unsafe-eval', 'unsafe-hashes', 'wasm-unsafe-eval', 'strict-dynamic', 'self', 'none', nonce, scheme or host source). Each such hash is of one inline script the renderer itself writes: its bytes are fixed in the renderer and hold no byte of any body; it never turns page text into code or markup (no eval, no Function, no string timer, no innerHTML, outerHTML, insertAdjacentHTML or document.write, no handler attribute, no created script element); it writes page text only as text; it navigates only by a fragment of the current page or an href the renderer wrote; and it stores no page text. Every page reads and navigates completely with scripts off.
````

## What this keeps

- Every body byte is still written as a character reference and never parsed.
- `default-src 'none'` still blocks every remote load. A script that matches
  no hash does not run, so an injected script still fails at the CSP.
- A page with no script stays lawful with no change: today's bytes pass.
- A consumer that cannot confirm the condition still scans as before and
  excludes whole on a finding.

## What this gives up

- **[Inferred]** Pages now run code. A defect in the fixed script is a defect
  on every page, and no CSP directive catches it. The clause's script rules
  are for the renderer and its tests; no CSP string can show them.
- **[Observed]** The clause newly forbids `connect-src`, `worker-src`,
  `child-src`, `frame-src` and `navigate-to` because each would reopen a path a
  script could use; none is on a page today. This is tighter than version 6.
- **[Inferred]** CSP cannot stop a script navigating away. That limb rests on
  the renderer's fixed bytes alone.

## Mechanical and judged halves

- Mechanical: `csp_finding` in the builder reads the directive half, over a
  28-row table (`--score`). The install implements the same reading in
  `pageSinkCspFinding`, with mutants for a wrong hash, an added directive and
  `'unsafe-inline'`.
- Judged: the script's own conduct. The install pins its hash against its bytes
  and scans its source for the named sinks; a reviewer reads it.

## What this does not do

- It adds no script. It changes no spec: `spec.md:247` and `:334` and
  `design.md:429` still say no script, and change through a dossier spec
  version. No script ships until both are signed and installed.
- It changes no detector, placement or withheld line (answer A above). It has
  no bearing on option E.
- It decides no feature. Zoom, click-through, remembered state and Esc dismissal
  are progressive enhancements behind this.
