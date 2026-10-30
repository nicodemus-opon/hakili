import { expect, test } from '@playwright/test';

const banned: Array<string | RegExp> = ['Review your answers', 'Generate plan', 'Start over'];

async function assertNoWizard(page, stage: string) {
	const t = await page.evaluate(() => document.body.innerText);
	for (const b of banned) {
		const found = typeof b === 'string' ? t.includes(b) : b.test(t);
		expect(found, `[${stage}] wizard chrome present: ${b}`).toBe(false);
	}
}

test('mid-interview thread has no wizard chrome', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'hakili:sessions:v1',
			JSON.stringify([
				{
					id: 'wizard-check',
					title: 'Wizard check',
					updatedAt: Date.now(),
					issue: 'My landlord wants to evict me next week.',
					langPref: 'en',
					questions: [
						{ id: 'q0', text: 'When did you receive the notice?', type: 'text', required: true },
						{
							id: 'q1',
							text: 'Do you have a written tenancy agreement?',
							type: 'boolean',
							required: true
						},
						{
							id: 'q2',
							text: 'Which of these apply?',
							type: 'multi_choice',
							options: ['Paid rent', 'Have receipts']
						}
					],
					answers: { q0: 'Yesterday', q1: 'Yes' },
					custom: {},
					idx: 2,
					plan: '',
					passages: [],
					userSources: [],
					followups: []
				}
			])
		);
	});
	await page.goto('/');
	await page.getByRole('button', { name: 'Wizard check', exact: true }).click();
	await page.locator('[data-slot="message-scroller-viewport"]').waitFor({ timeout: 15000 });
	// Mid-interview the current question renders inline in the thread; the
	// footer composer only appears after the plan exists.
	await expect(page.getByRole('group', { name: 'Which of these apply?' })).toBeVisible();
	await assertNoWizard(page, 'mid-interview');
});
