/**
 * import-linkedin-jobs.mjs
 *
 * Seeds job_applications from a LinkedIn job-tracker export (pasted 2026-04-22).
 * Inserts Wishlist (saved) and Applied records.
 *
 * Run from your Mac:
 *   cd ~/golem-os/supabase/migrate
 *   node import-linkedin-jobs.mjs
 *
 * Requires supabase/migrate/.env:
 *   SUPABASE_URL=https://wllsrdfflaudwhfpxzfe.supabase.co
 *   SERVICE_ROLE_KEY=<your service_role key>
 *   USER_ID=<your auth.users uuid>
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const USER_ID = process.env.USER_ID;

if (!USER_ID) {
  console.error('USER_ID not set in .env');
  process.exit(1);
}

// ─── SAVED JOBS (status → Wishlist) ──────────────────────────────────────────
// Parsed from LinkedIn "Saved · 117" tab (partial list — 29 entries visible).
// LinkedIn doesn't export job URLs for saved jobs; paste them in later via the app
// or use the LinkedIn Quick-Add bookmarklet going forward.
const WISHLIST = [
  { role: 'Counsel',                                               company: 'Brooklyn Navy Yard Development Corporation', notes: 'Brooklyn, NY (Hybrid)' },
  { role: 'Director, Strategy & Operations',                       company: 'Wrapbook',                                  notes: 'United States (Remote)' },
  { role: 'Legal Counsel, Commercial',                             company: 'GitLab',                                    notes: 'United States (Remote)' },
  { role: 'Senior Commercial Counsel',                             company: 'Mozilla',                                   notes: 'United States (Remote)' },
  { role: 'Senior Counsel',                                        company: 'Mammoth Brands',                            notes: 'New York, NY' },
  { role: 'Legal Data Director',                                   company: 'Legora',                                    notes: 'New York, NY (On-site)' },
  { role: 'Senior Counsel, Commercial',                            company: 'Headway',                                   notes: 'United States (Remote)' },
  { role: 'Sr. Corporate Counsel',                                 company: 'Model N',                                   notes: 'United States (Remote)' },
  { role: 'Legal Counsel, Commercial',                             company: 'Figma',                                     notes: 'New York, NY' },
  { role: 'Interim Legal Counsel',                                 company: 'Elevate Legal Talent',                      notes: 'United States (Remote)' },
  { role: 'Associate General Counsel - Product',                   company: 'Imprint',                                   notes: 'New York City Metropolitan Area' },
  { role: 'Senior Director / VP Legal & Business Affair Counsel',  company: 'GoDigital',                                 notes: 'United States (Remote)' },
  { role: 'Legal Director',                                        company: 'TiDB, powered by PingCAP',                  notes: 'San Francisco, CA (Remote)' },
  { role: 'Special Counsel – Rolling Stock Program',               company: 'Metropolitan Transportation Authority',     notes: 'New York, NY (On-site)' },
  { role: 'General Counsel',                                       company: 'JAGGAER',                                   notes: 'Durham, NC (Remote, East Coast preferred)' },
  { role: 'VP, Legal',                                             company: 'Translation',                               notes: 'Brooklyn, NY (Hybrid)' },
  { role: 'Strategic Account Manager, Venture Capital',            company: 'Carta',                                     notes: 'New York City Metropolitan Area (Hybrid)' },
  { role: 'Legal & BA, International Distribution',                company: 'A24',                                       notes: 'New York, NY' },
  { role: 'Counsel (USA)',                                          company: 'Conduit',                                   notes: 'New York, NY' },
  { role: 'Head of Legal',                                         company: 'Mood',                                      notes: 'New York, NY (On-site)' },
  { role: 'Corporate Counsel',                                     company: 'Arcadia',                                   notes: 'Boston, MA (Remote)' },
  { role: 'Legal Innovation Partner',                              company: 'Harvey',                                    notes: 'New York, NY (Hybrid)' },
  { role: 'Senior Specialist Legal Editor, Corporate and M&A',     company: 'Thomson Reuters',                           notes: 'New York, NY (Remote)' },
  { role: 'Legal Operations & Systems Lead',                       company: 'Duetto',                                    notes: 'Austin, TX (Remote)' },
  { role: 'General Counsel',                                       company: 'Data Annotation',                           notes: 'Wisconsin (Remote)' },
  { role: 'Strategy & Business Operations Generalist',             company: 'SentiLink',                                 notes: 'New York, NY (Remote)' },
  { role: 'Head of Partnerships',                                  company: 'FullStack Labs',                            notes: 'United States (Remote)' },
  { role: 'Product Counsel, DeepMind',                             company: 'Google DeepMind',                           notes: 'New York, NY (On-site)' },
  { role: 'Counsel, Data Products & Privacy',                      company: 'Rippling',                                  notes: 'New York, NY (On-site)' },
];

// ─── APPLIED JOBS ─────────────────────────────────────────────────────────────
// Dates back-calculated from "Applied X ago" relative to 2026-04-22.
// LinkedIn shows 25 total applied; 11 were visible in the pasted export.
const APPLIED = [
  // Applied "just now" or "13h ago" → 2026-04-22
  { role: 'Product Counsel, Data Strategy, DeepMind', company: 'Google DeepMind',                          date_applied: '2026-04-22', notes: 'New York, NY (On-site)' },
  { role: 'Legal Counsel',                            company: 'Men In Blazers Media Network',              date_applied: '2026-04-22', notes: 'New York, NY (Hybrid)' },
  { role: 'Managing Director of Legal Operations',    company: 'Lease & LaBau, Inc.',                      date_applied: '2026-04-22', notes: 'New York City Metropolitan Area (Hybrid)' },
  { role: 'Head of Business & Legal Affairs',         company: 'Creative License | Talent + Music + IP',   date_applied: '2026-04-22', notes: 'United States (Remote)' },
  { role: 'Product Counsel (Fintech/Payments)',        company: 'Legal.io',                                 date_applied: '2026-04-22', notes: 'United States (Remote). July start date.' },
  { role: 'Director, Legal Innovation & AI Strategy', company: 'Harnham',                                  date_applied: '2026-04-22', notes: 'New York City Metropolitan Area (Hybrid)' },

  // Applied "6d ago" → 2026-04-16
  { role: 'General Counsel',                          company: 'New Museum of Contemporary Art',           date_applied: '2026-04-16', notes: 'New York, NY (On-site)' },

  // Applied "1w ago" → 2026-04-15
  { role: 'Senior Counsel, Media Distribution',       company: 'Major League Baseball',                    date_applied: '2026-04-15', notes: 'New York, NY' },
  { role: 'General Counsel',                          company: 'Magna Search Group',                       date_applied: '2026-04-15', notes: 'New York (Hybrid). Application viewed.' },
  { role: 'Director, Legal - Payments',               company: 'GoFundMe',                                 date_applied: '2026-04-15', notes: 'United States (Remote)' },
  { role: 'Head of People Ops',                       company: 'Sword Health',                             date_applied: '2026-04-15', notes: 'United States (Remote). No longer accepting applications.' },
];

// ─── BUILD ROWS ───────────────────────────────────────────────────────────────
const wishlistRows = WISHLIST.map(j => ({
  user_id: USER_ID,
  company: j.company,
  role: j.role,
  status: 'Wishlist',
  notes: j.notes || null,
}));

const appliedRows = APPLIED.map(j => ({
  user_id: USER_ID,
  company: j.company,
  role: j.role,
  status: 'Applied',
  date_applied: j.date_applied,
  notes: j.notes || null,
}));

const allRows = [...wishlistRows, ...appliedRows];

// ─── INSERT ───────────────────────────────────────────────────────────────────
console.log(`Inserting ${wishlistRows.length} Wishlist + ${appliedRows.length} Applied rows…`);

const { data, error } = await supabase
  .from('job_applications')
  .insert(allRows)
  .select('id, company, role, status');

if (error) {
  console.error('Insert failed:', error.message);
  process.exit(1);
}

console.log(`\n✓ Inserted ${data.length} job applications\n`);
console.log('  Wishlist:', data.filter(r => r.status === 'Wishlist').length);
console.log('  Applied: ', data.filter(r => r.status === 'Applied').length);
console.log('\nSample rows:');
data.slice(0, 5).forEach(r => console.log(`  [${r.status}] ${r.role} @ ${r.company}`));
if (data.length > 5) console.log(`  … and ${data.length - 5} more`);
