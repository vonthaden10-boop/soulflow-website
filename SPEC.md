# VON SOLUTIONS — BUILD SPEC

Full implementation spec for the automated outbound pipeline.

---

## STEP 1 — BUILD `audit.js`

Create `C:\Users\corwi\my-agency\audit.js`

This module accepts a business website URL and returns a structured audit object.

### What to check (via HTTP fetch + HTML parsing of the business website):

```js
{
  metaPixel: bool,           // fbq or facebook pixel script detected
  metaAds: bool,             // check Facebook Ad Library URL: https://www.facebook.com/ads/library/?search_type=page&q={businessName}
  googleAnalytics: bool,     // gtag.js or analytics.js detected
  googleTagManager: bool,    // GTM script detected
  bookingWidget: bool,       // Calendly, Cal.com, Acuity, BookingKoala detected
  chatWidget: bool,          // Intercom, Drift, Tidio, Podium, LiveChat detected
  aiReceptionist: bool,      // Retell AI, VAPI, Bland AI scripts detected
  crmAutomation: bool,       // GoHighLevel, HubSpot, ActiveCampaign detected
  emailAutomation: bool,     // Mailchimp, Klaviyo, ActiveCampaign detected
  socialLinks: bool,         // Facebook, Instagram links detected in HTML
  manyChat: bool,            // ManyChat script detected
}
```

### Scoring:
- Each missing tool = points toward opportunity score
- Score = (missing count / total checks) * 100
- Round to integer

### Tier recommendation logic:
- Score 75–100 → GROW ($2,500/mo) — they have almost nothing, full package
- Score 40–74 → ANSWER+ ($1,200/mo) — partial automation, needs voice + more
- Score 0–39 → ANSWER ($500/mo) — already somewhat automated, entry point

### Export:
```js
module.exports = { auditWebsite, scoreAudit, recommendTier }
```

---

## STEP 2 — PLUG AUDIT INTO `email.js`

Before Claude generates the personalized email:

1. Call `auditWebsite(lead.website)`
2. Build a `missingTools` array from audit results
3. Inject into the Claude prompt like this:

```
This business is missing: [AI receptionist, Meta ads, online booking].
Write a cold email referencing exactly what they're missing and how Von Solutions fixes it.
```

The email must feel like Jacob researched them personally. Not generic. Not robotic.

---

## STEP 3 — BUILD `pipeline.js`

Master runner that orchestrates the full flow for each lead.

```js
for each lead in leads:
  1. SCRAPE    — pull from Supabase `leads` table where status = 'new'
  2. AUDIT     — run auditWebsite(lead.website), store audit JSON on lead row
  3. PERSONALIZE — call Claude API with lead + audit context, store email draft
  4. SEND      — send via Resend, log send timestamp + message ID
  5. LOG       — update Supabase row: status = 'sent', audit, email, sent_at, resend_id
```

### Supabase `leads` table schema (create if not exists):
```sql
id uuid primary key default gen_random_uuid(),
name text,
website text,
phone text,
email text,
vertical text,
city text,
status text default 'new',         -- new | audited | personalized | sent | replied
audit jsonb,
email_draft text,
email_subject text,
sent_at timestamptz,
resend_id text,
score integer,
recommended_tier text,
client_id text default 'von-solutions', -- multi-tenant ready from day one
created_at timestamptz default now()
```

---

## STEP 4 — BUILD THE DASHBOARD

Create `/dashboard` folder inside `my-agency`. React + Vite app.

See `.claude/skills/dashboard-design.md` for full design system and component specs.

### API server:
Add `server.js` — simple Express app:
- `POST /api/run` → triggers pipeline.js
- `GET /api/leads` → returns all leads from Supabase
- `GET /api/stats` → returns today's stats

---

## STEP 5 — DEPLOY

### Dashboard → Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Set env vars in Netlify dashboard (same as .env)
- Dashboard calls the Express API — host API on Railway or Render (free tier)

### Pipeline → run locally or schedule
- `npm run pipeline` executes one full cycle
- Add to cron or Windows Task Scheduler for daily automated runs

---

## FILE STRUCTURE (end state)
```
my-agency/
├── .env                    # never commit
├── package.json
├── scrape.js               # existing — Google Places scraper
├── audit.js                # NEW — website audit engine
├── email.js                # MODIFIED — audit-aware email generator
├── pipeline.js             # NEW — master orchestrator
├── server.js               # NEW — Express API for dashboard
├── dashboard/              # NEW — React + Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── PipelineBoard.jsx
│   │   │   ├── LeadCard.jsx
│   │   │   ├── AuditPanel.jsx
│   │   │   ├── EmailPreview.jsx
│   │   │   └── StatsBar.jsx
│   │   └── main.jsx
│   └── vite.config.js
└── roofing-ai-receptionist/ # existing subproject
```
