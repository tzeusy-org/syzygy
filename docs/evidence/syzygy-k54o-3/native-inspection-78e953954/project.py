#!/usr/bin/env python3
"""Validate and project the owned synthetic native diagnostics using only the adjacent files."""

from collections import Counter, defaultdict
from hashlib import sha256
from math import isfinite
from pathlib import Path
import json


DIRECTORY = Path(__file__).resolve().parent
NUMBER = {int, float}
INTEGER = {int}
BOOLEAN = {bool}
OPTIONAL_NUMBER = NUMBER | {type(None)}
ROLE = set("author inventory fidelity design".split())
OUTCOME = set("exited launch-refused stopped wall-limit output-limit storage-limit process-limit inspection-failed".split())
ERRNO = set("ENOENT ENOTDIR EACCES EPERM ELOOP EBADF EMFILE ENFILE ESRCH other".split())
CALL_SITE = set(
    "machine-store machine-peer session-audit run-artifacts run-machine session-current effect-product-sample "
    "run-sessions ordered-attempt supervisor unclassified".split()
)
ORDERED_PHASE = set(
    "reproduce-open-run reproduce-draft reproduce-fidelity-review reproduce-renderer-input reproduce-draw-pending "
    "reproduce-design-review reproduce-draw-final reproduce-validate-producer bootstrap-prelaunch-render "
    "bootstrap-prelaunch-current bootstrap-prelaunch-prepare bootstrap-prelaunch-host bootstrap-process-start "
    "bootstrap-launched bootstrap-write-launch bootstrap-commit-launch bootstrap-register-launch "
    "bootstrap-post-launch-current bootstrap-post-launch-sample bootstrap-commit-delivery bootstrap-read-delivery "
    "register-launch-start register-launch-prompt register-launch-poll register-launch-snapshot register-launch-retain".split()
)
METADATA_PHASE = set(
    "lookup current-before sample-before first-stable renderer-current sample-after second-stable "
    "current-before-copy materialize current-at-release".split()
)
PRELAUNCH_PHASE = set(
    "start end render-read-open render-step-return metadata-inspection-start metadata-inspection-return metadata-refused "
    "metadata-accepted reproduce-read-open reproduce-render-return".split()
)
PRELAUNCH_CAUSE = set(
    "fresh-design-spawn render-products-unavailable supervisor-render-branch-finished metadata-unavailable "
    "metadata-draft report-missing report-run report-draft report-command report-outcome report-pages report-site".split()
)
POLICY = {
    "began": NUMBER, "ended": NUMBER, "gitCalls": INTEGER, "gitMs": NUMBER,
    "valid": BOOLEAN, "callSite": CALL_SITE,
}
SAMPLE = {
    "id": INTEGER, "began": NUMBER, "gap": NUMBER, "elapsed": NUMBER, "bound": INTEGER,
    "stage": {"storage", "process", "current"},
    "firstCheck": {None, "inactive", "child-exited", "capture-finished", "stopping", "deadline"},
    "timerExpired": BOOLEAN, "sampleActive": BOOLEAN, "exited": BOOLEAN, "finishedCapture": BOOLEAN,
    "reason": OUTCOME, "storageMillis": OPTIONAL_NUMBER, "processMillis": OPTIONAL_NUMBER,
    "currentBegin": OPTIONAL_NUMBER, "currentSyncMillis": OPTIONAL_NUMBER, "currentMillis": OPTIONAL_NUMBER,
    "processError": ERRNO | {None},
    "storageDetail": {None, "depth-entries", "child-disappeared-open", "child-disappeared-stat",
                        "multiple-disappearances", "type-or-link", "entries", "retry"},
    "storageEntries": INTEGER | {type(None)}, "storageBytesSeen": INTEGER | {type(None)}, "eventLoopMax": NUMBER,
}
SCHEMA = {
    "spawn": {"inspectionBound": INTEGER, "cadence": INTEGER},
    "first-terminal": {"reason": OUTCOME, "requested": OUTCOME, "exited": BOOLEAN, "finishedCapture": BOOLEAN},
    "child-error": {},
    "child-exit": {"reason": OUTCOME, "code": INTEGER | {type(None)}, "signal": {None, "SIGTERM", "SIGKILL", "other"}},
    "sample-start": SAMPLE,
    "sample-success": SAMPLE,
    "current-false": SAMPLE,
    "timer-expired": SAMPLE,
    "sample-refused": {**SAMPLE, "errno": ERRNO},
    "prelaunch-policy": POLICY,
    "sync-policy": POLICY,
    "ordered-phase": {"phase": ORDERED_PHASE},
    "prelaunch-ordered-phase": {"phase": ORDERED_PHASE},
    "prelaunch-metadata": {
        "phase": METADATA_PHASE, "status": {"start", "refused", "threw", "passed"},
        "elapsed": NUMBER, "remaining": OPTIONAL_NUMBER,
    },
    "prelaunch-phase": {"phase": PRELAUNCH_PHASE},
    "relay-phase": {
        "ordinal": INTEGER, "elapsed": NUMBER, "terminal": BOOLEAN, "aborted": BOOLEAN,
        "marker": set("abort mediation-refused absolute-relay-timer outgoing-close outgoing-error enter resolved caught".split()),
        "step": set(
            "request begin-send audit-send-attempt wait-provider-exchange audit-send-outcome admit-response "
            "audit-admitted-response check-final-guard write-response audit-transport-failed".split()
        ),
        "reason": {None, "owned-provider-aborted", "machine-transport-unavailable", "provider-send-unconfirmed", "other"},
    },
}
PRELAUNCH_SOME_FIELDS = {
    "elapsed": NUMBER, "remaining": INTEGER, "cause": PRELAUNCH_CAUSE, "rendered": BOOLEAN,
    "productPresent": BOOLEAN, "metadataPresent": BOOLEAN, "verified": BOOLEAN,
}


class InvalidTrace(ValueError):
    """A trace with a field outside the source's diagnostic allowlist."""


def matches(value, domain):
    if type(value) in (dict, list):
        return False
    if type(value) is float and not isfinite(value):
        return False
    if all(isinstance(member, type) for member in domain):
        return type(value) in domain
    return value in domain


def trace_row(line, number):
    def use_unique_fields(pairs):
        row = dict(pairs)
        if len(row) != len(pairs):
            raise InvalidTrace(f"duplicate field at row {number}")
        return row

    try:
        row = json.loads(line, object_pairs_hook=use_unique_fields)
    except (ValueError, UnicodeError):
        raise InvalidTrace(f"invalid JSON at row {number}") from None

    if type(row) is not dict or type(row.get("event")) is not str or row["event"] not in SCHEMA:
        raise InvalidTrace(f"unrecognized event at row {number}")
    event = row["event"]
    required = {"at": NUMBER, "launch": INTEGER, "role": ROLE, "event": {event}, **SCHEMA[event]}
    allowed = {**required, **PRELAUNCH_SOME_FIELDS} if event == "prelaunch-phase" else required
    if required.keys() - row.keys() or row.keys() - allowed.keys():
        raise InvalidTrace(f"unexpected field set at row {number}")
    if any(not matches(value, allowed[key]) for key, value in row.items()):
        raise InvalidTrace(f"value outside closed domain at row {number}")
    if row["launch"] < 0 or ((row["launch"] == 0) != event.startswith("prelaunch-")):
        raise InvalidTrace(f"bad launch ordinal at row {number}")
    return row


def artifact(name):
    body = (DIRECTORY / name).read_bytes()
    return {"file": name, "bytes": len(body), "sha256": sha256(body).hexdigest()}


def policy_summary(rows, start, end):
    return {
        "checks": len(rows),
        "refusals": sum(not row["valid"] for row in rows),
        "overlapMillis": round(sum(min(end, row["ended"]) - max(start, row["began"]) for row in rows), 1),
        "gitCalls": sum(row["gitCalls"] for row in rows),
        "gitMillis": round(sum(row["gitMs"] for row in rows), 1),
    }


def stable_windows(rows):
    starts = [row for row in rows if row["event"] == "prelaunch-metadata" and row["status"] == "start"]
    policy = [row for row in rows if row["event"] == "prelaunch-policy"]
    for current, next_current in zip(starts, starts[1:]):
        if current["phase"] not in {"first-stable", "second-stable"}:
            continue
        start, end = current["at"], next_current["at"]
        contained = [row for row in policy if start <= row["began"] <= row["ended"] <= end]
        yield {
            "phase": current["phase"],
            "begin": start, "end": end, "elapsedMillis": round(end - start, 1),
            **policy_summary(contained, start, end),
            "checksBySite": dict(sorted(Counter(row["callSite"] for row in contained).items())),
        }


def sample_window(sample, phases, policy):
    start, end = sample["began"], sample["began"] + sample["elapsed"]
    overlap = [row for row in policy if row["ended"] > start and row["began"] < end]
    contained = [row for row in overlap if start <= row["began"] <= row["ended"] <= end]
    prior_phases = [row for row in phases if row["at"] <= start]
    by_phase_and_site = defaultdict(list)
    for row in overlap:
        phase = next((phase["phase"] for phase in reversed(phases) if phase["at"] <= row["began"]), None)
        by_phase_and_site[phase, row["callSite"]].append(row)
    return {
        "sample": sample,
        "phaseAtStart": prior_phases[-1]["phase"] if prior_phases else None,
        "phaseChanges": [row for row in phases if start < row["at"] <= end],
        "allOverlappingPolicy": policy_summary(overlap, start, end),
        "fullyOverlappingPolicy": policy_summary(contained, start, end),
        "byPhaseAndSite": [
            {"phase": phase, "callSite": site, **policy_summary(checks, start, end)}
            for (phase, site), checks in by_phase_and_site.items()
        ],
    }


def launch_witness(rows):
    for launch in sorted({row["launch"] for row in rows if row["event"] == "sample-refused"}):
        events = [row for row in rows if row["launch"] == launch]
        phases = [row for row in events if row["event"] == "ordered-phase"]
        policy = [row for row in events if row["event"] == "sync-policy"]
        yield {
            "spawn": next(row for row in events if row["event"] == "spawn"),
            "orderedPhases": phases,
            "successfulSampleCountRecorded": sum(row["event"] == "sample-success" for row in events),
            "samplesRefused": [sample_window(row, phases, policy) for row in events if row["event"] == "sample-refused"],
            "timersExpired": [row for row in events if row["event"] == "timer-expired"],
            "terminal": [row for row in events if row["event"] in {"first-terminal", "child-exit"}],
        }


def main():
    source = json.loads((DIRECTORY / "source-binding.json").read_text(encoding="utf-8"))
    actual = [artifact(name) for name in ("overlay.patch", "trace.jsonl")]
    if actual != source["rawArtifacts"]:
        raise SystemExit("raw evidence digest mismatch")
    try:
        rows = [
            trace_row(line, number)
            for number, line in enumerate((DIRECTORY / "trace.jsonl").read_bytes().splitlines(), 1)
        ]
    except InvalidTrace as failure:
        raise SystemExit(str(failure)) from None
    document = {
        "sourceBinding": artifact("source-binding.json"),
        "baseCommit": source["baseCommit"],
        "rawArtifacts": actual,
        "units": "milliseconds",
        "traceValidation": {
            "rowsPassedClosedFieldAndValueChecks": len(rows),
            "eventsByKind": dict(sorted(Counter(row["event"] for row in rows).items())),
        },
        "prelaunchRenderLease": [row for row in rows if row["event"] == "prelaunch-phase"],
        "prelaunchMetadata": [row for row in rows if row["event"] == "prelaunch-metadata"],
        "prelaunchStablePasses": list(stable_windows(rows)),
        "launchedSessionRefusals": list(launch_witness(rows)),
    }
    print(json.dumps(document, indent=2))


if __name__ == "__main__":
    main()
