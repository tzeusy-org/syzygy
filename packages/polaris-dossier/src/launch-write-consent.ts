import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { DECISIONS_DIR, SLOT, recorderTemplate, templateFields, type RecorderTemplate } from '@syzygy/polaris-generation-consent/live';
import { sha256 } from '@syzygy/support';
import { LAUNCH_RECORD_DIR } from './launch-record.js';
import { LAUNCH_REF } from './launch-store.js';

/** The write consent REQ-polaris-generation-046 requires before Syzygy writes any launch consent record (line 29): "Syzygy SHALL write
 * launch consent records only under an in-force write consent for the observing project's own repository (RFC5-12; SEC-4) whose scope
 * names this record class, the dedicated reference and the location in its tree. Absent that consent, Syzygy SHALL ask nothing, refuse,
 * and name the consent that is missing."
 *
 * In force by the act cross-check of RFC3-16(a), as every other gate source: the owner-act record `LAUNCH-CONSENT-WRITE-CONSENT-ACT.md`,
 * byte for byte what scripts/record_launch_consent_write_consent_act.py `render_act` writes (the template below is its port, held to the
 * recorded act by a test), binding the sha256 of the record's current bytes, with its instant not after `now`, and named by no other
 * decisions file (a withdrawal: any file carrying the act identity's stem, the phrase label or the record's path; the aggregate
 * acceptance record only on its field lines). The record's own lines must then name the record class, the reference and the location.
 *
 * Why not the consent package's `readDigestBoundActState`: its instant rule requires the instant's UTC date to equal the record's `Date`
 * line, and this act's `Date` is the owner's answer (2026-11-08) while its instant is the recording (2026-11-09T03:37:56Z), so that
 * reader refuses the performed act as malformed. Here the instant may fall on the `Date` or after it, never before; every other check
 * is the same. [Observed 2026-11-09; reported, not repaired: the act record is bound and the shared reader's rule serves other families.] */

export const WRITE_CONSENT_ARTIFACT = '.syzygy/governance/contracts/candidates/launch-consent-write-consent/instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md';
export const WRITE_CONSENT_ACT_FILE = 'LAUNCH-CONSENT-WRITE-CONSENT-ACT.md';
export const WRITE_CONSENT_NAME = `the launch-record write consent (WRITE-CONSENT-LAUNCH-RECORDS, its act ${DECISIONS_DIR}/${WRITE_CONSENT_ACT_FILE})`;
const LABEL = 'CONSENT TO WRITE LAUNCH CONSENT RECORDS ON THE DEDICATED BRANCH';

export const WRITE_CONSENT_TEMPLATE: RecorderTemplate = recorderTemplate(`# Owner act — write consent for launch consent records

Date: {date}

Recorded at (UTC): {instant}

Owner: Tzeusy

Act identity: \`WRITE-CONSENT-LAUNCH-RECORDS-{date}\`

Act type: \`consent-write\`

Project identity: \`project:syzygy\`

Artifact identity: \`.syzygy/governance/contracts/candidates/launch-consent-write-consent/instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md\`

Exact digest (SHA-256): \`{argument}\`

Scope: the write consent's own scope: launch consent records only, as new
files only, under \`.syzygy/governance/decisions/launch-consent/\`, by
recording commits on \`refs/heads/launch-consent-records\` of
\`project:syzygy\`'s governance home; nothing else

Provenance state: \`owner-adopted (bootstrap, uncorrelated)\` — state (1),
selected by the owner's option selection recorded below

Supersession / revocation: supersedes nothing. Revoked only by a later exact
owner act naming it; revocation is prospective (RFC5-13).

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

The owner was offered the package's \`.syzygy/governance/contracts/candidates/launch-consent-write-consent/OWNER-DECISION-PACKET.md\`, which by
design carries no digest. The act takes this phrase, whose argument is the
one row of the package manifest:

\`\`\`text
CONSENT TO WRITE LAUNCH CONSENT RECORDS ON THE DEDICATED BRANCH: {argument}
\`\`\`

The owner did not type the phrase. On {date} the owner answered a structured
question in a Claude Code session. Verbatim, as the coordinating session
recorded it:

> {quote}

[Inferred] That the person answering is the owner. The question named the
package, PR #801, the round-2 verdict and the manifest row's first eight
hex characters. It offered "Change a name first" and "Decline" as the other
answers [Observed by the coordinating session].

The argument was read from the one row of \`.syzygy/governance/contracts/candidates/launch-consent-write-consent/LAUNCH-CONSENT-WRITE-CONSENT-MANIFEST.txt\` and
matched the record on disk at recording. The recorder refuses any argument
that is not that row.

Frozen provenance:

- reviewed package commit \`{frozen}\`; every file that review read still had
  its reviewed bytes at recording;
- the package manifest file hashes to \`{manifest}\` (a container digest,
  no act's argument);
- confirmation review \`docs/reviews/R-LAUNCH-WRITE-CONSENT-2-RAW.md\`, verdict
  \`{verdict}\`, its head bound to the manifest file's SHA-256 above, its
  notes dispositioned in \`.syzygy/governance/contracts/candidates/launch-consent-write-consent/ROUND-2-DISPOSITIONS.md\`; the raw names
  reviewed commit \`{reviewed}\` [Observed — the raw's own line; binding is by
  digest].

## Effect

From this act's instant the record above is an in-force write consent
(RFC5-12; SEC-4) for \`(project:syzygy, repository:tzeusy-org-syzygy)\`. It is
the write consent REQ-polaris-generation-046 requires before Syzygy writes
any launch consent record. Its scope, exclusions, undo path and withdrawal
are the record's own, unrestated here.

## What this act does not authorize

It grants the write class only, within the record's scope. It authorizes no
implementation: the launch-consent code still needs its own direction. It
gives no observation, egress or execution consent, records no drawer or
provider statement, admits no repository, and makes no launch consent
record in force. It amends no doctrine, contract, policy or specification,
and grants no deployment, release, autonomous or multi-user authority.
`, {
  date: SLOT.date, instant: SLOT.instant, argument: SLOT.sha256, quote: SLOT.line, frozen: SLOT.commit, manifest: SLOT.sha256, verdict: SLOT.verdict, reviewed: SLOT.commit,
});

const STEMS: readonly string[] = ['write-consent-launch-records', LABEL.toLowerCase(), WRITE_CONSENT_ARTIFACT.toLowerCase()];
const FIELD_LINE = /^\s*(?:[-*>]\s*)?\**\s*(?:artifact\s+identity|act\s+identity|record\s+id|subject)\s*\**\s*:/iu;
const AGGREGATE = 'ACCEPTANCE-ACT-RECORD.md';

/** The lines of the consent record that must name this write's class, reference and location, exactly. */
const SCOPE_LINES: readonly string[] = [
  'Consent class: write (RFC5-12; SEC-4)',
  `Dedicated reference: \`${LAUNCH_REF}\``,
  `Location in its tree: \`${LAUNCH_RECORD_DIR}/\``,
];
const RECORD_CLASS_LINE = /^Record class written: launch consent records \(REQ-polaris-generation-046\):$/m;

export type WriteConsentState = { readonly state: 'ok'; readonly record: string } | { readonly state: 'absent' | 'refused'; readonly why: string };

async function decisionsFiles(root: string): Promise<readonly string[]> {
  const out: string[] = [];
  const pending = [''];
  while (pending.length > 0) {
    const rel = pending.pop()!;
    for (const e of await fs.readdir(path.join(root, DECISIONS_DIR, rel), { withFileTypes: true })) {
      const child = rel === '' ? e.name : `${rel}/${e.name}`;
      if (e.isDirectory()) pending.push(child); else if (e.isFile()) out.push(child);
    }
  }
  return out.sort();
}

export async function readWriteConsent(options: { readonly root: string; readonly now: number }): Promise<WriteConsentState> {
  const absent = (why: string): WriteConsentState => ({ state: 'absent', why: `${WRITE_CONSENT_NAME} is not in force: ${why}` });
  const refused = (why: string): WriteConsentState => ({ state: 'refused', why: `${WRITE_CONSENT_NAME} is not in force: ${why}` });
  let files: readonly string[];
  try { files = await decisionsFiles(options.root); } catch { return refused('the decisions tree cannot be read'); }
  if (!files.includes(WRITE_CONSENT_ACT_FILE)) return absent(`no owner-act record ${DECISIONS_DIR}/${WRITE_CONSENT_ACT_FILE} exists`);
  for (const rel of files) {
    if (rel === WRITE_CONSENT_ACT_FILE) continue;
    let text: string;
    try { text = (await fs.readFile(path.join(options.root, DECISIONS_DIR, rel), 'utf8')).toLowerCase(); } catch { return refused(`${DECISIONS_DIR}/${rel} cannot be read`); }
    const swept = rel === AGGREGATE ? text.split('\n').filter(line => FIELD_LINE.test(line)).join('\n') : text;
    if (STEMS.some(stem => swept.includes(stem) || rel.toLowerCase().includes(stem))) return refused(`${DECISIONS_DIR}/${rel} names the act without being its record: a withdrawal or a form this reader does not define`);
  }
  let act: string, artifact: string;
  try { act = await fs.readFile(path.join(options.root, DECISIONS_DIR, WRITE_CONSENT_ACT_FILE), 'utf8'); } catch { return refused('its act record cannot be read'); }
  const fields = templateFields(WRITE_CONSENT_TEMPLATE, act);
  if (fields === null || /[0-9a-fA-F]{64}/.test(fields['quote'] ?? '')) return refused('its act record is not exactly what its recorder writes');
  const date = fields['date']!, instant = fields['instant']!;
  const at = Date.parse(instant), day = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isSafeInteger(at) || new Date(at).toISOString().slice(0, 19) + 'Z' !== instant || !Number.isSafeInteger(day) || new Date(day).toISOString().slice(0, 10) !== date || at < day) {
    return refused('its act record\'s date and instant are not a real date and an instant on or after it');
  }
  try { artifact = await fs.readFile(path.join(options.root, WRITE_CONSENT_ARTIFACT), 'utf8'); } catch { return refused(`the act's artifact ${WRITE_CONSENT_ARTIFACT} cannot be read`); }
  if (sha256(artifact) !== fields['argument']) return refused(`the bytes of ${WRITE_CONSENT_ARTIFACT} differ from the act's argument`);
  if (at > options.now) return absent(`the act WRITE-CONSENT-LAUNCH-RECORDS-${date} is not in force yet`);
  const lines = artifact.split('\n');
  const missing = SCOPE_LINES.filter(line => lines.filter(l => l === line).length !== 1);
  if (missing.length > 0 || !RECORD_CLASS_LINE.test(artifact)) {
    return { state: 'refused', why: `${WRITE_CONSENT_NAME} is in force but its record does not name, exactly once each, the record class, the reference ${LAUNCH_REF} and the location ${LAUNCH_RECORD_DIR}/` };
  }
  return { state: 'ok', record: `WRITE-CONSENT-LAUNCH-RECORDS-${date}` };
}
