# Owner direction — implement launch consent, the launch-record write path and screening scope v8

Date: 2026-11-09

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest and adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It adopts nothing and edits no act-bound byte.
- It records no consent for any repository.
- It performs no dossier run, body read or provider call.

## The owner's words

[Observed by the coordinating Claude Code session.] On 2026-11-09 the owner
answered one structured question. The question listed what was already
signed:
- launch-consent spec v1.0 and v1.1;
- the launch-record write consent;
- the held selection of screening scope v8.

It said that none of them is built, because each record authorizes no
implementation. It then asked whether to implement:
- the launch question and phrase, with the name-on-branch warning for
  repositories not declared public;
- launch-record writes on `refs/heads/launch-consent-records`, only within
  the write consent;
- the trunk-tip default;
- the version-8 policy-reading code: no fetch and no partial redaction for
  private repositories, withheld object ids kept off pages, and a
  private-naming egress consent;
- the version-8 recorder, which records the held selection in the same
  change.

The question said that each part is reviewed in fresh context before merge,
that no agent makes dossier runs, and that the owner starts them.

The owner selected:

> Implement all, incl. v8 (Recommended) — One bounded implementation of launch consent + write path + v8, reviewed per part; your v8 selection is recorded with that code. Then you can launch Polaris on any repo, public or private.

The other options were "Launch consent only, public" and "Not yet".
- [Inferred] That the person answering is the owner.

## What this authorizes

Implementation code under `apps/**`, `packages/**` and `scripts/` for the
following signed semantics, and nothing else:

1. REQ-polaris-generation-046 and 047, as signed in
   `POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.1.md` (this directory), with
   v1.0 beneath it:
   - the launch question, the typed phrase and the warning;
   - the refusals;
   - the trunk-tip revision default.
2. Writes of launch consent records, exactly as the performed act
   `LAUNCH-CONSENT-WRITE-CONSENT-ACT.md` grants them:
   - new files only, under `.syzygy/governance/decisions/launch-consent/`;
   - one commit per confirmed answer on `refs/heads/launch-consent-records`;
   - hooks off and no push.
3. The code that reads screening-policy version 8, together with a dedicated
   recorder that records the owner's held selection
   (`OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08.md`) in the same change.
   - The recorder must refuse when the package bytes differ from those the
     round-6 review read.
   - Launch-consent spec v1.1 is now signed, so that hold is met.

Each part merges only after an independent fresh-context review of its pull
request.

## What it does not authorize

- A dossier run, a body read of any observed repository, or a provider call
  by an agent. The owner starts runs.
- Any write beyond the write consent.
- Any push of the launch-records branch.
- Any change to a signed specification or policy byte. A defect found during
  implementation goes back through review and owner sign-off (CC-REV-2).
- A retention rule. The owner chose none for now.
