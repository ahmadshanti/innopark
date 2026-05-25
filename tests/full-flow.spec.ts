import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.PW_BASE_URL ?? 'http://localhost:5173';
const ADMIN_EMAIL = process.env.PW_ADMIN_EMAIL ?? 'admin@innopark.ps';
const ADMIN_PASS = process.env.PW_ADMIN_PASS ?? 'Innopark@2026';
const JUDGE_EMAIL = process.env.PW_JUDGE_EMAIL ?? 'lama.shanti@najah.edu';
const JUDGE_PASS = process.env.PW_JUDGE_PASS ?? '';

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: /دخول/ }).click();
}

test.describe('Role Access', () => {
  test('admin can access approvals and criteria management', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASS);

    await expect(page).toHaveURL(`${BASE}/admin`, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'إدارة النظام' })).toBeVisible();
    await expect(page.getByRole('button', { name: /الطلبات الجديدة/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /المستخدمون/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /المشاريع/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /🎯 معايير التقييم/ })).toBeVisible();
  });

  test('judge can access evaluation workspace only', async ({ page }) => {
    test.skip(!JUDGE_PASS, 'Set PW_JUDGE_PASS to run judge access checks.');

    await login(page, JUDGE_EMAIL, JUDGE_PASS);

    await expect(page).toHaveURL(`${BASE}/judge`, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /مرحباً/ })).toBeVisible();
    await expect(page.getByText('المشاريع المعتمدة للتقييم')).toBeVisible();
    await expect(page.getByRole('button', { name: /لوحة التحكم/ })).toHaveCount(0);
  });

  test('judge cannot browse directly to admin', async ({ page }) => {
    test.skip(!JUDGE_PASS, 'Set PW_JUDGE_PASS to run judge access checks.');

    await login(page, JUDGE_EMAIL, JUDGE_PASS);
    await expect(page).toHaveURL(`${BASE}/judge`, { timeout: 10000 });

    await page.goto(`${BASE}/admin`);
    await expect(page).toHaveURL(`${BASE}/judge`, { timeout: 10000 });
  });
});
