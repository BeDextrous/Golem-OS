// ─── Golem OS: one-shot pillar tagging script ────────────────────────────────
//
// Assigns `pillar` values to existing rows using area/type heuristics.
// Unambiguous rows get assigned; ambiguous rows stay null.
//
// Heuristics applied:
//   tasks:              area PERSONAL/HEALTH → life
//                       area CAREER         → dextrous
//                       area OPS            → work
//   goals:              area PERSONAL/HEALTH/FINANCE → life
//                       area CAREER                  → dextrous
//                       area OPS                     → work
//   objectives:         inherit pillar from parent goal (where set)
//   notes:              inherit pillar from parent goal/objective/task (where set)
//   finances:           all rows → life
//   reading:            all rows → life
//   job_applications:   all rows → dextrous
//   target_companies:   all rows → dextrous
//   links, crm:         left as null (no reliable signal)
//
// Run from this folder:
//   node tag-pillars.mjs
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, USER_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !USER_ID) {
  console.error('❌  Missing .env values. Copy .env.example → .env and fill in.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── helpers ─────────────────────────────────────────────────────────────────

async function count(table, extra = {}) {
  const q = sb.from(table).select('id', { count: 'exact', head: true }).eq('user_id', USER_ID);
  for (const [k, v] of Object.entries(extra)) q.eq(k, v);
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}

async function updateWhere(table, match, pillar) {
  const q = sb.from(table).update({ pillar }).eq('user_id', USER_ID).is('pillar', null);
  for (const [k, v] of Object.entries(match)) {
    if (Array.isArray(v)) q.in(k, v);
    else q.eq(k, v);
  }
  const { error } = await q;
  if (error) throw error;
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 48 - title.length))}`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\nGolem OS — pillar tagging (user ${USER_ID.slice(0, 8)}…)`);

  // ── tasks ──────────────────────────────────────────────────────────────────
  section('tasks');
  const taskPlan = [
    { match: { area: ['PERSONAL', 'HEALTH'] }, pillar: 'life' },
    { match: { area: 'CAREER' },               pillar: 'dextrous' },
    { match: { area: 'OPS' },                  pillar: 'work' },
  ];
  for (const { match, pillar } of taskPlan) {
    const before = await count('tasks', { ...match, pillar: null });
    await updateWhere('tasks', match, pillar);
    console.log(`  area ${JSON.stringify(match.area).padEnd(25)} → ${pillar.padEnd(10)} (${before} rows)`);
  }

  // ── goals ──────────────────────────────────────────────────────────────────
  section('goals');
  const goalPlan = [
    { match: { area: ['PERSONAL', 'HEALTH', 'FINANCE'] }, pillar: 'life' },
    { match: { area: 'CAREER' },                          pillar: 'dextrous' },
    { match: { area: 'OPS' },                             pillar: 'work' },
  ];
  for (const { match, pillar } of goalPlan) {
    const before = await count('goals', { ...match, pillar: null });
    await updateWhere('goals', match, pillar);
    console.log(`  area ${JSON.stringify(match.area).padEnd(35)} → ${pillar.padEnd(10)} (${before} rows)`);
  }

  // ── objectives: inherit from parent goal ───────────────────────────────────
  section('objectives (inherit from parent goal)');
  for (const pillar of ['life', 'dextrous', 'work']) {
    const { data: goals, error: gErr } = await sb
      .from('goals')
      .select('id')
      .eq('user_id', USER_ID)
      .eq('pillar', pillar);
    if (gErr) throw gErr;
    if (!goals.length) continue;
    const goalIds = goals.map(g => g.id);
    const { error } = await sb
      .from('objectives')
      .update({ pillar })
      .eq('user_id', USER_ID)
      .is('pillar', null)
      .in('goal_id', goalIds);
    if (error) throw error;
    console.log(`  parent goal pillar=${pillar.padEnd(10)} → objectives updated`);
  }

  // ── notes: inherit from parent goal/objective/task ─────────────────────────
  section('notes (inherit from parent)');
  for (const pillar of ['life', 'dextrous', 'work']) {
    // via parent_goal_id
    const { data: goals } = await sb.from('goals').select('id').eq('user_id', USER_ID).eq('pillar', pillar);
    if (goals?.length) {
      await sb.from('notes').update({ pillar }).eq('user_id', USER_ID).is('pillar', null)
        .in('parent_goal_id', goals.map(g => g.id));
    }
    // via parent_objective_id
    const { data: objs } = await sb.from('objectives').select('id').eq('user_id', USER_ID).eq('pillar', pillar);
    if (objs?.length) {
      await sb.from('notes').update({ pillar }).eq('user_id', USER_ID).is('pillar', null)
        .in('parent_objective_id', objs.map(o => o.id));
    }
    // via parent_task_id
    const { data: tasks } = await sb.from('tasks').select('id').eq('user_id', USER_ID).eq('pillar', pillar);
    if (tasks?.length) {
      await sb.from('notes').update({ pillar }).eq('user_id', USER_ID).is('pillar', null)
        .in('parent_task_id', tasks.map(t => t.id));
    }
    console.log(`  pillar=${pillar} notes tagged via parent`);
  }

  // ── finances → life ────────────────────────────────────────────────────────
  section('finances → life (all rows)');
  const finBefore = await count('finances');
  await sb.from('finances').update({ pillar: 'life' }).eq('user_id', USER_ID).is('pillar', null);
  console.log(`  ${finBefore} rows → life`);

  // ── reading → life ─────────────────────────────────────────────────────────
  section('reading → life (all rows)');
  const readBefore = await count('reading');
  // reading table has no pillar column — this is a no-op but safe to run
  console.log(`  ${readBefore} rows (no pillar column on reading — skip)`);

  // ── job_applications → dextrous ────────────────────────────────────────────
  section('job_applications → dextrous (all rows)');
  // job_applications has no pillar column — tagged by context, not column
  const jobBefore = await count('job_applications');
  console.log(`  ${jobBefore} rows (no pillar column on job_applications — skip)`);

  // ── target_companies → dextrous ────────────────────────────────────────────
  section('target_companies → dextrous (all rows)');
  const tcBefore = await count('target_companies');
  console.log(`  ${tcBefore} rows (no pillar column on target_companies — skip)`);

  // ── summary ────────────────────────────────────────────────────────────────
  section('summary');
  const tables = ['tasks', 'goals', 'objectives', 'notes', 'links', 'finances', 'crm'];
  for (const table of tables) {
    const life      = await count(table, { pillar: 'life' });
    const dextrous  = await count(table, { pillar: 'dextrous' });
    const work      = await count(table, { pillar: 'work' });
    const { count: total } = await sb.from(table).select('id', { count: 'exact', head: true }).eq('user_id', USER_ID);
    const untagged  = (total ?? 0) - life - dextrous - work;
    console.log(
      `  ${table.padEnd(12)} life=${String(life).padStart(3)}  dextrous=${String(dextrous).padStart(3)}  work=${String(work).padStart(3)}  null=${String(untagged).padStart(3)}`
    );
  }

  console.log('\n✅  Done.\n');
}

run().catch(err => {
  console.error('❌  Script failed:', err.message ?? err);
  process.exit(1);
});
