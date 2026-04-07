/**
 * seed-leads.js — Vonthaden Solutions Dev Seed
 * Inserts 5 realistic Tampa Bay home service businesses into the leads table,
 * then fires a live test email for the first lead to TEST_RECIPIENT so you can
 * see exactly what a prospect would receive.
 * Safe to run multiple times — skips any phone number already in the DB.
 *
 * Usage: node seed-leads.js
 */

require('dotenv').config({ override: true });
const { createClient } = require('@supabase/supabase-js');
const Anthropic         = require('@anthropic-ai/sdk');
const { Resend }        = require('resend');

const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend    = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL  = process.env.FROM_EMAIL  || 'jacob@vonthaden.ai';
const FROM_NAME   = process.env.FROM_NAME   || 'Jacob von Thaden';
const AGENCY_NAME = process.env.AGENCY_NAME || 'Vonthaden Solutions';

// Where the preview fires — never the real lead address
const TEST_RECIPIENT = 'vonthaden10@gmail.com';

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

// ── Vertical pain points (mirrors email.js) ────────────────────

const VERTICAL_PAIN_POINTS = {
  roofing: {
    pain: "missing calls while up on a roof and can't answer",
    hook: "answers your phone when you're up on a roof — every call, every time",
    cta:  'Takes 15 minutes. I can show you what your phone sounds like with AI answering.',
  },
  hvac: {
    pain: 'losing after-hours service calls to competitors because nobody picks up',
    hook: 'books service calls at 2am when your phone goes to voicemail',
    cta:  'I can show you a 2-minute demo of what your after-hours calls would sound like.',
  },
  plumbing: {
    pain: "emergency calls going to voicemail while you're on a job",
    hook: "captures emergency calls 24/7 so you never lose a burst-pipe job to a competitor",
    cta:  'Happy to show you a quick demo of how it handles emergency dispatch.',
  },
  landscaping: {
    pain: "missing quote requests during spring rush because you're out in the field all day",
    hook: "handles quote requests and scheduling while you're out on a property",
    cta:  'I can show you a 2-minute demo of it handling a quote call start to finish.',
  },
  auto: {
    pain: 'losing buyer leads after hours when the lot is empty',
    hook: 'captures and qualifies buyer inquiries after hours when your lot is dark',
    cta:  'I can demo exactly what a late-night car buyer would hear when they call.',
  },
};

function getPainPoint(vertical) {
  const key = (vertical || '').toLowerCase();
  for (const [k, v] of Object.entries(VERTICAL_PAIN_POINTS)) {
    if (key.includes(k)) return v;
  }
  return {
    pain: 'missing calls and after-hours leads while running the business',
    hook: 'answers every call and books jobs 24/7 — no voicemail, no missed revenue',
    cta:  'I can show you a 2-minute demo of what your phone would sound like with AI answering.',
  };
}

// ── Generate email via Claude ──────────────────────────────────

async function generateEmail(lead) {
  const { pain, hook, cta } = getPainPoint(lead.vertical);

  const prompt = `You are writing a short, punchy cold outreach email on behalf of ${AGENCY_NAME}.

Business details:
- Business name: ${lead.business_name}
- Owner name: ${lead.owner_name || 'unknown'}
- City: ${lead.city || 'Tampa Bay'}
- Vertical: ${lead.vertical}

Core pain point for this vertical: ${pain}
How our AI receptionist solves it: ${hook}

Write a cold email with these rules:
1. Subject line: short, curiosity-driven, under 8 words. NO clickbait or spam words.
2. Opening: use owner name if known. NEVER "Hi there" or "Hi team".
3. One sentence naming the pain point (${pain}) — feel personal, not mass-sent.
4. One sentence on what we do: "${hook}" — keep it in your own words, match their world.
5. CTA: ${cta} Ask if they have 15 minutes this week.
6. Signature: ${FROM_NAME}, ${AGENCY_NAME}, (813) 536-6222
7. Total length: MAX 120 words — cut ruthlessly.
8. Tone: direct, human, confident — like a local guy who actually knows their industry.
9. NO "I hope this email finds you well." NO buzzwords. NO fluff.

Return ONLY valid JSON, no markdown fences:
{"subject": "...", "body": "..."}`;

  const message = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 512,
    messages:   [{ role: 'user', content: prompt }],
  });

  const raw     = message.content[0].text.trim();
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 200)}`);
  }
}

// ── Send via Resend ────────────────────────────────────────────

async function sendEmail(to, subject, body) {
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px">
${body.split('\n').map(line => line.trim() ? `<p style="margin:0 0 12px">${line}</p>` : '').join('')}
</div>`;

  const result = await resend.emails.send({
    from:    `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text: body,
  });

  if (result.error) throw new Error(result.error.message);
  return result.data?.id;
}

// ── Main ───────────────────────────────────────────────────────

async function seed() {
  console.log('🌱  Vonthaden Solutions — Lead Seeder\n');

  // Load existing phones to avoid duplicates
  const { data: existing, error: fetchErr } = await supabase
    .from('leads')
    .select('phone');

  if (fetchErr) {
    console.error('✗  Could not fetch existing leads:', fetchErr.message);
    process.exit(1);
  }

  const existingPhones = new Set((existing || []).map(r => r.phone).filter(Boolean));

  let inserted    = 0;
  let skipped     = 0;
  let previewLead = null;  // first successfully inserted lead gets the test send

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
      if (!previewLead) previewLead = lead;
      inserted++;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Inserted : ${inserted}
  ⚠   Skipped  : ${skipped}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // ── Test send ────────────────────────────────────────────────
  // Fire a real email to TEST_RECIPIENT so you can see what a prospect receives.
  // Uses the first newly inserted lead; skips if all leads already existed.

  const demoLead = previewLead || LEADS[0];  // fallback to first lead if all were skipped

  console.log(`\n📧  Sending preview email for "${demoLead.business_name}" → ${TEST_RECIPIENT}\n`);

  try {
    process.stdout.write('  ✍   Generating email via Claude…');
    const { subject, body } = await generateEmail(demoLead);
    process.stdout.write(' done\n');

    console.log(`\n  Subject : ${subject}`);
    console.log(`  Body preview:\n${body.split('\n').map(l => '    ' + l).join('\n')}\n`);

    process.stdout.write(`  📤  Sending to ${TEST_RECIPIENT}…`);
    const emailId = await sendEmail(TEST_RECIPIENT, subject, body);
    process.stdout.write(` sent ✅ (Resend id: ${emailId})\n`);
  } catch (err) {
    console.error(`  ✗  Test send failed: ${err.message}`);
  }
}

seed().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
