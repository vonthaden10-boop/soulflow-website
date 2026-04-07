# VON SOLUTIONS — CLAUDE CODE OPERATING MANUAL
# GSD MODE: No asking for permission. No explaining what you're about to do. Just build.

---

## STACK (LOCKED — DO NOT DEVIATE)
- **Backend:** Node.js, existing `scrape.js` + `email.js` in `C:\Users\corwi\my-agency`
- **AI:** Anthropic Claude API (already wired in `email.js`)
- **Database:** Supabase — `ocwpobikozdxwgabzsys.supabase.co`
- **Email:** Resend
- **Dashboard:** React + Vite, dark mode, deploy to Netlify
- **Environment:** All keys live in `.env` — never hardcode, never commit

---

## WHAT WE'RE BUILDING

A fully automated outbound pipeline:

**SCRAPE → AUDIT → PERSONALIZE → SEND → LOG**

Each step is a discrete module. Wire them together in a master `pipeline.js` runner.

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

### Email prompt rules (enforce these in the system prompt to Claude):
- Max 120 words
- Subject line included
- Reference their vertical and city
- Call out 2–3 specific missing tools by name
- Soft CTA: 15-minute call
- Sign off: Jacob, Von Solutions
- No buzzwords. No "I hope this email finds you well." No fluff.

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

### Design: Dark mode command center. Think NASA ops room meets startup war room.
- Font: monospace headers, clean sans body
- Colors: near-black background (#0a0a0f), electric blue accents (#3b82f6), green for success (#10b981), amber for in-progress (#f59e0b)
- No gradients on text. No purple. No generic SaaS look.

### Views to build:

#### 1. Pipeline Board (main view)
- Five columns: SCRAPED | AUDITED | PERSONALIZED | SENT | LOGGED
- Each lead is a card that moves through columns
- Card shows: business name, vertical, city, score badge, recommended tier
- Click card → expands to show full audit breakdown + email draft

#### 2. Audit Detail Panel
- Full checklist of what was detected vs missing
- Color coded: green = detected, red = missing
- Opportunity score (big number, color coded by tier)
- Recommended tier + price

#### 3. Email Preview
- Subject line
- Full email body
- "Send" button → triggers Resend, updates Supabase status

#### 4. Stats Bar (top of dashboard)
- Total leads scraped today
- Emails sent
- Open rate (if webhook data available)
- Pipeline value (sum of recommended tier prices)

#### 5. Run Pipeline Button
- Big button top right: "▶ RUN PIPELINE"
- Triggers `pipeline.js` via a simple Express endpoint (`/api/run`)
- Shows live status updates per lead as pipeline executes

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

---

## RULES FOR CLAUDE CODE
1. Never ask "should I proceed?" — just build
2. Never create placeholder comments like `// TODO` — implement it
3. Never use mock data in production files — real Supabase calls only
4. Always handle errors — wrap Supabase, Resend, and Claude calls in try/catch with meaningful logs
5. Always update lead status in Supabase at each pipeline stage — not just at the end
6. multi-tenant from day one — every row has `client_id`, default = 'von-solutions'
7. .env for all keys — SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY

---

## THIS IS JACOB'S BUSINESS — SHIP IT.
