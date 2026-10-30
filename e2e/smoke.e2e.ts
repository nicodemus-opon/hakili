import { expect, test } from '@playwright/test';

test('homepage loads with issue form', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'New chat' })).toBeVisible();
	await expect(page.getByLabel('Describe your issue')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Prepare questions' })).toBeDisabled();
	await expect(page.getByText('Hakili').first()).toBeVisible();
});

test('empty issue cannot start interview', async ({ page }) => {
	await page.goto('/');
	// Button stays disabled with no input; API also guards with 400.
	const res = await page.request.post('/api/interview/start', {
		data: { issue: '   ' }
	});
	expect(res.status()).toBe(400);
});
