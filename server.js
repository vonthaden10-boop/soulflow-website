/**
 * server.js — Von Solutions Express API
 * Serves pipeline triggers, lead data, and stats for the dashboard.
 *
 * Usage: npm run server  (or: node server.js)
 * Endpoints:
 *   POST /api/run      → trigger pipeline, stream SSE progress
 *   GET  /api/leads    → all leads from Supabase
 *   GET  /api/stats    → today's stats
 */

require('dotenv').config({ override: true });
const express           = require('express');
const cors              = require('cors');
const { createClient }  = require('@supabase/supabase-js');
const { runPipeline, setBroadcast } = require('./pipeline');
const { auditWebsite, scoreAudit, recommendTier, missingTools } = require('./audit');

const app      = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const PORT     = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── SSE broadcast registry ─────────────────────────────────────

const sseClients = new Set();

function broadcast(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch { /* client disconnected */ }
  }
}

setBroadcast(broadcast);

// ── POST /api/run — trigger the pipeline ──────────────────────

let pipelineRunning = false;

app.post('/api/run', async (req, res) => {
  if (pipelineRunning) {
    return res.status(409).json({ error: 'Pipeline already running' });
  }

  // Set up SSE so the dashboard gets live updates
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));

  const auditOnly = req.body?.mode === 'audit';
  const modeLabel = auditOnly ? 'AUDIT ONLY' : 'FULL PIPELINE';

  pipelineRunning = true;
  broadcast({ stage: 'PIPELINE', message: `${modeLabel} started`, auditOnly, ts: new Date().toISOString() });

  try {
    const result = await runPipeline({ auditOnly });
    broadcast({ stage: 'PIPELINE', message: `${modeLabel} complete`, ...result, ts: new Date().toISOString() });
  } catch (err) {
    broadcast({ stage: 'PIPELINE', message: `Pipeline error: ${err.message}`, ts: new Date().toISOString() });
  } finally {
    pipelineRunning = false;
    res.end();
    sseClients.delete(res);
  }
});

// ── GET /api/leads — all leads ────────────────────────────────

app.get('/api/leads', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/stats — dashboard stats ──────────────────────────

app.get('/api/stats', async (req, res) => {
  try {
    const now          = new Date();
    const todayStart   = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(todayStart); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [scrapedRes, sentRes, recentRes, allRes] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact' })
        .gte('created_at', todayStart.toISOString()),
      supabase.from('leads').select('id', { count: 'exact' })
        .eq('status', 'sent').gte('sent_at', todayStart.toISOString()),
      supabase.from('leads').select('created_at, sent_at, status')
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('leads').select('recommended_tier, status, vertical').limit(2000),
    ]);

    const recent = recentRes.data || [];
    const all    = allRes.data    || [];

    // Pipeline value
    const tierPrices    = { GROW: 2500, 'ANSWER+': 1200, ANSWER: 500 };
    const pipelineValue = all.reduce((s, l) => s + (tierPrices[l.recommended_tier] || 0), 0);

    // Sparklines: last 7 days, index 0 = 6 days ago, index 6 = today
    const sparklines = { scraped: [], sent: [] };
    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(todayStart); dStart.setDate(dStart.getDate() - i);
      const dEnd   = new Date(dStart);     dEnd.setDate(dEnd.getDate() + 1);
      sparklines.scraped.push(
        recent.filter(l => { const d = new Date(l.created_at); return d >= dStart && d < dEnd; }).length
      );
      sparklines.sent.push(
        recent.filter(l => { if (!l.sent_at) return false; const d = new Date(l.sent_at); return d >= dStart && d < dEnd; }).length
      );
    }

    // index 5 = yesterday (6 days ago=0, today=6, yesterday=5)
    const scrapedYesterday = sparklines.scraped[5];
    const sentYesterday    = sparklines.sent[5];

    // By vertical
    const vMap = {};
    all.forEach(l => { if (l.vertical) vMap[l.vertical] = (vMap[l.vertical] || 0) + 1; });
    const byVertical = Object.entries(vMap)
      .map(([vertical, count]) => ({ vertical, count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);

    // By stage
    const sMap = {};
    all.forEach(l => { const s = l.status || 'new'; sMap[s] = (sMap[s] || 0) + 1; });
    const byStage = ['new', 'audited', 'personalized', 'sent', 'replied'].map(stage => ({
      stage, count: sMap[stage] || 0,
    }));

    // Conversion rate
    const totalLeads = all.length;
    const totalSent  = all.filter(l => l.status === 'sent' || l.status === 'replied').length;
    const conversionRate = totalLeads > 0 ? Math.round((totalSent / totalLeads) * 100) : 0;

    res.json({
      scrapedToday: scrapedRes.count || 0,
      sentToday:    sentRes.count    || 0,
      scrapedYesterday,
      sentYesterday,
      pipelineValue,
      pipelineRunning,
      conversionRate,
      totalLeads,
      totalSent,
      sparklines,
      byVertical,
      byStage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/leads/:id/send — send one lead's drafted email ──

app.post('/api/leads/:id/send', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !lead) return res.status(404).json({ error: 'Lead not found' });
    if (!lead.email_draft || !lead.email_subject) return res.status(400).json({ error: 'No draft to send' });
    if (!lead.email) return res.status(400).json({ error: 'Lead has no email address' });

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const FROM_NAME  = process.env.FROM_NAME  || 'Jacob von Thaden';
    const FROM_EMAIL = process.env.FROM_EMAIL || 'jacob@vonthaden.ai';

    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px">
${lead.email_draft.split('\n').map(line => line.trim() ? `<p style="margin:0 0 12px">${line}</p>` : '').join('')}
</div>`;

    const result = await resend.emails.send({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      lead.email,
      subject: lead.email_subject,
      html,
      text:    lead.email_draft,
    });

    if (result.error) throw new Error(result.error.message);

    await supabase.from('leads').update({
      email_sent:    true,
      email_sent_at: new Date().toISOString(),
      resend_id:     result.data?.id,
      status:        'sent',
    }).eq('id', id);

    res.json({ ok: true, resendId: result.data?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/audit — on-demand single website audit ──────────
// No Supabase write. Returns full audit result immediately.
// Used by the dashboard "AUDIT A WEBSITE" manual feature.

app.post('/api/audit', async (req, res) => {
  const { businessName, website, city } = req.body || {};
  if (!website) return res.status(400).json({ error: 'website is required' });

  try {
    const audit   = await auditWebsite(website.trim(), (businessName || '').trim(), (city || '').trim());
    const score   = scoreAudit(audit);
    const tierRec = recommendTier(score);
    const missing = missingTools(audit);
    res.json({ audit, score, tier: tierRec.tier, price: tierRec.price, tierLabel: tierRec.label, missing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── JSON error handler — must be last middleware ───────────────
// Express 5 auto-forwards async errors to next(err). Without this,
// the default error handler sends HTML, which breaks JSON clients.

app.use((err, req, res, _next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀  Von Solutions API running on http://localhost:${PORT}\n`);
});
