import { useState } from 'react'
import LeadCard from './LeadCard.jsx'

const COLUMNS = [
  { key: 'new',          label: 'SCRAPED',       color: '#4a6fa5', dot: '#4a9eff' },
  { key: 'audited',      label: 'AUDITED',        color: '#c9a84c', dot: '#c9a84c' },
  { key: 'personalized', label: 'PERSONALIZED',   color: '#9b7fe8', dot: '#9b7fe8' },
  { key: 'sent',         label: 'SENT',            color: '#27ae60', dot: '#27ae60' },
  { key: 'error',        label: 'ERROR',           color: '#c0392b', dot: '#c0392b' },
]

export default function PipelineBoard({ leads, onSend }) {
  const [expanded, setExpanded] = useState(null)

  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = leads.filter(l => l.status === col.key)
    return acc
  }, {})

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 0,
      flex: 1,
      minHeight: 'calc(100vh - 210px)',
      alignItems: 'start',
      borderTop: '1px solid var(--border)',
    }}>
      {COLUMNS.map((col, colIdx) => (
        <div
          key={col.key}
          style={{
            background: 'transparent',
            padding: '16px 10px',
            borderRight: colIdx < COLUMNS.length - 1 ? '1px solid var(--border)' : 'none',
            minHeight: '100%',
          }}
        >
          {/* Column header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
            paddingBottom: 10,
            borderBottom: `1px solid ${col.color}33`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {/* Accent dot */}
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: col.dot,
                display: 'inline-block',
                boxShadow: `0 0 6px ${col.dot}88`,
              }} />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14, letterSpacing: 3,
                color: col.color,
              }}>
                {col.label}
              </span>
            </div>
            {/* Count badge */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11, fontWeight: 700,
              color: col.color,
              background: `${col.color}18`,
              border: `1px solid ${col.color}33`,
              borderRadius: 3,
              padding: '1px 7px',
              minWidth: 24, textAlign: 'center',
            }}>
              {byStatus[col.key]?.length || 0}
            </span>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(byStatus[col.key] || []).map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                accentColor={col.color}
                expanded={expanded === lead.id}
                onToggle={() => setExpanded(expanded === lead.id ? null : lead.id)}
                onSend={onSend}
              />
            ))}
            {(byStatus[col.key] || []).length === 0 && (
              <div style={{
                color: 'var(--white-mute)', fontSize: 11,
                textAlign: 'center', padding: '32px 0',
                fontFamily: 'var(--font-mono)', letterSpacing: 1,
                opacity: 0.4,
              }}>
                — EMPTY —
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
