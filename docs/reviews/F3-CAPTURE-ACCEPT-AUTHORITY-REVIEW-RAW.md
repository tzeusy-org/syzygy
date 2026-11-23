PASS

[Observed] The corrected patch matches the supplied base and hashes. It removes one caller check before an immediate synchronous call to capture, which runs the same check before the listener descriptor read. The original effect checks after the read and after each parent wait still gate native dispatch. Protected publication and transport authorization remain guarded. [Caller](/home/orca/.tmp/f3-capture-entry.TFdNmXbY/w/packages/polaris-dossier/src/url-run-machine.ts:258) · [Capture](/home/orca/.tmp/f3-capture-entry.TFdNmXbY/w/packages/polaris-dossier/src/url-machine-peer.ts:337)

[Observed] The test counts three checks before the blocked parent revalidation. The fixture’s second connection requires a response on the first, so it cannot overlap the counted window. The test checks that closing or withdrawing authority leaves no admitted connection or client record. [Focused test](/home/orca/.tmp/f3-capture-entry.TFdNmXbY/w/packages/polaris-dossier/src/url-run-machine.test.ts:238)

[Unknown] The end-to-end native Resume effect remains unverified. This review was source-only.
