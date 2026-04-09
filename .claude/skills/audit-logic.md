# Audit Logic — `audit.js`

## What to Detect
Fetch the business website HTML and check for presence of:

| Field | Detection signal |
|---|---|
| `metaPixel` | `fbq` or Facebook pixel script |
| `metaAds` | Facebook Ad Library: `https://www.facebook.com/ads/library/?search_type=page&q={businessName}` |
| `googleAnalytics` | `gtag.js` or `analytics.js` |
| `googleTagManager` | GTM script |
| `bookingWidget` | Calendly, Cal.com, Acuity, BookingKoala |
| `chatWidget` | Intercom, Drift, Tidio, Podium, LiveChat |
| `aiReceptionist` | Retell AI, VAPI, Bland AI scripts |
| `crmAutomation` | GoHighLevel, HubSpot, ActiveCampaign |
| `emailAutomation` | Mailchimp, Klaviyo, ActiveCampaign |
| `socialLinks` | Facebook or Instagram links in HTML |
| `manyChat` | ManyChat script |

## Scoring
```
score = Math.round((missingCount / totalChecks) * 100)
```
Higher score = more opportunity (more missing).

## Tier Recommendation

| Score | Tier | Price |
|---|---|---|
| 75–100 | GROW | $2,500/mo |
| 40–74 | ANSWER+ | $1,200/mo |
| 0–39 | ANSWER | $500/mo |

## Module Export
```js
module.exports = { auditWebsite, scoreAudit, recommendTier }
```
