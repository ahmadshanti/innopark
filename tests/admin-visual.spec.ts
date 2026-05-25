/**
 * INNOPARK — Visual / wide-coverage admin journey
 * ----------------------------------------------------------------------------
 * A "watch it work" Playwright suite. Runs slow-mo by default so a human can
 * see the app being exercised. Every step takes a numbered screenshot into
 * `test-results/visual/` so you can review the run after the fact.
 *
 * What's covered (read-only — no DB mutations):
 *   • Public routes smoke (home, how-it-works, implementation, judges, login,
 *     signup, apply) with broken-image + console-error checks
 *   • Login negative paths (empty, wrong creds)
 *   • Admin login + full tour through every tab (applications, judges,
 *     projects, criteria) including modals and filters
 *   • Role-based route protection (anonymous → /login)
 *   • Admin profile open + form interaction (cancel)
 *   • Apply form client-side validation (without submitting real data)
 *   • Mobile viewport tour
 *   • 404 fallback
 *
 * Run (visible browser, slow):
 *   npm run dev          # in another terminal
 *   npm run test:visual
 *
 * Run headless / CI:
 *   npm run test:e2e
 *
 * Env overrides:
 *   PW_BASE_URL       (default http://127.0.0.1:5173)
 *   PW_ADMIN_EMAIL    (default admin@innopark.ps)
 *   PW_ADMIN_PASS     (default Innopark@2026)
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
const BASE = process.env.PW_BASE_URL ?? 'http://127.0.0.1:5173';
const ADMIN_EMAIL = process.env.PW_ADMIN_EMAIL ?? 'admin@innopark.ps';
const ADMIN_PASS  = process.env.PW_ADMIN_PASS  ?? 'Innopark@2026';

const SHOTS_DIR = path.resolve('test-results/visual');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

// Slow the visible browser down so a human can follow along. Headless runs
// honour the same setting; bump to 0 in CI if it ever gets noisy.
test.use({
  launchOptions: { slowMo: Number(process.env.PW_SLOWMO ?? 250) },
  viewport: { width: 1440, height: 900 },
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
let stepCounter = 0;
function nextShotName(label: string) {
  stepCounter += 1;
  const slug = label.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
  return path.join(SHOTS_DIR, `${String(stepCounter).padStart(3, '0')}-${slug}.png`);
}

async function shot(page: Page, label: string) {
  const p = nextShotName(label);
  await page.screenshot({ path: p, fullPage: true });
}

async function goto(page: Page, p: string) {
  const url = p.startsWith('http') ? p : `${BASE}${p}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}

async function login(page: Page, email: string, password: string) {
  await goto(page, '/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: /دخول/ }).click();
}

async function loginAsAdmin(page: Page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASS);
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
}

async function assertNoBrokenImages(page: Page) {
  const broken = await page.evaluate(() =>
    Array.from(document.images)
      .filter(i => i.complete && i.naturalWidth === 0)
      .map(i => i.src),
  );
  expect(broken, `broken images: ${broken.join(', ')}`).toEqual([]);
}

function captureConsoleErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errs.push(msg.text());
  });
  page.on('pageerror', err => errs.push(err.message));
  return errs;
}

// -----------------------------------------------------------------------------
// 1. Public routes smoke
// -----------------------------------------------------------------------------
test.describe('Public surface', () => {
  const ROUTES: { path: string; label: string; mustSee: RegExp }[] = [
    { path: '/',               label: 'home',           mustSee: /INNOPARK|حديقة|الرئيسية/i },
    { path: '/how-it-works',   label: 'how-it-works',   mustSee: /آلية|كيف/ },
    { path: '/implementation', label: 'implementation', mustSee: /خطة|التنفيذ/ },
    { path: '/judges',         label: 'judges-public',  mustSee: /حكّام|الحكام|لجنة/ },
    { path: '/login',          label: 'login',          mustSee: /تسجيل الدخول/ },
    { path: '/signup',         label: 'signup',         mustSee: /إنشاء حساب|تسجيل/ },
    { path: '/apply',          label: 'apply',          mustSee: /تقديم|مشروع/ },
  ];

  for (const r of ROUTES) {
    test(`loads ${r.label}`, async ({ page }) => {
      const errs = captureConsoleErrors(page);
      await goto(page, r.path);
      await page.waitForLoadState('networkidle').catch(() => {});
      await expect(page.locator('body')).toContainText(r.mustSee, { timeout: 10_000 });
      await shot(page, `public-${r.label}`);
      await assertNoBrokenImages(page);
      expect(errs.filter(e => !/ResizeObserver|favicon/i.test(e))).toEqual([]);
    });
  }
});

// -----------------------------------------------------------------------------
// 2. Login negative paths
// -----------------------------------------------------------------------------
test.describe('Login validation', () => {
  test('empty fields show inline error', async ({ page }) => {
    await goto(page, '/login');
    await page.getByRole('button', { name: /دخول/ }).click();
    await expect(page.locator('body')).toContainText(/يرجى إدخال البريد/);
    await shot(page, 'login-empty-fields');
  });

  test('wrong credentials show generic error', async ({ page }) => {
    await login(page, 'nobody@example.com', 'wrong-password-123');
    await expect(page.locator('body')).toContainText(
      /البريد الإلكتروني أو كلمة المرور غير صحيحة|قيد المراجعة|تم رفض/,
      { timeout: 15_000 },
    );
    await shot(page, 'login-bad-credentials');
    await expect(page).toHaveURL(/\/login/);
  });
});

// -----------------------------------------------------------------------------
// 3. Route protection (RBAC) — anonymous
// -----------------------------------------------------------------------------
test.describe('Route protection', () => {
  const GATED = ['/admin', '/admin-profile', '/judge', '/profile'];

  for (const p of GATED) {
    test(`anonymous on ${p} is bounced to /login`, async ({ page }) => {
      await goto(page, p);
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
      await shot(page, `gated-${p.replace(/\W+/g, '-')}`);
    });
  }

  test('unknown route falls back to home', async ({ page }) => {
    await goto(page, '/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/$|\/login/, { timeout: 10_000 });
    await shot(page, 'unknown-route');
  });
});

// -----------------------------------------------------------------------------
// 4. Apply form — client-side validation (no real submit)
// -----------------------------------------------------------------------------
test.describe('Apply form validation', () => {
  test('rejects non-najah email', async ({ page }) => {
    await goto(page, '/apply');
    await page.locator('input[placeholder*="اسم"]').first().fill('مشروع اختباري');
    await page.locator('input[placeholder="الاسم الكامل"]').first().fill('مستخدم اختباري');
    await page.locator('input[placeholder*="0599"]').fill('0599123456');
    await page.locator('input[placeholder*="najah.edu"]').fill('user@example.com');
    await shot(page, 'apply-filled-bad-email');
    // Hit the submit button; expect either client validation or server rejection
    const submit = page.getByRole('button', { name: /إرسال|تقديم/ });
    if (await submit.count()) {
      await submit.first().click();
      await expect(page.locator('body')).toContainText(/najah|البريد/, { timeout: 10_000 });
      await shot(page, 'apply-bad-email-error');
    }
  });
});

// -----------------------------------------------------------------------------
// 5. Admin dashboard — full tour
// -----------------------------------------------------------------------------
test.describe('Admin dashboard tour', () => {
  test.setTimeout(120_000);

  test('login → applications → expand → judges → projects → criteria', async ({ page }) => {
    const errs = captureConsoleErrors(page);

    await test.step('login as admin', async () => {
      await loginAsAdmin(page);
      await shot(page, 'admin-dashboard-landing');
    });

    await test.step('applications tab — filters', async () => {
      // Already on applications by default
      await expect(page.getByRole('heading', { name: /طلبات المشاريع/ })).toBeVisible();
      await shot(page, 'admin-apps-pending');

      for (const filter of ['مقبولة', 'مرفوضة', 'الكل', 'قيد المراجعة']) {
        const btn = page.getByRole('button', { name: new RegExp(filter) });
        if (await btn.count()) {
          await btn.first().click();
          await page.waitForTimeout(400);
          await shot(page, `admin-apps-filter-${filter}`);
        }
      }
    });

    await test.step('applications tab — expand first row', async () => {
      const row = page.locator('div').filter({ hasText: /^#\d{3,}/ }).first();
      if (await row.count()) {
        await row.click();
        await page.waitForTimeout(500);
        await shot(page, 'admin-apps-expanded');
      }
    });

    await test.step('judges tab — filters + add-user toggle', async () => {
      await page.getByRole('button', { name: /المستخدمون/ }).click();
      await expect(page.getByRole('heading', { name: /إدارة المستخدمين/ })).toBeVisible({ timeout: 15_000 });
      await shot(page, 'admin-users-pending');

      for (const filter of ['مفعّلون', 'مرفوضون', 'الكل']) {
        const btn = page.getByRole('button', { name: new RegExp(filter) });
        if (await btn.count()) {
          await btn.first().click();
          await page.waitForTimeout(400);
          await shot(page, `admin-users-filter-${filter}`);
        }
      }

      // Open + close the new-user form without submitting
      const addBtn = page.getByRole('button', { name: /\+ مستخدم جديد/ });
      if (await addBtn.count()) {
        await addBtn.click();
        await expect(page.locator('body')).toContainText(/إنشاء مستخدم جديد/);
        await shot(page, 'admin-users-add-form');
        await page.getByRole('button', { name: /إلغاء/ }).click();
      }
    });

    await test.step('judges tab — open a user detail modal', async () => {
      const userRow = page.locator('text=/المعرّف:/').first();
      if (await userRow.count()) {
        await userRow.click();
        await expect(page.locator('text=/تفاصيل المستخدم/')).toBeVisible({ timeout: 10_000 });
        await shot(page, 'admin-users-modal');
        await page.getByRole('button', { name: /إغلاق/ }).click();
      }
    });

    await test.step('projects (results) tab', async () => {
      await page.getByRole('button', { name: /المشاريع/ }).click();
      await expect(page.getByRole('heading', { name: /نتائج المشاريع/ })).toBeVisible({ timeout: 15_000 });
      await shot(page, 'admin-results');
    });

    await test.step('criteria tab — expand a dimension', async () => {
      // The navbar also has a "معايير التقييم" link; the admin tab is prefixed
      // with the 🎯 emoji which disambiguates it.
      await page.getByRole('button', { name: /🎯 معايير التقييم/ }).click();
      await expect(page.getByRole('heading', { name: /معايير التقييم/ })).toBeVisible({ timeout: 15_000 });
      await shot(page, 'admin-criteria');

      const expand = page.getByRole('button', { name: /معايير \(/ });
      if (await expand.count()) {
        await expand.first().click();
        await page.waitForTimeout(400);
        await shot(page, 'admin-criteria-expanded');
      }
    });

    await test.step('admin profile page', async () => {
      await page.goto(`${BASE}/admin-profile`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toContainText(/الملف الشخصي/, { timeout: 15_000 });
      await shot(page, 'admin-profile');
      const back = page.getByRole('button', { name: /رجوع/ });
      if (await back.count()) {
        await back.click();
        await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
      }
    });

    await test.step('logout returns to public surface', async () => {
      const logout = page.getByRole('button', { name: /خروج/ }).first();
      if (await logout.count()) {
        await logout.click();
        // signOut + navigate("/") races with RequireRole's auth listener, which
        // redirects protected pages to /login. Either ending is fine — both
        // mean the admin is no longer authenticated.
        await expect(page).toHaveURL(/\/(login)?$/, { timeout: 10_000 });
        await shot(page, 'after-logout');
      }
    });

    // Only fail on real errors, not noisy benign messages
    const real = errs.filter(e => !/ResizeObserver|favicon|404 \(\)/i.test(e));
    expect(real, real.join('\n')).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// 6. Mobile viewport tour
// -----------------------------------------------------------------------------
test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('home + judges + login render', async ({ page }) => {
    for (const p of ['/', '/judges', '/login']) {
      await goto(page, p);
      await page.waitForLoadState('networkidle').catch(() => {});
      await shot(page, `mobile-${p.replace(/\W+/g, '-')}`);
      await assertNoBrokenImages(page);
    }
  });

  test('mobile admin tour', async ({ page }) => {
    await loginAsAdmin(page);
    await shot(page, 'mobile-admin-landing');
    for (const t of ['المستخدمون', 'المشاريع', 'معايير التقييم', 'الطلبات الجديدة']) {
      const btn = page.getByRole('button', { name: new RegExp(t) });
      if (await btn.count()) {
        await btn.first().click();
        await page.waitForTimeout(400);
        await shot(page, `mobile-admin-${t}`);
      }
    }
  });
});

// -----------------------------------------------------------------------------
// 7. Session handling
// -----------------------------------------------------------------------------
test.describe('Session handling', () => {
  test('admin survives reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
    await shot(page, 'admin-after-reload');
  });

  test('logged-in admin visiting /login is redirected back to /admin', async ({ page }) => {
    await loginAsAdmin(page);
    await goto(page, '/login');
    await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
    await shot(page, 'admin-login-redirect');
  });
});
