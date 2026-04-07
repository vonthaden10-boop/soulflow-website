import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const STAGE_CONFIG = {
  new:          { label: 'Scraped',      color: '#5a5248' },
  audited:      { label: 'Audited',      color: '#4a9eff' },
  personalized: { label: 'Personalized', color: '#9b7fe8' },
  sent:         { label: 'Sent',         color: '#27ae60' },
  replied:      { label: 'Replied',      color: '#c9a84c' },
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { stage, count } = payload[0].payload
  const cfg = STAGE_CONFIG[stage] || {}
  return (
    <div style={{
      background: '#0d0d14', border: '1px solid rgba(201,168,76,0.25)',
      borderRadius: 4, padding: '6px 12px',
      fontFamily: "'Courier New', monospace",
    }}>
      <div style={{ fontSize: 9, letterSpacing: 1, color: '#5a5248', textTransform: 'uppercase', marginBottom: 2 }}>
        {cfg.label || stage}
      </div>
      <div style={{ fontSize: 18, color: '#f5f0e8', fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: 1 }}>
        {count}
        <span style={{ fontSize: 9, color: cfg.color, marginLeft: 4 }}>leads</span>
      </div>
    </div>
  )
}

export default function StageDonut({ data = [] }) {
  const total     = data.reduce((s, d) => s + d.count, 0)
  const chartData = data.filter(d => d.count > 0)
  const empty     = chartData.length === 0

  return (
    <div style={{
      background: '#090910',
      border: '1px solid rgba(201,168,76,0.1)',
      borderTop: '2px solid rgba(201,168,76,0.35)',
      borderRadius: 6,
      padding: '20px 20px 16px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 8, letterSpacing: 2.5,
          color: '#4a4438', textTransform: 'uppercase',
        }}>
          Pipeline Stage Breakdown
        </div>
        {!empty && (
          <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 20, color: '#c9a84c', letterSpacing: 1 }}>
            {total}
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: '#4a4438', letterSpacing: 1, marginLeft: 4 }}>total</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 28, flex: 1 }}>

        {/* Donut */}
        <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={empty ? [{ stage: '_empty', count: 1 }] : chartData}
                dataKey="count" nameKey="stage"
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={80}
                paddingAngle={chartData.length > 1 ? 2 : 0}
                strokeWidth={0}
                isAnimationActive={!empty}
              >
                {(empty ? [{ stage: '_empty' }] : chartData).map(entry => (
                  <Cell
                    key={entry.stage}
                    fill={empty ? '#1a1a22' : (STAGE_CONFIG[entry.stage]?.color || '#2a2820')}
                  />
                ))}
              </Pie>
              {!empty && <Tooltip content={<CustomTooltip />} />}
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            {empty ? (
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: '#2a2420', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', padding: '0 8px' }}>
                No<br/>data
              </div>
            ) : (
              <>
                <div style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: 38, lineHeight: 1, color: '#f5f0e8',
                  textShadow: '0 0 20px rgba(245,240,232,0.1)',
                }}>
                  {total}
                </div>
                <div style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 7, letterSpacing: 2,
                  color: '#3a3430', textTransform: 'uppercase',
                }}>
                  leads
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legend with mini progress bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map(({ stage, count }) => {
            const cfg = STAGE_CONFIG[stage] || {}
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: cfg.color || '#2a2820', flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: 8, letterSpacing: 0.8,
                      color: '#5a5248', textTransform: 'uppercase',
                    }}>
                      {cfg.label || stage}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      fontSize: 14, color: count > 0 ? '#f5f0e8' : '#2a2820',
                    }}>
                      {count}
                    </span>
                    {count > 0 && (
                      <span style={{ fontFamily: "'Courier New', monospace", fontSize: 7, color: cfg.color }}>
                        {Math.round(pct)}%
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ height: 2, background: '#151518', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: cfg.color || '#2a2820',
                    borderRadius: 1,
                    transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
