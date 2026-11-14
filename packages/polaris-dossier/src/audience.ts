/** Per-run qualification beside the versioned guidance and reader standards; their bytes stay unchanged. */
export function audienceGuidance(audience: string): readonly string[] {
  return [
    'The operator declared this audience (Inferred):',
    `"${audience.replace(/\s+/gu, ' ').trim()}"`,
    "Where the brief, its readability and voice rules, the design-review criteria or the reader standards (including RS-2) name a software engineer, a newcomer or an engineer new to the project and its domain, the reader for this run is a member of the declared audience who is new to this project; RS-2's bar still applies: define each term and assume no knowledge of the code or Syzygy's vocabulary.",
  ];
}
