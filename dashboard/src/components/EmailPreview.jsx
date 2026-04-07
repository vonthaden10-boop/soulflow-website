import { useState } from 'react'

const G = '#c9a84c'
const GB = '#e8c96a'

export default function EmailPreview({ subject, body, canSend, onSend }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!canSend || sending || sent) return
    setSending(true)
    try {
      await onSend()
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      overflow: 'hidden',
    }}>
      {/* Header bar */}
      <div style={{
        padding: '6px 10px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 8,
          letterSpacing: 2, color: 'var(--white-mute)',
          textTransform: 'uppercase',
        }}>
          Draft
        </span>
        <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 11,
          color: 'var(--white)', fontWeight: 500, flex: 1,
        }}>
          {subject}
        </span>
      </div>

      {/* Body */}
      <div style={{
        padding: '10px 12px',
        color: 'var(--white-dim)', fontSize: 11, lineHeight: 1.65,
        whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto',
        fontFamily: 'var(--font-body)',
      }}>
        {body}
      </div>

      {/* Send button */}
      {(canSend || sent) && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleSend}
            disabled={!canSend || sending || sent}
            style={{
              width: '100%',
              background: sent
                ? 'rgba(39,174,96,0.12)'
                : sending
                ? 'transparent'
                : `linear-gradient(135deg, ${G} 0%, ${GB} 100%)`,
              color: sent ? '#27ae60' : sending ? G : '#000',
              border: (sent || sending) ? `1px solid ${sent ? '#27ae60' : G}` : 'none',
              borderRadius: 3,
              padding: '7px 0',
              fontFamily: 'var(--font-display)',
              fontSize: 13, letterSpacing: 2,
              cursor: (canSend && !sending && !sent) ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: (!sent && !sending) ? `0 0 16px rgba(201,168,76,0.25)` : 'none',
            }}
          >
            {sent ? '✓  TRANSMITTED' : sending ? '⟳  SENDING' : '▶  TRANSMIT'}
          </button>
        </div>
      )}
    </div>
  )
}
