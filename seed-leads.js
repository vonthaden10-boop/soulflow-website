/**
 * seed-leads.js — Vonthaden Solutions Dev Seed
 * Inserts 5 realistic Tampa Bay home service businesses into the leads table.
 * Safe to run multiple times — skips any phone number already in the DB.
 *
 * Usage: node seed-leads.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const LEADS = [
  {
    business_name: 'Sunshine State Roofing',
    owner_name:    'Mike Delgado',
    email:         'mike@sunshinestateroofing.com',
    phone:         '(813) 442-7801',
    city:          'Tampa',
    vertical:      'roofing',
    website:       'https://sunshinestateroofing.com',
    email_sent:    false,
    status:        'new',
    client_id:     'von-solutions',
  },
  {
    business_name: 'Bay Area Cool Air HVAC',
    owner_name:    'Sandra Ruiz',
    email:         'sandra@bayareacoolair.com',
    phone:         '(727) 883-5540',
    city:          'Clearwater',
    vertical:      'hvac',
    website:       'https://bayareacoolair.com',
    email_sent:    false,
    status:        'new',
    client_id:     'von-solutions',
  },
  {
    business_name: 'Gulf Coast Plumbing Pros',
    owner_name:    'Tony Marchetti',
    email:         'tony@gulfcoastplumbingpros.com',
    phone:         '(813) 661-2294',
    city:          'Brandon',
    vertical:      'plumbing',
    website:       'https://gulfcoastplumbingpros.com',
    email_sent:    false,
    status:        'new',
    client_id:     'von-solutions',
  },
  {
    business_name: 'Green Thumb Landscaping',
    owner_name:    'Carlos Vega',
    email:         'carlos@greenthumbtampa.com',
    phone:         '(813) 774-3318',
    city:          'St. Petersburg',
    vertical:      'landscaping',
    website:       'https://greenthumbtampa.com',
    email_sent:    false,
    status:        'new',
    client_id:     'von-solutions',
  },
  {
    business_name: 'Bayshore Auto Group',
    owner_name:    'Denise Fowler',
    email:         'denise@bayshoreautotampa.com',
    phone:         '(813) 555-9021',
    city:          'Tampa',
    vertical:      'auto',
    website:       'https://bayshoreautotampa.com',
    email_sent:    false,
    status:        'new',
    client_id:     'von-solutions',
  },
];

async function seed() {
  console.log('🌱  Vonthaden Solutions — Lead Seeder\n');

  // Load existing phones so we don't duplicate
  const { data: existing, error: fetchErr } = await supabase
    .from('leads')
    .select('phone');

  if (fetchErr) {
    console.error('✗  Could not fetch existing leads:', fetchErr.message);
    process.exit(1);
  }

  const existingPhones = new Set((existing || []).map(r => r.phone).filter(Boolean));

  let inserted = 0;
  let skipped  = 0;

  for (const lead of LEADS) {
    if (existingPhones.has(lead.phone)) {
      console.log(`  ⚠  Skipped (already exists): ${lead.business_name}`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from('leads').insert(lead);

    if (error) {
      console.error(`  ✗  Failed to insert ${lead.business_name}: ${error.message}`);
    } else {
      console.log(`  ✅  Inserted: ${lead.business_name} (${lead.vertical} — ${lead.city})`);
      inserted++;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Inserted : ${inserted}
  ⚠   Skipped  : ${skipped}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

seed().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
