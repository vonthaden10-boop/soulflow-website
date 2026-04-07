/**
 * email.js — Von Solutions Email Sender
 * Audits each lead's website, uses Claude to write a personalized cold email
 * referencing exactly what they're missing, sends via Resend, and logs to Supabase.
 *
 * Usage: npm run email
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic         = require('@anthropic-ai/sdk');
const { Resend }        = require('resend');
const { auditWebsite, scoreAudit, recommendTier, missingTools } = require('./audit');

const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend    = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL   = process.env.FROM_EMAIL   || 'jacob@vonthaden.ai';
const FROM_NAME    = process.env.FROM_NAME    || 'Jacob von Thaden';
const AGENCY_NAME  = process.env.AGENCY_NAME  || 'Von Solutions';

const BATCH_SIZE = 20;

// ── Claude audit-aware email writer ───────────────────────────

async function generateEmail(lead, audit) {
  const missing = missingTools(audit);
  const score   = scoreAudit(audit);
  const { label: tierLabel } = recommendTier(score);

  // Pick the 2–3 most impactful missing tools to call out
  const callouts   = missing.slice(0, 3);
  const missingStr = callouts.length ? callouts.join(', ') : 'key automation tools';

  // Pull intelligence signals to ground the email in real details
  const intel       = audit.intelligence || {};
  const gb          = audit.social?.googleBusiness;
  const reviewCount = gb?.reviewCount ?? null;

  const intelLines = [
    intel.yearsInBusiness?.found
      ? `- In business since ${intel.yearsInBusiness.year} (${intel.yearsInBusiness.yearsAgo} years)`
      : null,
    intel.teamSize?.found
      ? `- Team size signals: ${intel.teamSize.signals.join('; ')}`
      : null,
    intel.serviceArea?.cities?.length
      ? `- Service area mentions: ${intel.serviceArea.cities.join(', ')}`
      : null,
    intel.phone?.found
      ? `- Phone on site: ${intel.phone.raw}`
      : null,
    reviewCount !== null
      ? `- Google reviews: ${reviewCount} (rating: ${gb.rating ?? 'unknown'})`
      : '- Google reviews: not found',
    intel.reviewMentions?.count > 0
      ? `- Mentions "reviews" or "testimonials" ${intel.reviewMentions.count} time(s) on site`
      : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are writing a short, punchy cold outreach email on behalf of ${AGENCY_NAME}.

Business details:
- Business name: ${lead.business_name}
- Owner name: ${lead.owner_name || 'unknown'}
- City: ${lead.city || 'Tampa Bay'}
- Industry: ${lead.vertical}

What this business is missing (detected from their website):
${missing.length ? missing.map(t => `- ${t}`).join('\n') : '- No major gaps detected'}

Opportunity score: ${score}/100 — recommended package: ${tierLabel}

Additional business intelligence (use these to make the email feel researched, not mass-sent):
${intelLines || '- No additional signals detected'}

Write a cold email with these rules:
1. Subject line: short, curiosity-driven, under 8 words, NO clickbait or spam words
2. Opening: use owner name if known. If unknown, use business name naturally — never "Hi there" or "Hi team"
3. One sentence referencing ${missingStr} specifically — make it feel like you personally looked at their site, not a mass email
4. One sentence on what we do — make it vertical-specific. Roofers: "answers calls when you're on a roof." HVAC: "books service calls at 2am when your phone goes to voicemail." Auto dealers: "captures leads after hours when your lot is empty." Match the pain to their world.
5. If they have fewer than 10 Google reviews or none detected, add one sentence: we also help clients double their reviews in 60 days — keep it casual, one line only
6. CTA: offer to show them a 2-minute demo of what their phone would sound like with AI answering — no pitch, just show it. Ask if they have 15 minutes this week.
7. Signature: ${FROM_NAME}, ${AGENCY_NAME}, (813) 536-6222
8. Total length: MAX 120 words — cut ruthlessly
9. Tone: direct, human, confident — like a local guy who actually looked at their business, not a SaaS company
10. NO "I hope this email finds you well." NO "I came across your business." NO buzzwords. NO fluff.

Return ONLY valid JSON, no markdown fences:
{
  "subject": "...",
  "body": "..."
}`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw     = message.content[0].text.trim();
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 200)}`);
  }
}

// ── Send one email via Resend ──────────────────────────────────

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

// ── Supabase helpers ───────────────────────────────────────────

async function saveAudit(id, audit, score, tier) {
  const { error } = await supabase
    .from('leads')
    .update({ audit, score, recommended_tier: tier, status: 'audited' })
    .eq('id', id);
  if (error) throw new Error(`Supabase audit save failed: ${error.message}`);
}

async function saveEmailDraft(id, subject, body) {
  const { error } = await supabase
    .from('leads')
    .update({ email_subject: subject, email_draft: body, status: 'personalized' })
    .eq('id', id);
  if (error) throw new Error(`Supabase draft save failed: ${error.message}`);
}

async function markSent(id, resendId) {
  const { error } = await supabase
    .from('leads')
    .update({
      email_sent:    true,
      email_sent_at: new Date().toISOString(),
      resend_id:     resendId,
      status:        'sent',
    })
    .eq('id', id);
  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log('📧  Von Solutions — Email Sender starting…\n');

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
    return;
  }

  console.log(`  📋  ${leads.length} leads queued for outreach\n`);

  let sent   = 0;
  let failed = 0;

  for (const lead of leads) {
    const label = `${lead.business_name} <${lead.email}>`;

    try {
      // 1. Audit website
      process.stdout.write(`  🔍  Auditing ${lead.business_name}…`);
      const audit = await auditWebsite(lead.website, lead.business_name, lead.city);
      const score = scoreAudit(audit);
      const { tier } = recommendTier(score);
      await saveAudit(lead.id, audit, score, tier);
      process.stdout.write(` score ${score} → ${tier}\n`);

      // 2. Generate personalized email
      process.stdout.write(`  ✍  Generating email for ${label}…`);
      const { subject, body } = await generateEmail(lead, audit);
      await saveEmailDraft(lead.id, subject, body);
      process.stdout.write(' done\n');

      // 3. Send via Resend
      process.stdout.write(`  📤  Sending "${subject}"…`);
      const emailId = await sendEmail(lead.email, subject, body);
      process.stdout.write(` sent (id: ${emailId})\n`);

      // 4. Mark sent in Supabase
      await markSent(lead.id, emailId);

      console.log(`  ✅  ${label} — complete\n`);
      sent++;

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
