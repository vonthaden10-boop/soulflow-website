# Dashboard Design System

## Aesthetic
Dark mode command center. Think NASA ops room meets startup war room.

## Typography
- Headers: monospace
- Body: clean sans-serif

## Colors
| Token | Hex | Use |
|---|---|---|
| Background | `#0a0a0f` | Page/card backgrounds |
| Accent | `#3b82f6` | Electric blue — primary actions, highlights |
| Success | `#10b981` | Detected tools, sent status, positive states |
| Warning | `#f59e0b` | In-progress, amber tier badges |
| Danger | `red` | Missing tools, error states |

**No gradients on text. No purple. No generic SaaS look.**

---

## Views

### 1. Pipeline Board (main view)
- Five columns: SCRAPED | AUDITED | PERSONALIZED | SENT | LOGGED
- Each lead is a card that moves through columns
- Card shows: business name, vertical, city, score badge, recommended tier
- Click card → expands to show full audit breakdown + email draft

### 2. Audit Detail Panel
- Full checklist of what was detected vs missing
- Color coded: green = detected, red = missing
- Opportunity score displayed as a large number, color coded by tier
- Recommended tier + price shown prominently

### 3. Email Preview
- Subject line
- Full email body
- "Send" button → triggers Resend, updates Supabase status to 'sent'

### 4. Stats Bar (top of dashboard)
- Total leads scraped today
- Emails sent
- Open rate (if webhook data available)
- Pipeline value (sum of recommended tier prices)

### 5. Run Pipeline Button
- Positioned top right
- Label: `▶ RUN PIPELINE`
- Triggers `pipeline.js` via `POST /api/run`
- Shows live per-lead status updates as pipeline executes

---

## Components
```
dashboard/src/components/
├── PipelineBoard.jsx   # Kanban-style five-column board
├── LeadCard.jsx        # Card with score badge + tier, expandable
├── AuditPanel.jsx      # Checklist panel, green/red coded
├── EmailPreview.jsx    # Subject + body + Send button
└── StatsBar.jsx        # Top bar with today's metrics
```
