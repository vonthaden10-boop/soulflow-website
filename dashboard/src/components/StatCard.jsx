import { AreaChart, Area, ResponsiveContainer } from 'recharts'

export default function StatCard({ label, value, delta, sub, sparkline, accentColor = '#c9a84c' }) {
  const sparkData  = (sparkline || []).map((v, i) => ({ v, i }))
  const gradId     = `sg_${label.replace(/\W/g, '')}`
  const deltaPos   = delta != null && delta >= 0
  const deltaColor = delta == null ? null : deltaPos ? '#27ae60' : '#c0392b'

  return (
    <div style={{
      background: '#090910',
      border: '1px solid rgba(201,168,76,0.1)',
      borderTop: `2px solid ${accentColor}`,
      borderRadius: 6,
      padding: '18px 20px 0',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      minHeight: 150,
    }}>
      {/* Subtle corner glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(circle at top right, ${accentColor}08 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Label */}
      <div style={{
        fontFamily: "'Courier New', Consolas, monospace",
        fontSize: 8, letterSpacing: 2.5,
        color: '#4a4438', textTransform: 'uppercase',
        marginBottom: 10, position: 'relative',
      }}>
        {label}
      </div>

      {/* Big number */}
      <div style={{
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: 54, letterSpacing: -1, lineHeight: 1,
        color: '#f5f0e8',
        textShadow: '0 0 40px rgba(245,240,232,0.06)',
        marginBottom: 8, position: 'relative',
      }}>
        {value ?? '—'}
      </div>

      {/* Delta badge */}
      {delta != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 9, fontWeight: 700,
            color: deltaColor,
            background: `${deltaColor}14`,
            border: `1px solid ${deltaColor}30`,
            borderRadius: 2, padding: '1px 5px',
          }}>
            {deltaPos ? '▲' : '▼'} {Math.abs(delta)}%
          </span>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: '#3a3430', letterSpacing: 0.5 }}>
            vs yesterday
          </span>
        </div>
      )}

      {/* Sub text (when no delta) */}
      {sub && delta == null && (
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 9, color: '#3a3430',
          marginBottom: 10, letterSpacing: 0.3,
        }}>
          {sub}
        </div>
      )}

      {/* Sparkline — flush to card bottom */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', marginTop: 'auto' }}>
        {sparkData.length > 0 ? (
          <div style={{ width: '100%', marginLeft: -20, marginRight: -20 }}>
            <ResponsiveContainer width="100%" height={44}>
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={accentColor} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone" dataKey="v"
                  stroke={accentColor} strokeWidth={1.5}
                  fill={`url(#${gradId})`}
                  dot={false} isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 20 }} />
        )}
      </div>
    </div>
  )
}
