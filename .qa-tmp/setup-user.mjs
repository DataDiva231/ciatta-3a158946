import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey);
const email = `qa-auth-${Date.now()}@ciatta.io`;
const initialPassword = 'Initial-Pass-83719!';

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email, password: initialPassword, email_confirm: true,
});
if (createErr) { console.error('create failed', createErr); process.exit(1); }

fs.writeFileSync('.qa-tmp/auth-test-user.json', JSON.stringify({
  email, initialPassword, userId: created.user.id,
}, null, 2));

console.log('OK', email, created.user.id);
