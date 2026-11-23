# Dossier reader's edition — version 2.22

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule; no write to a repository the owner does not own; no network exposure, release or multi-user use.

## Why

- [Observed] syzygy-5dhm.136 (pursuit 2026-11-21b, R29 slice 4): "a reader opening a dossier meets the subject first. Pages about the run itself (how it was generated, review rounds, checks, screening census, provenance) move behind one clearly labelled 'About this run' entry at the end of the navigation; nothing is deleted and every link to them still resolves."
- [Observed] The 2026-11-21 pilot (`docs/evidence/pursuit-2026-11-21b/pilot/`, `runs.json` and `runs-page-words.json`) found 3,326 to 4,611 words per stored dossier on run or process pages, and the newest dossier carried about 2 required facts per 1,000 words against about 14 for a plain synthesis.
- [Observed] REQ-034 version 2.20 places the index "directly after `glossary.html` in the reading order", near the end, although the index and find-by-task are the two pages a reader uses to find something; and it states no order for the landing page beyond naming "its sections, the Pole map and the list of sections not generated" in that order where it places a region before or after them, which is the order the renderer drew, so a reader met the why section before the map of the parts.
- [Observed] The fold itself exists since syzygy-pdja.13 (owner note 3 of the 2026-11-08 Redis review), labelled "Review report", but no version of REQ-034 states it: the page set and its navigation order are specified, the fold is not.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- The index's place: third in the reading order, directly after `find-by-task.html`, and linked directly after it in every navigation and on the contents page (one sentence amended in place).
- One added paragraph, for every operator-agent rendering whatever its draft's schema:
  - the run pages named (understanding, discovery, clarifications, executions, review, size report, appendix), and every other page on the reading path;
  - each page's navigation in a stated order, ending with one `<details class="about-this-run">` entry, "About this run", holding exactly the run pages present, open on the pages it links;
  - the contents page closing with `<h2 id="about-this-run">About this run</h2>`, its sentence and the run pages, no run page linked before it;
  - nothing deleted, the appendix still last in the reading order;
  - the landing page's main content in a stated order: header, overview figures, Pole map, sections (after any 2.16 contents list), sections not generated, derived structure;
  - every disclosure that qualifies a claim stays inside that claim's element on that claim's page;
  - the general exception every earlier "same bytes" sentence takes for these changes, as version 2.15 states one for its additions;
  - the provider mode unaffected.
- Five scenarios added after version 2.20's last, and the four Form lines of the last Form block extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] This change leaves out:
- deleting, shortening or rewording any run page;
- moving any disclosure, Unknown, withheld item or screening outcome off the page that makes the claim;
- the provider mode's navigation and every byte its golden pins;
- any script, form or event handler, and any fragment target inside a collapsible element;
- a claim of a reader-share gain: the reader sessions (`docs/evidence/syzygy-5dhm-136/readers-2026-11-23/`) found before and after level, and no gain is claimed.
