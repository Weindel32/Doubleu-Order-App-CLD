import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN, NAVY } from '../tokens.js'
import { s, badgeStyle, btnStyle, btnGoldStyle } from '../tokens.js'
import StatCard from '../components/StatCard.jsx'
import { orderTotal, paymentSummary } from '../utils/helpers.js'

export default function Clients({ orders, setView, setEditOrder }) {
  const [selectedClient, setSelectedClient] = useState(null)

  // Build clients map from real orders
  const clientMap = {}
  orders.forEach(o => {
    const tot = orderTotal(o)
    if (!clientMap[o.client]) {
      clientMap[o.client] = {
        name: o.client,
        email: o.clientEmail || '',
        phone: o.clientPhone || '',
        address: o.clientAddress || '',
        city: o.clientCity || '',
        country: o.clientCountry || '',
        contact: o.clientContact || '',
        orders: [], total: 0, pieces: 0,
      }
    }
    clientMap[o.client].orders.push(o)
    clientMap[o.client].total  += tot
    clientMap[o.client].pieces += o.pieces || 0
  })

  const clients = Object.values(clientMap)
    .sort((a, b) => b.total - a.total)
    .map(c => ({ ...c, category: c.total >= 2000 ? 'Core' : 'Occasional' }))

  const core  = clients.filter(c => c.category === 'Core')
  const total = clients.reduce((a, c) => a + c.total, 0)

  const selected = selectedClient ? clients.find(c => c.name === selectedClient) : null

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
            <tr>{['Club','Ordini','Fatturato','Ultimo Ordine','Pezzi','Categoria',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {clients.map(c => {
              const lastOrder = c.orders.sort((a,b)=>b.date?.localeCompare(a.date))[0]
              return (
                <tr key={c.name} style={{cursor:'pointer'}} onClick={()=>setSelectedClient(c.name)}>
                  <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:18}}>{c.name}</td>
                  <td style={{...s.td,textAlign:'center'}}>{c.orders.length}</td>
                  <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:GOLD}}>
                    {c.total.toLocaleString('it-IT',{minimumFractionDigits:2})} €
                  </td>
                  <td style={{...s.td,color:MUTED,fontSize:11}}>{lastOrder?.date||'—'}</td>
                  <td style={{...s.td,textAlign:'center'}}>{c.pieces}</td>
                  <td style={s.td}>
                    <span style={{display:'inline-block',padding:'3px 10px',borderRadius:2,fontSize:9,letterSpacing:2,background:c.category==='Core'?'rgba(184,150,90,0.15)':'rgba(255,255,255,0.05)',color:c.category==='Core'?GOLD:MUTED,border:`1px solid ${c.category==='Core'?'rgba(184,150,90,0.3)':'rgba(255,255,255,0.1)'}`}}>
                      {c.category}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button style={{...btnGoldStyle,padding:'4px 12px',fontSize:9}} onClick={e=>{e.stopPropagation();setSelectedClient(c.name)}}>
                      Apri
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* ── Client detail modal ──────────────────────────────────── */}
      {selected && (
        <div style={{
          position:'fixed',top:0,left:0,right:0,bottom:0,
          background:'rgba(0,0,0,0.7)',zIndex:500,
          display:'flex',alignItems:'flex-start',justifyContent:'center',
          padding:'40px 20px',overflowY:'auto',
        }} onClick={()=>setSelectedClient(null)}>
          <div style={{
            background:'#1e2d50',border:`1px solid ${BORDER}`,borderRadius:14,
            width:'100%',maxWidth:800,padding:0,overflow:'hidden',
          }} onClick={e=>e.stopPropagation()}>

            {/* Modal header */}
            <div style={{background:'rgba(255,255,255,0.04)',padding:'24px 32px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:CREAM,letterSpacing:2}}>{selected.name}</div>
                <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginTop:4}}>
                  {selected.category.toUpperCase()} · {selected.orders.length} ordini · {selected.pieces} pezzi totali
                </div>
              </div>
              <button onClick={()=>setSelectedClient(null)} style={{background:'none',border:'none',color:MUTED,fontSize:24,cursor:'pointer',lineHeight:1}}>×</button>
            </div>

            <div style={{padding:'24px 32px'}}>
              {/* Anagraphic */}
              {(selected.contact||selected.email||selected.phone||selected.city) && (
                <div style={{...s.card,marginBottom:20}}>
                  <div style={s.cardTitle}>Anagrafica</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    {selected.contact && <div><div style={{fontSize:9,color:MUTED,letterSpacing:2,marginBottom:3}}>REFERENTE</div><div style={{fontSize:13,color:CREAM}}>{selected.contact}</div></div>}
                    {selected.email   && <div><div style={{fontSize:9,color:MUTED,letterSpacing:2,marginBottom:3}}>EMAIL</div><div style={{fontSize:13,color:CREAM}}>{selected.email}</div></div>}
                    {selected.phone   && <div><div style={{fontSize:9,color:MUTED,letterSpacing:2,marginBottom:3}}>TELEFONO</div><div style={{fontSize:13,color:CREAM}}>{selected.phone}</div></div>}
                    {selected.city    && <div><div style={{fontSize:9,color:MUTED,letterSpacing:2,marginBottom:3}}>CITTÀ</div><div style={{fontSize:13,color:CREAM}}>{selected.city}{selected.country?', '+selected.country:''}</div></div>}
                    {selected.address && <div style={{gridColumn:'span 2'}}><div style={{fontSize:9,color:MUTED,letterSpacing:2,marginBottom:3}}>INDIRIZZO</div><div style={{fontSize:13,color:CREAM}}>{selected.address}</div></div>}
                  </div>
                </div>
              )}

              {/* Financial summary */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
                {[
                  {l:'Fatturato Totale', v:`€ ${selected.total.toLocaleString('it-IT',{minimumFractionDigits:2})}`, color:GOLD},
                  {l:'Ordini Totali',    v:selected.orders.length},
                  {l:'Pezzi Totali',     v:selected.pieces},
                ].map(item=>(
                  <div key={item.l} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${BORDER}`,borderRadius:8,padding:'16px 20px'}}>
                    <div style={{fontSize:9,letterSpacing:2,color:MUTED,marginBottom:6}}>{item.l}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:item.color||CREAM}}>{item.v}</div>
                  </div>
                ))}
              </div>

              {/* Order history */}
              <div style={s.cardTitle}>Storico Ordini</div>
              <table style={s.table}>
                <thead>
                  <tr>{['Codice','Data','Stato','Pezzi','Totale',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {selected.orders.sort((a,b)=>b.date?.localeCompare(a.date)).map(o=>{
                    const {total:tot} = paymentSummary(o)
                    return (
                      <tr key={o.id}>
                        <td style={{...s.td,fontSize:11,color:MUTED,letterSpacing:1}}>{o.id}</td>
                        <td style={{...s.td,fontSize:12}}>{o.date}</td>
                        <td style={s.td}><span style={badgeStyle(o.status)}>{o.status}</span></td>
                        <td style={{...s.td,textAlign:'center'}}>{o.pieces}</td>
                        <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:GOLD}}>
                          {tot.toLocaleString('it-IT',{minimumFractionDigits:2})} €
                        </td>
                        <td style={s.td}>
                          <button style={{...btnGoldStyle,padding:'4px 10px',fontSize:8}}
                            onClick={()=>{setEditOrder(o);setView('new');setSelectedClient(null)}}>
                            Apri
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
