/**
 * pipeline.js — Von Solutions Master Pipeline Orchestrator
 * SCRAPE → AUDIT → PERSONALIZE → SEND → LOG
 *
 * Usage: npm run pipeline
 * Processes all leads with status = 'new' that have an email address.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic         = require('@anthropic-ai/sdk');
const { Resend }        = require('resend');
const { auditWebsite, scoreAudit, recommendTier, missingTools } = require('./audit');

const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend    = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL  = process.env.FROM_EMAIL  || 'jacob@vonthaden.ai';
const FROM_NAME   = process.env.FROM_NAME   || 'Jacob von Thaden';
const AGENCY_NAME = process.env.AGENCY_NAME || 'Von Solutions';
const CLIENT_ID   = process.env.CLIENT_ID   || 'von-solutions';

const BATCH_SIZE  = parseInt(process.env.PIPELINE_BATCH_SIZE || '20', 10);

// ── Status broadcast (used by server.js SSE) ──────────────────

let broadcastFn = null;
function setBroadcast(fn) { broadcastFn = fn; }

function emit(leadId, stage, message, extra = {}) {
  const payload = { leadId, stage, message, ts: new Date().toISOString(), ...extra };
  console.log(`  [${stage}] ${message}`);
  if (broadcastFn) broadcastFn(payload);
}

// ── Supabase helpers ───────────────────────────────────────────

async function updateLead(id, fields) {
  const { error } = await supabase.from('leads').update(fields).eq('id', id);
  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

// ── Stage 1: AUDIT ─────────────────────────────────────────────

async function runAudit(lead) {
  emit(lead.id, 'AUDIT', `Auditing ${lead.business_name}…`);
  const audit = await auditWebsite(lead.website, lead.business_name, lead.city);
  const score = scoreAudit(audit);
  const { tier } = recommendTier(score);
  await updateLead(lead.id, { audit, score, recommended_tier: tier, status: 'audited' });
  emit(lead.id, 'AUDIT', `${lead.business_name} → score ${score}, tier ${tier}`, { audit, score, tier });
  return { audit, score, tier };
}

// ── Stage 2: PERSONALIZE ───────────────────────────────────────

async function runPersonalize(lead, audit) {
  emit(lead.id, 'PERSONALIZE', `Generating email for ${lead.business_name}…`);

  const missing    = missingTools(audit);
  const score      = scoreAudit(audit);
  const { label }  = recommendTier(score);
  const callouts   = missing.slice(0, 3);
  const missingStr = callouts.length ? callouts.join(', ') : 'key automation tools';

  const prompt = `You are writing a short, punchy cold outreach email on behalf of ${AGENCY_NAME}.

Business details:
- Business name: ${lead.business_name}
- Owner name: ${lead.owner_name || 'there'}
- City: ${lead.city || 'Tampa Bay'}
- Industry: ${lead.vertical}

What this business is missing (detected from their website):
${missing.length ? missing.map(t => `- ${t}`).join('\n') : '- No major gaps detected'}

Opportunity score: ${score}/100 — recommended package: ${label}

Write a cold email with these rules:
1. Subject line: short, curiosity-driven, under 8 words, NO clickbait or spam words
2. Opening: address by owner name if known, otherwise "Hi [Business Name] team"
3. Reference ${missingStr} specifically — feel like you personally looked at their site
4. One sentence on what we do: AI receptionist + automation that fills in the gaps
5. Soft CTA: ask for a 15-minute call, no pressure
6. Signature: ${FROM_NAME}, ${AGENCY_NAME}, (813) 536-6222
7. Total length: MAX 120 words — cut ruthlessly
8. Tone: direct, human, confident — NOT salesy, NOT generic, NO buzzwords
9. NO "I hope this email finds you well." NO fluff.

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

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  await updateLead(lead.id, {
    email_subject: parsed.subject,
    email_draft:   parsed.body,
    status:        'personalized',
  });

  emit(lead.id, 'PERSONALIZE', `Email drafted: "${parsed.subject}"`, { subject: parsed.subject });
  return parsed;
}

// ── Stage 3: SEND ──────────────────────────────────────────────

async function runSend(lead, subject, body) {
  emit(lead.id, 'SEND', `Sending to ${lead.email}…`);

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px">
${body.split('\n').map(line => line.trim() ? `<p style="margin:0 0 12px">${line}</p>` : '').join('')}
</div>`;

  const result = await resend.emails.send({
    from:    `${FROM_NAME} <${FROM_EMAIL}>`,
    to:      lead.email,
    subject,
    html,
    text: body,
  });

  if (result.error) throw new Error(result.error.message);
  const resendId = result.data?.id;

  await updateLead(lead.id, {
    email_sent:    true,
    email_sent_at: new Date().toISOString(),
    resend_id:     resendId,
    status:        'sent',
  });

  emit(lead.id, 'SEND', `Sent (resend id: ${resendId})`, { resendId });
  return resendId;
}

// ── Main pipeline loop ─────────────────────────────────────────
//
// Options:
//   auditOnly {boolean} — when true, runs AUDIT stage only and stops.
//                         No emails drafted or sent. Pulls all new leads
//                         regardless of whether they have an email address.

async function runPipeline({ auditOnly = false } = {}) {
  const modeLabel = auditOnly ? 'AUDIT ONLY' : 'FULL PIPELINE';
  console.log(`\n🚀  Von Solutions — ${modeLabel} starting…\n`);

  // Audit-only mode pulls ALL new leads (no email required).
  // Full mode requires an email address since it will send.
  let query = supabase
    .from('leads')
    .select('*')
    .eq('status', 'new')
    .eq('client_id', CLIENT_ID)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (!auditOnly) {
    query = query.not('email', 'is', null);
  }

  const { data: leads, error } = await query;

  if (error) {
    console.error('✗  Failed to fetch leads:', error.message);
    throw error;
  }

  if (!leads || leads.length === 0) {
    const msg = auditOnly
      ? 'No new leads to audit.'
      : 'No new leads with email addresses to process.';
    console.log(`ℹ  ${msg}`);
    return { processed: 0, failed: 0, auditOnly };
  }

  console.log(`  📋  ${leads.length} leads to process (${modeLabel})\n`);

  let processed = 0;
  let failed    = 0;

  for (const lead of leads) {
    console.log(`\n──────────────────────────────────`);
    console.log(`  📌  ${lead.business_name} | ${lead.vertical} | ${lead.city}`);

    try {
      // Stage 1 — Audit (always runs)
      const { audit } = await runAudit(lead);

      if (!auditOnly) {
        // Stage 2 — Personalize
        const { subject, body } = await runPersonalize(lead, audit);

        // Stage 3 — Send
        await runSend(lead, subject, body);
      }

      processed++;
      console.log(`  ✅  Complete\n`);

    } catch (err) {
      console.error(`  ✗  Failed for ${lead.business_name}: ${err.message}`);
      try {
        await updateLead(lead.id, { status: 'error' });
      } catch { /* ignore secondary error */ }
      failed++;
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Processed : ${processed}
  ✗   Failed    : ${failed}
  Mode          : ${modeLabel}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return { processed, failed, auditOnly };
}

module.exports = { runPipeline, setBroadcast };

// Run directly if called as main
if (require.main === module) {
  const auditOnly = process.argv.includes('--audit-only');
  runPipeline({ auditOnly }).catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
