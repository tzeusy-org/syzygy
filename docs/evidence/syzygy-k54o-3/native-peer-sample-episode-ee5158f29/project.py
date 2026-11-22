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
    "run-sessions ordered-attempt supervisor unclassified machine-peer-unclassified peer-setup peer-capture "
    "peer-image-hash peer-read peer-store-read peer-store-audit peer-effect".split()
)
ORDERED_PHASE = set(
    "reproduce-open-run reproduce-draft reproduce-fidelity-review reproduce-renderer-input reproduce-draw-pending "
    "reproduce-design-review reproduce-draw-final reproduce-validate-producer bootstrap-prelaunch-render "
    "bootstrap-prelaunch-current bootstrap-prelaunch-prepare bootstrap-prelaunch-host bootstrap-process-start "
    "bootstrap-launched bootstrap-write-launch bootstrap-commit-launch bootstrap-register-launch "
    "bootstrap-post-launch-current bootstrap-post-launch-sample bootstrap-commit-delivery bootstrap-read-delivery "
    "register-launch-entry register-launch-start register-launch-prompt register-launch-poll register-launch-snapshot "
    "register-launch-retain delivery-read-entry delivery-read-product delivery-read-verify delivery-read-release "
    "delivery-commit-entry delivery-commit-launch-inspect delivery-commit-first-poll delivery-commit-product-inspect "
    "delivery-commit-product-compare delivery-commit-first-capture delivery-commit-append delivery-commit-materialize "
    "delivery-commit-second-capture delivery-commit-verify delivery-commit-release".split()
)
ORDERED_PHASE.update(['bootstrap-activate', 'bootstrap-begin-ordered-audit', 'bootstrap-commit-delivery', 'bootstrap-commit-launch', 'bootstrap-create-controller', 'bootstrap-final-current', 'bootstrap-launched', 'bootstrap-plan-bytes', 'bootstrap-plan-input', 'bootstrap-post-launch-current', 'bootstrap-post-launch-sample', 'bootstrap-prelaunch-current', 'bootstrap-prelaunch-host', 'bootstrap-prelaunch-prepare', 'bootstrap-prelaunch-render', 'bootstrap-process-start', 'bootstrap-processing-current', 'bootstrap-read-delivery', 'bootstrap-register-launch', 'bootstrap-write-launch'])
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
    "async-policy": POLICY,
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
SCHEMA["product-phase"] = SCHEMA["prelaunch-metadata"]
STORE_PHASE = set(
    "lock-start lock-held state-read-start state-read-return publication-start rename-complete publication-return "
    "lock-timer lock-result lock-release lock-inactive opening-refused lock-check-deadline".split()
)
TIMER_PHASE = set("timer-stage-start timer-armed timer-fired timer-stage-return late-capture-refused transport-result".split())
PARENT_PHASE = {"parent-start", "parent-timer", "parent-return"}
PEER_SPAN_PHASE = set(
    "capture-start capture-return issuance-start issuance-acquired issuance-publication-start "
    "issuance-publication-return issuance-return parent-launch-start parent-launch-return".split()
)
NULLABLE_BOOLEAN = BOOLEAN | {type(None)}
SCHEMA["store-phase"] = {
    "lock": INTEGER, "phase": STORE_PHASE, "began": NUMBER, "elapsed": NUMBER, "operationMilliseconds": INTEGER,
    "held": BOOLEAN, "uncertain": BOOLEAN, "pending": INTEGER, "syncChecks": INTEGER, "asyncChecks": INTEGER,
    "privatePublication": BOOLEAN, "leaseChecks": INTEGER, "ioCalls": INTEGER, "reads": INTEGER, "publications": INTEGER, "retries": INTEGER, "outcome": NULLABLE_BOOLEAN,
}
SCHEMA["peer-phase"] = {"connection": INTEGER, "began": NUMBER, "elapsed": NUMBER}
TIMER_FIELDS = {
    "phase": TIMER_PHASE, "timerStage": {"capture", "authorize", "transport"}, "armedAt": OPTIONAL_NUMBER,
    "deadline": NUMBER, "delay": OPTIONAL_NUMBER, "expired": BOOLEAN, "accepted": NULLABLE_BOOLEAN,
}
PARENT_FIELDS = {
    "phase": PARENT_PHASE, "bound": OPTIONAL_NUMBER, "accepted": BOOLEAN,
    "policyPhase": set("peer-setup peer-capture peer-image-hash peer-read peer-store-read peer-store-audit peer-effect".split()),
}
PEER_FIELDS = {
    "phase": PEER_SPAN_PHASE, "targetRole": ROLE, "peerKind": {"mcp-shim", "inference-bridge"},
    "bound": OPTIONAL_NUMBER, "exceeded": NULLABLE_BOOLEAN, "accepted": NULLABLE_BOOLEAN,
}
ACTIVATION_PHASE = set(['bootstrap-activation-issued', 'bootstrap-catch', 'bootstrap-controller-ready', 'bootstrap-final-current-refused', 'bootstrap-plan-ready', 'bootstrap-product-released', 'bootstrap-writer-ready', 'ordered-current-authority-refused', 'ordered-current-refresh-adopted', 'ordered-current-refresh-missing', 'ordered-current-refresh-start', 'ordered-current-render-missing', 'ordered-host-activation-entry', 'ordered-host-activation-ready', 'ordered-host-activation-refused', 'ordered-host-activation-timer', 'ordered-host-broker-entry', 'ordered-host-close', 'ordered-host-poison', 'ordered-host-relay-audit-entry', 'ordered-host-request-entry', 'ordered-host-request-refused', 'ordered-peer-effect-audit', 'ordered-peer-effect-enter', 'ordered-peer-effect-return', 'ordered-peer-effect-start', 'ordered-peer-effect-threw', 'ordered-phase', 'ordered-product-assertion-refused', 'ordered-product-current', 'ordered-relay-raw-connection', 'ordered-relay-stream-error', 'ordered-relay-transport-ready', 'ordered-relay-transport-refused', 'ordered-relay-transport-rejected', 'ordered-writer-admitted', 'ordered-writer-binding-refused', 'ordered-writer-entry', 'ordered-writer-epoch', 'ordered-writer-shape-refused', 'session-budget-or-stopped-refused', 'session-claim-refused', 'session-control-stopped', 'session-control-threw', 'session-cpu-refused', 'session-host-unhealthy'])
ORDERED_PHASE.add("bootstrap-pre-activation-sample-drain")
ACTIVATION_PHASE.update({"bootstrap-activation-drain-passed", "bootstrap-activation-drain-refused"})
SCHEMA["activation-phase"] = {"phase": ACTIVATION_PHASE}
INGRESS_DETAIL = {phase: {None} for phase in (
    "transport-stop-ingress transport-mediation-enter transport-mediation-drain-wait "
    "transport-mediation-drain-return transport-mediation-effect transport-lifetime-timer "
    "transport-raw-close transport-raw-error transport-pump-enter transport-pump-first-read "
    "transport-pump-end transport-pump-first-data transport-pump-settled "
    "relay-http-enter relay-mediation-enter relay-refusal-audit-enter relay-refusal-audit-threw "
    "relay-request-timer relay-outgoing-close relay-outgoing-error relay-incoming-error relay-http-complete "
    "relay-request-current-enter relay-stream-error relay-parser-connected"
).split()}
INGRESS_DETAIL.update({phase: set(details.split()) for phase, details in {
    "transport-stop-ingress-refused": "missing-state stream-destroyed already-complete",
    "transport-stream-destroy": "error normal",
    "transport-mediation-refused": "missing-state transport-ended stream-destroyed active-effect deadline effect-boundary",
    "transport-pump-first-return": "data pending end refused",
    "transport-pump-refused": "peer-read trailing-data transport-ended stream-destroyed deadline peer-read-refused chunk-kind chunk-bound parser-stream loop-bound",
    "peer-read-refused": "busy initial-current chunk-count read-parent-current read-pre-native-check native-read native-identity byte-bound final-current",
    "peer-mediation-refused": "busy initial-current unallowed-scope store-exclusive locked-current store-read stored-record decode-record active-instance audit post-audit-current effect-boundary effect post-effect-boundary store-exclusive-refused",
    "relay-http-refused": "missing-state pending poisoned closing request-envelope duplicate-header header-shape credential-header request-bound",
    "relay-mediation-return": "accepted refused",
    "relay-request-current-return": "accepted refused transport-ended",
    "relay-request-decision": "accepted refused",
    "relay-request-catch": "stop-ingress request-current request-mediation request-decision provider-headers attempt-allowed-audit post-audit-current send wait-provider post-send",
    "relay-listener-refused": "closing poisoned connection-bound missing-stream",
    "host-current-refused": "closing host-failed not-active input-current",
    "host-request-refused": "request-route request-screening request-body-shape request-metadata request-exact-body request-tool-wrapper request-product-admission",
}.items()})
ACTIVATION_PHASE.update({"ordered-current-drain-enter", "ordered-current-drain-refused",
    "ordered-current-drain-passed", "ordered-current-product-authority-refused"})
ACTIVATION_PHASE.update({"ordered-current-refresh-reproduced", "ordered-current-refresh-authority-refused",
    "ordered-current-refresh-audit-enter", "ordered-current-refresh-audit-return", "ordered-current-refresh-rejected"})
STORE_PHASE = SCHEMA["store-phase"]["phase"]
STORE_PHASE.update({"screened-operation-start", "screened-operation-return"})
FRESH_PEER_STAGES = set("initial-poll initial-check parent-poll parent-current post-parent-check native-capture native-identity final-poll final-check".split())
SCREEN_STAGES = set("request-current request-current-passed request-live request-live-passed pre-screen-current open-operation screen-worker post-screen-current observation-check close-operation".split())
MACHINE_OPERATION = set("source_read artifact_read artifact_write dossier_step inference-forward".split())
INGRESS_DETAIL.update({
    "peer-audit-return": MACHINE_OPERATION,
    "peer-post-audit-current": FRESH_PEER_STAGES,
    "peer-post-audit-current-refused": FRESH_PEER_STAGES,
    "peer-post-audit-current-return": MACHINE_OPERATION,
    "peer-effect-callback-return": MACHINE_OPERATION,
    "peer-boundary-refused": {"native-current", "store-current", "store-clock", "effect-deadline"},
    "screen-stage": SCREEN_STAGES,
    "screen-stage-refused": SCREEN_STAGES,
    "host-screen-decision-refused": set(("invalid-input invalid-config binding-mismatch unknown-origin unknown-class "
        "class-not-declared secret-excluded detector-failed schema-refused scaffolding-mismatch history-mismatch "
        "lifecycle-refused tool-refused unsupported-provider-block capacity-exhausted usage-refused metadata-refused unknown-code").split()),
})
SCHEMA["machine-audit-phase"] = {
    "phase": set(("enqueue project-refused dequeued commit-enter io-enter identities-before pre-write-current write-enter "
        "write-return post-write-current segment-sync post-segment-current directory-sync post-directory-current "
        "identities-after append-callback-return io-return committed commit-rejected audit-timer return-guard returned audit-rejected").split()),
    "ordinal": INTEGER, "remainingMillis": NUMBER, "bound": INTEGER, "pending": INTEGER,
    "filesystem": INTEGER, "callbacks": INTEGER, "poisoned": BOOLEAN, "closing": BOOLEAN,
}
SCHEMA["ingress-phase"] = {"phase": set(INGRESS_DETAIL), "connection": INTEGER | {type(None)}, "detail": {type(None), str}}
ACTIVATION_FIELDS = {
    "accepted": NULLABLE_BOOLEAN, "leaseState": {"open", "expired", "retired", "Unknown"},
    "expectedEpoch": INTEGER, "round": INTEGER, "epoch": INTEGER, "connection": INTEGER, "remainingMillis": INTEGER,
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
    global_event = event in {"peer-phase", "store-phase"}
    required = {"at": NUMBER, "launch": INTEGER, "role": {"supervisor"} if global_event else ROLE,
                "event": {event}, **SCHEMA[event]}
    if event == "peer-phase":
        if "timerStage" in row:
            required.update(TIMER_FIELDS)
        elif "policyPhase" in row:
            required.update(PARENT_FIELDS)
        else:
            required.update(PEER_FIELDS)
    if event == "ingress-phase" and type(row.get("phase")) is str and row["phase"] in INGRESS_DETAIL:
        required["detail"] = INGRESS_DETAIL[row["phase"]]
    allowed = required
    if event == "prelaunch-phase":
        allowed = {**required, **PRELAUNCH_SOME_FIELDS}
    elif event == "activation-phase":
        allowed = {**required, **ACTIVATION_FIELDS}
    if required.keys() - row.keys() or row.keys() - allowed.keys():
        raise InvalidTrace(f"unexpected field set at row {number}")
    if any(not matches(value, allowed[key]) for key, value in row.items()):
        raise InvalidTrace(f"value outside closed domain at row {number}")
    if row["launch"] < 0 or ((row["launch"] == 0) != (global_event or event.startswith("prelaunch-"))):
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


def operation_windows(rows, event, key):
    windows = defaultdict(list)
    for row in rows:
        if row["event"] == event:
            windows[row[key]].append(row)
    return windows


def peer_admission_windows(rows):
    pending = defaultdict(list)
    settled = set()
    for row in rows:
        if row["event"] != "peer-phase" or row["connection"] in settled:
            continue
        ordinal = row["connection"]
        pending[ordinal].append(row)
        if row["phase"] == "transport-result":
            settled.add(ordinal)
    return pending


def overlapping_parent_checks(rows, start, end, cutoff):
    starts, returned = {}, {}
    for row in rows:
        if row["event"] != "peer-phase" or "policyPhase" not in row:
            continue
        key = row["connection"], row["began"]
        if row["phase"] == "parent-start":
            starts[key] = row
        elif row["phase"] == "parent-return":
            returned[key] = row
    return [
        {"entry": row, "return": returned.get(key)}
        for key, row in starts.items()
        if row["at"] <= end and returned.get(key, {"at": cutoff})["at"] >= start
    ]


def during_window(windows, start, end, cutoff):
    for ordinal, rows in windows.items():
        first, last = rows[0], rows[-1]
        final = last["phase"] in {"lock-release", "lock-result", "transport-result", "issuance-return", "late-capture-refused"}
        ended = last["at"] if final else cutoff
        if first["at"] > end or ended < start:
            continue
        prior = [row for row in rows if row["at"] <= start]
        yield {
            "ordinal": ordinal,
            "earliest": first,
            "startState": prior[-1] if prior else None,
            "changes": [row for row in rows if start < row["at"] <= end],
            "latest": last,
        }


def async_policy_summary(policy, start, end):
    overlapping = [row for row in policy if row["ended"] > start and row["began"] < end]
    spans = sorted((max(start, row["began"]), min(end, row["ended"])) for row in overlapping)
    covered = 0
    previous_end = start
    for left, right in spans:
        covered += max(0, right - max(previous_end, left))
        previous_end = max(previous_end, right)
    sites = defaultdict(list)
    for row in overlapping:
        sites[row["callSite"]].append(row)
    return {
        **policy_summary(overlapping, start, end),
        "unionElapsedMillis": round(covered, 1),
        "byCallSite": {site: policy_summary(checks, start, end) for site, checks in sites.items()},
    }


def sample_window(sample, phases, policy, async_policy, store, peers, rows, cutoff):
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
        "asyncPolicy": async_policy_summary(async_policy, start, end),
        "storeOperations": list(during_window(store, start, end, cutoff)),
        "peerAdmissions": list(during_window(peers, start, end, cutoff)),
        "parentChecks": overlapping_parent_checks(rows, start, end, cutoff),
        "byPhaseAndSite": [
            {"phase": phase, "callSite": site, **policy_summary(checks, start, end)}
            for (phase, site), checks in by_phase_and_site.items()
        ],
    }


def launch_witness(rows):
    refusals = {"sample-refused", "current-false"}
    store = operation_windows(rows, "store-phase", "lock")
    peers = peer_admission_windows(rows)
    cutoff = max((row["at"] for row in rows), default=0)
    selected = {row["launch"] for row in rows if row["event"] in refusals
                or (row["launch"] > 4 and row["role"] == "design" and row["event"] == "spawn")}
    for launch in sorted(selected):
        events = [row for row in rows if row["launch"] == launch]
        phases = [row for row in events if row["event"] == "ordered-phase"]
        policy = [row for row in events if row["event"] == "sync-policy"]
        async_policy = [row for row in events if row["event"] == "async-policy"]
        successful = [row for row in events if row["event"] == "sample-success"]
        longest = max(successful, key=lambda row: row["elapsed"], default=None)
        yield {
            "spawn": next(row for row in events if row["event"] == "spawn"),
            "orderedPhases": phases,
            "productPhases": [row for row in events if row["event"] == "product-phase"],
            "activationPhases": [row for row in events if row["event"] == "activation-phase"],
            "ingressPhases": [row for row in events if row["event"] == "ingress-phase"],
            "machineAuditPhases": [row for row in events if row["event"] == "machine-audit-phase"],
            "successfulSampleCountRecorded": len(successful),
            "longestSuccessfulSample": None if longest is None else
                sample_window(longest, phases, policy, async_policy, store, peers, rows, cutoff),
            "samplesRefused": [sample_window(row, phases, policy, async_policy, store, peers, rows, cutoff)
                for row in events if row["event"] in refusals],
            "timersExpired": [row for row in events if row["event"] == "timer-expired"],
            "terminal": [row for row in events if row["event"] in {"first-terminal", "child-exit"}],
        }


def peer_timer_witness(rows):
    store = operation_windows(rows, "store-phase", "lock")
    peers = operation_windows(rows, "peer-phase", "connection")
    cutoff = max((row["at"] for row in rows), default=0)
    resumed_design = [row for row in rows if row["launch"] > 4 and row["role"] == "design"]
    sync = [row for row in resumed_design if row["event"] == "sync-policy"]
    async_policy = [row for row in resumed_design if row["event"] == "async-policy"]
    if not resumed_design:
        return
    spawn = resumed_design[0]["at"]
    for connection, phases in peers.items():
        if phases[-1]["at"] < spawn:
            continue
        timer = next((row for row in phases if row["phase"] == "timer-fired"), None)
        issuance = next((row for row in phases if row["phase"] == "issuance-publication-start"), None)
        returned = next((row for row in phases if row["phase"] == "issuance-publication-return"), None)
        result = {"connection": connection, "phases": phases}
        if issuance is not None:
            operation_end = cutoff if returned is None else returned["at"]
            result["issuanceStoreOperations"] = list(during_window(store, issuance["at"], operation_end, cutoff))
        if timer is None:
            yield result
            continue
        armed, dispatch = timer["armedAt"], timer["at"]
        result["firedStage"] = timer["timerStage"]
        result["armedDelayMillis"] = round(timer["delay"], 1)
        result["dispatchAfterArmMillis"] = round(dispatch - armed, 1)
        result["dispatchPastDeadlineMillis"] = round(dispatch - timer["deadline"], 1)
        if issuance is not None and issuance["at"] <= dispatch:
            started = issuance["at"]
            overlap_sync = [row for row in sync if row["ended"] > started and row["began"] < dispatch]
            result["issuancePublicationUntilTimer"] = {
                "elapsedMillis": round(dispatch - started, 1),
                "syncPolicy": policy_summary(overlap_sync, started, dispatch),
                "asyncPolicy": async_policy_summary(async_policy, started, dispatch),
                "storeOperations": list(during_window(store, started, dispatch, cutoff)),
            }
        yield result


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
        "launchedSessionRefusals": list(launch_witness(rows)),
        "freshDesignPeerTimers": list(peer_timer_witness(rows)),
    }
    print(json.dumps(document, indent=2))


if __name__ == "__main__":
    main()
