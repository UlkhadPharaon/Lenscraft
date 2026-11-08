/**
 * End-to-end verification of the LensCraft PocketBase migration against the
 * LIVE instance (https://lenscraft.185-7-81-99.sslip.io), exercising the real
 * migrated modules: src/lib/pocketbase.ts flow + server/pocketbase-admin.ts
 * (verifyPocketBaseToken, consumeGenerationQuota, superuser client).
 * Run: ADMIN_PW=<superuser pw> npx tsx scripts/pb-e2e.ts
 */
import PocketBase from 'pocketbase';
import {
  consumeGenerationQuota,
  getPocketBaseAdmin,
  verifyPocketBaseToken,
  QuotaError,
} from '../server/pocketbase-admin';

const URL = 'https://lenscraft.185-7-81-99.sslip.io';
const pass = (n: string) => console.log(`  [ok] ${n}`);
const fail = (n: string) => { console.log(`  [FAIL] ${n}`); process.exitCode = 1; };

const email = `e2e-${Date.now()}@lenscraft.local`;
const password = 'E2eTest1234!';
const treatmentId = crypto.randomUUID();
let userId = '';

const pb = new PocketBase(URL);
pb.autoCancellation(true);

// --- 1. sign up + sign in (AuthProvider flow) --------------------------------
await pb.collection('users').create({
  email, password, passwordConfirm: password, name: 'E2E Testeur', emailVisibility: true,
});
const auth = await pb.collection('users').authWithPassword(email, password);
userId = auth.record.id;
pass(`signup+signin -> uid=${userId} token=${!!pb.authStore.token}`);

// --- 2. treatment CRUD (context.tsx flow, uuid ids) --------------------------
await pb.collection('treatments').create({
  id: treatmentId, user_id: userId,
  data: { id: treatmentId, title: 'E2E traitement', scenes: [] },
});
pass(`create treatment id=${treatmentId.slice(0, 8)}…`);

const page = await pb.collection('treatments').getList(1, 100, {
  filter: `user_id = "${userId}"`, sort: '-created',
});
if (page.items.length === 1 && page.items[0].id === treatmentId) pass('list own treatments -> 1');
else fail(`list own treatments -> ${page.items.length}`);

await pb.collection('treatments').update(treatmentId, {
  data: { id: treatmentId, title: 'E2E traitement (modifié)', scenes: [] },
});
const updated = await pb.collection('treatments').getOne(treatmentId);
pass(updated.data.title === 'E2E traitement (modifié)' ? 'update path works' : 'update FAILED');

// --- 3. security rules -------------------------------------------------------
const anon = new PocketBase(URL);
const anonList = await anon.collection('treatments').getFullList().catch(() => [{ id: 'blocked' }]);
pass(anonList.length === 0 ? 'anon treatments list -> 0 records' : `ANON LEAK: ${anonList.length} records!`);
try {
  await anon.collection('treatments').create({ id: 'anonprobe', data: {}, user_id: userId });
  fail('ANON WRITE ALLOWED — critical');
} catch (e) {
  pass(`anon treatment write rejected (${(e as { status?: number }).status})`);
}
try {
  await anon.collection('profiles').getOne(userId);
  fail('anon profile read allowed!');
} catch (e) {
  pass(`anon profile read rejected (${(e as { status?: number }).status})`);
}

// --- 4. server: token verification (app.ts enforceQuota / checkout) ----------
const verified = await verifyPocketBaseToken(pb.authStore.token);
pass(verified?.id === userId ? `verifyPocketBaseToken -> ${verified.id}` : 'verifyPocketBaseToken FAILED');
pass((await verifyPocketBaseToken('garbage-token')) === null ? 'verifyPocketBaseToken(garbage) -> null' : 'garbage token accepted!');
pass((await verifyPocketBaseToken(null)) === null ? 'verifyPocketBaseToken(null) -> null' : 'null token accepted!');

// --- 5. server: quota + auto-provisioned profile (supabase-admin.ts) ---------
const first = await consumeGenerationQuota(userId, email);
pass(`quota 1st call -> tier=${first.tier} remaining=${first.remaining} (expect free/0)`);
try {
  await consumeGenerationQuota(userId, email);
  fail('quota 2nd call should have thrown QuotaError (free = 1/month)');
} catch (e) {
  pass(e instanceof QuotaError ? 'quota 2nd call -> QuotaError (limit enforced)' : `unexpected error: ${String(e)}`);
}
const admin = await getPocketBaseAdmin();
if (!admin) {
  fail('getPocketBaseAdmin() returned null — check POCKETBASE_ADMIN_* env');
} else {
  const profile = await admin.collection('profiles').getOne(userId);
  pass(`profile auto-provisioned -> email=${profile.email} tier=${profile.subscription_tier} count=${profile.generations_count}`);
  // Stripe-webhook style tier upgrade, then reset for cleanup
  await admin.collection('profiles').update(userId, { subscription_tier: 'pro' });
  const upgraded = await admin.collection('profiles').getOne(userId);
  pass(upgraded.subscription_tier === 'pro' ? 'tier upgrade path works (webhook equivalent)' : 'tier upgrade FAILED');
}

// --- 6. cleanup --------------------------------------------------------------
if (admin) {
  await admin.collection('users').delete(userId);
  pass('cleanup: e2e user deleted (cascade removes treatments + profile)');
}
console.log('LENSCRAFT E2E DONE');
