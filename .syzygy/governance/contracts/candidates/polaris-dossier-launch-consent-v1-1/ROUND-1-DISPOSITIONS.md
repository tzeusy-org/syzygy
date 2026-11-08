# Review round 1 dispositions — polaris-dossier-launch-consent v1.1

Reviewed record: docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-1-1-RAW.md

> **Candidate — binds nothing.** The raw (`CONFIRM WITH EXCEPTIONS`, over `8ee0eec0`, six notes, none requiring a change) is not edited. Each finding is carried to the owner unrepaired, because repairing it would change package bytes and retire this confirmation (rule 10). A later version may take any of them up.

1. **Finding 1** (note): when no public declaration is given, the warning describes a record that the v1.0 falsifier forbids, and the spec does not say which refusal follows. **Carried**: the delta already says that no record follows a silent declaration. Naming the refusal is a later-version question.
2. **Finding 2** (note): the Case does not list the effective screening policy as a variable. **Carried**: while version 7 governs, every repository not declared public is refused, so the warning has no effect until version 8 takes effect.
3. **Finding 3** (note): the warning names the name and URL, while the records also carry the commit. **Carried**: the owner chose "Only the name-on-branch warning" (item `syzygy-pdja.23-confidence`, answer C), so whether to name the commit is an owner question.
4. **Finding 4** (note): `OWNER-SIGNOFF.md` says 297 becomes 298 but omits the second figure, which also gains one scenario (raw, line 156). **Carried**: the counts in `PROJECT-STATUS.md` are rewritten by the recorder at install time, and these are derived from bytes.
5. **Finding 5** (note): the impact sweep covers `REQ-polaris-generation-046` but not the short form `REQ-046`. **Carried**: the reviewer checked every short-form site and found each still holds under v1.1.
6. **Finding 6** (note): the delta cites VIS-1 as a warrant, but the spec's doctrine warrant list does not carry it. **Carried**: this is a warrant-list completeness note and changes no requirement's meaning.
