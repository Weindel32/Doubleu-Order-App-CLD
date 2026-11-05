import { GOLD, MUTED, CREAM, CLAY, GREEN, BORDER } from '../tokens.js'
import { s } from '../tokens.js'
import { orderTotal, orderIVA, isConfirmed } from '../utils/helpers.js'
import { paymentDue, formatItalian } from '../utils/payments.js'
import { revenueByYear } from '../lib/revenue.js'

// revenueByYear sta in lib/revenue.js (lo usa anche il connettore MCP).
export { revenueByYear }

// Fatturato per anno e migliori club: stanno in Analytics; la Dashboard
// ne mostra solo la riga dell'anno in corso (vedi revenueByYear).

const eur0 = (n) => `€ ${n.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`

export function YearlyRevenueCard({ orders }) {
  const { entries, growth, prevYear } = revenueByYear(orders)
  if (!entries.length) return null
  const maxRev = Math.max(...entries.map(([, v]) => v.value), 1)
  return (
    <div style={{ ...s.card, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={s.cardTitle}>Fatturato Annuale</div>
        {growth !== null && (
          <div style={{ fontSize: 11, color: growth >= 0 ? GREEN : CLAY, letterSpacing: 1, fontWeight: 700 }}>
            {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% vs {prevYear}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
        {entries.map(([year, data]) => (
          <div key={year} style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: MUTED, letterSpacing: 2 }}>{year}</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: GOLD }}>{eur0(data.value)}</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(data.value / maxRev) * 100}%`, background: `linear-gradient(90deg,${GOLD},${CLAY})`, borderRadius: 4, transition: 'width 0.6s' }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: MUTED }}>
              <span>Netto IVA {eur0(data.net)}</span>
              <span>Incassato {eur0(data.collected)}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}`, fontSize: 10, color: MUTED, lineHeight: 1.6 }}>
        Barra = valore ordini confermati (IVA e spedizione comprese) · Netto IVA = imponibile + spedizione, esclusa l'IVA · Incassato = pagamenti segnati come ricevuti, contati nell'anno in cui sono stati incassati
      </div>
    </div>
  )
}

export function TopClubsCard({ orders }) {
  const top3 = Object.values(orders.filter(isConfirmed).reduce((acc, o) => {
    if (!acc[o.client]) acc[o.client] = { name: o.client, total: 0 }
    acc[o.client].total += orderTotal(o)
    return acc
  }, {})).sort((a, b) => b.total - a.total).slice(0, 3)
  if (!top3.length) return null
  return (
    <div style={{ ...s.card, marginBottom: 16 }}>
      <div style={s.cardTitle}>Top 3 Club per Fatturato</div>
      {top3.map((item, i) => (
        <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: i < top3.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, color: GOLD, letterSpacing: 2, opacity: 0.5 }}>0{i + 1}</span>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, color: CREAM }}>{item.name}</span>
          </div>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: GOLD, fontWeight: 300 }}>
            {item.total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>
      ))}
    </div>
  )
}
