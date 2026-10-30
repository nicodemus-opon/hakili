import { describe, expect, it } from 'vitest';
import {
	answerAddressesQuestion,
	hasDocCheckIntent,
	hasSubstantiveContent,
	isVagueIssue
} from './jurisdiction.ts';
import { fallbackPlan, parseInterviewStart } from './pipeline.ts';

describe('vague intake + doc routing', () => {
	it('flags review-this as vague', () => {
		expect(isVagueIssue('review this')).toBe(true);
		expect(isVagueIssue('Review this please')).toBe(true);
		expect(isVagueIssue('Review my tenancy agreement before I sign')).toBe(false);
		expect(isVagueIssue('My employer dismissed me without notice')).toBe(false);
	});

	it('detects doc-check intent', () => {
		expect(hasDocCheckIntent('Review my tenancy agreement')).toBe(true);
		expect(hasDocCheckIntent('My employer dismissed me')).toBe(false);
	});

	it('substance tripwire only rejects token-free noise', () => {
		expect(hasSubstantiveContent('hi')).toBe(false);
		expect(hasSubstantiveContent('???')).toBe(false);
		// Anything with words passes here — even "what can you do".
		// Relevance is decided post-generation, not pre-retrieval.
		expect(hasSubstantiveContent('what can you do')).toBe(true);
		expect(hasSubstantiveContent('Property purchase requirements')).toBe(true);
		expect(hasSubstantiveContent('rent')).toBe(true);
		expect(hasSubstantiveContent('mwajiri alinifukuza')).toBe(true);
	});

	it('answer relevance gate ignores well-cited off-topic memos', () => {
		const offTopic =
			'what can you do [1] Civil Procedure Act — Civil Procedure Act (Cap. 21) requires that any civil suit must be instituted in accordance with the procedural rules. Confirm the law is still current and verify all relevant facts to ensure the claim is properly documented.';
		expect(answerAddressesQuestion(offTopic, ['what can you do'])).toBe(false);
		expect(
			answerAddressesQuestion(
				'Property purchase in Kenya requires an official search, consent to transfer, a sale agreement, transfer instruments, stamp duty and registration [1].',
				['Property purchase requirements']
			)
		).toBe(true);
		expect(answerAddressesQuestion('Rent disputes go to the Rent Tribunal [1].', ['rent'])).toBe(
			true
		);
		expect(
			answerAddressesQuestion('Mwenzako alifukuzwa bila notisi; mwajiri lazima atoe notisi [1].', [
				'mwajiri alinifukuza'
			])
		).toBe(true);
		expect(answerAddressesQuestion('', ['rent'])).toBe(false);
		expect(answerAddressesQuestion('anything at all', ['???'])).toBe(false);
		// A bare number shared is coincidence, not relevance.
		expect(answerAddressesQuestion('See section 21 of the Act.', ['claim 21'])).toBe(false);
	});

	it('parses documentIds on interview start', () => {
		const ok = parseInterviewStart({ issue: 'review this', documentIds: ['a', 'b'] });
		if (!('error' in ok)) expect(ok.documentIds).toEqual(['a', 'b']);
		else expect.unreachable();
	});

	it('check fallback quotes doc excerpts instead of inventing consumer steps', () => {
		const plan = fallbackPlan('review this', {}, [], ['doc1'], ['lease.pdf'], 'check', {
			docExcerpts: ['Tenant agrees to pay $685 per month as base rent']
		});
		expect(plan).toContain('## Document');
		expect(plan).toContain('$685');
		expect(plan).not.toContain('NTSA');
	});
});
