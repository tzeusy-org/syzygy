# Round 3 carried exceptions — screening scope version 7

> **Candidate — binds nothing.** `R-SCREENING-SCOPE-V7-3-RAW.md` returned `CONFIRM WITH EXCEPTIONS` over `7f98407d`. The reviewed files are left frozen; this added file carries what the install owes, so no review is retired. The offer to the owner shows these.

## The install owes (E1, E4, E5, E7)

- Read the CSP meta with the same parser that finds scripts. Today's regex accepts a page Chrome reads differently, with a duplicate `content` or a meta smuggled in an attribute. Add both as fixtures with a Chrome check. A body cannot mint either; a renderer could. The defect exists at version 6 too.
- Extend `packages/polaris-generation-consent/src/package-reader.ts` and its testkit for the new act form, as the version-6 install did.
- Choose the parser. No workspace package lists one, so this adds a dependency or writes one; a full HTML parser is the safer reading.
- Hash a script after the newline normalisation Chrome applies; a raw CRLF hash disagrees with the browser.
- Require a review for any change to the pinned hash set, since a script and its pin can change in one PR.
- Change the dossier spec's content-security-policy text as well as its no-script text. Dossier spec version 1.5 carries this.
- Extend the storage test to `window.name`, `history.state` and a page-text fragment. Test `window.open` with a gesture. The source scan matches names, so a computed name such as a concatenated constructor falls to the reviewer.

## What the signer should read beside the packet (E3, E6)

- "Tighter than today's" is true of everything but scripts: the same list admits `script-src`, which version 6 forbade.
- "Nothing else may run" has an edge: a markup `script src` with an allowed `integrity` runs an external file having those exact bytes. A body cannot mint that markup.
- The per-page check runs only where a cited body relies on the exemption, the same scope as version 6.
- The script may navigate to an href the renderer wrote without a user gesture, and such a navigation opens a connection. The clause's "loads nothing" is read as not reaching that limb.

## Left alone (E2)

"A consumer that cannot confirm this" now follows a longer condition. The delta and ledger read "this" as the whole condition. Changing it changes the manifest row, so it waits for any later version.
