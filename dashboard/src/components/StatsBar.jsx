import { useEffect, useState, useRef } from 'react'

// Daily targets used to calculate fill %
const TARGETS = {
  scraped:  100,
  sent:     50,
  pipeline: 50000,
}

function AnimatedBar({ value, target, color, prefix = '', suffix = '', label, sublabel }) {
  const [width, setWidth] = useState(0)
  const pct = Math.min(100, Math.round((value / target) * 100)) || 0
  const prevValue = useRef(null)

  useEffect(() => {
    if (value === null || value === undefined) return
    // Trigger animation on every value change
    setWidth(0)
    const frame = requestAnimationFrame(() => {
      const t = setTimeout(() => setWidth(pct), 30)
      return () => clearTimeout(t)
    })
    prevValue.current = value
    return () => cancelAnimationFrame(frame)
  }, [value, pct])

  const displayVal = value == null ? '—'
    : prefix + value.toLocaleString() + suffix

  return (
    <div style={{ padding: '18px 24px 16px', borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
      {/* Background shimmer line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${color}44, transparent)`,
      }} />

      {/* Label */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9, letterSpacing: 2.5,
        color: 'var(--white-mute)',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {label}
      </div>

      {/* Value */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 34, letterSpacing: 1,
        color: value == null ? 'var(--white-mute)' : 'var(--white)',
        lineHeight: 1,
        marginBottom: 10,
      }}>
        {displayVal}
      </div>

      {/* Fill bar track */}
      <div style={{
        height: 3,
        background: 'var(--border)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 5,
      }}>
        <div style={{
          height: '100%',
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 2,
          transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>

      {/* Pct + sublabel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: color, letterSpacing: 1,
        }}>
          {value != null ? `${pct}%` : '—'}
        </span>
        {sublabel && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--white-mute)', letterSpacing: 1,
          }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}

export default function StatsBar({ stats }) {
  const isRunning = stats?.pipelineRunning

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr auto',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--gold-border)',
      marginBottom: 0,
    }}>
      <AnimatedBar
        label="Scraped Today"
        value={stats?.scrapedToday ?? null}
        target={TARGETS.scraped}
        color="#4a9eff"
        sublabel={`/ ${TARGETS.scraped} target`}
      />
      <AnimatedBar
        label="Emails Sent"
        value={stats?.sentToday ?? null}
        target={TARGETS.sent}
        color="#c9a84c"
        sublabel={`/ ${TARGETS.sent} target`}
      />
      <AnimatedBar
        label="Pipeline Value"
        value={stats?.pipelineValue ?? null}
        target={TARGETS.pipeline}
        color="#27ae60"
        prefix="$"
        suffix="/mo"
        sublabel={`/ $${TARGETS.pipeline.toLocaleString()} target`}
      />

      {/* Status tile */}
      <div style={{
        padding: '18px 28px 16px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minWidth: 140,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9, letterSpacing: 2.5,
          color: 'var(--white-mute)',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          System
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28, letterSpacing: 2,
          color: isRunning ? '#27ae60' : 'var(--white-mute)',
          lineHeight: 1,
          marginBottom: 10,
          animation: isRunning ? 'pulse-gold 1.5s ease-in-out infinite' : 'none',
        }}>
          {isRunning ? 'LIVE' : 'IDLE'}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isRunning ? '#27ae60' : 'var(--gold-dim)',
            display: 'inline-block',
            boxShadow: isRunning ? '0 0 8px #27ae60' : 'none',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: isRunning ? '#27ae60' : 'var(--white-mute)',
            letterSpacing: 1.5, textTransform: 'uppercase',
          }}>
            {isRunning ? 'EXECUTING' : 'STANDBY'}
          </span>
        </div>
      </div>
    </div>
  )
}
