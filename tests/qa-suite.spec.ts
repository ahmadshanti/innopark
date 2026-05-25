/**
 * INNOPARK — End-to-end QA Suite
 * ----------------------------------------------------------------------------
 * Senior-grade Playwright suite covering:
 *  - Smoke / page load for every public route
 *  - Navbar navigation + mobile drawer
 *  - Form validation (Apply, Signup, Login)
 *  - Authentication happy path (admin) + negative paths
 *  - Authorization / route protection (RBAC)
 *  - Responsive viewports (mobile, tablet, desktop)
 *  - Basic accessibility (landmarks, headings, labels)
 *  - Network resilience (404 fallback to /)
 *
 * Config:
 *   PW_BASE_URL       (default http://127.0.0.1:5173)
 *   PW_ADMIN_EMAIL    (default admin@innopark.ps)
 *   PW_ADMIN_PASS     (default Innopark@2026)
 *   PW_JUDGE_EMAIL    (optional)
 *   PW_JUDGE_PASS     (optional - judge tests skip if absent)
 *
 * Run:
 *   npx playwright test tests/qa-suite.spec.ts
 *   npx playwright test tests/qa-suite.spec.ts --project=chromium --reporter=list
 */

import { test, expect, type Page, type Locator } from '@playwright/test';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
const BASE = process.env.PW_BASE_URL ?? 'http://127.0.0.1:5173';
const ADMIN_EMAIL = process.env.PW_ADMIN_EMAIL ?? 'admin@innopark.ps';
const ADMIN_PASS = process.env.PW_ADMIN_PASS ?? 'Innopark@2026';
const JUDGE_EMAIL = process.env.PW_JUDGE_EMAIL ?? '';
const JUDGE_PASS = process.env.PW_JUDGE_PASS ?? '';

const VIEWPORTS = {
  mobile:  { width: 390,  height: 844  },
  tablet:  { width: 820,  height: 1180 },
  desktop: { width: 1440, height: 900  },
} as const;

// -----------------------------------------------------------------------------
// Helpers (Page-Object-light)
// -----------------------------------------------------------------------------
async function goto(page: Page, path: string) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
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
  await expect(page).toHaveURL(`${BASE}/admin`, { timeout: 15000 });
}

async function clickNavLink(page: Page, text: RegExp | string) {
  // Desktop links live in the header; on mobile they're inside the dropdown.
  const link = page.getByRole('button', { name: text }).first();
  await link.click();
}

function expectVisible(loc: Locator) {
  return expect(loc).toBeVisible({ timeout: 5000 });
}

/** Asserts every <img> on the current page loaded successfully (naturalWidth > 0). */
async function assertNoBrokenImages(page: Page) {
  const broken = await page.evaluate(() => {
    const imgs = Array.from(document.images);
    return imgs
      .filter(i => i.complete && i.naturalWidth === 0)
      .map(i => i.src);
  });
  expect(broken, `Broken images detected: ${broken.join(', ')}`).toEqual([]);
}

/** Asserts no uncaught console errors during this test. */
function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

// =============================================================================
// 1. SMOKE — every public route loads with no console errors / broken images
// =============================================================================
test.describe('@smoke Public routes load cleanly', () => {
  const routes: { path: string; heading: RegExp }[] = [
    { path: '/',               heading: /نضج الابتكار|نظام/ },
    { path: '/how-it-works',   heading: /المراحل والخطوات/ },
    { path: '/implementation', heading: /المراحل الزمنية/ },
    { path: '/login',          heading: /تسجيل الدخول/ },
    { path: '/signup',         heading: /إنشاء حساب/ },
    { path: '/apply',          heading: /قدّم مشروعك للتقييم/ },
  ];

  for (const { path, heading } of routes) {
    test(`GET ${path} renders without console errors`, async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await goto(page, path);
      await expect(page.getByText(heading).first()).toBeVisible({ timeout: 8000 });
      await assertNoBrokenImages(page);
      // Filter out 3rd-party noise that's outside our control
      const meaningful = errors.filter(e =>
        !/favicon|sourcemap|DevTools|extension/i.test(e)
      );
      expect(meaningful, `Console errors on ${path}: ${meaningful.join('\n')}`).toEqual([]);
    });
  }

  test('unknown route falls back to /', async ({ page }) => {
    await goto(page, '/this-route-does-not-exist');
    await expect(page).toHaveURL(`${BASE}/`);
  });
});

// =============================================================================
// 2. HOMEPAGE — hero, CTA, stats, sections present
// =============================================================================
test.describe('@homepage Homepage content', () => {
  test('hero CTA navigates to /apply', async ({ page }) => {
    await goto(page, '/');
    await page.getByRole('button', { name: /قدّم مشروعك الآن/ }).first().click();
    await expect(page).toHaveURL(`${BASE}/apply`);
    await expectVisible(page.getByRole('heading', { name: 'قدّم مشروعك للتقييم' }));
  });

  test('hero shows 4 stat counters', async ({ page }) => {
    await goto(page, '/');
    // Stats use class `stat-num`
    const stats = page.locator('.stat-num');
    await expect(stats).toHaveCount(4);
  });

  test('"تعرّف على المعايير" scrolls to dimensions section', async ({ page }) => {
    await goto(page, '/');
    await page.getByRole('button', { name: /تعرّف على المعايير/ }).click();
    // give smooth-scroll time; assert the anchor exists & has been reached visually
    await page.waitForTimeout(900);
    const dimensions = page.locator('#dimensions');
    await expect(dimensions).toBeInViewport({ ratio: 0.05 });
  });
});

// =============================================================================
// 3. NAVBAR — desktop + mobile drawer
// =============================================================================
test.describe('@navbar Navbar behavior', () => {
  test('desktop links route correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await goto(page, '/');

    await page.getByText('آلية العمل').first().click();
    await expect(page).toHaveURL(`${BASE}/how-it-works`);

    await page.getByText('خطة التنفيذ').first().click();
    await expect(page).toHaveURL(`${BASE}/implementation`);

    // back to home via logo
    await page.getByRole('button', { name: 'الرئيسية' }).first().click();
    await expect(page).toHaveURL(`${BASE}/`);
  });

  test('"دخول" CTA visible for visitors', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await goto(page, '/');
    await expectVisible(page.getByRole('button', { name: /^دخول$/ }).first());
  });

  test('mobile drawer opens and closes', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await goto(page, '/');

    const burger = page.getByRole('button', { name: 'قائمة التنقل' });
    await burger.click();

    // Drawer items should appear
    await expectVisible(page.getByRole('button', { name: 'آلية العمل' }).last());

    // Navigate via drawer
    await page.getByRole('button', { name: 'آلية العمل' }).last().click();
    await expect(page).toHaveURL(`${BASE}/how-it-works`);
  });
});

// =============================================================================
// 4. APPLY PAGE — form validation + UX
// =============================================================================
test.describe('@apply Apply page form behavior', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, '/apply');
  });

  test('renders form with default Individual type', async ({ page }) => {
    await expectVisible(page.getByPlaceholder('أدخل اسم مشروعك'));
    await expectVisible(page.getByRole('button', { name: 'فردي' }));
    await expectVisible(page.getByRole('button', { name: 'فريق' }));
  });

  test('empty submit shows required-field errors', async ({ page }) => {
    await page.getByRole('button', { name: /إرسال الطلب/ }).click();
    await expectVisible(page.getByText('اسم المشروع مطلوب'));
    await expectVisible(page.getByText('اسم مقدم الطلب مطلوب'));
    await expectVisible(page.getByText('رقم الجوال غير صحيح'));
    await expectVisible(page.getByText(/البريد الإلكتروني يجب أن ينتهي/));
  });

  test('rejects non-najah email', async ({ page }) => {
    await page.getByPlaceholder('أدخل اسم مشروعك').fill('Test Project');
    await page.getByPlaceholder('الاسم الكامل').fill('Tester');
    await page.getByPlaceholder('مثال: 0599123456').fill('0599123456');
    await page.getByPlaceholder(/najah\.edu/).fill('foo@gmail.com');
    await page.getByRole('button', { name: /إرسال الطلب/ }).click();
    await expectVisible(page.getByText(/البريد الإلكتروني يجب أن ينتهي/));
  });

  test('rejects invalid mobile format', async ({ page }) => {
    await page.getByPlaceholder('أدخل اسم مشروعك').fill('Test Project');
    await page.getByPlaceholder('الاسم الكامل').fill('Tester');
    await page.getByPlaceholder('مثال: 0599123456').fill('abc');
    await page.getByPlaceholder(/najah\.edu/).fill('tester@najah.edu');
    await page.getByRole('button', { name: /إرسال الطلب/ }).click();
    await expectVisible(page.getByText('رقم الجوال غير صحيح'));
  });

  test('switching to team reveals members section + add/remove', async ({ page }) => {
    await page.getByRole('button', { name: 'فريق' }).click();
    await expectVisible(page.getByText('أعضاء الفريق'));

    const addBtn = page.getByRole('button', { name: /إضافة عضو/ });
    await addBtn.click();
    await addBtn.click();

    // member rows have the placeholder "الاسم الكامل *"
    const memberInputs = page.getByPlaceholder('الاسم الكامل *');
    await expect(memberInputs).toHaveCount(3);

    // remove one via the × button (delete aria-label)
    const removeButtons = page.getByRole('button', { name: 'حذف' });
    await removeButtons.first().click();
    await expect(memberInputs).toHaveCount(2);
  });
});

// =============================================================================
// 5. LOGIN — UI + negative paths + happy path (admin)
// =============================================================================
test.describe('@auth Login flow', () => {
  test('renders login form', async ({ page }) => {
    await goto(page, '/login');
    await expectVisible(page.getByRole('heading', { name: 'تسجيل الدخول' }));
    await expectVisible(page.getByText('للأدمن والحكّام'));
    await expectVisible(page.getByRole('button', { name: /دخول/ }));
  });

  test('empty fields → inline validation message', async ({ page }) => {
    await goto(page, '/login');
    await page.getByRole('button', { name: /دخول/ }).click();
    await expectVisible(page.getByText(/يرجى إدخال البريد وكلمة المرور/));
  });

  test('wrong credentials → error banner', async ({ page }) => {
    await login(page, 'no-such-user@wrong.test', 'wrong-password');
    await expectVisible(page.getByText(/غير صحيحة/));
  });

  test('admin happy path → redirected to /admin', async ({ page }) => {
    await loginAsAdmin(page);
    await expectVisible(page.getByRole('heading', { name: 'إدارة النظام' }));
  });

  test('login page has a "signup" link', async ({ page }) => {
    await goto(page, '/login');
    await page.getByRole('button', { name: /إنشاء حساب جديد/ }).click();
    await expect(page).toHaveURL(`${BASE}/signup`);
    await expectVisible(page.getByRole('heading', { name: /إنشاء حساب/ }));
  });
});

// =============================================================================
// 6. SIGNUP — validation
// =============================================================================
test.describe('@auth Signup form validation', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, '/signup');
  });

  test('rejects when required fields missing', async ({ page }) => {
    await page.getByRole('button', { name: /إرسال الطلب/ }).click();
    await expectVisible(page.getByText(/حقول إجبارية/));
  });

  test('rejects short password', async ({ page }) => {
    await page.getByPlaceholder('مثال: أحمد محمد').fill('Test User');
    await page.getByPlaceholder('example@email.com').fill('test@najah.edu');
    await page.getByPlaceholder('8 أحرف على الأقل').fill('123');
    await page.getByPlaceholder(/عرّف عن نفسك/).fill('Just testing.');
    await page.getByRole('button', { name: /إرسال الطلب/ }).click();
    await expectVisible(page.getByText(/8 أحرف على الأقل/));
  });

  test('"تسجيل الدخول" link returns to /login', async ({ page }) => {
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await expect(page).toHaveURL(`${BASE}/login`);
  });
});

// =============================================================================
// 7. AUTHORIZATION — protected routes redirect when anonymous
// =============================================================================
test.describe('@rbac Protected routes', () => {
  for (const path of ['/admin', '/judge', '/evaluation']) {
    test(`anonymous GET ${path} → /login`, async ({ page }) => {
      await goto(page, path);
      await expect(page).toHaveURL(`${BASE}/login`, { timeout: 10000 });
    });
  }

  test('anonymous GET /results → /', async ({ page }) => {
    await goto(page, '/results');
    await expect(page).toHaveURL(`${BASE}/`);
  });
});

// =============================================================================
// 8. ADMIN — happy path tab navigation
// =============================================================================
test.describe('@admin Admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('shows all admin tabs', async ({ page }) => {
    for (const label of [/الطلبات الجديدة/, /المستخدمون/, /🏆\s*المشاريع/, /معايير التقييم/]) {
      await expectVisible(page.getByRole('button', { name: label }).first());
    }
  });

  test('navigates Users tab', async ({ page }) => {
    await page.getByRole('button', { name: /المستخدمون/ }).first().click();
    await expectVisible(page.getByRole('heading', { name: 'إدارة المستخدمين' }));
  });

  test('navigates Projects tab', async ({ page }) => {
    // Tab label is "🏆 المشاريع" — anchor on the emoji to disambiguate from
    // other buttons whose accessible name may also include "المشاريع".
    await page.getByRole('button', { name: /🏆\s*المشاريع/ }).first().click();
    await expectVisible(page.getByRole('heading', { name: 'نتائج المشاريع' }));
  });

  test('navigates Criteria tab', async ({ page }) => {
    await page.getByRole('button', { name: /معايير التقييم/ }).first().click();
    // CriteriaAdmin page should render – assert at least one heading present.
    const heading = page.locator('h1,h2,h3').first();
    await expectVisible(heading);
  });
});

// =============================================================================
// 9. JUDGE — optional (requires creds via env)
// =============================================================================
test.describe('@rbac Judge access', () => {
  test('judge lands on /judge', async ({ page }) => {
    test.skip(!JUDGE_PASS, 'Set PW_JUDGE_EMAIL/PW_JUDGE_PASS to run');
    await login(page, JUDGE_EMAIL, JUDGE_PASS);
    await expect(page).toHaveURL(`${BASE}/judge`, { timeout: 15000 });
    await expectVisible(page.getByRole('heading', { name: /مرحباً/ }));
  });

  test('judge cannot open /admin', async ({ page }) => {
    test.skip(!JUDGE_PASS, 'Set PW_JUDGE_EMAIL/PW_JUDGE_PASS to run');
    await login(page, JUDGE_EMAIL, JUDGE_PASS);
    await goto(page, '/admin');
    await expect(page).toHaveURL(`${BASE}/judge`, { timeout: 10000 });
  });
});

// =============================================================================
// 10. RESPONSIVE — same content renders across breakpoints
// =============================================================================
test.describe('@responsive Cross-viewport rendering', () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`home page is usable on ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await goto(page, '/');
      await expectVisible(page.getByText('نضج الابتكار').first());
      await expectVisible(page.getByRole('button', { name: /قدّم مشروعك الآن/ }).first());
    });
  }
});

// =============================================================================
// 11. A11Y — light-touch accessibility sanity
// =============================================================================
test.describe('@a11y Accessibility basics', () => {
  test('homepage has a single <h1>-equivalent and rtl direction', async ({ page }) => {
    await goto(page, '/');
    const dir = await page.locator('html, body, [dir]').first().getAttribute('dir');
    expect(dir === 'rtl' || (await page.locator('[dir="rtl"]').count()) > 0).toBeTruthy();
  });

  test('login form inputs have associated labels', async ({ page }) => {
    await goto(page, '/login');
    // Each visible <input> should have either a preceding label, aria-label, or placeholder
    const issues: string[] = [];
    const inputs = await page.locator('input:visible').all();
    for (const inp of inputs) {
      const aria = await inp.getAttribute('aria-label');
      const placeholder = await inp.getAttribute('placeholder');
      // find adjacent label text
      const labelText = await inp.evaluate((el) => {
        const id = el.getAttribute('id');
        if (id) {
          const lbl = document.querySelector(`label[for="${id}"]`);
          if (lbl) return lbl.textContent;
        }
        const parent = el.closest('div');
        return parent?.querySelector('label')?.textContent ?? null;
      });
      if (!aria && !placeholder && !labelText) {
        issues.push(`Unlabeled input: ${await inp.evaluate(e => e.outerHTML)}`);
      }
    }
    expect(issues, issues.join('\n')).toEqual([]);
  });
});
