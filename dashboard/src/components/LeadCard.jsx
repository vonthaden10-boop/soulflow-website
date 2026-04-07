import { useState } from 'react'
import AuditPanel from './AuditPanel.jsx'
import EmailPreview from './EmailPreview.jsx'

const TIER_COLORS = {
  GROW:      '#27ae60',
  'ANSWER+': '#c9a84c',
  ANSWER:    '#4a9eff',
}

export default function LeadCard({ lead, accentColor, expanded, onToggle, onSend }) {
  const [hovered, setHovered] = useState(false)
  const tierColor = TIER_COLORS[lead.recommended_tier] || 'var(--white-mute)'
  const score = lead.score ?? null

  const scoreColor = score === null ? 'var(--white-mute)'
    : score >= 75 ? '#27ae60'
    : score >= 40 ? '#c9a84c'
    : '#4a9eff'

  const borderColor = expanded
    ? accentColor
    : hovered
    ? `${accentColor}55`
    : 'var(--border)'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: expanded ? 'var(--card)' : 'var(--surface2)',
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        boxShadow: expanded
          ? `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}33`
          : hovered
          ? `0 2px 12px rgba(0,0,0,0.4)`
          : 'none',
        position: 'relative',
      }}
    >
      {/* Gold left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
        background: expanded ? accentColor : hovered ? `${accentColor}66` : 'transparent',
        transition: 'background 0.15s',
      }} />

      {/* Card header */}
      <div onClick={onToggle} style={{ padding: '9px 11px 9px 13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          <div style={{
            fontWeight: 600, fontSize: 12,
            color: hovered || expanded ? 'var(--white)' : '#ccc8c0',
            lineHeight: 1.3, flex: 1,
            transition: 'color 0.15s',
          }}>
            {lead.business_name}
          </div>
          {score !== null && (
            <span style={{
              background: `${scoreColor}18`,
              color: scoreColor,
              border: `1px solid ${scoreColor}44`,
              borderRadius: 3,
              padding: '0px 5px',
              fontSize: 10, fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {score}
            </span>
          )}
        </div>

        <div style={{ marginTop: 4, display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: 'var(--white-mute)', fontSize: 10 }}>{lead.vertical}</span>
          {lead.city && (
            <span style={{ color: 'var(--white-mute)', fontSize: 10, opacity: 0.6 }}>
              · {lead.city}
            </span>
          )}
          {lead.recommended_tier && (
            <span style={{
              background: `${tierColor}15`,
              color: tierColor,
              border: `1px solid ${tierColor}33`,
              borderRadius: 3, padding: '0px 4px',
              fontSize: 9, fontWeight: 700,
              fontFamily: 'var(--font-mono)', letterSpacing: 0.5,
            }}>
              {lead.recommended_tier}
            </span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            borderTop: `1px solid var(--border)`,
            padding: '11px 13px',
          }}
          onClick={e => e.stopPropagation()}
        >
          {lead.audit && (
            <AuditPanel audit={lead.audit} score={lead.score} tier={lead.recommended_tier} />
          )}
          {lead.email_draft && (
            <EmailPreview
              subject={lead.email_subject}
              body={lead.email_draft}
              canSend={lead.status === 'personalized' && !!lead.email}
              onSend={() => onSend(lead.id)}
            />
          )}
        </div>
      )}
    </div>
  )
}
