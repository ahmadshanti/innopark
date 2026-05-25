import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.PW_BASE_URL ?? 'http://localhost:5173';
const ADMIN_EMAIL = process.env.PW_ADMIN_EMAIL ?? 'admin@innopark.ps';
const ADMIN_PASS = process.env.PW_ADMIN_PASS ?? 'Innopark@2026';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: /دخول/ }).click();
}

test('Home Page تحميل صحيح', async ({ page }) => {
  await page.goto(BASE);
  await expect(page.getByText('نضج الابتكار')).toBeVisible();
  await expect(page.getByRole('button', { name: /قدّم مشروعك الآن/ })).toBeVisible();
});

test('Home Page - روابط الناف بار', async ({ page }) => {
  await page.goto(BASE);
  await page.getByText('آلية العمل').click();
  await expect(page).toHaveURL(`${BASE}/how-it-works`);
  await page.getByText('خطة التنفيذ').click();
  await expect(page).toHaveURL(`${BASE}/implementation`);
});

test('Apply Page موجودة', async ({ page }) => {
  await page.goto(`${BASE}/apply`);
  await expect(page.getByRole('heading', { name: 'قدّم مشروعك للتقييم' })).toBeVisible();
  await expect(page.getByPlaceholder('أدخل اسم مشروعك')).toBeVisible();
  await expect(page.getByRole('button', { name: 'فردي' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'فريق' })).toBeVisible();
});

test('Apply Page - validation تعمل', async ({ page }) => {
  await page.goto(`${BASE}/apply`);
  await page.getByRole('button', { name: /إرسال الطلب/ }).click();
  await expect(page.getByText('اسم المشروع مطلوب')).toBeVisible();
  await expect(page.getByText('اسم مقدم الطلب مطلوب')).toBeVisible();
});

test('Login صفحة موجودة', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();
  await expect(page.getByText('للأدمن والحكّام')).toBeVisible();
  await expect(page.getByRole('button', { name: /دخول/ })).toBeVisible();
});

test('Login - بيانات خاطئة', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'wrong@wrong.com');
  await page.fill('input[type="password"]', 'wrongpass');
  await page.getByRole('button', { name: /دخول/ }).click();
  await expect(page.getByText('غير صحيحة')).toBeVisible();
});

test('Admin Login صحيح', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await expect(page).toHaveURL(`${BASE}/admin`);
  await expect(page.getByRole('heading', { name: 'إدارة النظام' })).toBeVisible();
});

test('Admin - تبة المستخدمين', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await page.getByRole('button', { name: /المستخدمون/ }).click();
  await expect(page.getByRole('heading', { name: 'إدارة المستخدمين' })).toBeVisible();
});

test('Admin - تبة المشاريع', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await page.getByRole('button', { name: /المشاريع/ }).click();
  await expect(page.getByRole('heading', { name: 'نتائج المشاريع' })).toBeVisible();
});

test('صفحة آلية العمل', async ({ page }) => {
  await page.goto(`${BASE}/how-it-works`);
  await expect(page.getByRole('heading', { name: 'المراحل والخطوات' })).toBeVisible();
  await expect(page.getByText('التقديم والتسجيل')).toBeVisible();
  await expect(page.getByText('المتابعة والدعم')).toBeVisible();
});

test('صفحة خطة التنفيذ', async ({ page }) => {
  await page.goto(`${BASE}/implementation`);
  await expect(page.getByRole('heading', { name: 'المراحل الزمنية' })).toBeVisible();
  await expect(page.getByText('التأسيس والإعداد')).toBeVisible();
  await expect(page.getByText('مؤشرات الأداء الرئيسية')).toBeVisible();
});

test('Admin محمي - redirect للـ login', async ({ page }) => {
  await page.goto(`${BASE}/admin`);
  await expect(page).toHaveURL(`${BASE}/login`);
});

test('Judge محمي - redirect للـ login', async ({ page }) => {
  await page.goto(`${BASE}/judge`);
  await expect(page).toHaveURL(`${BASE}/login`);
});

test('Evaluation محمية - redirect للـ login', async ({ page }) => {
  await page.goto(`${BASE}/evaluation`);
  await expect(page).toHaveURL(`${BASE}/login`);
});
