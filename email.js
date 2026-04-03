/**
 * email.js — Vonthaden Solutions Email Sender
 * Reads unsent leads from Supabase, uses Claude to write a
 * personalized cold email per business, sends via Resend,
 * then updates email_sent + status in Supabase.
 *
 * Usage: npm run email
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic         = require('@anthropic-ai/sdk');
const { Resend }        = require('resend');

const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend    = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL   = process.env.FROM_EMAIL   || 'jacob@vonthaden.ai';
const FROM_NAME    = process.env.FROM_NAME    || 'Jacob von Thaden';
const AGENCY_NAME  = process.env.AGENCY_NAME  || 'Vonthaden Solutions';

// How many leads to email per run (keep low to avoid spam filters)
const BATCH_SIZE = 20;

// ── Claude email writer ────────────────────────────────────────

async function generateEmail(lead) {
  const verticalContext = {
    'Roofing':            'roofing contractors who lose jobs to competitors who respond faster to storm-damage calls',
    'HVAC':               'HVAC companies who miss leads on nights and weekends when homeowners most need emergency service',
    'Auto Dealer':        'auto dealerships that struggle to follow up with every online inquiry before the customer buys elsewhere',
    'Plumbing':           'plumbing companies that miss emergency calls after hours when customers need help most',
    'Home Services':      'home service businesses that lose leads to faster-responding competitors',
    'Electrical':         'electricians who miss urgent after-hours calls while homeowners call the next available contractor',
    'Landscaping':        'landscaping companies that lose recurring contracts because they are slow to respond to new quote requests',
    'Pest Control':       'pest control companies that lose customers to competitors who answer the phone on the first call',
    'General Contractor': 'general contractors who miss project inquiries while they are on the job site and cannot answer the phone',
    'Windows & Doors':    'window and door companies that lose high-ticket installs because they take too long to follow up on quotes',
    'Pool Service':       'pool service companies that lose new accounts because leads go cold before anyone calls them back',
  }[lead.vertical] || 'local businesses that are losing leads to faster-responding competitors';

  const prompt = `You are writing a short, punchy cold outreach email on behalf of ${AGENCY_NAME}.

Business details:
- Business name: ${lead.business_name}
- Owner name: ${lead.owner_name || 'there'}
- City: ${lead.city || 'Tampa Bay'}
- Industry: ${lead.vertical}

Context:
We help ${verticalContext}. We install an AI receptionist that answers every call 24/7, qualifies leads, and books appointments automatically — without hiring staff.

Write a cold email with these rules:
1. Subject line: short, curiosity-driven, under 8 words, NO clickbait or spam words
2. Opening: address them by owner name if known, otherwise "Hi [Business Name] team"
3. One specific pain point tied to their vertical — make it feel like you know their business
4. One sentence on what we do (don't over-explain)
5. Soft CTA: ask for a 15-minute call, no pressure
6. Signature: ${FROM_NAME}, ${AGENCY_NAME}, (813) 536-6222
7. Total length: under 150 words
8. Tone: direct, human, confident — NOT salesy or generic

Return ONLY valid JSON in this exact shape, no markdown:
{
  "subject": "...",
  "body": "..."
}`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();

  // Strip markdown code fences if Claude wrapped it
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 200)}`);
  }
}

// ── Send one email via Resend ──────────────────────────────────

async function sendEmail(to, subject, body) {
  // Convert plain text body to minimal HTML (preserves line breaks)
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

// ── Mark lead as sent in Supabase ─────────────────────────────

async function markSent(id, status = 'contacted') {
  const { error } = await supabase
    .from('leads')
    .update({
      email_sent:    true,
      email_sent_at: new Date().toISOString(),
      status,
    })
    .eq('id', id);

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log('📧  Vonthaden Solutions — Email Sender starting…\n');

  // Fetch unsent leads that have an email address
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('email_sent', false)
    .not('email', 'is', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('✗  Failed to fetch leads:', error.message);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.log('ℹ  No unsent leads with email addresses found.');
    console.log('   Add emails to leads in Supabase, then re-run.');
    return;
  }

  console.log(`  📋  ${leads.length} leads queued for outreach\n`);

  let sent   = 0;
  let failed = 0;

  for (const lead of leads) {
    const label = `${lead.business_name} <${lead.email}>`;
    process.stdout.write(`  ✍  Generating email for ${label}…`);

    try {
      // 1. Generate personalized email with Claude
      const { subject, body } = await generateEmail(lead);
      process.stdout.write(' done\n');

      // 2. Send via Resend
      process.stdout.write(`  📤  Sending "${subject}"…`);
      const emailId = await sendEmail(lead.email, subject, body);
      process.stdout.write(` sent (id: ${emailId})\n`);

      // 3. Mark as sent in Supabase
      await markSent(lead.id);

      console.log(`  ✅  ${label} — complete\n`);
      sent++;

      // Small delay between sends to avoid rate limits
      await new Promise(r => setTimeout(r, 800));

    } catch (err) {
      process.stdout.write('\n');
      console.error(`  ✗  Failed for ${label}: ${err.message}\n`);
      failed++;
    }
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Sent   : ${sent}
  ✗   Failed : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
