import { test, expect, type Page } from '@playwright/test';

async function skipOnboarding(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip' }).click();
}

test.describe('onboarding', () => {
  test('shows on first launch, walks through, and never reappears after reload', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to TaskLock')).toBeVisible();

    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Get Started' }).click();
    await expect(page.getByText('No tasks yet')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Welcome to TaskLock')).not.toBeVisible();
  });

  test('the help button on the Tasks tab replays it', async ({ page }) => {
    await skipOnboarding(page);
    await page.getByRole('button', { name: 'How TaskLock works' }).click();
    await expect(page.getByText('Welcome to TaskLock')).toBeVisible();
  });
});

test.describe('locking to-dos', () => {
  test('gate the blocker, unlock, and celebrate on completion', async ({ page }) => {
    await skipOnboarding(page);

    await page.getByRole('button', { name: 'Add Task' }).first().click();
    await page.getByPlaceholder('What needs to be done?').fill('Write report');
    await page.getByText('Make this a locking task').click();
    await page.getByRole('button', { name: 'Add Task' }).last().click();
    await expect(page.getByText('1 left to unlock')).toBeVisible();

    await page.getByRole('button', { name: 'Blocker' }).click();
    await expect(page.getByText('Finish 1 item to unlock')).toBeVisible();
    await expect(page.getByText('Locking items today')).toBeVisible();

    await page.getByRole('button', { name: 'To-Dos' }).click();
    await page.getByRole('button', { name: 'Mark "Write report" as done' }).click();
    await expect(page.getByText('Apps Unlocked!')).toBeVisible();
    await expect(page.getByText('Apps Unlocked', { exact: true }).first()).toBeVisible();
  });
});

test.describe('dailies', () => {
  test('a timed locking daily gates apps from its start time', async ({ page }) => {
    await skipOnboarding(page);
    await page.getByRole('button', { name: 'Dailies' }).click();

    await page.getByRole('button', { name: 'Add Daily' }).first().click();
    await page.getByPlaceholder('Daily routine name...').fill('Do laundry');
    await page.getByRole('button', { name: 'Toggle set time' }).click();
    await page.locator('input[type="time"]').fill('00:01');
    await page.getByText('Make this a locking daily').click();
    await page.getByRole('button', { name: 'Add Daily' }).last().click();

    await page.getByRole('button', { name: 'Blocker' }).click();
    await expect(page.getByText('Finish 1 item to unlock')).toBeVisible();
    await expect(page.getByText('Do laundry')).toBeVisible();

    await page.getByRole('button', { name: 'Dailies' }).click();
    await page.getByRole('button', { name: 'Check off "Do laundry" for today' }).click();
    await expect(page.getByText('Apps Unlocked!')).toBeVisible();
  });

  test('a barcode daily only checks off with the registered code', async ({ page }) => {
    await skipOnboarding(page);
    await page.getByRole('button', { name: 'Dailies' }).click();

    await page.getByRole('button', { name: 'Add Daily' }).first().click();
    await page.getByPlaceholder('Daily routine name...').fill('Brush teeth');
    await page.getByRole('button', { name: /Require a barcode scan/ }).click();
    await expect(page.getByText('Camera unavailable')).toBeVisible(); // no camera in CI
    await page.getByPlaceholder('Type the code on the item…').fill('4006381333931');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.getByText(/Barcode registered/)).toBeVisible();
    await page.getByRole('button', { name: 'Add Daily' }).last().click();

    await page.getByRole('button', { name: 'Scan barcode to check off "Brush teeth"' }).click();
    await page.getByPlaceholder('Type the code on the item…').fill('9999');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.getByText(/not the registered code/)).toBeVisible();

    await page.getByPlaceholder('Type the code on the item…').fill('4006381333931');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.getByRole('button', { name: 'Uncheck "Brush teeth" for today' })).toBeVisible();
  });
});

test('data survives a reload', async ({ page }) => {
  await skipOnboarding(page);
  await page.getByRole('button', { name: 'Add Task' }).first().click();
  await page.getByPlaceholder('What needs to be done?').fill('Persisted task');
  await page.getByRole('button', { name: 'Add Task' }).last().click();
  await expect(page.getByText('Persisted task')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Persisted task')).toBeVisible();
});
