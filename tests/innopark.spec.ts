import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@innopark.ps';
const ADMIN_PASS = 'Innopark@2026';
const JUDGE_EMAIL = `judge_${Date.now()}@test.com`;
const JUDGE_PASS = 'Test123456';
const JUDGE_NAME = 'حكّم تيست';

async function loginAs(page: Page, email: string, pass: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button:has-text("دخول")');
  await page.waitForTimeout(2000);
}

// ── 1. Home Page ────────────────────────────────────────────────
test('Home Page تحميل صحيح', async ({ page }) => {
  await page.goto(BASE);
  await expect(page.locator('text=نظام تقييم').first()).toBeVisible();
  await expect(page.locator('text=نضج الابتكار').first()).toBeVisible();
  console.log('✅ Home Page OK');
});

test('Home Page - روابط الناف بار', async ({ page }) => {
  await page.goto(BASE);
  await page.click('text=آلية العمل');
  await expect(page).toHaveURL(`${BASE}/how-it-works`);
  await page.click('text=خطة التنفيذ');
  await expect(page).toHaveURL(`${BASE}/implementation`);
  console.log('✅ Navbar links OK');
});

// ── 2. Sign Up ──────────────────────────────────────────────────
test('Sign Up صفحة موجودة', async ({ page }) => {
  await page.goto(`${BASE}/signup`);
  await expect(page.locator('text=تسجيل حساب حكّام')).toBeVisible();
  await expect(page.locator('input[placeholder="أدخل اسمك الكامل"]')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('button:has-text("إنشاء حساب")')).toBeVisible();
  console.log('✅ Sign Up page OK');
});

test('Sign Up - validation تعمل', async ({ page }) => {
  await page.goto(`${BASE}/signup`);
  // اضغط بدون تعبئة
  await page.click('button:has-text("إنشاء حساب")');
  await page.waitForTimeout(500);
  // المفروض يظهر error
  await expect(page.locator('text=يرجى إدخال الاسم')).toBeVisible();
  console.log('✅ Sign Up validation OK');
});

// ── 3. Login Page ───────────────────────────────────────────────
test('Login صفحة موجودة', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.locator('text=تسجيل الدخول')).toBeVisible();
  await expect(page.locator('text=للحكّام والمشرفين')).toBeVisible();
  await expect(page.locator('text=سجّل كحكّم')).toBeVisible();
  console.log('✅ Login page OK');
});

test('Login - بيانات خاطئة', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'wrong@wrong.com');
  await page.fill('input[type="password"]', 'wrongpass');
  await page.click('button:has-text("دخول")');
  await page.waitForTimeout(3000);
  await expect(page.locator('text=غير صحيحة')).toBeVisible();
  console.log('✅ Wrong credentials blocked OK');
});

// ── 4. Admin Login ──────────────────────────────────────────────
test('Admin Login صحيح', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await expect(page).toHaveURL(`${BASE}/admin`);
  await expect(page.locator('text=إدارة النظام')).toBeVisible();
  console.log('✅ Admin login OK');
});

// ── 5. Admin Dashboard tabs ─────────────────────────────────────
test('Admin - تبة الحكّام', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await page.click('button:has-text("الحكّام")');
  await page.waitForTimeout(1000);
  await expect(page.locator('h2:has-text("إدارة الحكّام")')).toBeVisible();
  console.log('✅ Judges tab OK');
});

test('Admin - تبة نتائج المشاريع', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await page.click('button:has-text("نتائج المشاريع")');
  await page.waitForTimeout(1000);
  await expect(page.locator('h2:has-text("نتائج المشاريع")')).toBeVisible();
  console.log('✅ Projects tab OK');
});

test('Admin - تبة المستخدمون', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await page.click('button:has-text("المستخدمون")');
  await page.waitForTimeout(1000);
  await expect(page.locator('text=المستخدمون المشرفون')).toBeVisible();
  console.log('✅ Users tab OK');
});

// ── 6. Evaluation Form ──────────────────────────────────────────
test('Evaluation - صفحة البيانات', async ({ page }) => {
  await page.goto(`${BASE}/evaluation`);
  await expect(page.locator('text=معلومات المشروع')).toBeVisible();
  await expect(page.locator('input[placeholder*="اسم مشروعك"]')).toBeVisible();
  console.log('✅ Evaluation page 0 OK');
});

test('Evaluation - validation البيانات', async ({ page }) => {
  await page.goto(`${BASE}/evaluation`);
  await page.click('button:has-text("التالي")');
  await page.waitForTimeout(500);
  await expect(page.locator('text=اسم المشروع مطلوب')).toBeVisible();
  console.log('✅ Evaluation validation OK');
});

test('Evaluation - الانتقال للخطوة التانية', async ({ page }) => {
  await page.goto(`${BASE}/evaluation`);
  // تعبئة Step 0
  await page.fill('input[placeholder*="اسم مشروعك"]', 'مشروع اختبار');
  await page.fill('input[placeholder*="الاسم الكامل"]', 'أحمد');
  await page.fill('input[type="email"]', 'test@test.com');
  await page.fill('input[placeholder*="كلية"]', 'IT');
  await page.click('button:has-text("التالي")');
  await page.waitForTimeout(500);
  await expect(page.locator('text=التقنية').first()).toBeVisible();
  console.log('✅ Step 1 navigation OK');
});

// ── 7. How It Works ─────────────────────────────────────────────
test('صفحة آلية العمل', async ({ page }) => {
  await page.goto(`${BASE}/how-it-works`);
  await expect(page.locator('text=التقديم والتسجيل')).toBeVisible();
  await expect(page.locator('text=المتابعة والدعم')).toBeVisible();
  console.log('✅ How it works OK');
});

// ── 8. Implementation ───────────────────────────────────────────
test('صفحة خطة التنفيذ', async ({ page }) => {
  await page.goto(`${BASE}/implementation`);
  await expect(page.locator('text=التأسيس والإعداد')).toBeVisible();
  await expect(page.locator('text=مؤشرات الأداء').first()).toBeVisible();
  console.log('✅ Implementation OK');
});

// ── 9. Protected Routes ─────────────────────────────────────────
test('Admin محمي - redirect للـ login', async ({ page }) => {
  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(`${BASE}/login`);
  console.log('✅ Admin route protected OK');
});

test('Judge محمي - redirect للـ login', async ({ page }) => {
  await page.goto(`${BASE}/judge`);
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(`${BASE}/login`);
  console.log('✅ Judge route protected OK');
});