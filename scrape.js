/**
 * scrape.js — Von Solutions Lead Scraper
 * Searches roofing, HVAC, and auto dealers in Tampa Bay
 * via Google Places API, deduplicates, and inserts into Supabase.
 *
 * Usage: npm run scrape
 */

require('dotenv').config({ override: true });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ── Search targets ─────────────────────────────────────────────
const SEARCHES = [
  { query: 'roofing company Tampa Bay Florida',              vertical: 'Roofing'             },
  { query: 'HVAC contractor Tampa Bay Florida',              vertical: 'HVAC'                },
  { query: 'auto dealer Tampa Bay Florida',                  vertical: 'Auto Dealer'         },
  { query: 'plumbing company Tampa Bay Florida',             vertical: 'Plumbing'            },
  { query: 'home services contractor Tampa Florida',         vertical: 'Home Services'       },
  { query: 'electrician Tampa Bay Florida',                  vertical: 'Electrical'          },
  { query: 'landscaping company Tampa Bay Florida',          vertical: 'Landscaping'         },
  { query: 'pest control company Tampa Bay Florida',         vertical: 'Pest Control'        },
  { query: 'general contractor Tampa Bay Florida',           vertical: 'General Contractor'  },
  { query: 'window and door company Tampa Bay Florida',      vertical: 'Windows & Doors'     },
  { query: 'pool service company Tampa Bay Florida',         vertical: 'Pool Service'        },
];

// ── Helpers ────────────────────────────────────────────────────

async function textSearch(query, pageToken = null) {
  const params = new URLSearchParams({
    query,
    key: PLACES_KEY,
    type: 'establishment',
  });
  if (pageToken) params.set('pagetoken', pageToken);

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Places TextSearch HTTP ${res.status}`);
  return res.json();
}

async function placeDetails(placeId) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_phone_number,formatted_address,website,business_status',
    key: PLACES_KEY,
  });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Places Details HTTP ${res.status}`);
  const data = await res.json();
  return data.result || {};
}

function extractCity(address = '') {
  // "123 Main St, Tampa, FL 33601, USA" → "Tampa"
  const parts = address.split(',').map(s => s.trim());
  // City is usually the 2nd-to-last segment before state+zip
  if (parts.length >= 3) return parts[parts.length - 3];
  return parts[0] || '';
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Fetch all pages for one search query (max 3 pages = 60 results) ──
async function fetchAllPages(query, vertical) {
  const results = [];
  let pageToken  = null;
  let page       = 0;

  do {
    if (page > 0) await sleep(2100); // Google requires a short delay before using next_page_token
    const data = await textSearch(query, pageToken);

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn(`  ⚠  Places API status: ${data.status} — ${data.error_message || ''}`);
      break;
    }

    for (const place of (data.results || [])) {
      results.push({ placeId: place.place_id, name: place.name, vertical });
    }

    pageToken = data.next_page_token || null;
    page++;
  } while (pageToken && page < 3);

  return results;
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('🔍  Von Solutions — Lead Scraper starting…\n');

  // 1. Load existing place IDs to deduplicate (we store place_id in business_name for now
  //    — a cleaner approach uses a separate unique column; see note below)
  const { data: existing } = await supabase
    .from('leads')
    .select('phone');

  const existingPhones = new Set((existing || []).map(r => r.phone).filter(Boolean));
  console.log(`  ℹ  ${existingPhones.size} existing leads loaded for deduplication\n`);

  // 2. Scrape all search targets
  const rawLeads = [];
  for (const { query, vertical } of SEARCHES) {
    console.log(`  🔎  Searching: "${query}"`);
    try {
      const hits = await fetchAllPages(query, vertical);
      console.log(`      → ${hits.length} places found`);
      rawLeads.push(...hits);
    } catch (err) {
      console.error(`      ✗ Error: ${err.message}`);
    }
    await sleep(500);
  }

  // Deduplicate by place_id across search queries
  const uniqueByPlaceId = [...new Map(rawLeads.map(l => [l.placeId, l])).values()];
  console.log(`\n  📋  ${uniqueByPlaceId.length} unique places found across all searches`);

  // 3. Enrich each lead with place details and insert
  let inserted = 0;
  let skipped  = 0;

  for (const lead of uniqueByPlaceId) {
    try {
      await sleep(120); // stay under Places API rate limits
      const detail = await placeDetails(lead.placeId);

      if (detail.business_status === 'CLOSED_PERMANENTLY') {
        skipped++;
        continue;
      }

      const phone = detail.formatted_phone_number || null;
      const city  = extractCity(detail.formatted_address || '');

      // Skip if phone already in DB
      if (phone && existingPhones.has(phone)) {
        skipped++;
        continue;
      }

      const row = {
        business_name: detail.name || lead.name,
        owner_name:    null,          // Places API doesn't expose owner name
        email:         null,          // Places API doesn't expose email
        phone,
        city,
        vertical:      lead.vertical,
        status:        'new',
      };

      const { error } = await supabase.from('leads').insert(row);
      if (error) {
        console.error(`  ✗  Insert failed for "${row.business_name}": ${error.message}`);
        skipped++;
      } else {
        if (phone) existingPhones.add(phone); // prevent duplicates within this run
        inserted++;
        console.log(`  ✅  ${row.business_name} (${city}) — ${row.vertical}`);
      }
    } catch (err) {
      console.error(`  ✗  Details fetch failed for place ${lead.placeId}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Inserted : ${inserted}
  ⏭  Skipped  : ${skipped}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠  NOTE: Google Places API does not return email addresses.
   Add emails manually in Supabase, or run a separate
   enrichment step (e.g. Hunter.io / Apollo) before sending.
`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
