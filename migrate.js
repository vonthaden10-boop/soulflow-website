/**
 * migrate.js — Vonthaden Solutions DB Migration Runner
 * Runs migrate.sql against your Supabase project via the Management API,
 * then automatically runs the seed so you can go straight to npm run email.
 *
 * Requires SUPABASE_ACCESS_TOKEN in .env (one-time setup):
 *   1. Go to https://supabase.com/dashboard/account/tokens
 *   2. Generate a new token → copy it
 *   3. Add to .env: SUPABASE_ACCESS_TOKEN=sbp_xxxx...
 *
 * Usage: node migrate.js
 */

require('dotenv').config({ override: true });
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;

// Extract project ref from URL: https://ocwpobikozdxwgabzsys.supabase.co → ocwpobikozdxwgabzsys
function getProjectRef(url) {
  try {
    const host = new URL(url).hostname;          // ocwpobikozdxwgabzsys.supabase.co
    return host.split('.')[0];                   // ocwpobikozdxwgabzsys
  } catch {
    return null;
  }
}

async function runMigration() {
  console.log('🗄️   Vonthaden Solutions — Migration Runner\n');

  // ── Guard: check for access token ───────────────────────────
  if (!ACCESS_TOKEN) {
    console.error(`✗  SUPABASE_ACCESS_TOKEN not found in .env.

To get one:
  1. Open https://supabase.com/dashboard/account/tokens
  2. Click "Generate new token" → give it a name → copy it
  3. Add this line to your .env:
     SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx
  4. Re-run: node migrate.js

Alternatively, paste the contents of migrate.sql directly into:
  https://supabase.com/dashboard/project/${getProjectRef(SUPABASE_URL) || '<your-project-ref>'}/sql/new
`);
    process.exit(1);
  }

  const projectRef = getProjectRef(SUPABASE_URL);
  if (!projectRef) {
    console.error('✗  Could not parse project ref from SUPABASE_URL:', SUPABASE_URL);
    process.exit(1);
  }

  // ── Read SQL ─────────────────────────────────────────────────
  const sqlPath = path.join(__dirname, 'migrate.sql');
  const sql     = fs.readFileSync(sqlPath, 'utf8');

  console.log(`  Project ref : ${projectRef}`);
  console.log(`  SQL file    : ${sqlPath}\n`);

  // ── POST to Supabase Management API ─────────────────────────
  const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  process.stdout.write('  Running migration…');

  const response = await fetch(apiUrl, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    process.stdout.write(' ✗\n\n');
    console.error(`Migration failed (HTTP ${response.status}):`);
    console.error(JSON.stringify(body, null, 2));
    console.error(`\nFallback: paste migrate.sql into the Supabase SQL editor:
  https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    process.exit(1);
  }

  process.stdout.write(' ✅\n');
  console.log('\n  leads table is ready.\n');

  // ── Auto-run seed ────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Running seed-leads.js…\n');

  try {
    execSync('node seed-leads.js', { stdio: 'inherit', cwd: __dirname });
  } catch {
    // seed-leads.js already prints its own errors; non-zero exit is handled there
    process.exit(1);
  }
}

runMigration().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
