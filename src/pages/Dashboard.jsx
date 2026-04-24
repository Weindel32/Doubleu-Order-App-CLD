import { GOLD, MUTED, CREAM, CLAY, GREEN, BORDER } from '../tokens.js'
import { s, badgeStyle, btnStyle, btnGoldStyle } from '../tokens.js'
import { orderTotal, paymentSummary, daysUntilDelivery, needsAlert } from '../utils/helpers.js'
import { generateProductionPDF } from '../utils/pdfProduction.js'
import { generateClientPDF }     from '../utils/pdfClient.js'
import { generateDeliveryPDF }   from '../utils/pdfDelivery.js'
import AlertsPanel               from '../components/AlertsPanel.jsx'
import StatCard                  from '../components/StatCard.jsx'
import BollaModal                from '../components/BollaModal.jsx'
import { useState }              from 'react'

export default function Dashboard({ orders, setView, setEditOrder, onDelete, onOrdersChange, navigateToOrders }) {
  const [bollaOrder, setBollaOrder] = useState(null)
  const confirmed = orders.filter(o => o.status !== 'PREVENTIVO')
  const quote     = orders.filter(o => o.status === 'PREVENTIVO')
  const inProd    = orders.filter(o => o.status === 'IN PRODUZIONE')
  const totalRev  = confirmed.reduce((a, o) => a + orderTotal(o), 0)
  const totalPending = orders.filter(o=>o.status!=='PREVENTIVO').reduce((s,o)=>s+paymentSummary(o).pending,0)

  // ── Yearly comparison ─────────────────────────────────────────
  const rev2025 = confirmed.filter(o=>o.date?.includes('2025')).reduce((a,o)=>a+orderTotal(o),0)
  const rev2026 = confirmed.filter(o=>o.date?.includes('2026')).reduce((a,o)=>a+orderTotal(o),0)
  const maxRev  = Math.max(rev2025, rev2026, 1)
  const growth  = rev2025 > 0 ? ((rev2026 - rev2025) / rev2025 * 100).toFixed(0) : null

  const top3 = Object.values(
    orders.filter(o=>o.status!=='PREVENTIVO').reduce((acc,o)=>{
      const tot=orderTotal(o)
      if(!acc[o.client]) acc[o.client]={name:o.client,total:0}
      acc[o.client].total+=tot
      return acc
    },{})
  ).sort((a,b)=>b.total-a.total).slice(0,3)

  const openPDF = (gen, order) => {
    const h=gen(order); const w=window.open('','_blank'); w.document.write(h); w.document.close()
  }

  return (
    <div>
      <div style={s.topBar}>
        <div>
          <div style={s.pageTitle}>Dashboard</div>
          <div style={s.pageSub}>Panoramica operativa · {new Date().toLocaleDateString('it-IT')}</div>
        </div>
        <button style={btnStyle(true)} onClick={()=>{setEditOrder(null);setView('new')}}>+ Nuovo Ordine</button>
      </div>

      <AlertsPanel orders={orders} setView={setView} setEditOrder={setEditOrder}/>

      <div style={s.grid4}>
        <StatCard label="Preventivi"    value={quote.length}     sub="In attesa"           onClick={navigateToOrders ? () => navigateToOrders('Preventivo')     : undefined} />
        <StatCard label="Confermati"    value={confirmed.length} sub={`${totalRev.toLocaleString('it-IT',{maximumFractionDigits:0})} €`} accent onClick={navigateToOrders ? () => navigateToOrders('Confermato')    : undefined} />
        <StatCard label="In Produzione" value={inProd.length}    sub="Ordini attivi"       onClick={navigateToOrders ? () => navigateToOrders('In Produzione')  : undefined} />
        <StatCard label="Da Incassare"  value={`€ ${totalPending.toLocaleString('it-IT',{maximumFractionDigits:0})}`} sub="Pagamenti in sospeso" onClick={navigateToOrders ? () => navigateToOrders('Da Incassare') : undefined} />
      </div>

      {/* ── Yearly comparison ────────────────────────────────── */}
      {(rev2025 > 0 || rev2026 > 0) && (
        <div style={{...s.card, marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={s.cardTitle}>Fatturato Annuale</div>
            {growth !== null && (
              <div style={{fontSize:11,color:parseFloat(growth)>=0?GREEN:CLAY,letterSpacing:1,fontWeight:700}}>
                {parseFloat(growth)>=0?'▲':'▼'} {Math.abs(parseFloat(growth))}% vs 2025
              </div>
            )}
          </div>
          <div style={{display:'flex',gap:20,alignItems:'flex-end'}}>
            {[{year:'2025',rev:rev2025},{year:'2026',rev:rev2026}].map(({year,rev})=>(
              <div key={year} style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:11,color:MUTED,letterSpacing:2}}>{year}</span>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:GOLD}}>
                    € {rev.toLocaleString('it-IT',{maximumFractionDigits:0})}
                  </span>
                </div>
                <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${(rev/maxRev)*100}%`,background:`linear-gradient(90deg,${GOLD},${CLAY})`,borderRadius:4,transition:'width 0.6s'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 */}
      {top3.length > 0 && (
        <div style={{...s.card, marginBottom:16}}>
          <div style={s.cardTitle}>Top 3 Club per Fatturato</div>
          {top3.map((item,i)=>(
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
      )}

      <div style={s.divider}/>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:CREAM,letterSpacing:2,marginBottom:20}}>Ultimi Ordini</div>

      {orders.length===0 ? (
        <div style={{textAlign:'center',padding:'60px 0',color:MUTED}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,marginBottom:12}}>Nessun ordine ancora</div>
          <button style={btnStyle(true)} onClick={()=>{setEditOrder(null);setView('new')}}>+ Crea Primo Ordine</button>
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>{['Cliente','Codice','Consegna','Stato','Pezzi','Totale','Pagamenti','PDF'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {orders.slice(0,7).map(o=>{
              const {paid,pending,total:tot}=paymentSummary(o)
              const days=daysUntilDelivery(o)
              const alert=needsAlert(o)
              return (
                <tr key={o.id} style={{background:alert?'rgba(196,98,58,0.04)':'transparent'}}>
                  <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>
                    {alert&&<span style={{color:CLAY,marginRight:6}}>⚠</span>}{o.client}
                  </td>
                  <td style={{...s.td,color:MUTED,fontSize:11,letterSpacing:1}}>{o.id}</td>
                  <td style={{...s.td,fontSize:11,color:days!==null&&days<=7&&o.status!=='CONSEGNATO'?CLAY:MUTED}}>
                    {o.deliveryDate||'—'}
                    {days!==null&&o.status!=='CONSEGNATO'&&<div style={{fontSize:9,marginTop:2}}>{days<0?`scad.${Math.abs(days)}gg`:days===0?'oggi':`${days}gg`}</div>}
                  </td>
                  <td style={s.td}><span style={badgeStyle(o.status)}>{o.status}</span></td>
                  <td style={{...s.td,textAlign:'center'}}>{o.pieces}</td>
                  <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:GOLD}}>
                    {tot.toLocaleString('it-IT',{minimumFractionDigits:2})} €
                  </td>
                  <td style={s.td}>
                    {tot>0&&<div>
                      <div style={{fontSize:9,color:GREEN}}>✓ {paid.toLocaleString('it-IT',{maximumFractionDigits:0})} €</div>
                      {pending>0&&<div style={{fontSize:9,color:GOLD}}>⧖ {pending.toLocaleString('it-IT',{maximumFractionDigits:0})} €</div>}
                    </div>}
                  </td>
                  <td style={s.td}>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      <button style={{...btnGoldStyle,padding:'4px 7px',fontSize:8}} onClick={()=>{setEditOrder(o);setView('new')}}>Apri</button>
                      <button style={{padding:'4px 7px',fontSize:8,border:'1px solid rgba(196,98,58,0.4)',background:'rgba(196,98,58,0.08)',color:CLAY,borderRadius:3,cursor:'pointer'}} onClick={()=>openPDF(generateProductionPDF,o)}>Prod.</button>
                      <button style={{padding:'4px 7px',fontSize:8,border:`1px solid rgba(184,150,90,0.3)`,background:'rgba(184,150,90,0.06)',color:GOLD,borderRadius:3,cursor:'pointer'}} onClick={()=>openPDF(generateClientPDF,o)}>Cliente</button>
                      <button style={{padding:'4px 7px',fontSize:8,border:'1px solid rgba(122,174,232,0.3)',background:'rgba(122,174,232,0.06)',color:'#7aaee8',borderRadius:3,cursor:'pointer'}} onClick={()=>o.status==='CONSEGNA PARZIALE'?setBollaOrder(o):openPDF(generateDeliveryPDF,o)}>Bolla</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
    {bollaOrder && <BollaModal order={bollaOrder} onClose={() => setBollaOrder(null)} />}
  )
}
