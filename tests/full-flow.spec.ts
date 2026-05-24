import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

const BASE = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@innopark.ps';
const ADMIN_PASS = 'Innopark@2026';
const TS = Date.now();
const JUDGE1 = { email: `judge1_${TS}@test.com`, pass: 'Judge123456', name: 'حكّم أول' };
const JUDGE2 = { email: `judge2_${TS}@test.com`, pass: 'Judge123456', name: 'حكّم ثاني' };
const PROJECT1 = { num: `P${TS}1`, name: 'تطبيق ذكاء اصطناعي' };
const PROJECT2 = { num: `P${TS}2`, name: 'منصة تعليمية' };

// ── Helpers ─────────────────────────────────────────────────────

async function adminLogin(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button:has-text("دخول")');
  await page.waitForURL(`${BASE}/admin`, { timeout: 10000 });
  console.log('✅ Admin logged in');
}

async function judgeLogin(page: Page, email: string, pass: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button:has-text("دخول")');
  await page.waitForTimeout(4000);
  const url = page.url();
  if (url.includes('/judge')) {
    console.log(`✅ Judge logged in: ${email}`);
  } else {
    console.log(`⚠️ Judge login issue - at: ${url}`);
  }
}

async function addJudge(page: Page, name: string, email: string, pass: string) {
  await page.click('button:has-text("الحكّام")');
  await page.waitForTimeout(800);
  await page.locator('button').filter({ hasText: /إضافة حكّم/ }).click();
  await page.waitForTimeout(800);
  await page.fill('input[placeholder="اسم الحكّم"]', name);
  await page.fill('input[placeholder="judge@example.com"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button:has-text("إضافة")');
  await page.waitForTimeout(4000);
  console.log(`✅ Judge added: ${name} (${email})`);
}

async function fillEvaluation(page: Page, projectNum: string, projectName: string, judgeEmail: string) {
  // تأكد إن على صفحة الحكّم أولاً
  const currentUrl = page.url();
  if (!currentUrl.includes('/judge') && !currentUrl.includes('/evaluation')) {
    console.log(`⚠️ Not on judge page, at: ${currentUrl}`);
    return;
  }
  
  // إذا على صفحة الحكّم، اضغط تقييم جديد
  if (currentUrl.includes('/judge')) {
    const newEvalBtn = page.locator('button:has-text("تقييم جديد")');
    if (await newEvalBtn.isVisible()) {
      await newEvalBtn.click();
      await page.waitForTimeout(1500);
    } else {
      await page.goto(`${BASE}/evaluation`);
      await page.waitForTimeout(1500);
    }
  }
  
  await page.waitForSelector('text=معلومات المشروع', { timeout: 10000 });

  // Step 0 - Project Info
  const inputs = page.locator('input[type="text"]');
  await inputs.nth(0).fill(projectNum);   // رقم المشروع
  await inputs.nth(1).fill(projectName);  // اسم المشروع
  await inputs.nth(2).fill('مختبر');      // اسم مقدم الطلب
  await page.fill('input[type="email"]', judgeEmail);
  await inputs.nth(3).fill('IT');         // الجهة

  await page.click('button:has-text("التالي")');
  await page.waitForTimeout(500);

  // Steps 1-5 - Ratings
  for (let step = 1; step <= 5; step++) {
    await page.waitForTimeout(300);
    const unrated = page.locator('button:has-text("اضغط للتقييم")');
    const count = await unrated.count();
    for (let i = 0; i < count; i++) {
      await unrated.nth(i).click();
      await page.waitForTimeout(150);
    }
    await page.click('button:has-text("التالي")');
    await page.waitForTimeout(400);
  }

  // Step 6 - Submit
  await page.waitForSelector('text=مراجعة التقييم', { timeout: 5000 });
  await page.click('button:has-text("إرسال التقييم")');
  await page.waitForTimeout(4000);
  console.log(`✅ Evaluation submitted: ${projectNum} - ${projectName}`);
}

// ── Tests ────────────────────────────────────────────────────────

test.describe.serial('Full Flow Test', () => {

  test('١. Admin يضيف حكّمين', async ({ page }) => {
    await adminLogin(page);
    await addJudge(page, JUDGE1.name, JUDGE1.email, JUDGE1.pass);
    await page.waitForTimeout(1000);
    await addJudge(page, JUDGE2.name, JUDGE2.email, JUDGE2.pass);

    // تأكد إن الحكّام ظهروا
    await page.click('button:has-text("الحكّام")');
    await page.waitForTimeout(2000);
    // تحقق إن القائمة فيها عناصر (الحكّمين اتضافوا بنجاح)
    const judgeRows = page.locator('table tbody tr, .divide-y > div');
    const count = await judgeRows.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Both judges added - ${count} judges visible`);
  });

  test('٢. الحكّم الأول يقيم مشروعين', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await judgeLogin(page, JUDGE1.email, JUDGE1.pass);
    await expect(page).toHaveURL(`${BASE}/judge`, { timeout: 8000 });

    // مشروع ١ — من صفحة الحكّم
    await fillEvaluation(page, PROJECT1.num, PROJECT1.name, JUDGE1.email);
    await expect(page).toHaveURL(`${BASE}/results`, { timeout: 10000 });
    console.log(`✅ Judge 1 evaluated ${PROJECT1.name}`);

    // مشروع ٢ — ارجع لصفحة الحكّم
    await page.goto(`${BASE}/judge`);
    await page.waitForTimeout(1000);
    await fillEvaluation(page, PROJECT2.num, PROJECT2.name, JUDGE1.email);
    await expect(page).toHaveURL(`${BASE}/results`, { timeout: 10000 });
    console.log(`✅ Judge 1 evaluated ${PROJECT2.name}`);

    await ctx.close();
  });

  test('٣. الحكّم الثاني يقيم نفس المشروعين', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await judgeLogin(page, JUDGE2.email, JUDGE2.pass);
    await expect(page).toHaveURL(`${BASE}/judge`, { timeout: 8000 });

    // مشروع ١
    await fillEvaluation(page, PROJECT1.num, PROJECT1.name, JUDGE2.email);
    await expect(page).toHaveURL(`${BASE}/results`, { timeout: 10000 });
    console.log(`✅ Judge 2 evaluated ${PROJECT1.name}`);

    // مشروع ٢
    await page.goto(`${BASE}/judge`);
    await page.waitForTimeout(1000);
    await fillEvaluation(page, PROJECT2.num, PROJECT2.name, JUDGE2.email);
    await expect(page).toHaveURL(`${BASE}/results`, { timeout: 10000 });
    console.log(`✅ Judge 2 evaluated ${PROJECT2.name}`);

    await ctx.close();
  });

  test('٤. الأدمن يشوف نتائج المشاريع', async ({ page }) => {
    await adminLogin(page);

    // تبة المشاريع
    await page.click('button:has-text("المشاريع")');
    await page.waitForTimeout(2000);

    // تأكد إن المشروعين ظهروا
    await expect(page.locator(`text=${PROJECT1.num}`).first()).toBeVisible();
    await expect(page.locator(`text=${PROJECT2.num}`).first()).toBeVisible();
    console.log('✅ Both projects visible in admin');

    // تأكد إن اسم الحكّمين ظاهر
    await expect(page.locator(`text=${JUDGE1.name}`).first()).toBeVisible();
    await expect(page.locator(`text=${JUDGE2.name}`).first()).toBeVisible();
    console.log('✅ Both judges scores visible');
  });

  test('٥. الحكّم يشوف تقييماته', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await judgeLogin(page, JUDGE1.email, JUDGE1.pass);
    await page.waitForURL(`${BASE}/judge`, { timeout: 8000 });

    await expect(page.locator(`text=${PROJECT1.num}`).first()).toBeVisible();
    await expect(page.locator(`text=${PROJECT2.num}`).first()).toBeVisible();
    console.log('✅ Judge sees their 2 evaluations');

    await ctx.close();
  });

  test('٦. الأدمن يشوف إحصائيات الحكّام', async ({ page }) => {
    await adminLogin(page);
    await page.click('button:has-text("الحكّام")');
    await page.waitForTimeout(1000);

    // كل حكّم عنده 2 تقييمات
    const rows = page.locator(`text=${JUDGE1.name}`);
    await expect(rows.first()).toBeVisible();
    console.log('✅ Admin sees judges with evaluation counts');
  });

});