# Settled dossier mobile reflow projected package review, round 5

Subject commit `992056ce808b0e669ed8b8b488f0b87ccc4b7706`
Tree `20d70b4ebdbf792d2e891b659318263efd25a040`
Reviewed 2026-11-25 UTC

REVISE

[Observed] The private projection contains nine changed paths, including two exact R4 source blobs and six archive files. The four raw reviews match their independent originals byte for byte. The sole additional ledger row is A-308 after A-307. The named inverse, applied in a fresh clone, restores both source paths, preserves the seven archive and ledger paths and yields tree `870987885ff3a455a8a76c1491762d6850342d2c`. The archived synthetic evidence has SHA-256 `d64218d4ae24181cafee4573f04bfda9cde893c41e75c8eee3b8967e11cdc790`. The prefix contains actual #991, official queue commit for #992 and a private projected #993 merge.

[Observed] The exact R4 synthetic rich Index page fits at rest. On a 390-pixel viewport, tabbing to its long code citation opens the path tooltip and makes the document horizontally scrollable. In an independent browser profile the page width changes from 375 to 1081 pixels, and the visible tooltip's right edge is 1081 pixels from the left. The HTML fixture SHA-256 is `411fcc2eb72a399e1ac77a84aa8f2338e80cc40f4a66c988aa22edd558344c24`. The independent keyboard trace SHA-256 is `f8e85f4b5a1905759218c362c8d4b41979f9acd40a953e68e19b75d6e3de1d5a`.

[Inferred] This falsifies phone-width reading during an ordinary citation interaction. Keep the citation destination, accessible name and full tooltip content, and bound the visible content for keyboard focus and pointer hover at narrow widths. Exercise at least one inline target near the right edge as well as the code citation.
