import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE } from '../tokens.js'
import { orderTotal } from '../utils/helpers.js'

function fmt(n) {
  return '€ ' + (parseFloat(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function MobileQuotes({ quotes, onSelectQuote }) {
  return (
    <div style={{ padding: '20px 16px' }}>

      <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
        {quotes.length} preventivi
      </div>

      {quotes.map(q => {
        const total = orderTotal(q)
        const kitCount = q.kits?.length || 0
        const artCount = (q.kits || []).flatMap(k => k.articles || []).length
        return (
          <div key={q.id} onClick={() => onSelectQuote(q)} style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: '16px',
            marginBottom: 10,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM, flex: 1, marginRight: 10, lineHeight: 1.2 }}>
                {q.client}
              </div>
              <span style={{
                fontSize: 8, letterSpacing: 2, color: CLAY,
                border: '1px solid rgba(196,98,58,0.35)',
                background: 'rgba(196,98,58,0.08)',
                padding: '3px 8px', borderRadius: 3,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>PREV.</span>
            </div>

            <div style={{ fontSize: 10, color: MUTED, marginBottom: 10 }}>{q.id} · {q.date}</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: MUTED, letterSpacing: 1 }}>
                {q.pricingMode === 'kit'
                  ? `${kitCount} kit · ${artCount} articoli`
                  : `${artCount} articoli`}
              </span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: GOLD }}>
                {fmt(total)}
              </span>
            </div>
          </div>
        )
      })}

      {quotes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 12, color: MUTED }}>
          Nessun preventivo
        </div>
      )}
    </div>
  )
}
