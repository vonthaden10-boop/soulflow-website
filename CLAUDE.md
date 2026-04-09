# VON SOLUTIONS — CLAUDE CODE OPERATING MANUAL
# GSD MODE: No asking for permission. No explaining what you're about to do. Just build.

---

## STACK (LOCKED)
- **Backend:** Node.js (scrape.js, email.js, audit.js, pipeline.js, server.js)
- **AI:** Anthropic Claude API
- **DB:** Supabase — `ocwpobikozdxwgabzsys.supabase.co`
- **Email:** Resend
- **Dashboard:** React + Vite → Netlify | API → Railway/Render
- **Env:** All keys in `.env` — never hardcode, never commit

---

## PROJECT
Automated outbound pipeline: **SCRAPE → AUDIT → PERSONALIZE → SEND → LOG**

Every Supabase row includes `client_id` (default: `'von-solutions'`) — multi-tenant from day one.

Full build spec in `SPEC.md`. Skills in `.claude/skills/`.

---

## RULES
1. No permission-asking. No pre-explaining. Build.
2. No `// TODO` comments — implement it or skip it.
3. No mock data — real Supabase calls only.
4. Wrap all external calls (Supabase, Resend, Claude) in try/catch with meaningful logs.
5. Update lead status in Supabase at each pipeline stage, not just at the end.
6. `.env` keys: `SUPABASE_URL`, `SUPABASE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`

---

## SELF-MAINTENANCE
- After every completed task, run: `git add -A && git commit -m "auto: [brief description]"`
- After every completed task, check if anything from the session belongs in a skill file or `SPEC.md`. If yes, move it automatically.
- Never let `CLAUDE.md` exceed 50 lines. Flag if approaching.
- After every session, output a one-line summary of what changed and why.
