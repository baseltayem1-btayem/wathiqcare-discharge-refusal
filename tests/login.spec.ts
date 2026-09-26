import { test, expect } from '@playwright/test';

// بيانات وهمية لتجربة تسجيل الدخول (test-only fake credentials, not a real secret)
const email = 'testuser@example.com';
const password = process.env.TEST_LOGIN_PASSWORD || 'testpassword';

test('login page should show and handle login form', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  // تحقق من وجود حقل البريد وكلمة المرور وزر الدخول
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button, [type="submit"]')).toBeVisible();

  // أدخل بيانات وهمية
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button, [type="submit"]');

  // تحقق من ظهور رسالة خطأ أو انتقال المستخدم (حسب منطق التطبيق)
  await expect(
    page.locator('text=/خطأ|كلمة المرور غير صحيحة|البريد الإلكتروني غير صحيح|error|invalid/i')
  ).toHaveCount(1);
});
