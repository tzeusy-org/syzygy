# Design

## What the agent tool exposes, and where

[Observed] `docs/evidence/syzygy-5dhm-26/transcript-shape-2026-11-27.json` (script `transcript_shape_probe.py`, Claude Code 2.1.332): in one operator session transcript every non-synthetic `assistant` entry carries `message.id` and a `message.usage` object whose four token counts (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`) are integers; 1,231 of 1,861 response identities span several entries (one per content block), and every one of those repeats identical counts; two entries are the tool's own `<synthetic>` notices; entries carry millisecond UTC instants. Subagent transcripts sit below the session's own directory.

[Observed] `packages/polaris-dossier/src/polaris.ts` gives each launched role a home `<run>.agents/<role>`, and `session-view.ts` sets `CLAUDE_CONFIG_DIR` to its `.claude`, so the tool keeps that role's transcripts under `.claude/projects/`. Since this change the supervisor and the reader both derive the home from the run directory (`agentsRoot` in `run-dir.ts`).

[Unknown] No launched run's transcript was read for this change: the worker's rules forbid opening `run-*.agents/`. That the tool writes the same entry shape there as in an operator session is Inferred from the same tool and configuration variable; the first real launched close will show it, and every way it could differ yields a fixed Unknown rather than a figure.

## Why the transcript and not a receipt

[Inferred] The transcript is the agent tool's own record, but it lies in a home the session can write, so it is evidence of the Inferred grade: a session could edit its own counts. It is therefore no tool-owned receipt, the step measures' `toolOwnedUsage` keeps its Unknown, and the record never labels a figure Observed. A headless `--output-format json` run would give a summary per process, but the launched sessions are interactive by owner ruling (syzygy-qkea.18), so no such summary exists.

## Counting rules

[Inferred] One response is one message identity; the largest count each kind reaches across its entries is the response's, which equals every entry's count where they agree (all observed cases) and cannot double-count a response written over several lines. Synthetic notices are no model response. A kind that some response does not give is Unknown rather than summed over the responses that do, and any Unknown session makes every run total Unknown (VIS-2). An unterminated last line is passed over, since the tool may be writing it when status or render reads; any other unparsable line makes the session Unknown, since it may be a response. "Responses" is the count of model responses, the closest the transcript comes to the turns of the move's text; the operator's declared turn figure keeps its own meaning.

## Bounds

[Inferred] 268,435,456 bytes per transcript (a long operator session measured 127,740,755), 256 files and four levels per role, no link followed and no special file read. A transcript past its bound makes its role Unknown; nothing is sampled.

## Why the cost line is in the review-status region

[Inferred] Render reads the usage anew at every render, and the review page is part of what the rendered-design review reviews. Placing the line in that page's review-status region, the one part a later render may change without retiring the review, keeps a changing figure from retiring a counted review. The region is shared by every page; only the review page shows the cost item.

## Money

[Inferred] Syzygy holds no price list it can attest to and no provider bill, so money is always Unknown with the reason `no-price-receipt`. A later slice may add an Inferred estimate from a dated, cited price table.
