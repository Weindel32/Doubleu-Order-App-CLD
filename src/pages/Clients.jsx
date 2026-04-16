import { GOLD, MUTED } from '../tokens.js'
import { s } from '../tokens.js'
import StatCard from '../components/StatCard.jsx'
import { MOCK_CLIENTS } from '../data/mockData.js'

export default function Clients() {
  const core  = MOCK_CLIENTS.filter(c => c.category === 'Core')
  const total = MOCK_CLIENTS.reduce((a, c) => a + c.total, 0)

  return (
    <div>
      <div style={s.pageTitle}>Clienti</div>
      <div style={s.pageSub}>Panoramica commerciale club</div>

      <div style={s.grid3}>
        <StatCard label="Club in Archivio" value={MOCK_CLIENTS.length} />
        <StatCard
          label="Fatturato Reale"
          value={`${total.toLocaleString('it-IT', { maximumFractionDigits: 0 })} €`}
          accent
          sub="Totale confermato"
        />
        <StatCard label="Club Core" value={core.length} sub="Fatturato > 2.000 €" />
      </div>

      <div style={s.divider} />

      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: '#f5f0e8', letterSpacing: 2, marginBottom: 20 }}>
        Club Clienti
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            {['Club', 'Ordini', 'Fatturato Totale', 'Ultimi 12 mesi', 'Ultimo Ordine', 'Categoria'].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_CLIENTS.map(c => (
            <tr key={c.id}>
              <td style={{ ...s.td, fontFamily: "'Cormorant Garamond', serif", fontSize: 18, letterSpacing: 1 }}>
                {c.name}
              </td>
              <td style={{ ...s.td, textAlign: 'center' }}>{c.orders}</td>
              <td style={{ ...s.td, fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: GOLD }}>
                {c.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
              </td>
              <td style={{ ...s.td, fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: GOLD }}>
                {c.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
              </td>
              <td style={{ ...s.td, color: MUTED, fontSize: 11 }}>{c.lastOrder}</td>
              <td style={s.td}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 2,
                  fontSize: 9,
                  letterSpacing: 2,
                  background: c.category === 'Core' ? 'rgba(184,150,90,0.15)' : 'rgba(255,255,255,0.05)',
                  color: c.category === 'Core' ? GOLD : MUTED,
                  border: `1px solid ${c.category === 'Core' ? 'rgba(184,150,90,0.3)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                  {c.category}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
