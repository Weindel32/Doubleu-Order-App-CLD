import { GOLD, MUTED } from '../tokens.js'
import { s } from '../tokens.js'

export default function StatCard({ label, value, sub, accent, onClick }) {
  return (
    <div
      style={{ ...s.statCard(accent), ...(onClick ? { cursor: 'pointer', transition: 'opacity 0.15s' } : {}) }}
      onClick={onClick}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.opacity = '0.8' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.opacity = '1' }}
    >
      <div style={{ ...s.statLabel, color: accent ? 'rgba(255,255,255,0.6)' : MUTED }}>{label}</div>
      <div style={s.statValue}>{value}</div>
      {sub && <div style={{ ...s.statSub, color: accent ? 'rgba(255,255,255,0.75)' : GOLD }}>{sub}</div>}
      {onClick && <div style={{ fontSize: 8, letterSpacing: 2, color: accent ? 'rgba(255,255,255,0.4)' : 'rgba(184,150,90,0.5)', marginTop: 8 }}>VEDI ORDINI →</div>}
    </div>
  )
}
