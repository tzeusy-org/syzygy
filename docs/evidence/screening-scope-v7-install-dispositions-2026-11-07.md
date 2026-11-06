# Dispositions — screening scope version 7, recorder and install, round 1

Reviewed record: docs/reviews/R-SCREENING-SCOPE-V7-INSTALL-1-RAW.md

The review returned `CONFIRM WITH EXCEPTIONS` over `b3cd3a43`. It said its grade of F1 was the closest call and that it could be overruled. It is repaired before landing, as a defect in security behaviour.

- F1, repaired. A page must state `utf-8` as the first element of its head, inside the prescan, with no other encoding statement and no other `http-equiv` meta. Any file but `.json` must be named `.html`. A Chrome fixture holds the encoding page.
- F2, repaired. A page is read in both parsing modes and must pass both. The false comment is gone. Tests hold both hiding forms.
- F3, repaired as far as a test can. A pin's raw must carry a confirming verdict and `Pinned script: <hash>` in its head. The code comment says this is a tripwire over a retained file, not a review gate. No CODEOWNERS is added: there is one owner.
- F4, repaired or tracked. The wrong file name in a test comment is fixed. The storage and `window.open` tests wait for a script and are on bead `syzygy-pdja.3`, as is the dossier spec text on `syzygy-pdja.2`.
- F5, a landing step. The version 7 recording tag is pushed on the landed commit. The version 6 tag is pushed on its landed commit too, since its record names it.
- F6, kept. 14:04:40Z is the form's per-item instant, in the scratch answers file; 14:04:42 is the submission. 14:11:19Z is when the recorder ran; the first commit came later, as the commit's date shows. Neither can be re-derived from tracked bytes.
- F7, kept. The gaps match version 6's; the act is performed and its recorder only re-checks it now.
- F8, repaired or disclosed. The "version 3" comments and the status row's cell count are fixed. `scripts/redis_screening_v6_measure.py` and the version 6 builder's `--check` fail once version 7 is in force; neither is in CI or the battery, and they are history.
- F9, repaired. `check_generator_install.mjs` and its test name `parse5`.
- F10, no change needed beyond F1.
- F11, repaired. Tests hold the viewport attributes and the `meta` limb. `scriptSource`'s text join has a fixture; the parser yields one text child, so it stays nearly equivalent.
- F12, repaired for the refresh meta, by F1's `http-equiv` rule.

## Round 2

`docs/reviews/R-SCREENING-SCOPE-V7-INSTALL-2-RAW.md` returned `REVISE` over `d88188a4`, on one limb only: the F1 disposition above says "inside the prescan, with no other encoding statement", and two page forms kept that sentence false. Only an injected renderer could write them. No source body reaches them and the shipped renderers do not write them. The F1 sentence above stays as written, since it is what round 2 reviewed.

- Finding 1, repaired. A page's raw text must open with a fixed head: a doctype, `<html>` with at most a `lang` attribute, `<head>`, then exactly the charset meta, in any case. This replaces the prescan-distance check, whose denominator was the first `<meta` in the raw string rather than the element read. Chrome fixtures hold both routes.
- Finding 4, repaired. The stale test title and test comment are corrected.
- Finding 6, repaired. A fixture confirms the opening in upper case, which kills the two surviving case mutants. `scriptSource`'s first-child mutant stays the disclosed near-equivalent.
- Findings 2, 3, 5, 7 to 12: no change. Finding 5 stays a landing step.
