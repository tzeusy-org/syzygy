/**
 * Everything in this package outside the parked provider island: what a module the `syzygy` CLI reaches may import
 * (`@syzygy/polaris-generation-core/live`). The island (admitted-input, discovery, discovery-provider, excerpt, pipeline,
 * provider-draft, rendered-design) is exported from the package root only, beside everything here;
 * `island-boundary.test.ts` fails when a module the CLI reaches imports it.
 */
export {
  CANONICAL_JSON_ENCODING,
  CanonicalJsonError,
  digestCanonicalJson,
  encodeCanonicalJson,
  type CanonicalJsonFailure,
  type CanonicalJsonLimits,
} from './canonical-json.js';

export { parseBoundedJson, BoundedJsonError } from './parse-json.js';
export { generationSourceIdentity, generationAnchorId, gitBlobObjectId, validateGenerationSources, validateGenerationSourceTransport, verifiedRedactedBody, quotableGenerationSources, generationSourcesForBody, generationSourcesForRedactedBody, generationSpanRange, generationSourceTextAt, segmentBody, GENERATION_EXCLUSION_REASONS, isGenerationExclusionReason, newGenerationRunKey, keyedDigest, excludedSourceId, type GenerationExclusionReason, GenerationSourceError, type BodyPiece, type BodySourceInput, type RedactedBodySourceInput, type VerifiedRedactedBody, type RedactedBodyScreen, type SourceRedaction, type GenerationSpan, type GenerationSource, type GenerationSourceFailure } from './generation-source.js';
export {
  promptForStage, ILLUSTRATION_HEADING,
  type GenerationStage, type DiscoveryStage, type PromptStage, type PromptProfile,
} from './prompts.js';
export { check, checkShape, choice, handle, list, object, one, ref, refs, text, type Schema, type SchemaError, type SchemaWithDefs } from './closed-schema.js';
export { SOURCE_ID_PATTERN, SOURCE_ID_MIN_LENGTH, SOURCE_ID_MAX_LENGTH, SOURCE_TEXT_MAX_LENGTH } from './source-model.js';
export { validateDraftRecord, validateRequestedAssets, reviewVerdict, diagramToMermaid, DIAGRAM_KINDS } from './draft-model.js';
export type { DossierDraft, DraftParagraph, DraftBlock, DraftElement, DraftDiagram, DraftDiagramNode, DraftDiagramEdge, DiagramKind, EpistemicMarking, RequestedAsset } from './draft-model.js';
export {
  evaluateDossier, scanDossierPage, readerCost, fidelity, resolveQuote, runReaderTest, topicCoverage, scriptedAnswers, admittedSourcesDigest,
  parseDossierManifest, parseReaderQuestions, parsePageBudget, decodeHtmlText, isDossierPagePath,
  DossierEvaluationError, DOSSIER_FORMAT, READER_QUESTIONS_FORMAT, OWNER_TOPICS,
  type DossierManifest, type DossierEvaluationInput, type ReaderQuestion, type ReaderAnswer, type ReaderAnswerPort, type ReaderPortFactory, type ReaderLocation,
  type PageBudget, type BoundOutcome, type QuoteOutcome, type ScannedPage, type OwnerTopic,
} from './dossier-evaluation.js';
export { DOSSIER_PROFILE_ID, DOSSIER_READER_QUESTIONS, DOSSIER_REQUESTED_ASSETS, clarify, openQuestions } from './dossier-profile.js';
export type { ClarificationInput, ClarificationQuestion, ClarificationRecord, OwnerAnswer } from './dossier-profile.js';
export { validateReaderQuestions, ReaderQuestionsError, READER_QUESTION_TOPICS, READER_QUESTIONS_MAX, READER_QUESTION_TEXT_MAX, type ReaderQuestionTopic } from './reader-questions.js';
export { QUOTE_LEAD_IN, checkBlockQuotes, checkDraftQuotes, draftBlocks, inspectBlockQuotes, normaliseForQuote, quoteFindingAsReviewFinding, sourceTextById, type QuoteBlock, type QuoteFinding, type QuoteFindingKind } from './quote-fidelity.js';
export { leadInQuotationSpans, leadInQuotations, lineCount, locateQuote, normaliseTracked, type LeadInQuotation, type LeadInQuotationSpan, type QuoteLocation, type TrackedText } from './quote-locate.js';
export type { EvidenceAnchor, LocalBlock, LocalDisclosureItem, LocalDraftLayer, LocalPage, LocalPageGroup, LocalPageItem, LocalRenderInput, LocalSegment } from './local-render.js';
export { REVIEW_STATUS_REGION, REVIEW_STATUS_REGION_OPEN, withoutReviewStatusRegion } from './local-render.js';
export { codeContentExempt, documentationExempt, documentationPathRules, PAGE_SINK_CONTRACT, pageSinkCspFinding, publicSourceContentClass, readCodeContentExemption, readGovernanceTextRule, readProjectDocumentationExemption, readProjectDocumentationRule, type ClassificationContext, type CodeContentExemption, type CodeContentExemptionRead, type DocumentationExemptionRead, type DocumentationPathRuleId, type GovernanceTextRead, type OwnerPlacement, type PlacementSubject, type ProjectDocumentationRead, type ProjectDocumentationRule, type PublicSourceContentClass } from './public-source-classification.js';
export { bodyLines, compileEveryOffsetMatcher, MAX_MATCHES, readScopeDetectors, readSecretRedaction, redactBody, redactionMarker, retainedWithMarkers, spanTouchesWithheld, type DetectorMatch, type EveryOffsetMatcher, type RedactionDetector, type RedactionOutcome, type ScopeDetectorsRead, type SecretRedaction, type SecretRedactionRead, type WholeExclusionCause } from './secret-redaction.js';
