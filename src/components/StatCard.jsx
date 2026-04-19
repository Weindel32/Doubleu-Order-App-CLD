import { GOLD, MUTED } from '../tokens.js'
import { s } from '../tokens.js'

export default function StatCard({ label, value, sub, accent }) {
  return (
    <div style={s.statCard(accent)}>
      <div style={{ ...s.statLabel, color: accent ? 'rgba(255,255,255,0.6)' : MUTED }}>{label}</div>
      <div style={s.statValue}>{value}</div>
      {sub && <div style={{ ...s.statSub, color: accent ? 'rgba(255,255,255,0.75)' : GOLD }}>{sub}</div>}
    </div>
  )
}
