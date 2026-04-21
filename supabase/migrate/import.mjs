// ─── Golem OS: one-shot Sheet → Supabase importer ───────────────────────────
//
// Reads CSVs from ./imports/ (one per Sheet tab) and inserts them into Supabase.
// Resolves hierarchy: Goals → Objectives → Tasks, plus Notes/Links parents.
//
// Run from this folder:
//   cp .env.example .env   # fill in real values
//   npm install
//   npm run import
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPORTS_DIR = path.join(__dirname, 'imports');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, USER_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !USER_ID) {
  console.error('❌ Missing .env values. Copy .env.example → .env and fill in.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// ─── helpers ─────────────────────────────────────────────────────────────────
function readCsv(name) {
  const p = path.join(IMPORTS_DIR, name);
  if (!fs.existsSync(p)) {
    console.log(`  (skipping ${name} — not found)`);
    return [];
  }
  const raw = fs.readFileSync(p, 'utf8');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

const toInt   = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
const toNum   = v => { const n = parseFloat(v);   return Number.isFinite(n) ? n : null; };
const toDate  = v => {
  const s = v == null ? '' : String(v).trim();
  if (!s) return null;
  // Accept YYYY-MM-DD or anything Date can parse cleanly
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};
const nonEmpty = v => (v == null || String(v).trim() === '') ? null : String(v).trim();

// ── status / priority normalizers (legacy values → schema-allowed values) ────
function normStatus(kind, raw) {
  const s = nonEmpty(raw);
  if (!s) return null;
  const lo = s.toLowerCase();
  if (kind === 'reading') {
    if (['finished','complete','completed','done','read'].includes(lo)) return 'Read';
    if (['in progress','reading','started','ongoing'].includes(lo))     return 'Reading';
    if (['paused','on hold','hold'].includes(lo))                       return 'Paused';
    if (['want to read','wishlist','todo','queued','want'].includes(lo))return 'Want to Read';
    return 'Want to Read';
  }
  if (kind === 'goals') {
    if (['done','complete','completed','finished','closed'].includes(lo)) return 'Done';
    if (['paused','on hold','hold','dormant'].includes(lo))               return 'Paused';
    return 'Active'; // Active, In Progress, Open, etc.
  }
  if (kind === 'tasks') {
    if (['done','complete','completed','finished','closed'].includes(lo)) return 'Done';
    if (['in progress','ongoing','started','wip'].includes(lo))                       return 'Active';
    if (['blocked','stuck','waiting','paused','on hold','hold'].includes(lo))         return 'On Hold';
    return 'Active';
  }
  return s;
}
function normPriority(raw) {
  const s = nonEmpty(raw);
  if (!s) return null;
  const lo = s.toLowerCase();
  if (['high','h','urgent','p1','p0'].includes(lo))   return 'High';
  if (['medium','med','m','normal','p2'].includes(lo))return 'Medium';
  if (['low','l','p3','p4'].includes(lo))             return 'Low';
  return null; // unknown → null (column is nullable)
}

// Insert a batch and return the rows (with new .id assigned).
async function insertAll(table, rows) {
  if (!rows.length) return [];
  const { data, error } = await sb.from(table).insert(rows).select();
  if (error) {
    console.error(`❌ Insert into ${table} failed:`, error);
    process.exit(1);
  }
  return data;
}

// Build old_id (string) → new_id (int) map. Assumes CSVs pair up in order.
function mapIds(csvRows, inserted) {
  const m = new Map();
  csvRows.forEach((row, i) => {
    const oldId = nonEmpty(row.ID) || nonEmpty(row.Id) || nonEmpty(row.id);
    if (oldId && inserted[i]) m.set(oldId, inserted[i].id);
  });
  return m;
}

// Match a legacy free-text value against {map of oldId→newId, array of
// {id, title}} so Tasks.Objective can resolve either form.
function resolveLegacyRef(raw, idMap, titleIndex) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (idMap.has(s)) return idMap.get(s);            // Sheet ID match
  const hit = titleIndex.find(r =>
    r.title && r.title.toLowerCase() === s.toLowerCase());
  return hit ? hit.id : null;
}

// ParentID can be "View:ID", "ID", or a legacy title. Return
// {goalId, objectiveId, taskId} with exactly one set (or none).
function resolveParent(raw, maps) {
  if (!raw) return {};
  const s = String(raw).trim();
  if (!s) return {};

  // "Goals:12" style
  const m = /^(Goals|Objectives|Tasks):(\d+)$/i.exec(s);
  if (m) {
    const view = m[1].toLowerCase();
    const oldId = m[2];
    if (view === 'goals'      && maps.goals.idMap.has(oldId))      return { goalId:      maps.goals.idMap.get(oldId) };
    if (view === 'objectives' && maps.objectives.idMap.has(oldId)) return { objectiveId: maps.objectives.idMap.get(oldId) };
    if (view === 'tasks'      && maps.tasks.idMap.has(oldId))      return { taskId:      maps.tasks.idMap.get(oldId) };
  }

  // Bare numeric — search all three maps
  if (/^\d+$/.test(s)) {
    if (maps.goals.idMap.has(s))      return { goalId:      maps.goals.idMap.get(s) };
    if (maps.objectives.idMap.has(s)) return { objectiveId: maps.objectives.idMap.get(s) };
    if (maps.tasks.idMap.has(s))      return { taskId:      maps.tasks.idMap.get(s) };
  }

  // Legacy title — try matching in each index
  const lo = s.toLowerCase();
  let hit = maps.goals.titleIndex.find(r => r.title?.toLowerCase() === lo);
  if (hit) return { goalId: hit.id };
  hit = maps.objectives.titleIndex.find(r => r.title?.toLowerCase() === lo);
  if (hit) return { objectiveId: hit.id };
  hit = maps.tasks.titleIndex.find(r => r.title?.toLowerCase() === lo);
  if (hit) return { taskId: hit.id };

  return {};
}

// ─── main ────────────────────────────────────────────────────────────────────
console.log(`→ Importing for user_id ${USER_ID}`);

// ── Phase 0: wipe this user's existing rows so re-runs are idempotent ──────
//   Order matters: delete children before parents (FK set-null would also work,
//   but clean deletes in dep order are simpler to reason about).
for (const t of ['links','notes','tasks','objectives','reading','finances','crm','goals']) {
  const { error } = await sb.from(t).delete().eq('user_id', USER_ID);
  if (error) { console.error(`❌ Wipe ${t} failed:`, error); process.exit(1); }
}
console.log('▶ wiped existing rows for this user');

// ── Phase A: base tables ────────────────────────────────────────────────────
// Goals
const goalsCsv = readCsv('Goals.csv');
const goalsInserted = await insertAll('goals', goalsCsv.map(r => ({
  user_id: USER_ID,
  title:   nonEmpty(r.Title) || '(untitled)',
  area:    nonEmpty(r.Area),
  status:  normStatus('goals', r.Status) || 'Active',
  notes:   nonEmpty(r.Notes)
})));
const goalsIdMap = mapIds(goalsCsv, goalsInserted);
const goalsTitleIndex = goalsInserted.map(g => ({ id: g.id, title: g.title }));
console.log(`▶ goals        ${goalsInserted.length} rows imported`);

// Reading
const readingCsv = readCsv('Reading.csv');
const readingInserted = await insertAll('reading', readingCsv.map(r => ({
  user_id:      USER_ID,
  book_title:   nonEmpty(r['Book Title']) || '(untitled)',
  author:       nonEmpty(r.Author),
  status:       normStatus('reading', r.Status) || 'Want to Read',
  progress_pct: toInt(r.Progress_Pct)
})));
console.log(`▶ reading      ${readingInserted.length} rows imported`);

// Finances
const financesCsv = readCsv('Finances.csv');
const financesInserted = await insertAll('finances', financesCsv.map(r => ({
  user_id:    USER_ID,
  entry_date: toDate(r.Date) || new Date().toISOString().slice(0, 10),
  label:      nonEmpty(r.Label),
  category:   nonEmpty(r.Category),
  amount:     toNum(r.Amount) ?? 0
})));
console.log(`▶ finances     ${financesInserted.length} rows imported`);

// CRM
const crmCsv = readCsv('CRM.csv');
const crmInserted = await insertAll('crm', crmCsv.map(r => ({
  user_id:         USER_ID,
  name:            nonEmpty(r.Name) || '(unnamed)',
  role:            nonEmpty(r.Role),
  company:         nonEmpty(r.Company),
  interaction_log: nonEmpty(r.Interaction_Log)
})));
console.log(`▶ crm          ${crmInserted.length} rows imported`);

// ── Phase B: Objectives (depends on goals) ──────────────────────────────────
const objectivesCsv = readCsv('Objectives.csv');
const objectivesRows = objectivesCsv.map(r => {
  const goalId = goalsIdMap.get(nonEmpty(r.GoalID) || '') || null;
  return {
    user_id:       USER_ID,
    goal_id:       goalId,
    title:         nonEmpty(r.Title) || '(untitled)',
    target_value:  toNum(r.Target_Value),
    current_value: toNum(r.Current_Value),
    metric_unit:   nonEmpty(r.Metric_Unit),
    deadline:      toDate(r.Deadline)
  };
});
const objectivesInserted = await insertAll('objectives', objectivesRows);
const objectivesIdMap = mapIds(objectivesCsv, objectivesInserted);
const objectivesTitleIndex = objectivesInserted.map(o => ({ id: o.id, title: o.title }));
const linkedObj = objectivesRows.filter(r => r.goal_id).length;
console.log(`▶ objectives   ${objectivesInserted.length} rows imported  (${linkedObj} linked to goals, ${objectivesInserted.length - linkedObj} unlinked)`);

// ── Phase C: Tasks (depends on objectives) ──────────────────────────────────
const tasksCsv = readCsv('Tasks.csv');
const tasksRows = tasksCsv.map(r => {
  // Resolve Objective (could be ID or legacy title)
  const objRaw = nonEmpty(r.Objective);
  const objectiveId = resolveLegacyRef(objRaw, objectivesIdMap, objectivesTitleIndex);
  return {
    user_id:      USER_ID,
    objective_id: objectiveId,
    name:         nonEmpty(r['Task Name']) || '(untitled)',
    status:       normStatus('tasks', r.Status) || 'Active',
    due_date:     toDate(r['Due Date']),
    area:         nonEmpty(r.Area),
    priority:     normPriority(r.Priority)
  };
});
const tasksInserted = await insertAll('tasks', tasksRows);
const tasksIdMap = mapIds(tasksCsv, tasksInserted);
const tasksTitleIndex = tasksInserted.map(t => ({ id: t.id, title: t.name }));
const linkedTasks = tasksRows.filter(r => r.objective_id).length;
console.log(`▶ tasks        ${tasksInserted.length} rows imported (${linkedTasks} linked to objectives, ${tasksInserted.length - linkedTasks} unlinked)`);

// ── Phase D: Notes + Links (depend on all three hierarchy tables) ───────────
const maps = {
  goals:      { idMap: goalsIdMap,      titleIndex: goalsTitleIndex },
  objectives: { idMap: objectivesIdMap, titleIndex: objectivesTitleIndex },
  tasks:      { idMap: tasksIdMap,      titleIndex: tasksTitleIndex }
};

const notesCsv = readCsv('Notes.csv');
const notesRows = notesCsv.map(r => {
  const p = resolveParent(nonEmpty(r.ParentID), maps);
  return {
    user_id:             USER_ID,
    title:               nonEmpty(r.Title),
    content:             nonEmpty(r.Content),
    tags:                nonEmpty(r.Tags),
    parent_goal_id:      p.goalId      || null,
    parent_objective_id: p.objectiveId || null,
    parent_task_id:      p.taskId      || null
  };
});
const notesInserted = await insertAll('notes', notesRows);
const linkedNotes = notesRows.filter(r =>
  r.parent_goal_id || r.parent_objective_id || r.parent_task_id).length;
console.log(`▶ notes        ${notesInserted.length} rows imported  (${linkedNotes} with parents, ${notesInserted.length - linkedNotes} unlinked)`);

const linksCsv = readCsv('Links.csv');
const linksRows = linksCsv.map(r => {
  const p = resolveParent(nonEmpty(r.ParentID), maps);
  return {
    user_id:             USER_ID,
    title:               nonEmpty(r.Title),
    url:                 nonEmpty(r.URL) || '',
    website:             nonEmpty(r.Website),
    date_added:          toDate(r['Date Added']),
    parent_goal_id:      p.goalId      || null,
    parent_objective_id: p.objectiveId || null,
    parent_task_id:      p.taskId      || null
  };
}).filter(r => r.url); // skip blank URL rows
const linksInserted = await insertAll('links', linksRows);
const linkedLinks = linksRows.filter(r =>
  r.parent_goal_id || r.parent_objective_id || r.parent_task_id).length;
console.log(`▶ links        ${linksInserted.length} rows imported  (${linkedLinks} with parents, ${linksInserted.length - linkedLinks} unlinked)`);

console.log('✅ Import complete.');
