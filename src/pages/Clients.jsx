import { GOLD, MUTED, CREAM } from '../tokens.js'
import { s } from '../tokens.js'
import StatCard from '../components/StatCard.jsx'
import { orderTotal } from '../utils/helpers.js'

export default function Clients({ orders }) {
  // Build clients from real orders
  const clientMap = {}
  orders.forEach(o => {
    const tot = orderTotal(o)
    if (!clientMap[o.client]) {
      clientMap[o.client] = { name: o.client, orders: 0, total: 0, lastOrder: o.date, pieces: 0 }
    }
    clientMap[o.client].orders++
    clientMap[o.client].total += tot
    clientMap[o.client].pieces += o.pieces || 0
    // Keep most recent date
    if (o.date > clientMap[o.client].lastOrder) clientMap[o.client].lastOrder = o.date
  })

  const clients = Object.values(clientMap)
    .sort((a, b) => b.total - a.total)
    .map(c => ({ ...c, category: c.total >= 2000 ? 'Core' : 'Occasional' }))

  const core  = clients.filter(c => c.category === 'Core')
  const total = clients.reduce((a, c) => a + c.total, 0)

  return (
    <div>
      <div style={s.pageTitle}>Clienti</div>
      <div style={s.pageSub}>Panoramica commerciale club</div>

      <div style={s.grid3}>
        <StatCard label="Club in Archivio" value={clients.length} />
        <StatCard label="Fatturato Reale" value={`${total.toLocaleString('it-IT',{maximumFractionDigits:0})} €`} accent sub="Totale confermato" />
        <StatCard label="Club Core" value={core.length} sub="Fatturato > 2.000 €" />
      </div>

      <div style={s.divider} />
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:CREAM,letterSpacing:2,marginBottom:20}}>Club Clienti</div>

      {clients.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 0',color:MUTED}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24}}>Nessun cliente ancora</div>
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>{['Club','Ordini','Fatturato','Ultimo Ordine','Pezzi','Categoria'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {clients.map(c=>(
              <tr key={c.name}>
                <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:18}}>{c.name}</td>
                <td style={{...s.td,textAlign:'center'}}>{c.orders}</td>
                <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:GOLD}}>
                  {c.total.toLocaleString('it-IT',{minimumFractionDigits:2})} €
                </td>
                <td style={{...s.td,color:MUTED,fontSize:11}}>{c.lastOrder}</td>
                <td style={{...s.td,textAlign:'center'}}>{c.pieces}</td>
                <td style={s.td}>
                  <span style={{display:'inline-block',padding:'3px 10px',borderRadius:2,fontSize:9,letterSpacing:2,background:c.category==='Core'?'rgba(184,150,90,0.15)':'rgba(255,255,255,0.05)',color:c.category==='Core'?GOLD:MUTED,border:`1px solid ${c.category==='Core'?'rgba(184,150,90,0.3)':'rgba(255,255,255,0.1)'}`}}>
                    {c.category}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
