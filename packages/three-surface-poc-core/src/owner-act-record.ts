// Owner-act record parser — pure text → typed fields, no validity.
//
// An owner-act record under `.syzygy/governance/decisions/` (for example
// the three 2026-09-02 PWB effect-act records) is a Markdown file whose
// head is a sequence of labelled paragraphs, followed by a `## Ceremony`
// section carrying the exact phrase the owner wrote in a fenced `text`
// block and the recording tag, and a `## Effect` section stating the
// act's scope. This parser extracts those fields and reports each as
// `present`, `missing` (label absent) or `malformed` (label present but
// the value does not fit the label's syntactic form).
//
// The parser owns NO notion of validity. Whether a present field matches
// the controlled evaluation input (RFC3-16(b) "wrong but present"), or
// whether the act is effective at all (RFC3-16(a)), is decided only by
// `body-read-authority.ts`. Keeping the two apart is what lets the
// evaluator's 195 invalid cases stay independently reachable: a fixture
// can make any one field missing, malformed or wrong without the parser
// collapsing it into something else.

export type ParsedField<T> =
  | { readonly kind: 'present'; readonly value: T }
  | { readonly kind: 'missing' }
  | { readonly kind: 'malformed'; readonly raw: string };

interface ProvenanceStateField {
  // The backticked state label exactly as written.
  readonly label: string;
  // Whether the record states that the state was explicitly selected by
  // the human (RFC3-16(c) requires explicit selection for state (1)).
  readonly explicitSelection: boolean;
}

type A1Field =
  | { readonly absent: true }
  | { readonly absent: false; readonly identity: string };

type SupersessionField =
  | { readonly relation: 'none' }
  | {
      readonly relation: 'supersedes' | 'revokes';
      // The act identity or the decisions/ record path the act names.
      readonly target: string;
      // Present when the act supersedes only one authority role ("for the
      // `<act-type>` role only"); the evaluator matches it to the act type.
      readonly role?: string;
    };

export interface ParsedOwnerActRecord {
  readonly actIdentity: ParsedField<string>;
  readonly actType: ParsedField<string>;
  readonly projectIdentity: ParsedField<string>;
  readonly artifactIdentity: ParsedField<string>;
  readonly exactDigest: ParsedField<string>;
  readonly provenanceState: ParsedField<ProvenanceStateField>;
  readonly supersession: ParsedField<SupersessionField>;
  readonly a1: ParsedField<A1Field>;
  readonly owner: ParsedField<string>;
  readonly actInstant: ParsedField<string>;
  readonly expires: ParsedField<string>;
  readonly ceremonyPhrase: ParsedField<string>;
  readonly recordingTag: ParsedField<string>;
  readonly scope: ParsedField<string>;
}

const LABELS = {
  actIdentity: 'Act identity:',
  actType: 'Act type:',
  projectIdentity: 'Project identity:',
  artifactIdentity: 'Artifact identity:',
  exactDigest: 'Exact digest (SHA-256):',
  provenanceState: 'Provenance state:',
  supersession: 'Supersession / revocation:',
  a1: 'A1 audit-record identity (RFC3-16(b) item 9):',
  owner: 'Owner:',
  actInstant: 'Date:',
  expires: 'Expires:',
} as const;

// Splits the text into paragraphs (blank-line separated), joining the
// continuation lines of a wrapped labelled paragraph with single spaces.
function paragraphs(text: string): readonly string[] {
  const out: string[] = [];
  let current: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.trim() === '') {
      if (current.length > 0) {
        out.push(current.join(' '));
        current = [];
      }
      continue;
    }
    current.push(line.trim());
  }
  if (current.length > 0) out.push(current.join(' '));
  return out;
}

// Returns the paragraph body after `label`, or undefined when no
// paragraph starts with that label. Only the head of the record (before
// the first `## ` heading) is searched, so prose in later sections can
// never masquerade as a labelled field.
function labelledValue(head: readonly string[], label: string): string | undefined {
  for (const paragraph of head) {
    if (paragraph.startsWith(label)) {
      return paragraph.slice(label.length).trim();
    }
  }
  return undefined;
}

const BACKTICKED = /^`([^`]+)`(.*)$/s;

function backtickedField(head: readonly string[], label: string): ParsedField<string> {
  const value = labelledValue(head, label);
  if (value === undefined) return { kind: 'missing' };
  const match = BACKTICKED.exec(value);
  if (match === null || match[2]?.trim() !== '') return { kind: 'malformed', raw: value };
  const inner = match[1] ?? '';
  return { kind: 'present', value: inner };
}

function plainField(head: readonly string[], label: string): ParsedField<string> {
  const value = labelledValue(head, label);
  if (value === undefined) return { kind: 'missing' };
  if (value === '' || /[`*\u0000-\u001f]/.test(value)) return { kind: 'malformed', raw: value };
  return { kind: 'present', value };
}

function provenanceStateField(head: readonly string[]): ParsedField<ProvenanceStateField> {
  const value = labelledValue(head, LABELS.provenanceState);
  if (value === undefined) return { kind: 'missing' };
  const match = BACKTICKED.exec(value);
  if (match === null) return { kind: 'malformed', raw: value };
  const trailer = match[2] ?? '';
  return {
    kind: 'present',
    value: {
      label: match[1] ?? '',
      // "explicitly given by the owner's words" is the screening-scope v4 recorder's form
      // (scripts/record_public_source_screening_scope_v4_act.py, act of 2026-10-20), which
      // records the owner's own words where earlier recorders recorded an option selection.
      explicitSelection: /^ \u2014 state \(1\), explicitly (?:selected by (?:performing the offered state-\(1\) phrase|the owner's option selection recorded below)|given by the owner's words recorded below)$/.test(trailer),
    },
  };
}

function supersessionField(head: readonly string[]): ParsedField<SupersessionField> {
  const value = labelledValue(head, LABELS.supersession);
  if (value === undefined) return { kind: 'missing' };
  if (/^none\b/.test(value)) return { kind: 'present', value: { relation: 'none' } };
  const match = /^(supersedes|revokes) `([^`]+)`/.exec(value);
  if (match !== null) {
    return {
      kind: 'present',
      value: { relation: match[1] as 'supersedes' | 'revokes', target: match[2] ?? '' },
    };
  }
  // The amendment form (2026-09-05 records): "this act supersedes, for the
  // `<role>` role only, the <date> act recorded at `<decisions/ path>`."
  const scoped = /^this act (supersedes|revokes), for the `([^`]+)` role only, the \d{4}-\d{2}-\d{2} act recorded at `([^`]+)`\./.exec(value);
  if (scoped === null) return { kind: 'malformed', raw: value };
  return {
    kind: 'present',
    value: { relation: scoped[1] as 'supersedes' | 'revokes', target: scoped[3] ?? '', role: scoped[2] ?? '' },
  };
}

function a1Field(head: readonly string[]): ParsedField<A1Field> {
  const value = labelledValue(head, LABELS.a1);
  if (value === undefined) return { kind: 'missing' };
  if (value === '**explicitly absent**') return { kind: 'present', value: { absent: true } };
  const match = BACKTICKED.exec(value);
  if (match === null || match[2]?.trim() !== '') return { kind: 'malformed', raw: value };
  return { kind: 'present', value: { absent: false, identity: match[1] ?? '' } };
}

// The text of one `## <name>` section (up to the next `## ` heading), or
// undefined when the heading is absent.
function section(text: string, name: string): string | undefined {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${name}`);
  if (start < 0) return undefined;
  const body: string[] = [];
  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index] ?? '';
    if (line.startsWith('## ')) break;
    body.push(line);
  }
  return body.join('\n');
}

function ceremonyPhraseField(text: string): ParsedField<string> {
  const ceremony = section(text, 'Ceremony');
  if (ceremony === undefined) return { kind: 'missing' };
  const fence = /```text\r?\n([\s\S]*?)```/.exec(ceremony);
  if (fence === null) return { kind: 'missing' };
  const body = (fence[1] ?? '').replace(/\r?\n$/, '');
  if (body.trim() === '' || body.includes('\n')) return { kind: 'malformed', raw: body };
  return { kind: 'present', value: body };
}

function recordingTagField(text: string): ParsedField<string> {
  const ceremony = section(text, 'Ceremony');
  if (ceremony === undefined) return { kind: 'missing' };
  const line = ceremony
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('- recording tag:'));
  if (line === undefined) return { kind: 'missing' };
  const value = line.slice('- recording tag:'.length).trim();
  const match = /^`([^`]+)`/.exec(value);
  if (match === null) return { kind: 'malformed', raw: value };
  return { kind: 'present', value: match[1] ?? '' };
}

function scopeField(text: string): ParsedField<string> {
  const effect = section(text, 'Effect');
  if (effect === undefined) return { kind: 'missing' };
  if (effect.trim() === '') return { kind: 'malformed', raw: effect };
  return { kind: 'present', value: effect.trim() };
}

export function parseOwnerActRecord(text: string): ParsedOwnerActRecord {
  const firstHeading = text.search(/^## /m);
  const headText = firstHeading < 0 ? text : text.slice(0, firstHeading);
  const head = paragraphs(headText);
  return {
    actIdentity: backtickedField(head, LABELS.actIdentity),
    actType: backtickedField(head, LABELS.actType),
    projectIdentity: backtickedField(head, LABELS.projectIdentity),
    artifactIdentity: backtickedField(head, LABELS.artifactIdentity),
    exactDigest: backtickedField(head, LABELS.exactDigest),
    provenanceState: provenanceStateField(head),
    supersession: supersessionField(head),
    a1: a1Field(head),
    owner: plainField(head, LABELS.owner),
    actInstant: plainField(head, LABELS.actInstant),
    expires: plainField(head, LABELS.expires),
    ceremonyPhrase: ceremonyPhraseField(text),
    recordingTag: recordingTagField(text),
    scope: scopeField(text),
  };
}

// Finds, in an arbitrary decisions/ record, the act identities (or record
// paths, in the amendment form) it names as superseded or revoked. Used by the loader to derive the lifecycle
// input for each authority act; the parser again decides nothing.
export function supersessionTargetsOf(
  text: string,
): readonly { readonly relation: 'supersedes' | 'revokes'; readonly target: string }[] {
  const parsed = parseOwnerActRecord(text);
  if (parsed.supersession.kind !== 'present' || parsed.supersession.value.relation === 'none') {
    return [];
  }
  const { relation, target } = parsed.supersession.value;
  return [{ relation, target }];
}
