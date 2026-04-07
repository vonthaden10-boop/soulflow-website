import { useState, useEffect, useCallback } from 'react'
import PipelineBoard from './components/PipelineBoard.jsx'
import ManualAuditModal from './components/ManualAuditModal.jsx'
import StatCard from './components/StatCard.jsx'
import VerticalChart from './components/VerticalChart.jsx'
import StageDonut from './components/StageDonut.jsx'

const API = import.meta.env.VITE_API_URL || ''
const G   = '#c9a84c'
const GB  = '#e8c96a'

// ── Helpers ────────────────────────────────────────────────────

function calcDelta(current, previous) {
  if (previous == null || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function formatMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

// ── Mode toggle ────────────────────────────────────────────────

function ModeToggle({ auditOnly, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!auditOnly)}
      title={auditOnly ? 'Click to enable full pipeline (emails will send)' : 'Click to restrict to audit only'}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '5px 11px',
        border: `1px solid ${auditOnly ? 'rgba(201,168,76,0.35)' : 'rgba(192,57,43,0.4)'}`,
        borderRadius: 4,
        background: auditOnly ? 'rgba(201,168,76,0.05)' : 'rgba(192,57,43,0.07)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none', transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: 30, height: 15, borderRadius: 8,
        background: auditOnly ? G : '#c0392b',
        position: 'relative', flexShrink: 0,
        boxShadow: `0 0 6px ${auditOnly ? 'rgba(201,168,76,0.4)' : 'rgba(192,57,43,0.4)'}`,
        transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: auditOnly ? 17 : 2,
          width: 11, height: 11, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: 12, letterSpacing: 1.5,
          color: auditOnly ? G : '#c0392b', lineHeight: 1,
        }}>
          {auditOnly ? 'AUDIT ONLY' : 'FULL PIPELINE'}
        </span>
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 7, letterSpacing: 0.5,
          color: '#4a4438', lineHeight: 1,
        }}>
          {auditOnly ? 'no emails will be sent' : 'emails WILL be sent'}
        </span>
      </div>
      <span style={{ fontSize: 11, opacity: 0.65, flexShrink: 0 }}>
        {auditOnly ? '🛡' : '⚠️'}
      </span>
    </div>
  )
}

// ── Section divider ────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 12,
    }}>
      <span style={{
        fontFamily: "'Courier New', monospace",
        fontSize: 7, letterSpacing: 3,
        color: '#3a3430', textTransform: 'uppercase',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(201,168,76,0.12), transparent)' }} />
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────

export default function App() {
  const [leads,          setLeads]          = useState([])
  const [stats,          setStats]          = useState(null)
  const [running,        setRunning]        = useState(false)
  const [log,            setLog]            = useState([])
  const [logOpen,        setLogOpen]        = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditOnly,      setAuditOnly]      = useState(true)

  const fetchLeads = useCallback(async () => {
    try {
      const data = await fetch(`${API}/api/leads`).then(r => r.json())
      setLeads(Array.isArray(data) ? data : [])
    } catch (err) { console.error('Failed to fetch leads:', err) }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const data = await fetch(`${API}/api/stats`).then(r => r.json())
      setStats(data)
    } catch (err) { console.error('Failed to fetch stats:', err) }
  }, [])

  useEffect(() => {
    fetchLeads(); fetchStats()
    const id = setInterval(() => { fetchLeads(); fetchStats() }, 15000)
    return () => clearInterval(id)
  }, [fetchLeads, fetchStats])

  const handleModeChange = (newAuditOnly) => {
    if (!newAuditOnly) {
      if (!window.confirm('Switch to FULL PIPELINE mode?\n\nThis will send real emails to leads.\n\nAre you sure?')) return
    }
    setAuditOnly(newAuditOnly)
  }

  const runPipeline = async () => {
    if (running) return
    setRunning(true); setLogOpen(true)
    setLog([{ ts: new Date().toISOString(), message: `${auditOnly ? 'AUDIT ONLY' : 'FULL PIPELINE'} INITIATED`, stage: 'SYS' }])
    try {
      const res     = await fetch(`${API}/api/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: auditOnly ? 'audit' : 'full' }),
      })
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data:'))) {
          try {
            const p = JSON.parse(line.slice(5))
            setLog(prev => [...prev, { ts: p.ts, message: p.message, stage: p.stage }])
            if (p.stage === 'PIPELINE' && p.message?.includes('complete')) { fetchLeads(); fetchStats() }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setLog(prev => [...prev, { ts: new Date().toISOString(), message: `FAULT: ${err.message}`, stage: 'ERR' }])
    } finally { setRunning(false) }
  }

  const sendLead = async (id) => {
    try {
      const data = await fetch(`${API}/api/leads/${id}/send`, { method: 'POST' }).then(r => r.json())
      if (data.ok) { fetchLeads(); fetchStats() }
      else alert(`Send failed: ${data.error}`)
    } catch (err) { alert(`Send failed: ${err.message}`) }
  }

  const stageColor = (stage) => ({
    SEND: '#27ae60', ERR: '#c0392b', SYS: G,
    AUDIT: '#4a9eff', PERSONALIZE: '#9b7fe8',
  }[stage] || '#5a5248')

  // ── Derived stat card values ───────────────────────────────
  const scrapedDelta = calcDelta(stats?.scrapedToday, stats?.scrapedYesterday)
  const sentDelta    = calcDelta(stats?.sentToday,    stats?.sentYesterday)

  const btnLabel = running ? '⟳ EXECUTING' : auditOnly ? '▶ RUN AUDIT' : '▶ RUN PIPELINE'

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 54,
        background: '#06060a',
        borderBottom: '1px solid rgba(201,168,76,0.12)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 0 rgba(201,168,76,0.06), 0 4px 20px rgba(0,0,0,0.4)',
      }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: 24, letterSpacing: 5, color: G, lineHeight: 1,
          }}>
            VON SOLUTIONS
          </span>
          <div style={{ width: 1, height: 18, background: 'rgba(201,168,76,0.2)' }} />
          <span style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 8, letterSpacing: 2.5,
            color: '#4a4438', textTransform: 'uppercase',
          }}>
            Pipeline Control
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Live dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: running ? '#27ae60' : '#2a2820',
              display: 'inline-block',
              animation: running ? 'pulse-gold 1s ease-in-out infinite' : 'none',
              boxShadow: running ? '0 0 6px #27ae60' : 'none',
            }} />
            <span style={{
              fontFamily: "'Courier New', monospace", fontSize: 8,
              letterSpacing: 2, color: running ? '#27ae60' : '#3a3430',
              textTransform: 'uppercase',
            }}>
              {running ? 'LIVE' : 'STANDBY'}
            </span>
          </div>

          <div style={{ width: 1, height: 16, background: '#1f1f28' }} />

          {/* Audit a Website */}
          <button
            onClick={() => setShowAuditModal(true)}
            style={{
              background: 'transparent',
              border: `1px solid rgba(201,168,76,0.3)`,
              color: G, borderRadius: 4,
              padding: '5px 13px',
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 12, letterSpacing: 1.5,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; e.currentTarget.style.boxShadow = `0 0 12px rgba(201,168,76,0.15)` }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}
          >
            + AUDIT A WEBSITE
          </button>

          {/* Log toggle */}
          {log.length > 0 && (
            <button
              onClick={() => setLogOpen(o => !o)}
              style={{
                background: 'transparent', border: '1px solid #1f1f28',
                color: '#4a4438', borderRadius: 4,
                padding: '4px 9px', fontSize: 9,
                fontFamily: "'Courier New', monospace", letterSpacing: 1,
                textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              {logOpen ? '▾' : '▸'} LOG ({log.length})
            </button>
          )}

          <ModeToggle auditOnly={auditOnly} onChange={handleModeChange} disabled={running} />

          {/* Run button */}
          <button
            onClick={runPipeline}
            disabled={running}
            style={{
              background: running
                ? 'transparent'
                : auditOnly
                ? `linear-gradient(135deg, ${G} 0%, ${GB} 100%)`
                : 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
              color: running ? G : '#000',
              border: running ? `1px solid ${G}` : 'none',
              borderRadius: 4, padding: '7px 20px',
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 14, letterSpacing: 2,
              cursor: running ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: running ? 'none' : auditOnly
                ? `0 0 18px rgba(201,168,76,0.25)`
                : `0 0 18px rgba(192,57,43,0.35)`,
            }}
          >
            {btnLabel}
          </button>
        </div>
      </header>

      {/* ── Pipeline log ── */}
      {logOpen && log.length > 0 && (
        <div style={{
          margin: '0 28px',
          background: '#06060a',
          borderBottom: '1px solid rgba(201,168,76,0.08)',
          padding: '8px 16px',
          maxHeight: 120, overflowY: 'auto',
          fontFamily: "'Courier New', monospace", fontSize: 10,
        }}>
          {log.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 1, alignItems: 'baseline' }}>
              <span style={{ color: '#2a2820', flexShrink: 0 }}>{entry.ts?.slice(11, 19)}</span>
              {entry.stage && (
                <span style={{ color: stageColor(entry.stage), fontWeight: 700, minWidth: 70, flexShrink: 0 }}>
                  [{entry.stage}]
                </span>
              )}
              <span style={{ color: stageColor(entry.stage) }}>{entry.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ padding: '24px 28px 0' }}>

        {/* ── Stat cards ── */}
        <SectionLabel>Performance Overview</SectionLabel>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14, marginBottom: 20,
        }}>
          <StatCard
            label="Leads Scraped Today"
            value={stats?.scrapedToday ?? '—'}
            delta={scrapedDelta}
            sparkline={stats?.sparklines?.scraped}
            accentColor="#4a9eff"
          />
          <StatCard
            label="Emails Sent Today"
            value={stats?.sentToday ?? '—'}
            delta={sentDelta}
            sparkline={stats?.sparklines?.sent}
            accentColor="#27ae60"
          />
          <StatCard
            label="Pipeline Value"
            value={stats ? formatMoney(stats.pipelineValue) : '—'}
            sub={stats ? `${stats.totalLeads} leads in system` : null}
            accentColor={G}
          />
          <StatCard
            label="Conversion Rate"
            value={stats ? `${stats.conversionRate}%` : '—'}
            sub={stats ? `${stats.totalSent} sent / ${stats.totalLeads} total` : null}
            accentColor="#9b7fe8"
          />
        </div>

        {/* ── Charts ── */}
        <SectionLabel>Intelligence</SectionLabel>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 14, marginBottom: 20,
        }}>
          <VerticalChart data={stats?.byVertical || []} />
          <StageDonut    data={stats?.byStage    || []} />
        </div>

        {/* ── Pipeline board ── */}
        <SectionLabel>Pipeline Board</SectionLabel>
      </div>

      <PipelineBoard leads={leads} onSend={sendLead} />

      {/* ── Manual audit modal ── */}
      {showAuditModal && (
        <ManualAuditModal onClose={() => setShowAuditModal(false)} />
      )}
    </div>
  )
}
