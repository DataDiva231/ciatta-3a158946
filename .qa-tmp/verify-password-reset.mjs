import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const BASE = 'http://localhost:8081';
const user = JSON.parse(fs.readFileSync('.qa-tmp/auth-test-user.json', 'utf8'));
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey);

const consoleErrors = [];
const networkErrors = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));
page.on('requestfailed', (r) => networkErrors.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 500) networkErrors.push(`${r.status()} ${r.url()}`); });

console.log('--- STEP 1: real UI request flow ---');
await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
await page.waitForTimeout(7000);
await page.getByRole('button', { name: 'Get Started' }).click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Already have an account? Sign In' }).click();
await page.waitForTimeout(600);

await page.getByPlaceholder('Email address').fill(user.email);
await page.getByRole('button', { name: 'Forgot password?' }).click();
await page.waitForTimeout(1200);
const requestScreenText = await page.locator('body').innerText();
console.log('Real "Forgot password?" request succeeded (notice shown):', requestScreenText.includes('on its way'));
console.log('Real request shows no error:', !requestScreenText.includes("didn't send"));

console.log('--- STEP 2: obtain the real verification link Supabase generated (no inbox access, so using admin.generateLink for the click-through — same underlying Supabase mechanism a real email link uses) ---');
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'recovery',
  email: user.email,
  options: { redirectTo: `${BASE}/reset-password` },
});
if (linkErr) { console.error('generateLink failed', linkErr); process.exit(1); }
const actionLink = linkData.properties.action_link;
console.log('Got real action_link:', Boolean(actionLink));

console.log('--- STEP 3: click through exactly as a real email click would (through Supabase\'s own /auth/v1/verify redirect) ---');
await page.goto(actionLink, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
console.log('Landed on:', page.url());
const landedOnResetPassword = page.url().startsWith(`${BASE}/reset-password`);
console.log('Landed on /reset-password:', landedOnResetPassword);

const bodyAfterClick = await page.locator('body').innerText();
console.log('Shows "expired" error state:', bodyAfterClick.includes('expired'));
console.log('Shows real new-password form (Choose a new password):', bodyAfterClick.includes('Choose a new password'));

// Confirm a real session was actually established (not just UI text).
const sessionAfterClick = await page.evaluate(async () => {
  const raw = Object.keys(window.localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (!raw) return null;
  const parsed = JSON.parse(window.localStorage.getItem(raw));
  return { hasAccessToken: Boolean(parsed?.access_token), userEmail: parsed?.user?.email };
});
console.log('Real session established in localStorage:', JSON.stringify(sessionAfterClick));

console.log('--- STEP 4: complete the flow as a real user would ---');
const newPassword = 'Brand-New-Pass-92841!';
await page.getByPlaceholder('New password').fill(newPassword);
await page.waitForTimeout(300);
const continueBtn = page.getByRole('button', { name: 'Continue' });
const continueEnabled = await continueBtn.isEnabled();
console.log('Continue button enabled after valid password:', continueEnabled);
await continueBtn.click();
await page.waitForTimeout(2000);
console.log('Landed on after Continue:', page.url());
const landedOnToday = page.url().startsWith(`${BASE}/today`) || page.url() === `${BASE}/`;
console.log('Landed on expected screen (/today):', page.url().includes('/today'));

console.log('--- STEP 5: reuse prevention — the same link must not work twice ---');
const page2 = await context.newPage();
const reuseErrors = [];
page2.on('console', (m) => { if (m.type() === 'error') reuseErrors.push(m.text()); });
await page2.goto(actionLink, { waitUntil: 'networkidle' });
await page2.waitForTimeout(1500);
const reuseBody = await page2.locator('body').innerText();
console.log('Second click on same link correctly shows expired/invalid state:', reuseBody.includes('expired'));
await page2.close();

console.log('--- STEP 6: the NEW password actually works for a fresh sign-in ---');
const page3 = await context.newPage();
const signinErrors = [];
page3.on('console', (m) => { if (m.type() === 'error') signinErrors.push(m.text()); });
await page3.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
await page3.waitForTimeout(7000);
await page3.getByRole('button', { name: 'Get Started' }).click();
await page3.waitForTimeout(600);
await page3.getByRole('button', { name: 'Already have an account? Sign In' }).click();
await page3.waitForTimeout(600);
await page3.getByPlaceholder('Email address').fill(user.email);
await page3.getByPlaceholder('Password').fill(newPassword);
await page3.getByRole('button', { name: 'Continue' }).click();
await page3.waitForTimeout(2000);
console.log('Fresh sign-in with NEW password lands on:', page3.url());
console.log('Fresh sign-in with new password succeeded:', page3.url().includes('/today'));
await page3.close();

console.log('--- STEP 7: confirm the OLD password no longer works ---');
const page4 = await context.newPage();
await page4.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
await page4.waitForTimeout(7000);
await page4.getByRole('button', { name: 'Get Started' }).click();
await page4.waitForTimeout(600);
await page4.getByRole('button', { name: 'Already have an account? Sign In' }).click();
await page4.waitForTimeout(600);
await page4.getByPlaceholder('Email address').fill(user.email);
await page4.getByPlaceholder('Password').fill(user.initialPassword);
await page4.getByRole('button', { name: 'Continue' }).click();
await page4.waitForTimeout(1500);
const oldPwBody = await page4.locator('body').innerText();
console.log('Old password correctly rejected:', oldPwBody.includes("didn't match"));
await page4.close();

console.log('--- ERRORS ---');
console.log('Console errors:', JSON.stringify(consoleErrors));
console.log('Network errors:', JSON.stringify(networkErrors));

await page.screenshot({ path: '.qa-tmp/reset-final.png' });
await browser.close();
