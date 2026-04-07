/**
 * email.js — Vonthaden Solutions Email Sender
 * Pulls unsent leads from Supabase, generates a personalized cold email for each
 * using Claude (Sonnet 4.6), sends via Resend, and marks the lead as contacted.
 *
 * Audit is opportunistic: if a website exists we run it for richer personalization,
 * but the pipeline never blocks on it — every lead with an email address gets reached.
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
const AGENCY_NAME  = process.env.AGENCY_NAME  || 'Vonthaden Solutions';

const BATCH_SIZE = 20;

// ── Vertical pain points & hooks ──────────────────────────────
// Each entry:
//   pain  → what keeps them up at night (used in the email body)
//   hook  → how our AI receptionist solves it (one punchy sentence)
//   cta   → demo framing tuned to their day-to-day reality

const VERTICAL_PAIN_POINTS = {
  roofing: {
    pain:  'missing calls while up on a roof and can\'t answer',
    hook:  'answers your phone when you\'re up on a roof — every call, every time',
    cta:   'Takes 15 minutes. I can show you what your phone sounds like with AI answering.',
  },
  hvac: {
    pain:  'losing after-hours service calls to competitors because nobody picks up',
    hook:  'books service calls at 2am when your phone goes to voicemail',
    cta:   'I can show you a 2-minute demo of what your after-hours calls would sound like.',
  },
  plumbing: {
    pain:  'emergency calls going to voicemail while you\'re on a job',
    hook:  'captures emergency calls 24/7 so you never lose a burst-pipe job to a competitor',
    cta:   'Happy to show you a quick demo of how it handles emergency dispatch.',
  },
  auto: {
    pain:  'losing buyer leads after hours when the lot is empty',
    hook:  'captures and qualifies buyer inquiries after hours when your lot is dark',
    cta:   'I can demo exactly what a late-night car buyer would hear when they call.',
  },
  landscaping: {
    pain:  'missing quote requests during spring rush because you\'re out in the field all day',
    hook:  'handles quote requests and scheduling while you\'re out on a property',
    cta:   'I can show you a 2-minute demo of it handling a quote call start to finish.',
  },
};

function getPainPoint(vertical) {
  const key = (vertical || '').toLowerCase();
  // fuzzy match — "roofing contractor" → "roofing"
  for (const [k, v] of Object.entries(VERTICAL_PAIN_POINTS)) {
    if (key.includes(k)) return v;
  }
  // generic fallback
  return {
    pain:  'missing calls and after-hours leads while running the business',
    hook:  'answers every call and books jobs 24/7 — no voicemail, no missed revenue',
    cta:   'I can show you a 2-minute demo of what your phone would sound like with AI answering.',
  };
}

// ── Claude email writer ────────────────────────────────────────

async function generateEmail(lead, audit = null) {
  const { pain, hook, cta } = getPainPoint(lead.vertical);

  // Build audit-derived lines only when we have audit data
  let auditSection = '';
  let reviewLine   = '';

  if (audit) {
    const missing  = missingTools(audit);
    const score    = scoreAudit(audit);
    const { label: tierLabel } = recommendTier(score);
    const callouts = missing.slice(0, 3);

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
        : null,
    ].filter(Boolean).join('\n');

    auditSection = `
Website audit (use these to make the email feel researched, not mass-sent):
- Opportunity score: ${score}/100 — recommended package: ${tierLabel}
- Missing tools detected: ${callouts.length ? callouts.join(', ') : 'none flagged'}
${intelLines}`;

    if (reviewCount !== null && reviewCount < 10) {
      reviewLine = `One extra line (casual, one sentence only): mention we help clients double their reviews in 60 days.`;
    }
  }

  const prompt = `You are writing a short, punchy cold outreach email on behalf of ${AGENCY_NAME}.

Business details:
- Business name: ${lead.business_name}
- Owner name: ${lead.owner_name || 'unknown'}
- City: ${lead.city || 'Tampa Bay'}
- Vertical: ${lead.vertical}

Core pain point for this vertical: ${pain}
How our AI receptionist solves it: ${hook}
${auditSection}

Write a cold email with these rules:
1. Subject line: short, curiosity-driven, under 8 words. NO clickbait or spam words.
2. Opening: use owner name if known. If unknown, use business name naturally — NEVER "Hi there" or "Hi team".
3. One sentence that names the vertical pain point (${pain}) — make it feel personal, not mass-sent.
4. One sentence on what we do: "${hook}" — keep it in your own words, match their world.
5. ${reviewLine || 'Skip the review line.'}
6. CTA: ${cta} Ask if they have 15 minutes this week.
7. Signature: ${FROM_NAME}, ${AGENCY_NAME}, (813) 536-6222
8. Total length: MAX 120 words — cut ruthlessly.
9. Tone: direct, human, confident — like a local guy who actually knows their industry, not a SaaS company.
10. NO "I hope this email finds you well." NO "I came across your business." NO buzzwords. NO fluff.

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
  console.log('📧  Vonthaden Solutions — Email Sender starting…\n');

  // Pull leads that have never been emailed and have an email address.
  // Double-guard: email_sent = false AND status != 'sent' prevents re-sends
  // if one field gets out of sync.
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('email_sent', false)
    .neq('status', 'sent')
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

  console.log(`📋  ${leads.length} leads queued for outreach\n`);

  let sent   = 0;
  let failed = 0;

  for (const lead of leads) {
    const label = `${lead.business_name} <${lead.email}>`;

    try {
      // 1. Audit website (opportunistic — skip if no website)
      let audit = null;
      if (lead.website) {
        process.stdout.write(`  🔍  Auditing ${lead.business_name}…`);
        try {
          audit = await auditWebsite(lead.website, lead.business_name, lead.city);
          const score = scoreAudit(audit);
          const { tier } = recommendTier(score);
          await saveAudit(lead.id, audit, score, tier);
          process.stdout.write(` score ${scoreAudit(audit)} → ${tier}\n`);
        } catch (auditErr) {
          process.stdout.write(` ⚠ audit failed (${auditErr.message}) — continuing without it\n`);
          audit = null;
        }
      } else {
        console.log(`  ⚡  No website for ${lead.business_name} — skipping audit`);
      }

      // 2. Generate personalized email
      process.stdout.write(`  ✍   Generating email for ${label}…`);
      const { subject, body } = await generateEmail(lead, audit);
      await saveEmailDraft(lead.id, subject, body);
      process.stdout.write(' done\n');

      // 3. Send via Resend
      process.stdout.write(`  📤  Sending "${subject}"…`);
      const emailId = await sendEmail(lead.email, subject, body);
      process.stdout.write(` sent (id: ${emailId})\n`);

      // 4. Mark as contacted — prevents any future re-send
      await markSent(lead.id, emailId);

      console.log(`  ✅  ${label} — complete\n`);
      sent++;

      await new Promise(r => setTimeout(r, 800));

    } catch (err) {
      process.stdout.write('\n');
      console.error(`  ✗  Failed for ${label}: ${err.message}\n`);

      // Mark error in Supabase so we can triage without re-attempting automatically
      try { await supabase.from('leads').update({ status: 'error' }).eq('id', lead.id); } catch (_) {}
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
