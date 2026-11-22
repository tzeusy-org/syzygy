# Dossier spec corrections — version 2.11

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule (a path a secret detector matches is still counted and named nowhere, and nothing is admitted or excluded differently); no foreign repository; no exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.75, from the review of the 2.9 code (syzygy-3efd.36): the code follows readings the text does not state, or states wrongly. The CI pipeline map's literal `<p class="map-workflow">` form cannot hold its `<li>` entries in an HTML parser; the job list's condition, the run file's unreadable set, `machine.json`'s `pages` list and the singular sentences are not as written; and a manifest map says `Every candidate file not left out or set apart was read for facts.` where a recognizer has an Unknown file it does not list (VIS-2).
- [Observed] From the review of the 2.10 code: for a bounded-form check record, check's report gives the words `this draft does not parse, so it has no reading ledger`, untrue of a draft that parsed.
- [Observed] From the change syzygy-3efd.66 and the review of syzygy-3efd.70/.66: the readable layout now stacks every graph of two or more layers, so the 2.9 reason that an author could reshape a graph until the layout stacks it no longer holds, the run-file scenario's premise (a chain of three boxes laid out 1048 px wide) cannot occur, and rule `graph-without-narrow-form` matches no readable graph within the schema's bounds.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- The CI pipeline map: `<ul class="map-workflow">` with `<li>` items; `<ul class="map-facts">` only where the file has a listed `job` or `job-needs` fact.
- `run-advice.json`: a record that is not the check record of its revision is counted `unreadable`; a record without `figureFit` is counted `read`.
- `machine.json`'s `pages` entries for the map pages join version 2.9's byte list and the exception sentence; a scenario's list of 2.9 additions is completed.
- The singular sentences of the map pages are stated.
- A manifest map's closing list counts the Unknown files its recognizers do not list, and says every candidate file was read for facts only where none is Unknown (needs a code change).
- A bounded check record's `readingDifference` reads `this check's record was written in its bounded form, which keeps no reading ledger` (needs a code change).
- The figure-fit text: the readable layout stacks every graph of two or more layers; `graph-without-narrow-form` is kept and fires only with another supplied layout or a graph past the schema's bounds; the 2.9 reshaping reason is reworded; the run-file scenario names a graph figure laid out 1048 px wide by the supplied layout, with no shape.
- A paragraph stating the bytes version 2.11 changes; four scenarios added; two scenario lines amended and one AND line added; the four Form lines extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged. [Inferred] Provider mode is unaffected.

## Non-goals

[Inferred] No schema, brief, cap or screening change; no new Unknown reason; the 1048 px shrink rule and rule `graph-without-narrow-form` are kept, not retired; provider aria (syzygy-3efd.77) is out of scope.
