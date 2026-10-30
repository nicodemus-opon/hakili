import { expect, test } from '@playwright/test';

// Regression tests for the interview validation getting stuck on
// "Choose an answer to continue." after answering.

const startWith = (question: unknown) => ({
	status: 200,
	contentType: 'application/json',
	body: JSON.stringify({ title: 'T', question })
});

async function startInterview(page, question: unknown) {
	await page.route('/api/interview/start', async (route) => {
		await route.fulfill(startWith(question));
	});
	await page.goto('/');
	await page.getByLabel('Describe your issue').fill('issue text');
	await page.getByRole('button', { name: 'Prepare questions' }).click();
}

test('date answer advances without validation error', async ({ page }) => {
	await startInterview(page, {
		id: 'q1',
		text: 'When did it happen?',
		type: 'date',
		required: true
	});
	await page.route('/api/interview/next', async (route) => {
		await route.fulfill(startWith({ id: 'q2', text: 'What next?', type: 'text', required: true }));
	});
	const input = page.getByLabel('When did it happen?');
	await expect(input).toBeVisible();
	await input.fill('2026-01-15');
	await expect(input).toHaveValue('2026-01-15');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByText('What next?')).toBeVisible({ timeout: 10000 });
	await expect(page.getByText('Choose an answer to continue.')).toBeHidden();
});

test('submit disabled while loading: no double-submit error, single request', async ({ page }) => {
	let nextCalls = 0;
	await startInterview(page, {
		id: 'q1',
		text: 'What happened?',
		type: 'text',
		required: true
	});
	await page.route('/api/interview/next', async (route) => {
		nextCalls += 1;
		await new Promise((r) => setTimeout(r, 1500));
		await route.fulfill(startWith({ id: 'q2', text: 'When?', type: 'text', required: true }));
	});
	const input = page.getByPlaceholder('Type your answer…');
	await expect(input).toBeVisible();
	await input.fill('I was dismissed without notice');
	const submit = page.getByRole('button', { name: 'Continue' });
	await submit.click();
	// While pending, submit must be disabled so a second click can't fire.
	await expect(submit).toBeDisabled();
	await submit.click({ force: true });
	await expect(page.getByText('Choose an answer to continue.')).toBeHidden();
	await expect(page.getByText('When?')).toBeVisible({ timeout: 10000 });
	expect(nextCalls).toBe(1);
});
