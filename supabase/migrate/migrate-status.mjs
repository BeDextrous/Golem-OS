// ─── Golem OS: one-shot Task status label migration ─────────────────────────
//
// Normalizes legacy Task status labels to the current enum:
//   "In Progress" → "To Do"
//   "Blocked"     → "On Hold"
//   "Paused"      → "On Hold"
//
// Run from this folder:
//   node migrate-status.mjs
//     or
//   npm run migrate-status
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, USER_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !USER_ID) {
  console.error('❌ Missing .env values. Copy .env.example → .env and fill in.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const plan = [
    { from: ['In Progress'],       to: 'To Do'   },
    { from: ['Blocked', 'Paused'], to: 'On Hold' }
  ];

  // Snapshot "before" counts for a readable summary.
  const counts = {};
  for (const step of plan) {
    for (const s of step.from) {
      const { count, error } = await sb
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', USER_ID)
        .eq('status', s);
      if (error) throw error;
      counts[s] = count ?? 0;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`📊 Rows to migrate (user ${USER_ID.slice(0, 8)}…):`);
  for (const [s, c] of Object.entries(counts)) console.log(`   ${s.padEnd(12)} ${c}`);
  if (total === 0) { console.log('✨ Nothing to migrate. Done.'); return; }

  // Apply updates.
  for (const step of plan) {
    const { error } = await sb
      .from('tasks')
      .update({ status: step.to })
      .eq('user_id', USER_ID)
      .in('status', step.from);
    if (error) throw error;
    console.log(`✅ ${step.from.join(' + ')} → ${step.to}`);
  }

  // Verify: no legacy values should remain.
  const { count: leftover, error: verErr } = await sb
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', USER_ID)
    .in('status', ['In Progress', 'Blocked', 'Paused']);
  if (verErr) throw verErr;
  if (leftover === 0) console.log('🎯 All legacy statuses cleared.');
  else console.warn(`⚠  ${leftover} rows still carry legacy status values.`);
}

run().catch(err => { console.error('❌ Migration failed:', err); process.exit(1); });
