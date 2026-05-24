# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow.spec.ts >> Full Flow Test >> ٢. الحكّم الأول يقيم مشروعين
- Location: tests\full-flow.spec.ts:123:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:5173/judge"
Received: "http://localhost:5173/login"
Timeout:  8000ms

Call log:
  - Expect "toHaveURL" with timeout 8000ms
    19 × unexpected value "http://localhost:5173/login"

```

```yaml
- img "INNOPARK"
- text: INNOPARK حديقة النجاح للابتكار
- heading "تسجيل الدخول" [level=1]
- paragraph: للحكّام والمشرفين
- text: البريد الإلكتروني
- textbox "example@email.com": judge1_1779633490172@test.com
- text: كلمة المرور
- textbox "••••••••": Judge123456
- text: ⚠️ البريد الإلكتروني أو كلمة المرور غير صحيحة
- button "دخول →"
- button "→ العودة للرئيسية"
```

# Test source

```ts
  28  |   await page.waitForTimeout(4000);
  29  |   const url = page.url();
  30  |   if (url.includes('/judge')) {
  31  |     console.log(`✅ Judge logged in: ${email}`);
  32  |   } else {
  33  |     console.log(`⚠️ Judge login issue - at: ${url}`);
  34  |   }
  35  | }
  36  | 
  37  | async function addJudge(page: Page, name: string, email: string, pass: string) {
  38  |   await page.click('button:has-text("الحكّام")');
  39  |   await page.waitForTimeout(800);
  40  |   await page.locator('button').filter({ hasText: /إضافة حكّم/ }).click();
  41  |   await page.waitForTimeout(800);
  42  |   await page.fill('input[placeholder="اسم الحكّم"]', name);
  43  |   await page.fill('input[placeholder="judge@example.com"]', email);
  44  |   await page.fill('input[type="password"]', pass);
  45  |   await page.click('button:has-text("إضافة")');
  46  |   await page.waitForTimeout(4000);
  47  |   console.log(`✅ Judge added: ${name} (${email})`);
  48  | }
  49  | 
  50  | async function fillEvaluation(page: Page, projectNum: string, projectName: string, judgeEmail: string) {
  51  |   // تأكد إن على صفحة الحكّم أولاً
  52  |   const currentUrl = page.url();
  53  |   if (!currentUrl.includes('/judge') && !currentUrl.includes('/evaluation')) {
  54  |     console.log(`⚠️ Not on judge page, at: ${currentUrl}`);
  55  |     return;
  56  |   }
  57  |   
  58  |   // إذا على صفحة الحكّم، اضغط تقييم جديد
  59  |   if (currentUrl.includes('/judge')) {
  60  |     const newEvalBtn = page.locator('button:has-text("تقييم جديد")');
  61  |     if (await newEvalBtn.isVisible()) {
  62  |       await newEvalBtn.click();
  63  |       await page.waitForTimeout(1500);
  64  |     } else {
  65  |       await page.goto(`${BASE}/evaluation`);
  66  |       await page.waitForTimeout(1500);
  67  |     }
  68  |   }
  69  |   
  70  |   await page.waitForSelector('text=معلومات المشروع', { timeout: 10000 });
  71  | 
  72  |   // Step 0 - Project Info
  73  |   const inputs = page.locator('input[type="text"]');
  74  |   await inputs.nth(0).fill(projectNum);   // رقم المشروع
  75  |   await inputs.nth(1).fill(projectName);  // اسم المشروع
  76  |   await inputs.nth(2).fill('مختبر');      // اسم مقدم الطلب
  77  |   await page.fill('input[type="email"]', judgeEmail);
  78  |   await inputs.nth(3).fill('IT');         // الجهة
  79  | 
  80  |   await page.click('button:has-text("التالي")');
  81  |   await page.waitForTimeout(500);
  82  | 
  83  |   // Steps 1-5 - Ratings
  84  |   for (let step = 1; step <= 5; step++) {
  85  |     await page.waitForTimeout(300);
  86  |     const unrated = page.locator('button:has-text("اضغط للتقييم")');
  87  |     const count = await unrated.count();
  88  |     for (let i = 0; i < count; i++) {
  89  |       await unrated.nth(i).click();
  90  |       await page.waitForTimeout(150);
  91  |     }
  92  |     await page.click('button:has-text("التالي")');
  93  |     await page.waitForTimeout(400);
  94  |   }
  95  | 
  96  |   // Step 6 - Submit
  97  |   await page.waitForSelector('text=مراجعة التقييم', { timeout: 5000 });
  98  |   await page.click('button:has-text("إرسال التقييم")');
  99  |   await page.waitForTimeout(4000);
  100 |   console.log(`✅ Evaluation submitted: ${projectNum} - ${projectName}`);
  101 | }
  102 | 
  103 | // ── Tests ────────────────────────────────────────────────────────
  104 | 
  105 | test.describe.serial('Full Flow Test', () => {
  106 | 
  107 |   test('١. Admin يضيف حكّمين', async ({ page }) => {
  108 |     await adminLogin(page);
  109 |     await addJudge(page, JUDGE1.name, JUDGE1.email, JUDGE1.pass);
  110 |     await page.waitForTimeout(1000);
  111 |     await addJudge(page, JUDGE2.name, JUDGE2.email, JUDGE2.pass);
  112 | 
  113 |     // تأكد إن الحكّام ظهروا
  114 |     await page.click('button:has-text("الحكّام")');
  115 |     await page.waitForTimeout(2000);
  116 |     // تحقق إن القائمة فيها عناصر (الحكّمين اتضافوا بنجاح)
  117 |     const judgeRows = page.locator('table tbody tr, .divide-y > div');
  118 |     const count = await judgeRows.count();
  119 |     expect(count).toBeGreaterThan(0);
  120 |     console.log(`✅ Both judges added - ${count} judges visible`);
  121 |   });
  122 | 
  123 |   test('٢. الحكّم الأول يقيم مشروعين', async ({ browser }) => {
  124 |     const ctx = await browser.newContext();
  125 |     const page = await ctx.newPage();
  126 | 
  127 |     await judgeLogin(page, JUDGE1.email, JUDGE1.pass);
> 128 |     await expect(page).toHaveURL(`${BASE}/judge`, { timeout: 8000 });
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  129 | 
  130 |     // مشروع ١ — من صفحة الحكّم
  131 |     await fillEvaluation(page, PROJECT1.num, PROJECT1.name, JUDGE1.email);
  132 |     await expect(page).toHaveURL(`${BASE}/results`, { timeout: 10000 });
  133 |     console.log(`✅ Judge 1 evaluated ${PROJECT1.name}`);
  134 | 
  135 |     // مشروع ٢ — ارجع لصفحة الحكّم
  136 |     await page.goto(`${BASE}/judge`);
  137 |     await page.waitForTimeout(1000);
  138 |     await fillEvaluation(page, PROJECT2.num, PROJECT2.name, JUDGE1.email);
  139 |     await expect(page).toHaveURL(`${BASE}/results`, { timeout: 10000 });
  140 |     console.log(`✅ Judge 1 evaluated ${PROJECT2.name}`);
  141 | 
  142 |     await ctx.close();
  143 |   });
  144 | 
  145 |   test('٣. الحكّم الثاني يقيم نفس المشروعين', async ({ browser }) => {
  146 |     const ctx = await browser.newContext();
  147 |     const page = await ctx.newPage();
  148 | 
  149 |     await judgeLogin(page, JUDGE2.email, JUDGE2.pass);
  150 |     await expect(page).toHaveURL(`${BASE}/judge`, { timeout: 8000 });
  151 | 
  152 |     // مشروع ١
  153 |     await fillEvaluation(page, PROJECT1.num, PROJECT1.name, JUDGE2.email);
  154 |     await expect(page).toHaveURL(`${BASE}/results`, { timeout: 10000 });
  155 |     console.log(`✅ Judge 2 evaluated ${PROJECT1.name}`);
  156 | 
  157 |     // مشروع ٢
  158 |     await page.goto(`${BASE}/judge`);
  159 |     await page.waitForTimeout(1000);
  160 |     await fillEvaluation(page, PROJECT2.num, PROJECT2.name, JUDGE2.email);
  161 |     await expect(page).toHaveURL(`${BASE}/results`, { timeout: 10000 });
  162 |     console.log(`✅ Judge 2 evaluated ${PROJECT2.name}`);
  163 | 
  164 |     await ctx.close();
  165 |   });
  166 | 
  167 |   test('٤. الأدمن يشوف نتائج المشاريع', async ({ page }) => {
  168 |     await adminLogin(page);
  169 | 
  170 |     // تبة المشاريع
  171 |     await page.click('button:has-text("المشاريع")');
  172 |     await page.waitForTimeout(2000);
  173 | 
  174 |     // تأكد إن المشروعين ظهروا
  175 |     await expect(page.locator(`text=${PROJECT1.num}`).first()).toBeVisible();
  176 |     await expect(page.locator(`text=${PROJECT2.num}`).first()).toBeVisible();
  177 |     console.log('✅ Both projects visible in admin');
  178 | 
  179 |     // تأكد إن اسم الحكّمين ظاهر
  180 |     await expect(page.locator(`text=${JUDGE1.name}`).first()).toBeVisible();
  181 |     await expect(page.locator(`text=${JUDGE2.name}`).first()).toBeVisible();
  182 |     console.log('✅ Both judges scores visible');
  183 |   });
  184 | 
  185 |   test('٥. الحكّم يشوف تقييماته', async ({ browser }) => {
  186 |     const ctx = await browser.newContext();
  187 |     const page = await ctx.newPage();
  188 | 
  189 |     await judgeLogin(page, JUDGE1.email, JUDGE1.pass);
  190 |     await page.waitForURL(`${BASE}/judge`, { timeout: 8000 });
  191 | 
  192 |     await expect(page.locator(`text=${PROJECT1.num}`).first()).toBeVisible();
  193 |     await expect(page.locator(`text=${PROJECT2.num}`).first()).toBeVisible();
  194 |     console.log('✅ Judge sees their 2 evaluations');
  195 | 
  196 |     await ctx.close();
  197 |   });
  198 | 
  199 |   test('٦. الأدمن يشوف إحصائيات الحكّام', async ({ page }) => {
  200 |     await adminLogin(page);
  201 |     await page.click('button:has-text("الحكّام")');
  202 |     await page.waitForTimeout(1000);
  203 | 
  204 |     // كل حكّم عنده 2 تقييمات
  205 |     const rows = page.locator(`text=${JUDGE1.name}`);
  206 |     await expect(rows.first()).toBeVisible();
  207 |     console.log('✅ Admin sees judges with evaluation counts');
  208 |   });
  209 | 
  210 | });
```