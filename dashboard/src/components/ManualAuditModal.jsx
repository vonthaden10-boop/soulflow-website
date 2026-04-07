import { useState, useEffect, useRef } from 'react'
import AuditPanel from './AuditPanel.jsx'

const API = import.meta.env.VITE_API_URL || ''
const G   = '#c9a84c'
const GB  = '#e8c96a'

const inputStyle = {
  width: '100%',
  background: '#0b0b0e',
  border: '1px solid #2a2820',
  borderRadius: 4,
  padding: '9px 12px',
  color: '#f5f0e8',
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.15s',
}

function Field({ label, value, onChange, placeholder, required, inputRef }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block',
        fontFamily: "'Courier New', Consolas, monospace",
        fontSize: 9, letterSpacing: 2.5,
        color: focused ? G : '#6b6058',
        textTransform: 'uppercase',
        marginBottom: 5,
        transition: 'color 0.15s',
      }}>
        {label}{required && <span style={{ color: '#c0392b', marginLeft: 2 }}>*</span>}
      </label>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle,
          borderColor: focused ? `${G}66` : '#2a2820',
        }}
      />
    </div>
  )
}

function ElapsedTimer({ running }) {
  const [elapsed, setElapsed] = useState(0)
  const start = useRef(Date.now())

  useEffect(() => {
    if (!running) { setElapsed(0); return }
    start.current = Date.now()
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 200)
    return () => clearInterval(t)
  }, [running])

  if (!running) return null
  return (
    <span style={{
      fontFamily: "'Courier New', Consolas, monospace",
      fontSize: 10, color: G, letterSpacing: 1,
    }}>
      {elapsed}s
    </span>
  )
}

export default function ManualAuditModal({ onClose }) {
  const [businessName, setBusinessName] = useState('')
  const [website,      setWebsite]      = useState('')
  const [city,         setCity]         = useState('')
  const [loading,      setLoading]      = useState(false)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState(null)
  const firstInput = useRef(null)

  // Focus first field once on mount only
  useEffect(() => {
    firstInput.current?.focus()
  }, [])

  // Escape to close — separate effect so it never re-triggers the focus above
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, onClose])

  const runAudit = async () => {
    if (!website.trim()) { setError('Website URL is required.'); return }
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: businessName.trim(), website: website.trim(), city: city.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = e => { if (e.key === 'Enter' && !loading) runAudit() }

  return (
    /* Backdrop */
    <div
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 60, overflowY: 'auto',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        background: '#0b0b0e',
        border: `1px solid ${result ? `${G}55` : '#1f1f28'}`,
        borderRadius: 6,
        overflow: 'hidden',
        margin: '0 20px 60px',
        boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px ${G}22`,
        transition: 'border-color 0.3s',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid #1f1f28',
          background: '#0d0d14',
        }}>
          <div>
            <div style={{
              fontFamily: "'Bebas Neue', 'Impact', sans-serif",
              fontSize: 18, letterSpacing: 3, color: G,
            }}>
              AUDIT A WEBSITE
            </div>
            <div style={{
              fontFamily: "'Courier New', Consolas, monospace",
              fontSize: 9, letterSpacing: 1.5, color: '#6b6058',
              textTransform: 'uppercase', marginTop: 2,
            }}>
              On-demand website & social audit
            </div>
          </div>
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            style={{
              background: 'transparent', border: '1px solid #2a2820',
              color: '#6b6058', borderRadius: 3,
              width: 28, height: 28, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px 20px 0' }} onKeyDown={handleKey}>
          <Field
            label="Business Name"
            value={businessName}
            onChange={setBusinessName}
            placeholder="Business Name"
            inputRef={firstInput}
          />
          <Field
            label="Website URL"
            value={website}
            onChange={setWebsite}
            placeholder="Website"
            required
          />
          <Field
            label="City"
            value={city}
            onChange={setCity}
            placeholder="City"
          />

          {error && (
            <div style={{
              marginBottom: 14, padding: '8px 12px',
              background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)',
              borderRadius: 4, color: '#e74c3c',
              fontFamily: "'Courier New', Consolas, monospace", fontSize: 11,
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            onClick={runAudit}
            disabled={loading || !website.trim()}
            style={{
              width: '100%', marginBottom: 20,
              background: loading || !website.trim()
                ? 'transparent'
                : `linear-gradient(135deg, ${G} 0%, ${GB} 100%)`,
              color: loading ? G : !website.trim() ? '#3a3830' : '#000',
              border: (loading || !website.trim()) ? `1px solid ${loading ? G : '#3a3830'}` : 'none',
              borderRadius: 4, padding: '10px 0',
              fontFamily: "'Bebas Neue', 'Impact', sans-serif",
              fontSize: 15, letterSpacing: 2.5,
              cursor: loading || !website.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: (!loading && website.trim()) ? `0 0 20px rgba(201,168,76,0.25)` : 'none',
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: 'pulse-gold 1s ease-in-out infinite' }}>⟳ SCANNING</span>
                <ElapsedTimer running={loading} />
              </>
            ) : (
              '▶ RUN AUDIT'
            )}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{
            margin: '0 20px 20px',
            padding: '12px 14px',
            background: 'rgba(201,168,76,0.04)',
            border: `1px solid ${G}22`,
            borderRadius: 4,
            fontFamily: "'Courier New', Consolas, monospace",
            fontSize: 10, color: '#6b6058',
            letterSpacing: 0.5,
          }}>
            <div style={{ color: G, marginBottom: 4 }}>SCANNING IN PROGRESS</div>
            <div>· Fetching website HTML</div>
            <div>· Detecting marketing tools</div>
            <div>· Checking Google Business via Places API</div>
            <div>· Detecting social media links</div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ borderTop: '1px solid #1f1f28' }}>
            {/* Result header */}
            <div style={{
              padding: '12px 20px',
              background: '#0d0d14',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                fontSize: 13, letterSpacing: 2, color: '#6b6058',
              }}>
                AUDIT RESULTS — {result.audit?.error ? 'PARTIAL' : 'COMPLETE'}
              </div>
              <div style={{
                fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                fontSize: 20, letterSpacing: 1,
                color: result.score >= 75 ? '#27ae60' : result.score >= 40 ? G : '#4a9eff',
              }}>
                {result.score}/100
              </div>
            </div>

            {/* AuditPanel reuse */}
            <div style={{ padding: '14px 20px 20px' }}>
              <AuditPanel
                audit={result.audit}
                score={result.score}
                tier={result.tier}
              />

              {/* Missing tools summary */}
              {result.missing?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{
                    fontFamily: "'Courier New', Consolas, monospace",
                    fontSize: 8, letterSpacing: 2.5,
                    color: '#6b6058', textTransform: 'uppercase',
                    marginBottom: 5,
                  }}>
                    Top Opportunities for Cold Email
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {result.missing.slice(0, 6).map(t => (
                      <span key={t} style={{
                        fontFamily: "'Courier New', Consolas, monospace",
                        fontSize: 9, padding: '2px 7px',
                        background: 'rgba(192,57,43,0.08)',
                        border: '1px solid rgba(192,57,43,0.2)',
                        borderRadius: 3, color: '#e07060',
                        letterSpacing: 0.3,
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
