/**
 * Compatibility facade over the modular agent harness (`./agent/*`).
 * New code should import from the focused modules directly; this file keeps
 * existing imports (tests, scripts, routes) working during migration.
 */
export {
	LLM_MODEL,
	SMALL_LLM_MODEL,
	LARGE_LLM_MODEL,
	EMBED_MODEL,
	initAgent as initQvac,
	agentReady as qvacReady,
	loadedTiers,
	dualDegraded,
	resolveModelStrategy,
	pickTier,
	keepMode,
	embedText,
	embedTexts,
	completeText,
	completeJson,
	completeStructured,
	completeWithTools
} from './agent/llm.ts';
export type { ModelTier, TaskKind, ModelStrategy } from './agent/llm.ts';
export { FTS_SYNONYMS, FTS_STOPWORDS } from './agent/fts-data.ts';
export {
	plainOrQuery,
	ftsOrQuery,
	orQueryAddsTerms,
	expandQueryTerms,
	resolveResponseLang,
	outputMatchesLang
} from './agent/language.ts';
export {
	hasCorpus,
	ingestCorpus,
	searchLegal,
	classifyIssue,
	deriveTopic,
	fuseRankings,
	diversifyPassages
} from './agent/retrieval.ts';
export {
	contentTokens,
	docsFlagFor,
	firstClause,
	isAnchored,
	isDuplicateQuestion,
	isGenericQuestion,
	isGroundedInIssue,
	isGroundedInLaw,
	isSingleConcept,
	isSubstantiveEvidence,
	isTypeConsistent,
	isVagueAnswer,
	presupposesRequestedArtifact,
	requestedArtifactTokens
} from './agent/interview/policy.ts';
export {
	judgeEntitiesGrounded,
	nextQuestion,
	isDegenerateText,
	isDegenerateText as isDegenerate
} from './agent/interview/loop.ts';
export { PLAN_HEADINGS } from './agent/plan/headings.ts';
export {
	citationCoverage,
	countMissingHeadings,
	countPlaceholderSections,
	factualSentences,
	groundingScore,
	hasSafetyFooter,
	isThinPlan,
	packPassages,
	splitSections,
	verifyCitations,
	verifyQuoteSpans,
	weakSections
} from './agent/plan/validator.ts';
export { generatePlan, savePlan } from './agent/plan/generator.ts';
export type {
	Passage,
	UserPassage,
	Question,
	Topic,
	ResponseLang,
	LangPref,
	QuestionType,
	HistoryTurn
} from './agent/types.ts';
export { ALLOWED_TOPICS } from './agent/types.ts';
