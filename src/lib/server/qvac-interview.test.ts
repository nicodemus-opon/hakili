import { describe, expect, it } from 'vitest';
import {
	contentTokens,
	docsFlagFor,
	isDuplicateQuestion,
	isGenericQuestion,
	isGroundedInIssue,
	isSingleConcept,
	isTypeConsistent,
	presupposesRequestedArtifact
} from './qvac.ts';

const CAR_ISSUE = 'i bought a car from someone and they havent transferred ownership to me yet';

describe('documents flag (uploader routing)', () => {
	it('trusts the model flag and blocks repeats without keyword matching', () => {
		const history = [{ q: 'Do you have the sale agreement for the car?', a: 'yes, attached' }];
		expect(docsFlagFor('Do you have the sale agreement for the car?', true, history)).toBe(false);
		expect(docsFlagFor('Did you receive a termination notice?', true, [])).toBe(true);
		expect(docsFlagFor('Who is the other party?', undefined, [])).toBe(false);
		expect(docsFlagFor('Did you receive a termination notice?', false, [])).toBe(false);
	});
});

describe('grounding-based generic check', () => {
	it('rejects vague catch-alls only against unrelated context', () => {
		const issue = 'My employer dismissed me without notice';
		const withContract = 'My employer dismissed me, I had a permanent contract';
		expect(isGenericQuestion('What outcome are you hoping for?', issue, [])).toBe(true);
		expect(isGenericQuestion('Tell me more about it', issue, [])).toBe(true);
		expect(
			isGenericQuestion('What type of employment contract did you have?', withContract, [])
		).toBe(false);
		// Ungrounded drafts are generic by definition: without a contract in
		// the issue, a contract question is speculative and must be rejected.
		expect(isGenericQuestion('What type of employment contract did you have?', issue, [])).toBe(
			true
		);
	});

	it('rejects invented entities without any domain vocabulary', () => {
		expect(
			isGroundedInIssue('What is the loan amount and when was it agreed upon?', CAR_ISSUE, [])
		).toBe(false);
		expect(
			isGroundedInIssue(
				'What sale agreement and payment proof do you have for the car?',
				CAR_ISSUE,
				[]
			)
		).toBe(true);
	});

	it('short texts are always generic', () => {
		expect(isGenericQuestion('When?', CAR_ISSUE, [])).toBe(true);
		expect(contentTokens('the and of').size).toBe(0);
	});
});

describe('structural single-concept and type checks', () => {
	it('rejects double-barrelled questions structurally', () => {
		expect(isSingleConcept('What is the loan amount and when was it agreed upon?')).toBe(false);
		expect(isSingleConcept('What sale agreement do you have for the car?')).toBe(true);
		expect(isSingleConcept('When and where did this happen?')).toBe(false);
		expect(isSingleConcept('On what date did this happen?')).toBe(true);
		expect(isSingleConcept('Who is the other party in this matter?')).toBe(true);
		expect(isSingleConcept('Who was the employer and what led to dismissal?')).toBe(false);
		expect(
			isSingleConcept('Were you given a notice of dismissal and what is the date of the dismissal?')
		).toBe(false);
		expect(isSingleConcept('What is the name of the person who sold you the car?')).toBe(true);
		expect(isSingleConcept('What happened, when, where, and who saw it?')).toBe(false);
	});

	it('date type needs a when-word, choices need 2-6 options', () => {
		expect(isTypeConsistent('When did you buy the car?', 'date', [])).toBe(true);
		expect(isTypeConsistent('What did you buy?', 'date', [])).toBe(false);
		expect(isTypeConsistent('Pick one', 'single_choice', ['A'])).toBe(false);
		expect(isTypeConsistent('Pick one', 'single_choice', ['A', 'B'])).toBe(true);
	});

	it('flags repeats by token overlap, not phrasing', () => {
		const history = [{ q: 'Who is the other party in this matter?', a: 'John Kamau' }];
		expect(isDuplicateQuestion('Who is the other party in this matter?', history)).toBe(true);
		expect(isDuplicateQuestion('Which documents can you attach?', history)).toBe(false);
	});

	it('question words alone never ground a draft', () => {
		const issue = 'employer dismissed me with no notice';
		const history = [
			{
				q: 'What did your written termination notice say?',
				a: 'storyblok gmbh, no action'
			}
		];
		// "what" appears in the earlier question — that must not ground this.
		expect(isGroundedInIssue('What steps have been taken so far?', issue, history, '')).toBe(false);
		expect(isGenericQuestion('What steps have been taken so far?', issue, history, '')).toBe(true);
		// A real shared noun still grounds.
		expect(
			isGroundedInIssue('What did your written termination notice say?', issue, history, '')
		).toBe(true);
	});
});

describe('prospective-artifact guard (drafting intent)', () => {
	it('rejects circular existence asks about the document to be drafted', () => {
		expect(
			presupposesRequestedArtifact(
				'Was there a written authority letter issued by the person you are acting for?',
				'draft a letter of authority to act on behalf of someone'
			)
		).toBe(true);
	});

	it('rejects post-draft response asks about the document to be drafted', () => {
		expect(
			presupposesRequestedArtifact(
				'Did you receive a response from the other party to the demand letter?',
				'draft a demand letter for a bastard to pay me bac in 7 days'
			)
		).toBe(true);
		expect(
			presupposesRequestedArtifact(
				'When was the demand letter sent?',
				'draft a demand letter for payment'
			)
		).toBe(true);
		expect(
			presupposesRequestedArtifact(
				'What did the authority letter say?',
				'draft a letter of authority to act'
			)
		).toBe(true);
	});

	it('keeps legitimate drafting intake that names the artifact prospectively', () => {
		expect(
			presupposesRequestedArtifact(
				'Who owes you the money and how much is owed?',
				'draft a demand letter for a bastard to pay me bac in 7 days'
			)
		).toBe(false);
		expect(
			presupposesRequestedArtifact(
				'Who should the authority letter name as your representative?',
				'draft a letter of authority to act on behalf of someone'
			)
		).toBe(false);
		expect(
			presupposesRequestedArtifact(
				'What amount should the demand letter claim?',
				'draft a demand letter for payment of KES 50000'
			)
		).toBe(false);
	});

	it('is inert outside creation requests', () => {
		expect(
			presupposesRequestedArtifact(
				'Were you given a written notice of dismissal?',
				'My employer dismissed me without notice'
			)
		).toBe(false);
	});
});
