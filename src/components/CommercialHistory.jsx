import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN } from '../tokens.js'
import { orderTotal } from '../utils/helpers.js'

const STATUS_STYLE = {
  PREVENTIVO:          { label: 'Preventivo',        color: '#7aaee8', bg: 'rgba(90,130,184,0.15)', border: 'rgba(90,130,184,0.3)' },
  CONFERMATO:          { label: 'Confermato',        color: GOLD,      bg: 'rgba(184,150,90,0.15)', border: 'rgba(184,150,90,0.3)' },
  'IN PRODUZIONE':     { label: 'In produzione',     color: GOLD,      bg: 'rgba(184,150,90,0.15)', border: 'rgba(184,150,90,0.3)' },
  'CONSEGNA PARZIALE': { label: 'Consegna parziale', color: GREEN,     bg: 'rgba(74,158,110,0.15)', border: 'rgba(74,158,110,0.3)' },
  CONSEGNATO:          { label: 'Consegnato',        color: GREEN,     bg: 'rgba(74,158,110,0.15)', border: 'rgba(74,158,110,0.3)' },
  ANNULLATO:           { label: 'Annullato',         color: MUTED,     bg: 'rgba(138,154,181,0.12)', border: 'rgba(138,154,181,0.3)' },
}

function orderStatusInfo(o) {
  if (o.lost)    return { label: 'Perso',      color: CLAY, bg: 'rgba(196,98,58,0.15)',  border: 'rgba(196,98,58,0.3)' }
  if (o.standby) return { label: 'In standby', color: GOLD, bg: 'rgba(184,150,90,0.15)', border: 'rgba(184,150,90,0.3)' }
  return STATUS_STYLE[o.status] || { label: o.status, color: MUTED, bg: 'rgba(255,255,255,0.05)', border: BORDER }
}

// Riga di data italiana "gg/mm/aaaa" -> chiave ordinabile "aaaammgg"
const sortKey = (dateStr) => {
  const [d, m, y] = (dateStr || '').split('/')
  return d && m && y ? `${y}${m}${d}` : '00000000'
}

export default function CommercialHistory({ orders = [], emptyText = 'Nessun ordine o preventivo collegato' }) {
  if (orders.length === 0) {
    return <div style={{ fontSize: 12, color: MUTED, fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>{emptyText}</div>
  }
  const sorted = [...orders].sort((a, b) => sortKey(b.date).localeCompare(sortKey(a.date)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map(o => {
        const st = orderStatusInfo(o)
        const note = o.lost ? o.lostReason : o.standby ? o.standbyReason : null
        return (
          <div key={o.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: CREAM }}>{o.id}</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{o.date}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: CREAM }}>€ {orderTotal(o).toLocaleString('it-IT', { maximumFractionDigits: 0 })}</span>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 2, fontSize: 9, letterSpacing: 1.5, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                  {st.label}
                </span>
              </div>
            </div>
            {note && (
              <div style={{ fontSize: 11, color: MUTED, marginTop: 6, lineHeight: 1.5, overflowWrap: 'break-word' }}>
                {note}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
