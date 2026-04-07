const TOOL_LABELS = {
  metaPixel:        'Meta Pixel',
  metaAds:          'Meta Ads',
  googleAnalytics:  'Google Analytics',
  googleTagManager: 'Tag Manager',
  bookingWidget:    'Booking Widget',
  chatWidget:       'Chat Widget',
  aiReceptionist:   'AI Receptionist',
  crmAutomation:    'CRM / Automation',
  emailAutomation:  'Email Automation',
  socialLinks:      'Social Links',
  manyChat:         'ManyChat',
  hasVideo:         'Video Content',
  siteIsModern:     'Modern Website',
  hasFreshContent:  'Fresh Content',
}

const TIER_INFO = {
  GROW:      { color: '#27ae60', price: '$2,500/mo', label: 'GROW' },
  'ANSWER+': { color: '#c9a84c', price: '$1,200/mo', label: 'ANSWER+' },
  ANSWER:    { color: '#4a9eff', price: '$500/mo',   label: 'ANSWER' },
}

const SOCIAL_SCORE_FLAGS  = ['hasFacebook', 'hasInstagram', 'hasGoogleBusiness', 'goodGoogleRating']
const INTEL_SCORED_FLAGS  = ['hasVideo', 'siteIsModern', 'hasFreshContent']

// ── Tiny label badge ────────────────────────────────────────────

function Badge({ text, color = '#6b6058' }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 7,
      letterSpacing: 1, textTransform: 'uppercase',
      background: `${color}18`, color,
      border: `1px solid ${color}44`,
      borderRadius: 2, padding: '1px 4px',
      marginLeft: 5, verticalAlign: 'middle',
      flexShrink: 0,
    }}>
      {text}
    </span>
  )
}

// ── Google star rating ──────────────────────────────────────────

function Stars({ rating }) {
  if (rating == null) return null
  const full  = Math.floor(rating)
  const half  = rating - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <span style={{ color: '#c9a84c', fontSize: 9, letterSpacing: 0.5 }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(empty)}
      <span style={{ color: 'var(--white-dim)', marginLeft: 3 }}>{rating.toFixed(1)}</span>
    </span>
  )
}

// ── Social row ──────────────────────────────────────────────────

function SocialRow({ label, present, detectedUrl, handle, note, manualCheck, children }) {
  const color = present ? '#27ae60' : '#c0392b'
  const bg    = present ? 'rgba(39,174,96,0.05)' : 'rgba(192,57,43,0.05)'

  return (
    <div style={{
      padding: '5px 7px', borderRadius: 3, background: bg, marginBottom: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 8, color, fontWeight: 900, flexShrink: 0 }}>
          {present ? '■' : '□'}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: present ? '#8a8070' : 'var(--white-dim)',
          letterSpacing: 0.3,
        }}>
          {label}
        </span>
        {present && handle && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'var(--gold)', letterSpacing: 0.2,
          }}>
            @{handle}
          </span>
        )}
        <Badge text="auto-detected" color={present ? '#27ae60' : '#6b6058'} />
        {manualCheck && <Badge text="manual check needed" color="#c9a84c" />}
      </div>
      {children && (
        <div style={{ paddingLeft: 13, marginTop: 3 }}>
          {children}
        </div>
      )}
      {note && (
        <div style={{
          paddingLeft: 13, marginTop: 2,
          fontFamily: 'var(--font-mono)', fontSize: 8,
          color: '#5a5248', letterSpacing: 0.2,
          fontStyle: 'italic',
        }}>
          {note}
        </div>
      )}
    </div>
  )
}

// ── Intelligence row ────────────────────────────────────────────

function IntelRow({ icon, label, value, missing, sub }) {
  const color = missing ? '#c0392b' : value ? 'var(--white-dim)' : '#5a5248'
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 6,
      padding: '3px 7px', borderRadius: 3,
      background: missing ? 'rgba(192,57,43,0.05)' : 'rgba(255,255,255,0.02)',
    }}>
      <span style={{ fontSize: 9, color: 'var(--white-mute)', flexShrink: 0, marginTop: 1, width: 12, textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: 1, color: '#5a5248', textTransform: 'uppercase' }}>
          {label}
        </span>
        {value && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color, marginLeft: 6, letterSpacing: 0.2 }}>
            {value}
          </span>
        )}
        {!value && missing && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#5a3028', marginLeft: 6, fontStyle: 'italic' }}>
            not detected
          </span>
        )}
        {sub && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#5a5248', marginTop: 1, letterSpacing: 0.2 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────

export default function AuditPanel({ audit, score, tier }) {
  const info = TIER_INFO[tier] || {}

  const toolMissing   = Object.keys(TOOL_LABELS).filter(k => !audit[k])
  const socialMissing = SOCIAL_SCORE_FLAGS.filter(k => Object.prototype.hasOwnProperty.call(audit, k) && !audit[k])
  const totalGaps     = toolMissing.length + socialMissing.length

  const fb = audit.social?.facebook
  const ig = audit.social?.instagram
  const gb = audit.social?.googleBusiness

  const gbMetrics = [
    gb?.reviewCount > 0  ? `${gb.reviewCount} reviews`         : null,
    gb?.photoCount  > 0  ? `${gb.photoCount} photos`           : null,
    gb?.respondingToReviews ? 'likely responding to reviews'   : null,
    gb?.recentReviewDate    ? `last review ${gb.recentReviewDate}` : null,
  ].filter(Boolean)

  return (
    <div style={{ marginBottom: 12 }}>

      {/* ── Score row ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '8px 10px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        marginBottom: 8,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 42, letterSpacing: -1, lineHeight: 1,
          color: score >= 75 ? '#27ae60' : score >= 40 ? '#c9a84c' : '#4a9eff',
        }}>
          {score ?? '—'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            letterSpacing: 2, color: 'var(--white-mute)',
            textTransform: 'uppercase', marginBottom: 4,
          }}>
            Opportunity Score
          </div>
          {tier && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                background: `${info.color}18`, color: info.color,
                border: `1px solid ${info.color}44`,
                borderRadius: 3, padding: '1px 6px',
                fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: 1,
              }}>
                {info.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: info.color, fontWeight: 700 }}>
                {info.price}
              </span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#c0392b', lineHeight: 1 }}>
            {totalGaps}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--white-mute)', letterSpacing: 1, textTransform: 'uppercase' }}>
            gaps
          </div>
        </div>
      </div>

      {/* ── Tool checklist ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 6px', marginBottom: 8 }}>
        {Object.entries(TOOL_LABELS).map(([key, label]) => {
          const on = !!audit[key]
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 6px', borderRadius: 3,
              background: on ? 'rgba(39,174,96,0.06)' : 'rgba(192,57,43,0.06)',
            }}>
              <span style={{ fontSize: 8, color: on ? '#27ae60' : '#c0392b', flexShrink: 0, fontWeight: 900 }}>
                {on ? '■' : '□'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 0.3, color: on ? '#6a7868' : 'var(--white-dim)' }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Business Intelligence section ── */}
      {audit.intelligence && (() => {
        const intel = audit.intelligence
        const yib   = intel.yearsInBusiness
        const sq    = intel.siteQuality
        const vid   = intel.video
        const fresh = intel.freshContent
        const sa    = intel.serviceArea
        const team  = intel.teamSize
        const rev   = intel.reviewMentions
        return (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 8,
              letterSpacing: 3, color: 'var(--white-mute)',
              textTransform: 'uppercase',
              marginBottom: 5, paddingBottom: 4,
              borderBottom: '1px solid var(--border)',
            }}>
              Business Intelligence
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 6px' }}>

              <IntelRow
                icon="📅"
                label="Est."
                value={yib?.found ? `${yib.year} (${yib.yearsAgo}y)` : null}
                missing={!yib?.found}
              />

              <IntelRow
                icon="📍"
                label="Address"
                value={intel.address?.found ? intel.address.raw : null}
                missing={!intel.address?.found}
              />

              <IntelRow
                icon="📞"
                label="Phone"
                value={intel.phone?.found ? intel.phone.raw : null}
                missing={!intel.phone?.found}
              />

              <IntelRow
                icon="🌐"
                label="Site"
                value={sq ? `${sq.isSSL ? 'SSL' : 'no SSL'} · ${sq.hasViewport ? 'mobile' : 'no mobile'} · ©${sq.copyrightYear ?? '?'}` : null}
                missing={sq && !sq.isModern}
              />

              <IntelRow
                icon="🎥"
                label="Video"
                value={vid?.found ? (vid.youtubeEmbeds > 0 ? `${vid.youtubeEmbeds} YT embed${vid.youtubeEmbeds > 1 ? 's' : ''}` : vid.hasVimeo ? 'Vimeo' : 'video tag') : null}
                missing={!vid?.found}
              />

              <IntelRow
                icon="📝"
                label="Content"
                value={fresh?.found ? `${fresh.latestYear}${fresh.hasBlog ? ' · has blog' : ''}` : null}
                missing={!fresh?.found}
                sub={fresh?.found && !fresh.hasBlog ? 'no blog detected' : null}
              />

              <IntelRow
                icon="👥"
                label="Team"
                value={team?.found ? team.signals[0] : null}
                missing={false}
              />

              <IntelRow
                icon="⭐"
                label="Reviews"
                value={rev?.count > 0 ? `${rev.count} mention${rev.count > 1 ? 's' : ''}${rev.hasTestimonialSection ? ' · has section' : ''}` : null}
                missing={false}
              />

            </div>
            {sa?.cities?.length > 0 && (
              <div style={{
                marginTop: 5, padding: '4px 7px', borderRadius: 3,
                background: 'rgba(255,255,255,0.02)',
                display: 'flex', alignItems: 'flex-start', gap: 6,
              }}>
                <span style={{ fontSize: 9, color: 'var(--white-mute)', flexShrink: 0, marginTop: 1 }}>🗺</span>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: 1, color: '#5a5248', textTransform: 'uppercase', marginRight: 6 }}>
                    Serves
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--white-dim)', letterSpacing: 0.2 }}>
                    {sa.cities.join(' · ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Social Media section ── */}
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 8,
          letterSpacing: 3, color: 'var(--white-mute)',
          textTransform: 'uppercase',
          marginBottom: 5, paddingBottom: 4,
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Social Media</span>
          {audit.social
            ? socialMissing.length > 0 && <span style={{ color: '#c0392b' }}>{socialMissing.length} gaps</span>
            : <span style={{ color: 'var(--white-mute)', letterSpacing: 1 }}>re-run pipeline to scan</span>
          }
        </div>

        {audit.social ? (
          <>
            {/* Facebook */}
            <SocialRow
              label="Facebook"
              present={!!fb?.present}
              handle={fb?.handle}
              manualCheck={fb?.present}
              note={fb?.present
                ? 'Follower count, post frequency: verify manually at facebook.com'
                : 'No Facebook link found on website'}
            />

            {/* Instagram */}
            <SocialRow
              label="Instagram"
              present={!!ig?.present}
              handle={ig?.handle}
              manualCheck={ig?.present}
              note={ig?.present
                ? 'Follower count, post frequency: verify manually at instagram.com'
                : 'No Instagram link found on website'}
            />

            {/* Google Business — authoritative via Places API */}
            <div style={{
              padding: '5px 7px', borderRadius: 3,
              background: gb?.present ? 'rgba(39,174,96,0.05)' : 'rgba(192,57,43,0.05)',
              marginBottom: 2,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 8, color: gb?.present ? '#27ae60' : '#c0392b', fontWeight: 900, flexShrink: 0 }}>
                  {gb?.present ? '■' : '□'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: gb?.present ? '#8a8070' : 'var(--white-dim)', letterSpacing: 0.3 }}>
                  Google Business
                </span>
                {gb?.present && gb?.rating != null && (
                  <span style={{ marginLeft: 2 }}><Stars rating={gb.rating} /></span>
                )}
                <Badge text="google places api" color="#4a9eff" />
              </div>
              {gb?.present && gbMetrics.length > 0 && (
                <div style={{
                  paddingLeft: 13, marginTop: 3,
                  fontFamily: 'var(--font-mono)', fontSize: 8,
                  color: 'var(--gold)', letterSpacing: 0.2,
                }}>
                  {gbMetrics.join(' · ')}
                </div>
              )}
              {!gb?.present && (
                <div style={{
                  paddingLeft: 13, marginTop: 2,
                  fontFamily: 'var(--font-mono)', fontSize: 8,
                  color: '#5a5248', fontStyle: 'italic',
                }}>
                  {gb?.error ? `Could not query: ${gb.error}` : 'Not found in Google Places'}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Leads audited before social scan was added */
          ['Facebook', 'Instagram', 'Google Business'].map(platform => (
            <div key={platform} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 6px', borderRadius: 3,
              background: 'rgba(255,255,255,0.02)', marginBottom: 2,
            }}>
              <span style={{ fontSize: 8, color: 'var(--white-mute)', flexShrink: 0 }}>◌</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--white-mute)', letterSpacing: 0.3 }}>
                {platform}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--border)', marginLeft: 4 }}>
                — not yet scanned
              </span>
            </div>
          ))
        )}
      </div>

      {audit.error && (
        <div style={{
          marginTop: 6, color: '#c0392b',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          padding: '4px 6px', background: 'rgba(192,57,43,0.08)', borderRadius: 3,
        }}>
          ⚠ {audit.error}
        </div>
      )}
    </div>
  )
}
