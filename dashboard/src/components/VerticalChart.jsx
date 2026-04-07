import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const G = '#c9a84c'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0d0d14', border: '1px solid rgba(201,168,76,0.25)',
      borderRadius: 4, padding: '6px 12px',
      fontFamily: "'Courier New', monospace",
    }}>
      <div style={{ fontSize: 9, letterSpacing: 1, color: '#5a5248', textTransform: 'uppercase', marginBottom: 2 }}>
        {payload[0].payload.vertical}
      </div>
      <div style={{ fontSize: 18, color: '#f5f0e8', fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: 1 }}>
        {payload[0].value}
        <span style={{ fontSize: 9, color: G, marginLeft: 4 }}>leads</span>
      </div>
    </div>
  )
}

export default function VerticalChart({ data = [] }) {
  const empty = !data.length || data.every(d => d.count === 0)

  return (
    <div style={{
      background: '#090910',
      border: '1px solid rgba(201,168,76,0.1)',
      borderTop: '2px solid rgba(201,168,76,0.35)',
      borderRadius: 6,
      padding: '20px 20px 12px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 8, letterSpacing: 2.5,
          color: '#4a4438', textTransform: 'uppercase',
        }}>
          Leads by Vertical
        </div>
        {!empty && (
          <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 20, color: G, letterSpacing: 1 }}>
            {data.reduce((s, d) => s + d.count, 0)}
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: '#4a4438', letterSpacing: 1, marginLeft: 4 }}>total</span>
          </div>
        )}
      </div>

      {empty ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 200,
        }}>
          <div style={{
            fontFamily: "'Courier New', monospace", fontSize: 9,
            color: '#2a2420', letterSpacing: 2, textTransform: 'uppercase',
          }}>
            Awaiting pipeline data
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 30)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 32, bottom: 0, left: 0 }}
          >
            <XAxis
              type="number" hide
              domain={[0, Math.max(...data.map(d => d.count)) * 1.15]}
            />
            <YAxis
              type="category" dataKey="vertical" width={88}
              tick={{
                fontFamily: "'Courier New', monospace",
                fontSize: 9, fill: '#6a6058', letterSpacing: 0.5,
              }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(201,168,76,0.03)' }} />
            <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={12}>
              {data.map((entry, i) => (
                <Cell
                  key={entry.vertical}
                  fill={i === 0 ? G : `rgba(201,168,76,${Math.max(0.55 - i * 0.06, 0.18)})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
