/**
 * audit.js — Von Solutions Website Audit Engine
 *
 * Auto-detected (reliable):
 *   10 tool pattern checks + metaAds + hasFacebook + hasInstagram
 *   + hasGoogleBusiness + goodGoogleRating = 15 total scored checks
 *
 * Requires manual verification:
 *   Facebook follower count, Instagram follower count
 *
 * Usage:
 *   const { auditWebsite, scoreAudit, recommendTier, missingTools } = require('./audit');
 */

'use strict';

// ── Tool detection patterns ────────────────────────────────────

const CHECKS = {
  metaPixel: {
    label: 'Meta Pixel',
    patterns: [/fbq\s*\(/, /facebook\.net\/en_US\/fbevents/, /connect\.facebook\.net/],
  },
  googleAnalytics: {
    label: 'Google Analytics',
    patterns: [/gtag\.js/, /analytics\.js/, /googletagmanager\.com\/gtag/, /UA-\d{6,}-\d/],
  },
  googleTagManager: {
    label: 'Google Tag Manager',
    patterns: [/googletagmanager\.com\/ns\.html/, /GTM-[A-Z0-9]+/],
  },
  bookingWidget: {
    label: 'Booking Widget',
    // Platform embeds
    patterns: [
      /calendly\.com/, /cal\.com/, /acuityscheduling\.com/, /bookingkoala\.com/,
      // Home services platforms
      /scheduleengine\.net/, /servicetitan\.com/, /housecallpro\.com/,
      /getjobber\.com/, /jobber\.com/,
      // Text-based: buttons/links with booking intent
      /(?:href|onclick|class|id)[^>]*(?:book|schedul|appointment)/i,
      />\s*(?:book\s+(?:now|online|an?\s+appointment)|schedule\s+(?:now|an?\s+appointment|service|visit|a\s+call)|request\s+(?:an?\s+)?appointment)\s*</i,
    ],
  },
  chatWidget: {
    label: 'Chat Widget',
    patterns: [
      /intercom\.io/, /drift\.com/, /tidio\.co/, /podium\.com/, /livechat\.com/,
      /tawk\.to/, /crisp\.chat/, /freshchat\.com/, /reamaze\.com/, /olark\.com/,
      /smartsupp\.com/, /zendesk\.com\/embeddable_framework/,
      // ServiceTitan / ScheduleEngine chat widget
      /webchat\.scheduleengine\.net/, /se_chat_enable/,
      // Text-based: common chat CTA labels
      />\s*(?:chat\s+with\s+us|live\s*chat|start\s+(?:a\s+)?chat|chat\s+now)\s*</i,
      // Common chat widget class/id patterns
      /(?:class|id)="[^"]*(?:chat-?(?:widget|button|launcher|bubble)|live-?chat)[^"]*"/i,
    ],
  },
  aiReceptionist: {
    label: 'AI Receptionist',
    patterns: [/retellai\.com/, /vapi\.ai/, /bland\.ai/],
  },
  crmAutomation: {
    label: 'CRM / Automation',
    patterns: [/gohighlevel\.com/, /leadconnectorhq\.com/, /hubspot\.com/, /activecampaign\.com/],
  },
  emailAutomation: {
    label: 'Email Automation',
    patterns: [/mailchimp\.com/, /klaviyo\.com/, /activecampaign\.com/],
  },
  socialLinks: {
    label: 'Social Links',
    patterns: [/facebook\.com\/(?!(?:ads|sharer|share|dialog|login|groups|watch|marketplace)\/)/, /instagram\.com\//],
  },
  manyChat: {
    label: 'ManyChat',
    patterns: [/manychat\.com/, /widget\.manychat\.com/],
  },
};

// 10 pattern checks + metaAds + hasFacebook + hasInstagram
// + hasGoogleBusiness + goodGoogleRating = 15 tool/social checks
// + hasVideo + siteIsModern + hasFreshContent = 18 total
const TOTAL_CHECKS = Object.keys(CHECKS).length + 8;

// ── Text extraction helper ─────────────────────────────────────

function plainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Fetch helper ───────────────────────────────────────────────

async function fetchHtml(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// Try https:// first, fall back to http:// if connection fails.
async function fetchWebsite(rawUrl) {
  const httpsUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  try {
    const html = await fetchHtml(httpsUrl);
    return { html, url: httpsUrl };
  } catch (httpsErr) {
    // Only fall back to http:// on connection/TLS errors, not HTTP 4xx/5xx
    const isConnErr = /ECONNREFUSED|ENOTFOUND|ECONNRESET|certificate|SSL|TLS|abort/i.test(httpsErr.message);
    if (!isConnErr) throw httpsErr;   // e.g. HTTP 404 — don't retry

    const httpUrl = httpsUrl.replace(/^https:\/\//i, 'http://');
    console.log(`[AUDIT]   https failed (${httpsErr.message}), retrying http…`);
    const html = await fetchHtml(httpUrl);
    return { html, url: httpUrl };
  }
}

// ── Social: detect Facebook / Instagram links in HTML ─────────
// No scraping — presence detection only.
// Follower counts require manual verification.

function detectFacebook(html) {
  const match = html.match(
    /https?:\/\/(?:www\.)?facebook\.com\/(?!ads\/|sharer\/|share\/|dialog\/|login\/|groups\/|watch\/|marketplace\/)([A-Za-z0-9._%-]{3,})/
  );
  if (!match) return { present: false, url: null, handle: null };
  return { present: true, url: match[0], handle: match[1].replace(/\/$/, '') };
}

function detectInstagram(html) {
  const match = html.match(
    /https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|explore\/|reel\/|accounts\/|stories\/)([A-Za-z0-9._]{1,30})/
  );
  if (!match) return { present: false, url: null, handle: null };
  return { present: true, url: match[0], handle: match[1].replace(/\/$/, '') };
}

// ── Social: Google Business via Places API ────────────────────

async function fetchGoogleBusiness(businessName, city) {
  const result = {
    present: false, placeId: null,
    rating: null, reviewCount: 0, photoCount: 0,
    respondingToReviews: false, recentReviewDate: null,
    source: 'google_places_api', error: null,
  };
  try {
    const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
    if (!PLACES_KEY) {
      result.error = 'GOOGLE_PLACES_API_KEY not set';
      return result;
    }

    const query = city ? `${businessName} ${city}` : businessName;
    console.log(`[AUDIT]   Google Business: searching "${query}"…`);

    const searchData = JSON.parse(
      await fetchHtml(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${PLACES_KEY}`,
        8000
      )
    );

    if (searchData.status !== 'OK' || !searchData.results?.length) {
      console.log(`[AUDIT]   Google Business: not found (${searchData.status})`);
      return result;
    }

    result.present = true;
    result.placeId = searchData.results[0].place_id;
    console.log(`[AUDIT]   Google Business: found (${searchData.results[0].name})`);

    const detailData = JSON.parse(
      await fetchHtml(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${result.placeId}&fields=rating,user_ratings_total,reviews,photos&key=${PLACES_KEY}`,
        8000
      )
    );

    if (detailData.status !== 'OK') {
      result.error = `Places Details: ${detailData.status}`;
      return result;
    }

    const d = detailData.result || {};
    result.rating      = d.rating            ?? null;
    result.reviewCount = d.user_ratings_total ?? 0;
    result.photoCount  = (d.photos || []).length;
    result.respondingToReviews = (result.rating >= 4.0) && (result.reviewCount >= 10);

    if (d.reviews?.length) {
      const latest = Math.max(...d.reviews.map(r => r.time || 0));
      if (latest > 0) result.recentReviewDate = new Date(latest * 1000).toISOString().slice(0, 10);
    }

    console.log(`[AUDIT]   Google Business: ${result.rating}★, ${result.reviewCount} reviews, ${result.photoCount} photos`);
  } catch (err) {
    result.error = err.message;
    console.error(`[AUDIT]   Google Business error: ${err.message}`);
  }
  return result;
}

// ── Business intelligence helpers (synchronous, run on fetched HTML) ──

function detectYearsInBusiness(text) {
  // "since YYYY" / "founded YYYY" / "established YYYY"
  let m = text.match(/(?:since|founded(?:\s+in)?|established(?:\s+in)?)\s+(1[89]\d{2}|20[012]\d)/i);
  if (m) {
    const year = parseInt(m[1]);
    return { found: true, year, yearsAgo: new Date().getFullYear() - year, rawText: m[0].trim() };
  }
  // "X+ years of experience / in business / serving"
  m = text.match(/(\d{1,2})\+?\s+years?\s+(?:of\s+)?(?:experience|in\s+(?:the\s+)?(?:business|industry)|serving)/i);
  if (m) {
    const years = parseInt(m[1]);
    return { found: true, year: new Date().getFullYear() - years, yearsAgo: years, rawText: m[0].trim() };
  }
  return { found: false, year: null, yearsAgo: null, rawText: null };
}

function detectAddress(text) {
  // Match: 2–6 digit number + 1–4 word street name + street type
  // Capped at 4 words to avoid matching navigation text
  const m = text.match(
    /\b\d{2,6}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z]?[a-zA-Z]+){0,3}\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Circle|Cir|Highway|Hwy)\.?(?:\s+(?:Suite|Ste|Unit|Apt|#)\s*[\w-]+)?\b/i
  );
  if (m) return { found: true, raw: m[0].replace(/\s+/g, ' ').trim() };
  return { found: false, raw: null };
}

function detectPhone(text) {
  const m = text.match(/(?:\+1[\s.-]?)?\(?(\d{3})\)?[\s.-](\d{3})[\s.-](\d{4})/);
  if (m) return { found: true, raw: m[0].trim() };
  return { found: false, raw: null };
}

function assessSiteQuality(html, url) {
  const hasViewport    = /<meta[^>]+name=["']viewport["']/i.test(html);
  const isSSL          = /^https:\/\//i.test(url);
  const copyrightMatch = html.match(/©\s*(?:copyright\s+)?(\d{4})|copyright\s+(?:©\s*)?(\d{4})/i);
  const copyrightYear  = copyrightMatch ? parseInt(copyrightMatch[1] || copyrightMatch[2]) : null;
  const currentYear    = new Date().getFullYear();
  const isModern       = hasViewport && isSSL && (copyrightYear == null || copyrightYear >= currentYear - 2);
  return { hasViewport, isSSL, copyrightYear, isModern };
}

function detectVideo(html) {
  const youtubeEmbeds = (html.match(/youtube\.com\/embed\//gi) || []).length;
  const hasVideoTag   = /<video[\s>]/i.test(html);
  const hasVimeo      = /player\.vimeo\.com\/video\//i.test(html);
  return { found: youtubeEmbeds > 0 || hasVideoTag || hasVimeo, youtubeEmbeds, hasVideoTag, hasVimeo };
}

function detectServiceArea(text) {
  const cities = new Set();
  // "serving Tampa, Clearwater, and St. Pete" style
  const rx = /\bserv(?:ing|es?|ed)\s+([A-Z][a-zA-Z\s,&/]{3,80}?)(?:\.|!|\?|$)/gm;
  let m;
  while ((m = rx.exec(text)) !== null) {
    m[1].split(/[,&/]|\band\b/i).forEach(part => {
      const city = part.trim().replace(/\s+/g, ' ');
      if (city.length >= 3 && city.length <= 40 && /^[A-Z]/.test(city)) cities.add(city);
    });
    if (cities.size >= 10) break;
  }
  return { cities: [...cities].slice(0, 8) };
}

function detectTeamSize(text) {
  const patterns = [
    /(\d{1,4})\+?\s+(?:employees|team\s+members|staff|workers)/i,
    /(\d{1,4})\+?\s+(?:licensed\s+)?(?:technicians|plumbers|electricians|contractors|professionals)/i,
    /(\d{1,3})\+?\s+service\s+(?:trucks|vans|vehicles)/i,
    /team\s+of\s+(\d{1,4})/i,
    /fleet\s+of\s+(\d{1,3})\s+(?:trucks|vehicles|vans)/i,
  ];
  const signals = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) signals.push(m[0].trim());
  }
  return { found: signals.length > 0, signals };
}

function countReviewMentions(html, text) {
  const reviewCount      = (text.match(/\breview[s]?\b/gi) || []).length;
  const testimonialCount = (text.match(/\btestimonial[s]?\b/gi) || []).length;
  const hasTestimonialSection =
    /(?:class|id)=["'][^"']*testimonial[s]?[^"']*["']/i.test(html) ||
    /<[^>]+(?:id|class)=["'][^"']*review[s]?[^"']*["']/i.test(html);
  return { count: reviewCount + testimonialCount, reviewCount, testimonialCount, hasTestimonialSection };
}

function detectFreshContent(html, text) {
  const currentYear = new Date().getFullYear();
  // Any mention of last year or this year
  const years = [...text.matchAll(/\b(20(?:1[5-9]|2[0-9]))\b/g)].map(m => parseInt(m[1]));
  const latestYear = years.length ? Math.max(...years) : null;
  // Blog/news presence in nav or heading text
  const navHtml   = html.match(/<(?:nav|header)[^>]*>[\s\S]*?<\/(?:nav|header)>/i)?.[0] || '';
  const hasBlog   = /\b(?:blog|news|articles?|updates?|resources?)\b/i.test(navHtml) ||
                    /\b(?:blog|news)\b/i.test(html.match(/<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>/gi)?.join(' ') || '');
  return {
    found: latestYear != null && latestYear >= currentYear - 1,
    latestYear,
    hasBlog,
  };
}

// ── Meta Ads check ─────────────────────────────────────────────

async function checkMetaAds(businessName) {
  try {
    const html = await fetchHtml(
      `https://www.facebook.com/ads/library/?search_type=page&q=${encodeURIComponent(businessName)}`,
      8000
    );
    return /\"ad_archive_id\"/.test(html) || /ad_count/.test(html);
  } catch {
    return false;
  }
}

// ── Core audit function ────────────────────────────────────────
//
// THROWS if the website cannot be fetched. Callers must handle.
// This prevents a failed fetch from being silently scored as 100/100.

async function auditWebsite(website, businessName = '', city = '') {
  if (!website) throw new Error('No website URL provided');

  console.log(`\n[AUDIT] ════════════════════════════════`);
  console.log(`[AUDIT] Business : ${businessName || '(unnamed)'}`);
  console.log(`[AUDIT] Website  : ${website}`);
  console.log(`[AUDIT] City     : ${city || '(none)'}`);
  console.log(`[AUDIT] ────────────────────────────────`);

  // ── Step 1: Fetch website HTML ─────────────────────────────
  // Throws on failure — do NOT catch here. A failed fetch must
  // be an error, not a silent 100/100 "all gaps" result.
  const { html, url: resolvedUrl } = await fetchWebsite(website);

  console.log(`[AUDIT] ✓ Fetched ${html.length.toLocaleString()} chars from ${resolvedUrl}`);

  if (html.length < 200) {
    console.warn(`[AUDIT] ⚠ Very short response — site may be redirecting to a login or JS-only page`);
  }

  // ── Step 2: Tool pattern checks ────────────────────────────
  console.log(`[AUDIT] ── Tool checks ──`);
  const result = { metaAds: false };

  for (const [key, { label, patterns }] of Object.entries(CHECKS)) {
    const detected = patterns.some(p => p.test(html));
    result[key] = detected;
    console.log(`[AUDIT]   ${detected ? '✓' : '✗'} ${label}`);
  }

  // ── Step 3: Intelligence extraction (synchronous, no network) ─
  console.log(`[AUDIT] ── Intelligence extraction ──`);
  const text = plainText(html);

  const yearsInfo    = detectYearsInBusiness(text);
  const addressInfo  = detectAddress(text);
  const phoneInfo    = detectPhone(text);
  const qualityInfo  = assessSiteQuality(html, resolvedUrl);
  const videoInfo    = detectVideo(html);
  const serviceArea  = detectServiceArea(text);
  const teamInfo     = detectTeamSize(text);
  const reviewInfo   = countReviewMentions(html, text);
  const freshInfo    = detectFreshContent(html, text);

  console.log(`[AUDIT]   ${yearsInfo.found   ? '✓' : '✗'} Years in business${yearsInfo.found ? ` (${yearsInfo.rawText})` : ''}`);
  console.log(`[AUDIT]   ${addressInfo.found ? '✓' : '✗'} Physical address`);
  console.log(`[AUDIT]   ${phoneInfo.found   ? '✓' : '✗'} Phone number`);
  console.log(`[AUDIT]   ${qualityInfo.isModern ? '✓' : '✗'} Modern site (viewport=${qualityInfo.hasViewport}, SSL=${qualityInfo.isSSL}, copyright=${qualityInfo.copyrightYear})`);
  console.log(`[AUDIT]   ${videoInfo.found   ? '✓' : '✗'} Video content (${videoInfo.youtubeEmbeds} YT embeds, videoTag=${videoInfo.hasVideoTag})`);
  console.log(`[AUDIT]   ${serviceArea.cities.length ? '✓' : '✗'} Service area${serviceArea.cities.length ? `: ${serviceArea.cities.join(', ')}` : ''}`);
  console.log(`[AUDIT]   ${teamInfo.found    ? '✓' : '✗'} Team size signals${teamInfo.found ? `: ${teamInfo.signals.join('; ')}` : ''}`);
  console.log(`[AUDIT]   Reviews/testimonials: ${reviewInfo.count} mentions`);
  console.log(`[AUDIT]   ${freshInfo.found   ? '✓' : '✗'} Fresh content (latest year: ${freshInfo.latestYear}, blog: ${freshInfo.hasBlog})`);

  // ── Step 4: Social link detection ─────────────────────────
  console.log(`[AUDIT] ── Social detection ──`);
  const fb = detectFacebook(html);
  const ig = detectInstagram(html);
  console.log(`[AUDIT]   ${fb.present ? '✓' : '✗'} Facebook${fb.handle ? ` (@${fb.handle})` : ''}`);
  console.log(`[AUDIT]   ${ig.present ? '✓' : '✗'} Instagram${ig.handle ? ` (@${ig.handle})` : ''}`);

  // ── Step 5: Network checks in parallel ────────────────────
  console.log(`[AUDIT] ── Network checks (parallel) ──`);
  const [metaAdsRes, gbRes] = await Promise.allSettled([
    businessName ? checkMetaAds(businessName) : Promise.resolve(false),
    businessName ? fetchGoogleBusiness(businessName, city) : Promise.resolve({ present: false, error: 'No businessName' }),
  ]);

  result.metaAds = metaAdsRes.status === 'fulfilled' ? metaAdsRes.value : false;
  const gb = gbRes.status === 'fulfilled' ? gbRes.value : { present: false, error: String(gbRes.reason) };
  console.log(`[AUDIT]   ${result.metaAds ? '✓' : '✗'} Meta Ads`);

  // ── Step 6: Derive scored flags ────────────────────────────
  result.hasFacebook       = fb.present;
  result.hasInstagram      = ig.present;
  result.hasGoogleBusiness = gb.present;
  result.goodGoogleRating  = gb.present && gb.rating != null && gb.rating >= 4.0 && gb.reviewCount >= 5;
  result.hasVideo          = videoInfo.found;
  result.siteIsModern      = qualityInfo.isModern;
  result.hasFreshContent   = freshInfo.found;

  // ── Step 7: Attach intelligence display objects ────────────
  result.intelligence = {
    yearsInBusiness: yearsInfo,
    address:         addressInfo,
    phone:           phoneInfo,
    siteQuality:     qualityInfo,
    video:           videoInfo,
    serviceArea,
    teamSize:        teamInfo,
    reviewMentions:  reviewInfo,
    freshContent:    freshInfo,
  };

  // ── Step 8: Attach social display object ──────────────────
  result.social = {
    facebook: {
      ...fb,
      followersVerified: false,
      note: fb.present
        ? 'Link detected. Follower count requires manual verification.'
        : 'No Facebook link found on website.',
    },
    instagram: {
      ...ig,
      followersVerified: false,
      note: ig.present
        ? 'Link detected. Follower count requires manual verification.'
        : 'No Instagram link found on website.',
    },
    googleBusiness: { ...gb },
  };

  // ── Summary ────────────────────────────────────────────────
  const score = scoreAudit(result);
  const { tier } = recommendTier(score);
  console.log(`[AUDIT] ── Result ──`);
  console.log(`[AUDIT]   Score : ${score}/100`);
  console.log(`[AUDIT]   Tier  : ${tier}`);
  console.log(`[AUDIT] ════════════════════════════════\n`);

  return result;
}

// ── Scoring ────────────────────────────────────────────────────

function scoreAudit(audit) {
  const keys = [
    'metaPixel', 'metaAds', 'googleAnalytics', 'googleTagManager',
    'bookingWidget', 'chatWidget', 'aiReceptionist', 'crmAutomation',
    'emailAutomation', 'socialLinks', 'manyChat',
    'hasFacebook', 'hasInstagram',
    'hasGoogleBusiness', 'goodGoogleRating',
    'hasVideo', 'siteIsModern', 'hasFreshContent',
  ];
  const missing = keys.filter(k => !audit[k]).length;
  return Math.round((missing / TOTAL_CHECKS) * 100);
}

// ── Tier recommendation ────────────────────────────────────────

function recommendTier(score) {
  if (score >= 75) return { tier: 'GROW',    price: 2500, label: 'GROW ($2,500/mo)' };
  if (score >= 40) return { tier: 'ANSWER+', price: 1200, label: 'ANSWER+ ($1,200/mo)' };
  return              { tier: 'ANSWER',   price: 500,  label: 'ANSWER ($500/mo)' };
}

// ── Human-readable missing tools (for Claude email prompt) ─────

function missingTools(audit) {
  const map = {
    metaPixel:        'Meta Pixel',
    metaAds:          'Meta Ads',
    googleAnalytics:  'Google Analytics',
    googleTagManager: 'Google Tag Manager',
    bookingWidget:    'online booking widget',
    chatWidget:       'live chat widget',
    aiReceptionist:   'AI receptionist',
    crmAutomation:    'CRM / automation platform',
    emailAutomation:  'email automation',
    socialLinks:      'social media links',
    manyChat:         'ManyChat',
    hasFacebook:      'Facebook presence',
    hasInstagram:     'Instagram presence',
    hasGoogleBusiness:'Google Business Profile',
    goodGoogleRating: 'strong Google rating (4.0+)',
    hasVideo:         'video content / YouTube presence',
    siteIsModern:     'modern mobile-friendly website',
    hasFreshContent:  'fresh website content',
  };
  return Object.entries(map)
    .filter(([k]) => !audit[k])
    .map(([, label]) => label);
}

module.exports = { auditWebsite, scoreAudit, recommendTier, missingTools };
