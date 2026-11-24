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
        "`version` and the lower-case hexadecimal SHA-256 of the file's bytes. The question file is the one source of a dossier's reader questions. "
        "Its public part holds the brief's topics, the provider profile's reader questions and the authoring kit's evaluation questions (the ones "
        "the kit's manual reader test asks); the brief and the provider profile read their lists from it, and the provider profile's frozen "
        "reader-questions file, which the reader test and the scorecard are given, is derived from it. Its held-out part gives, per comparison "
        "subject (repository and commit), for each of its graded questions, depth list and reader tasks either a frozen reference (the key "
        "file's repository-relative path, the SHA-256 of its bytes and its item count, the graded list also its required-fact count; a depth "
        "list holds ten to twenty items and the task list exactly five) or a not-written state with a reason, and holds none of their text; a "
        "subject with any list not written binds no comparison, and a file breaking these counts is refused. Its digest therefore changes with "
        "any public text, order or held-out reference. A reader of a stored run record SHALL accept a record without the member, written before "
        "this version, read its question file as Unknown and never refuse or rewrite it, and SHALL refuse a member of any other shape. The "
        "recorded value is Inferred like the rest of the record; in this version the binding and its Unknown are carried in the run record "
        "only and are not rendered. No held-out text SHALL enter the brief, the inventory brief, the fidelity review's criteria, the provider "
        "profile's reader-questions file or the discovery questions, or any other text an authoring (author or editor), inventory, reviewer or "
        "scout session is given. The mechanical check covers those packets as this tree builds them from fixtures, by the predicate stated "
        "below; live packets and lists not yet written are not mechanically checked (Unknown).\n")
text = text.replace(anchor, para + anchor)
scen_anchor = "\nForm: event-response.\n"
assert text.count(scen_anchor) == 1
scen = ("\n#### Scenario: The run record names the question file\n\n"
        "- **WHEN** `init` records a run, and a stored record written before version 2.27 is read\n"
        "- **THEN** the new record carries `questionFile` with the format `polaris-question-file/1`, the version and the SHA-256 of the question file's bytes, and the earlier record is read with its question file Unknown, its bytes unchanged\n"
        "- **AND** a `questionFile` with another format, a malformed digest, a non-integer or below-one version, an extra member, or a value that is not an object refuses the read\n"
        "- **AND** a question file whose depth list holds 9 or 21 items or whose task list holds 4 or 6 is refused, and a subject with a list not written binds no comparison\n\n"
        "#### Scenario: Held-out text never reaches an authoring packet\n\n"
        "- **WHEN** the fixture brief, inventory brief, fidelity criteria, provider reader-questions file and discovery questions are built, and again with one held-out graded question or required fact planted in one of them, plainly or JSON-escaped\n"
        "- **THEN** no unplanted packet holds any eight consecutive words of a frozen held-out question, required fact, depth item or task (both texts lower-cased, every run of characters other than letters and digits folded to one space, JSON string escapes undone; a paraphrase is not detected), and each planted packet is reported by role, packet and needle identity without repeating the text\n")
text = text.replace(scen_anchor, scen + scen_anchor)
tp_anchor = "\n- **Case, oracle and falsifier (verify):**"
assert text.count(tp_anchor) == 1
i = text.index(tp_anchor) + 1
j = text.index("\n", i)
text = text[:j] + ("\n- **Case, oracle and falsifier (question file):** A run record written by `init` and one with the member removed or malformed; a fixture "
                   "packet per authoring role, unplanted and with a held-out needle planted. The oracle is a digest computed from the question file's JSON copy "
                   "and accept or refuse per case (one refusal text for every malformed binding: `run.json questionFile must carry exactly the polaris-question-file/1 format, a version and a SHA-256`); "
                   "the falsifier is a record without the digest after this version, a refused earlier record, a planted needle that is not reported, "
                   "an unplanted packet reported as carrying held-out text, or a finding that repeats held-out text.") + text[j:]
out = root / "openspec/changes/dossier-question-file/proposed/polaris-generation/spec.md"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text)
print(out, len(text))
