"""Build the v2.27 question-file spec from the v2.21 verify-text bytes (syzygy-5dhm.21)."""
import pathlib, sys
root = pathlib.Path(sys.argv[1])
src = (root / "openspec/changes/dossier-verify-text/proposed/polaris-generation/spec.md").read_text()
lines = src.split("\n")
assert lines[0].startswith("# Dossier verify")
head = [
    "# Dossier question file: the run record names the instrument",
    "",
    "Candidate version 2.27; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED requirement, REQ-polaris-generation-033, whose complete text below replaces the effective text that verify-text version 2.21 gave it (versions 2.22 to 2.26 leave this requirement as 2.21 left it). It adds one paragraph, the question file the run record names, and two scenarios; every other line is carried unchanged.",
]
assert lines[1] == "" and lines[3] == ""
body = head + lines[3:]
text = "\n".join(body)
anchor = "\nThe run record and the dossier's appendix SHALL disclose in human form"
assert text.count(anchor) == 1
para = ("\nSince version 2.27 the run record SHALL name the question file the run was initialised under: `init` SHALL write one `questionFile` member "
        "beside the polaris-dossier-run/2 core's other fields, carrying exactly `format` with value `polaris-question-file/1`, a positive integer "
        "`version` and the lower-case hexadecimal SHA-256 of the file's bytes. The question file is the one place a dossier's reader questions are "
        "written: a public part (the brief's topics, the provider profile's reader questions and the authoring kit's evaluation questions) that "
        "the brief, the provider profile, the reader test and the scorecard each read from it, and a held-out part that names, per comparison "
        "subject, the key file holding its graded questions, depth list (ten to twenty items) and five reader tasks by path, SHA-256 and count, "
        "and holds none of their text. Its digest therefore changes with any public text, order or held-out reference. A reader of a stored run "
        "record SHALL accept a record without the member, written before this version, read its question file as Unknown and never refuse or "
        "rewrite it, and SHALL refuse a member of any other shape. The recorded value is Inferred like the rest of the record. No held-out text "
        "SHALL enter the brief, an inventory, review or provider stage packet, or any other text an authoring, inventory, editor or scout session "
        "is given.\n")
text = text.replace(anchor, para + anchor)
scen_anchor = "\nForm: event-response.\n"
assert text.count(scen_anchor) == 1
scen = ("\n#### Scenario: The run record names the question file\n\n"
        "- **WHEN** `init` records a run, and a stored record written before version 2.27 is read\n"
        "- **THEN** the new record carries `questionFile` with the format `polaris-question-file/1`, the version and the SHA-256 of the question file's bytes, and the earlier record is read with its question file Unknown, its bytes unchanged\n"
        "- **AND** a `questionFile` with another format, a malformed digest, a version below one or an extra member refuses the read\n\n"
        "#### Scenario: Held-out text never reaches an authoring packet\n\n"
        "- **WHEN** a fixture brief, inventory brief, provider reader-questions file or scout question list is built, and again with one held-out graded question or required fact planted in it, plainly or JSON-escaped\n"
        "- **THEN** the unplanted packets carry no held-out text and each planted one is reported by role, packet and needle identity without repeating the text\n")
text = text.replace(scen_anchor, scen + scen_anchor)
tp_anchor = "\n- **Case, oracle and falsifier (verify):**"
assert text.count(tp_anchor) == 1
i = text.index(tp_anchor) + 1
j = text.index("\n", i)
text = text[:j] + ("\n- **Case, oracle and falsifier (question file):** A run record written by `init` and one with the member removed or malformed; a fixture "
                   "packet per authoring role, unplanted and with a held-out needle planted. The oracle is a digest computed from the question file's JSON copy "
                   "and literal refusal texts; the falsifier is a record without the digest after this version, a refused earlier record, or a planted "
                   "needle that is not reported.") + text[j:]
out = root / "openspec/changes/dossier-question-file/proposed/polaris-generation/spec.md"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text)
print(out, len(text))
