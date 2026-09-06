import { GOLD, MUTED, CREAM, CLAY, GREEN, BORDER } from '../tokens.js'
import { s, badgeStyle, btnStyle, btnGoldStyle } from '../tokens.js'
import { orderTotal, orderIVA, paymentSummary, daysUntilDelivery, needsAlert, isConfirmed } from '../utils/helpers.js'
import { generateProductionPDF } from '../utils/pdfProduction.js'
import { generateClientPDF }     from '../utils/pdfClient.js'
import { generateDeliveryPDF }   from '../utils/pdfDelivery.js'
import AlertsPanel               from '../components/AlertsPanel.jsx'
import StatCard                  from '../components/StatCard.jsx'
import BollaModal                from '../components/BollaModal.jsx'
import { useState }              from 'react'

export default function Dashboard({ orders, setView, setEditOrder, onDelete, onOrdersChange, navigateToOrders, onNavigateToQuotes, shipments = [], clients = [], prospects = [] }) {
  const [bollaOrder, setBollaOrder] = useState(null)
  const confirmed = orders.filter(isConfirmed)
  const quote     = orders.filter(o => o.status === 'PREVENTIVO')
  const inProd    = orders.filter(o => o.status === 'IN PRODUZIONE')

  const parseDate = d => {
    if (!d) return 0
    const [dd,mm,yyyy] = d.split('/')
    return new Date(`${yyyy}-${mm}-${dd}`).getTime() || 0
  }
  const fullyPaid = confirmed
    .filter(o => { const ps = paymentSummary(o); return ps.total > 0 && ps.residual === 0 && ps.pending === 0 })
    .sort((a,b) => parseDate(b.date) - parseDate(a.date))
    .slice(0, 5)
  const totalRev  = confirmed.reduce((a, o) => a + orderTotal(o), 0)
  // "Da incassare" deve coprire tutto ciò che manca da riscuotere: sia le
  // rate già pianificate (pending) sia il saldo non ancora programmato
  // (residual) — un ordine senza pagamenti pianificati non va escluso solo
  // perché non ha rate in calendario.
  const totalPending  = confirmed.reduce((s,o)=>s+paymentSummary(o).pending,0)
  const totalResidual = confirmed.reduce((s,o)=>s+paymentSummary(o).residual,0)
  const totalToCollect = totalPending + totalResidual

  // ── Yearly comparison ─────────────────────────────────────────
  // Tre numeri diversi, non intercambiabili per decidere: valore ordini
  // (il totale confermato, IVA e spedizione comprese quando presenti),
  // ricavi al netto IVA (imponibile + spedizione, esclusa l'IVA che non
  // è mai un ricavo aziendale) e incassato (i pagamenti segnati come
  // ricevuti, per data del pagamento — non della data dell'ordine, così
  // una rata saldata l'anno dopo conta nell'anno in cui è arrivata).
  const revenueByYear = confirmed.reduce((acc, o) => {
    const match = o.date?.match(/(\d{4})/)
    if (!match) return acc
    const y = match[1]
    if (!acc[y]) acc[y] = { value: 0, net: 0 }
    acc[y].value += orderTotal(o)
    acc[y].net   += orderTotal(o) - orderIVA(o)
    return acc
  }, {})
  const collectedByYear = confirmed.reduce((acc, o) => {
    (o.payments || []).filter(p => p.paid).forEach(p => {
      const match = p.date?.match(/(\d{4})/)
      if (!match) return
      const y = match[1]
      acc[y] = (acc[y] || 0) + (parseFloat(p.amount) || 0)
    })
    return acc
  }, {})
  const yearEntries = Object.entries(revenueByYear).sort(([a],[b])=>a-b)
  const maxRev  = Math.max(...yearEntries.map(([,v])=>v.value), 1)
  const lastTwo = yearEntries.slice(-2)
  const growth  = lastTwo.length === 2 && lastTwo[0][1].value > 0
    ? ((lastTwo[1][1].value - lastTwo[0][1].value) / lastTwo[0][1].value * 100).toFixed(0)
    : null

  const top3 = Object.values(
    confirmed.reduce((acc,o)=>{
      const tot=orderTotal(o)
      if(!acc[o.client]) acc[o.client]={name:o.client,total:0}
      acc[o.client].total+=tot
      return acc
    },{})
  ).sort((a,b)=>b.total-a.total).slice(0,3)

  const openPDF = (gen, order) => {
    const h=gen(order); const w=window.open('','_blank'); w.document.write(h); w.document.close()
  }

  return (<>
    <div>
      <div style={s.topBar}>
        <div>
          <div style={s.pageTitle}>Dashboard</div>
          <div style={s.pageSub}>Panoramica operativa · {new Date().toLocaleDateString('it-IT')}</div>
        </div>
        <button style={btnStyle(true)} onClick={()=>{setEditOrder(null);setView('new')}}>+ Nuovo Ordine</button>
      </div>

      <AlertsPanel orders={orders} setView={setView} setEditOrder={setEditOrder}
        shipments={shipments} clients={clients} prospects={prospects}/>

      <div style={s.grid4}>
        <StatCard label="Preventivi"    value={quote.length}     sub="In attesa"           onClick={onNavigateToQuotes || undefined} />
        <StatCard label="Confermati"    value={confirmed.length} sub={`${totalRev.toLocaleString('it-IT',{maximumFractionDigits:0})} €`} accent onClick={navigateToOrders ? () => navigateToOrders('Confermato')    : undefined} />
        <StatCard label="In Produzione" value={inProd.length}    sub="Ordini attivi"       onClick={navigateToOrders ? () => navigateToOrders('In Produzione')  : undefined} />
        <StatCard label="Da Incassare"  value={`€ ${totalToCollect.toLocaleString('it-IT',{maximumFractionDigits:0})}`}
          sub={`${totalPending.toLocaleString('it-IT',{maximumFractionDigits:0})} € attesi · ${totalResidual.toLocaleString('it-IT',{maximumFractionDigits:0})} € da pianificare`}
          onClick={navigateToOrders ? () => navigateToOrders('Da Incassare') : undefined} />
      </div>

      {/* ── Yearly comparison ────────────────────────────────── */}
      {yearEntries.length > 0 && (
        <div style={{...s.card, marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={s.cardTitle}>Fatturato Annuale</div>
            {growth !== null && (
              <div style={{fontSize:11,color:parseFloat(growth)>=0?GREEN:CLAY,letterSpacing:1,fontWeight:700}}>
                {parseFloat(growth)>=0?'▲':'▼'} {Math.abs(parseFloat(growth))}% vs {lastTwo[0][0]}
              </div>
            )}
          </div>
          <div style={{display:'flex',gap:20,alignItems:'flex-end'}}>
            {yearEntries.map(([year,data])=>(
              <div key={year} style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:11,color:MUTED,letterSpacing:2}}>{year}</span>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:GOLD}}>
                    € {data.value.toLocaleString('it-IT',{maximumFractionDigits:0})}
                  </span>
                </div>
                <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${(data.value/maxRev)*100}%`,background:`linear-gradient(90deg,${GOLD},${CLAY})`,borderRadius:4,transition:'width 0.6s'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:10,color:MUTED}}>
                  <span>Netto IVA € {data.net.toLocaleString('it-IT',{maximumFractionDigits:0})}</span>
                  <span>Incassato € {(collectedByYear[year]||0).toLocaleString('it-IT',{maximumFractionDigits:0})}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${BORDER}`,fontSize:10,color:MUTED,lineHeight:1.6}}>
            Barra = valore ordini confermati (IVA e spedizione comprese) · Netto IVA = imponibile + spedizione, esclusa l'IVA · Incassato = pagamenti segnati come ricevuti, contati nell'anno in cui sono stati incassati
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

      {confirmed.length===0 ? (
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
            {confirmed.slice(0,7).map(o=>{
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

      {/* ── Ultimi 5 ordini incassati ─────────────────────────── */}
      {fullyPaid.length > 0 && (
        <>
          <div style={s.divider}/>
          <div style={{display:'flex',alignItems:'baseline',gap:16,marginBottom:20}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:CREAM,letterSpacing:2}}>Ultimi Ordini Incassati</div>
            <div style={{fontSize:11,color:MUTED,letterSpacing:1}}>
              Totale: <span style={{color:GREEN,fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>
                {fullyPaid.reduce((a,o)=>a+orderTotal(o),0).toLocaleString('it-IT',{minimumFractionDigits:2})} €
              </span>
            </div>
          </div>
          <table style={s.table}>
            <thead>
              <tr>{['Cliente','Codice','Data','Stato','Pezzi','Incassato'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {fullyPaid.map(o=>{
                const tot=orderTotal(o)
                return (
                  <tr key={o.id} style={{cursor:'pointer'}} onClick={()=>{setEditOrder(o);setView('new')}}>
                    <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>{o.client}</td>
                    <td style={{...s.td,color:MUTED,fontSize:11,letterSpacing:1}}>{o.id}</td>
                    <td style={{...s.td,fontSize:11,color:MUTED}}>{o.date||'—'}</td>
                    <td style={s.td}><span style={badgeStyle(o.status)}>{o.status}</span></td>
                    <td style={{...s.td,textAlign:'center',color:MUTED}}>{o.pieces||'—'}</td>
                    <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:GREEN}}>
                      ✓ {tot.toLocaleString('it-IT',{minimumFractionDigits:2})} €
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {/* ── Preventivi in attesa ───────────────────────────────── */}
      {quote.length > 0 && (
        <>
          <div style={s.divider}/>
          <div style={{display:'flex',alignItems:'baseline',gap:16,marginBottom:20}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:CREAM,letterSpacing:2}}>Preventivi in Attesa</div>
            <div style={{fontSize:11,color:MUTED,letterSpacing:1}}>
              Potenziale: <span style={{color:GOLD,fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>
                {quote.reduce((a,o)=>a+orderTotal(o),0).toLocaleString('it-IT',{minimumFractionDigits:2})} €
              </span>
            </div>
          </div>
          <table style={s.table}>
            <thead>
              <tr>{['Cliente','Codice','Data','Pezzi','Valore Potenziale',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {quote.map(o=>{
                const tot=orderTotal(o)
                return (
                  <tr key={o.id}>
                    <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>{o.client}</td>
                    <td style={{...s.td,color:MUTED,fontSize:11,letterSpacing:1}}>{o.id}</td>
                    <td style={{...s.td,fontSize:11,color:MUTED}}>{o.date||'—'}</td>
                    <td style={{...s.td,textAlign:'center',color:MUTED}}>{o.pieces||'—'}</td>
                    <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:'rgba(184,150,90,0.6)'}}>
                      {tot>0?`${tot.toLocaleString('it-IT',{minimumFractionDigits:2})} €`:'—'}
                    </td>
                    <td style={s.td}>
                      <button style={{...btnGoldStyle,padding:'4px 10px',fontSize:8}} onClick={()=>{setEditOrder(o);setView('newQuote')}}>Apri</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
    {bollaOrder && <BollaModal order={bollaOrder} onClose={() => setBollaOrder(null)} />}
  </>)
}
