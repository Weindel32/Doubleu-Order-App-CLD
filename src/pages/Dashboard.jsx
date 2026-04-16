import { GOLD, MUTED, CREAM, CLAY, GREEN } from '../tokens.js'
import { s, badgeStyle, btnStyle, btnGoldStyle } from '../tokens.js'
import { MOCK_ORDERS, orderTotal, paymentSummary, daysUntilDelivery, needsAlert } from '../data/mockData.js'
import { generateProductionPDF } from '../utils/pdfProduction.js'
import { generateClientPDF }     from '../utils/pdfClient.js'
import AlertsPanel               from '../components/AlertsPanel.jsx'

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={s.statCard(accent)}>
      <div style={{...s.statLabel,color:accent?'rgba(255,255,255,0.6)':MUTED}}>{label}</div>
      <div style={s.statValue}>{value}</div>
      {sub && <div style={{...s.statSub,color:accent?'rgba(255,255,255,0.75)':GOLD}}>{sub}</div>}
    </div>
  )
}

export default function Dashboard({ setView, setEditOrder }) {
  const confirmed = MOCK_ORDERS.filter(o => o.status !== 'PREVENTIVO')
  const quote     = MOCK_ORDERS.filter(o => o.status === 'PREVENTIVO')
  const inProd    = MOCK_ORDERS.filter(o => o.status === 'IN PRODUZIONE')
  const totalRev  = confirmed.reduce((a, o) => a + orderTotal(o), 0)

  // Total pending payments across all active orders
  const totalPending = MOCK_ORDERS
    .filter(o => o.status !== 'PREVENTIVO')
    .reduce((s, o) => s + paymentSummary(o).pending, 0)

  const top3 = Object.values(
    MOCK_ORDERS.filter(o => o.status !== 'PREVENTIVO').reduce((acc, o) => {
      const tot = orderTotal(o)
      if (!acc[o.client]) acc[o.client] = { name: o.client, total: 0 }
      acc[o.client].total += tot
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total).slice(0, 3)

  const openPDF = (gen, order) => {
    const h = gen(order); const w = window.open('', '_blank'); w.document.write(h); w.document.close()
  }

  return (
    <div>
      <div style={s.topBar}>
        <div>
          <div style={s.pageTitle}>Dashboard</div>
          <div style={s.pageSub}>Panoramica operativa · {new Date().toLocaleDateString('it-IT')}</div>
        </div>
        <button style={btnStyle(true)} onClick={() => { setEditOrder(null); setView('new') }}>+ Nuovo Ordine</button>
      </div>

      {/* Alerts */}
      <AlertsPanel setView={setView} setEditOrder={setEditOrder} />

      <div style={s.grid4}>
        <StatCard label="Preventivi"      value={quote.length}     sub="In attesa" />
        <StatCard label="Confermati"      value={confirmed.length} sub={`${totalRev.toLocaleString('it-IT',{maximumFractionDigits:0})} €`} accent />
        <StatCard label="In Produzione"   value={inProd.length}    sub="Ordini attivi" />
        <StatCard label="Da Incassare"    value={`€ ${totalPending.toLocaleString('it-IT',{maximumFractionDigits:0})}`} sub="Pagamenti in sospeso" />
      </div>

      {/* Top 3 */}
      <div style={{...s.card, marginBottom:16}}>
        <div style={s.cardTitle}>Top 3 Club per Fatturato</div>
        {top3.map((item, i) => (
          <div key={item.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 0',borderBottom:i<2?`1px solid rgba(255,255,255,0.05)`:'none'}}>
            <div style={{display:'flex',alignItems:'center',gap:20}}>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,color:GOLD,letterSpacing:2,opacity:0.5}}>0{i+1}</span>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,color:CREAM}}>{item.name}</span>
            </div>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:GOLD,fontWeight:300}}>
              {item.total.toLocaleString('it-IT',{minimumFractionDigits:2})} €
            </span>
          </div>
        ))}
      </div>

      <div style={s.divider}/>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:CREAM,letterSpacing:2,marginBottom:20}}>Ultimi Ordini</div>

      <table style={s.table}>
        <thead>
          <tr>{['Cliente','Codice','Consegna','Stato','Pezzi','Totale','Pagamenti','PDF'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {MOCK_ORDERS.slice(0,7).map(o => {
            const {paid, pending, total: tot} = paymentSummary(o)
            const days = daysUntilDelivery(o)
            const alert = needsAlert(o)
            return (
              <tr key={o.id} style={{background:alert?'rgba(196,98,58,0.04)':'transparent'}}>
                <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>
                  {alert && <span style={{color:CLAY,marginRight:6}}>⚠</span>}
                  {o.client}
                </td>
                <td style={{...s.td,color:MUTED,fontSize:11,letterSpacing:1}}>{o.id}</td>
                <td style={{...s.td,fontSize:11,color:days!==null&&days<=7&&!['CONSEGNATO'].includes(o.status)?CLAY:MUTED}}>
                  {o.deliveryDate||'—'}
                  {days!==null&&!['CONSEGNATO'].includes(o.status)&&<div style={{fontSize:9,marginTop:2}}>{days<0?`scaduto ${Math.abs(days)}gg`:days===0?'oggi':`${days}gg`}</div>}
                </td>
                <td style={s.td}><span style={badgeStyle(o.status)}>{o.status}</span></td>
                <td style={{...s.td,textAlign:'center'}}>{o.pieces}</td>
                <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:GOLD}}>
                  {tot.toLocaleString('it-IT',{minimumFractionDigits:2})} €
                </td>
                <td style={s.td}>
                  {tot > 0 && (
                    <div>
                      <div style={{fontSize:9,color:GREEN,letterSpacing:1}}>✓ {paid.toLocaleString('it-IT',{maximumFractionDigits:0})} €</div>
                      {pending>0 && <div style={{fontSize:9,color:GOLD,letterSpacing:1}}>⧖ {pending.toLocaleString('it-IT',{maximumFractionDigits:0})} €</div>}
                    </div>
                  )}
                </td>
                <td style={s.td}>
                  <div style={{display:'flex',gap:5}}>
                    <button style={{...btnGoldStyle,padding:'4px 8px',fontSize:8}} onClick={()=>{setEditOrder(o);setView('new')}}>Apri</button>
                    <button style={{padding:'4px 8px',fontSize:8,border:'1px solid rgba(196,98,58,0.4)',background:'rgba(196,98,58,0.08)',color:CLAY,borderRadius:3,cursor:'pointer'}} onClick={()=>openPDF(generateProductionPDF,o)}>Prod.</button>
                    <button style={{padding:'4px 8px',fontSize:8,border:`1px solid rgba(184,150,90,0.3)`,background:'rgba(184,150,90,0.06)',color:GOLD,borderRadius:3,cursor:'pointer'}} onClick={()=>openPDF(generateClientPDF,o)}>Cliente</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
