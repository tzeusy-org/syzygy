# A303 R2 static controls proof packet

**Static synthetic proof only. Actual final capture is pending. Native acceptance, recovery and performance remain Unknown.**

This is an inert evidence bundle. Stored Python, shell, TypeScript and patch files are preserved source artifacts with no executable permission. None is run by opening or verifying this archive. Do not run the retained capture or reproduction drivers as part of reviewing the packet. Original source-only banners and historical records remain verbatim; later execution records have their own explicit scope.

The retained execution records contain 4 held positive + 23 refused negative A303 controls, separately from the older 202 + 31 retained negatives and 8 added comparator negatives. The older run also records 46 page positives, 2 changed-observation positives and 46 separate f043 self-comparison positives. These denominators are different checks, not actual captures or distinct-page totals. See reviews/A303-R2-executed-controls-independent-review-RAW.md for criteria, refusal-path limitations and exact record hashes.

## Contents

- factory/: frozen R2 factory source, original manifests, source review raw report and its exact bindings.
- controls-27/: frozen 27-control driver/binding plus executed results, deletion fixtures and stdout.
- controls-old-233-plus-8/: older executed records and stdout; drivers are prepared/reproduce-controls.py and prepared/retained/compare-bound-disclosure-v2.py plus disclosure-canaries-v2.py.
- prepared/: exact small comparator/control sources and preparation/original input bindings. The original preparation manifest intentionally names separately retained files omitted from this transport bundle.
- source-subject-main/: exact render source and commit bytes for subject `9c878b13f5ea7b819b4817517c675810d4b0f23c` and main `1a4903374ea928b0489953e8cdedb22f1a6debf2`, their two reviewed source patches, A303 adoption rows and bindings. Full repositories/ledgers are external. A source overlay is explicitly allowed; source equality with main is not claimed.
- original-input-bindings/: original predecessor packet manifest/hash and README, verbatim.
- omitted-original-inputs.json: complete byte/hash/location census for excluded prepared files, including both duplicated frozen-sites trees, the full draft/config, broad source deltas and listings.

## Inputs retained separately

The original packet remains at `/home/orca/.tmp/f3-native-admission-fixes/f043-render-retention`; its MANIFEST.json SHA-256 is `57ce8193454a7fcbf7dc660ec840d2d14ff6b6a8ca1aeb31a6788b8aa805e7ac`. Original baseline/candidate sites are its sites/baseline and sites/candidate directories; full config and draft are in its inputs/ directory. The prepared duplicate inputs remain at `/home/orca/.tmp/f3-native-admission-fixes/final-render-capture-factory-A303-R2/subjects/9c878b13f5ea7b819b4817517c675810d4b0f23c--main-1a4903374ea928b0489953e8cdedb22f1a6debf2` (frozen-sites/2446, frozen-sites/f043 and inputs/). Their original source locators and digests are retained here. Nothing in those locations was changed or removed.

This transport packet supports source/result/provenance audit without the duplicated sites. It is intentionally not a self-contained replay environment: reproducing controls needs the separately retained exact sites, full inputs and Git objects. No real build, capture, native process, checker, provider call or network call was performed while assembling it. Actual final capture evidence is not included or implied.

## Integrity and archive format

manifest.json lists every file under payload/ with relative archive path, byte count, SHA-256 and origin. Its own bytes are excluded from its file list to avoid self-reference. payload.tar.gz contains those payload members plus that exact manifest.json. The root README.md is a convenience copy of the payload README.

Archive members are sorted regular files, mode 0644, uid/gid 0, empty owner/group names and mtime 0; the USTAR stream is gzip-compressed with filename empty, mtime 0 and compression level 9. archive.json binds compressed and uncompressed bytes and the manifest. verification.json records independent archive rebuild equality, extraction population and byte/hash verification. Archive extraction never imports or executes any retained source.
