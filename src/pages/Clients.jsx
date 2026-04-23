import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN } from '../tokens.js'
import { s, badgeStyle, btnStyle, btnGoldStyle } from '../tokens.js'
import StatCard from '../components/StatCard.jsx'
import { orderTotal, paymentSummary } from '../utils/helpers.js'

const CAT_COLORS = {
  ANCHOR: { bg: 'rgba(184,150,90,0.18)', color: GOLD,      border: 'rgba(184,150,90,0.35)' },
  ALLIED: { bg: 'rgba(90,130,184,0.18)', color: '#7aaee8', border: 'rgba(90,130,184,0.35)' },
  SCOUT:  { bg: 'rgba(196,98,58,0.15)',  color: CLAY,      border: 'rgba(196,98,58,0.3)'  },
}
const CAT_LABELS = { ANCHOR: 'ANCHOR Club', ALLIED: 'ALLIED Club', SCOUT: 'SCOUT Club' }
const getAutoCategory = (total) => total >= 4000 ? 'ANCHOR' : total >= 1000 ? 'ALLIED' : 'SCOUT'

function CategoryBadge({ cat }) {
  const cc = CAT_COLORS[cat] || CAT_COLORS.SCOUT
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:2, fontSize:9, letterSpacing:2, background:cc.bg, color:cc.color, border:`1px solid ${cc.border}` }}>
      {CAT_LABELS[cat]}
    </span>
  )
}

export default function Clients({ orders, clients, setView, setEditOrder, onNewOrderFromClient, onUpsertClient }) {
  const [selectedClient, setSelectedClient] = useState(null)
  const [saving, setSaving] = useState(false)

  const overrideMap = {}
  clients.forEach(c => { overrideMap[c.name] = c })

  const clientMap = {}
  orders.forEach(o => {
    const tot = orderTotal(o)
    if (!clientMap[o.client]) {
      clientMap[o.client] = {
        name: o.client, email: o.clientEmail||'', phone: o.clientPhone||'',
        address: o.clientAddress||'', city: o.clientCity||'',
        country: o.clientCountry||'', contact: o.clientContact||'',
        orders: [], total: 0, pieces: 0, totalIstituzionale: 0, totalSoci: 0,
      }
    }
    clientMap[o.client].orders.push(o)
    clientMap[o.client].total += tot
    clientMap[o.client].pieces += o.pieces || 0
    if (o.orderType === 'soci') clientMap[o.client].totalSoci += tot
    else clientMap[o.client].totalIstituzionale += tot
  })

  const clientList = Object.values(clientMap).map(c => {
    const ov = overrideMap[c.name]
    const autoCategory = getAutoCategory(c.total)
    return {
      ...c,
      autoCategory,
      category: ov?.category_override || autoCategory,
      categoryOverride: ov?.category_override || null,
      shopAttivo: ov?.shop_attivo || false,
    }
  }).sort((a, b) => b.total - a.total)

  const selected = selectedClient ? clientList.find(c => c.name === selectedClient) : null
  const totalRevenue = clientList.reduce((a, c) => a + c.total, 0)
  const anchorCount = clientList.filter(c => c.category === 'ANCHOR').length
  const alliedCount = clientList.filter(c => c.category === 'ALLIED').length

  const handleCategorySelect = async (clientName, cat) => {
    const ov = overrideMap[clientName]
    const autoCategory = getAutoCategory(clientMap[clientName]?.total || 0)
    const newOverride = cat === autoCategory ? null : cat
    setSaving(true)
    await onUpsertClient(clientName, {
      category_override: newOverride,
      shop_attivo: ov?.shop_attivo || false,
    })
    setSaving(false)
  }

  const handleShopToggle = async (clientName, value) => {
    const ov = overrideMap[clientName]
    setSaving(true)
    await onUpsertClient(clientName, {
      category_override: ov?.category_override || null,
      shop_attivo: value,
    })
    setSaving(false)
  }

  return (
    <div>
      <div style={s.pageTitle}>Clienti</div>
      <div style={s.pageSub}>Panoramica commerciale club</div>

      <div style={s.grid4}>
        <StatCard label="Club in Archivio" value={clientList.length}/>
        <StatCard label="Fatturato Totale" value={`${totalRevenue.toLocaleString('it-IT',{maximumFractionDigits:0})} €`} accent sub="Tutti gli ordini"/>
        <StatCard label="ANCHOR Club" value={anchorCount} sub="Fatturato ≥ 4.000 €"/>
        <StatCard label="ALLIED Club" value={alliedCount} sub="Fatturato ≥ 1.000 €"/>
      </div>

      <div style={s.divider}/>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:CREAM,letterSpacing:2,marginBottom:20}}>Club Clienti</div>

      {clientList.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 0',color:MUTED}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24}}>Nessun cliente ancora</div>
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              {['Club','Ordini','Fatturato Tot.','Istituzionale','Soci / Shop','Categoria','Shop',''].map(h=>(
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientList.map(c => {
              const cc = CAT_COLORS[c.category] || CAT_COLORS.SCOUT
              const lastOrder = [...c.orders].sort((a,b)=>b.date?.localeCompare(a.date))[0]
              return (
                <tr key={c.name} style={{cursor:'pointer'}} onClick={()=>setSelectedClient(c.name)}>
                  <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:18}}>{c.name}</td>
                  <td style={{...s.td,textAlign:'center'}}>{c.orders.length}</td>
                  <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:GOLD}}>
                    {c.total.toLocaleString('it-IT',{minimumFractionDigits:2})} €
                  </td>
                  <td style={{...s.td,fontSize:13,color:MUTED}}>
                    {c.totalIstituzionale > 0 ? `${c.totalIstituzionale.toLocaleString('it-IT',{maximumFractionDigits:0})} €` : '—'}
                  </td>
                  <td style={{...s.td,fontSize:13,color:MUTED}}>
                    {c.totalSoci > 0 ? `${c.totalSoci.toLocaleString('it-IT',{maximumFractionDigits:0})} €` : '—'}
                  </td>
                  <td style={s.td}><CategoryBadge cat={c.category}/></td>
                  <td style={s.td}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:c.shopAttivo?GREEN:'rgba(255,255,255,0.15)',display:'inline-block'}}/>
                  </td>
                  <td style={s.td} onClick={e=>e.stopPropagation()}>
                    <button style={{...btnGoldStyle,padding:'4px 12px',fontSize:9}} onClick={()=>setSelectedClient(c.name)}>Apri</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {selected && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:500,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'40px 20px',overflowY:'auto'}}
          onClick={()=>setSelectedClient(null)}>
          <div style={{background:'#1e2d50',border:`1px solid ${BORDER}`,borderRadius:14,width:'100%',maxWidth:860,padding:0,overflow:'hidden'}}
            onClick={e=>e.stopPropagation()}>

            {/* Modal header */}
            <div style={{background:'rgba(255,255,255,0.04)',padding:'24px 32px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:CREAM,letterSpacing:2}}>{selected.name}</div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginTop:8}}>
                  <CategoryBadge cat={selected.category}/>
                  {selected.categoryOverride && (
                    <span style={{fontSize:9,letterSpacing:2,color:MUTED}}>OVERRIDE MANUALE</span>
                  )}
                  {selected.shopAttivo && (
                    <span style={{fontSize:9,letterSpacing:2,color:GREEN,background:'rgba(74,158,110,0.12)',border:'1px solid rgba(74,158,110,0.3)',padding:'2px 8px',borderRadius:2}}>SHOP ATTIVO</span>
                  )}
                </div>
              </div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <button style={btnStyle(true)} onClick={()=>{
                  setSelectedClient(null)
                  onNewOrderFromClient({
                    name:selected.name, email:selected.email, phone:selected.phone,
                    address:selected.address, city:selected.city,
                    country:selected.country, contact:selected.contact,
                  })
                }}>+ Nuovo Ordine</button>
                <button onClick={()=>setSelectedClient(null)} style={{background:'none',border:'none',color:MUTED,fontSize:24,cursor:'pointer',lineHeight:1}}>×</button>
              </div>
            </div>

            <div style={{padding:'24px 32px'}}>
              {/* Anagrafica */}
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

              {/* Stats grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:20}}>
                {[
                  {l:'Fatturato Totale', v:`€ ${selected.total.toLocaleString('it-IT',{minimumFractionDigits:2})}`, color:GOLD},
                  {l:'Istituzionale',    v:`€ ${selected.totalIstituzionale.toLocaleString('it-IT',{minimumFractionDigits:2})}`, color:CREAM},
                  {l:'Soci / Shop',      v:`€ ${selected.totalSoci.toLocaleString('it-IT',{minimumFractionDigits:2})}`, color:'#7aaee8'},
                  {l:'Pezzi Totali',     v:selected.pieces, color:CREAM},
                ].map(item=>(
                  <div key={item.l} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${BORDER}`,borderRadius:8,padding:'14px 16px'}}>
                    <div style={{fontSize:9,letterSpacing:2,color:MUTED,marginBottom:6}}>{item.l}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:item.color}}>{item.v}</div>
                  </div>
                ))}
              </div>

              {/* Revenue split bar */}
              {selected.total > 0 && (
                <div style={{marginBottom:20}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:9,letterSpacing:2,color:MUTED}}>SPLIT FATTURATO</span>
                    <span style={{fontSize:9,color:MUTED}}>{selected.totalIstituzionale>0?Math.round(selected.totalIstituzionale/selected.total*100):0}% Ist. · {selected.totalSoci>0?Math.round(selected.totalSoci/selected.total*100):0}% Soci</span>
                  </div>
                  <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden',display:'flex'}}>
                    <div style={{width:`${Math.min(100,selected.totalIstituzionale/selected.total*100)}%`,background:GOLD,transition:'width 0.4s'}}/>
                    <div style={{width:`${Math.min(100,selected.totalSoci/selected.total*100)}%`,background:'#7aaee8',opacity:0.7,transition:'width 0.4s'}}/>
                  </div>
                </div>
              )}

              {/* Category override + Shop Attivo */}
              <div style={{...s.card,marginBottom:20}}>
                <div style={s.cardTitle}>Classificazione</div>
                <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                  {(['ANCHOR','ALLIED','SCOUT']).map(cat => {
                    const cc = CAT_COLORS[cat]
                    const isActive = selected.category === cat
                    const isAuto = selected.autoCategory === cat
                    return (
                      <button key={cat} onClick={()=>!saving&&handleCategorySelect(selected.name, cat)}
                        style={{padding:'8px 20px',borderRadius:3,border:`1px solid ${isActive?cc.border:BORDER}`,background:isActive?cc.bg:'transparent',color:isActive?cc.color:MUTED,cursor:saving?'wait':'pointer',fontSize:9,letterSpacing:2,fontWeight:isActive?700:400}}>
                        {CAT_LABELS[cat]}{isAuto?' (auto)':''}
                      </button>
                    )
                  })}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div onClick={()=>!saving&&handleShopToggle(selected.name, !selected.shopAttivo)}
                    style={{width:40,height:22,borderRadius:11,position:'relative',cursor:saving?'wait':'pointer',background:selected.shopAttivo?GREEN:'rgba(255,255,255,0.12)',transition:'background 0.2s',flexShrink:0}}>
                    <div style={{position:'absolute',top:3,left:selected.shopAttivo?21:3,width:16,height:16,borderRadius:'50%',background:'white',transition:'left 0.2s'}}/>
                  </div>
                  <span style={{fontSize:12,color:CREAM}}>Shop Attivo</span>
                  <span style={{fontSize:10,color:MUTED}}>{selected.shopAttivo?'Sì':'No'}</span>
                </div>
              </div>

              {/* Order history */}
              <div style={s.cardTitle}>Storico Ordini</div>
              <table style={s.table}>
                <thead>
                  <tr>{['Codice','Data','Tipo','Stato','Pezzi','Totale',''].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[...selected.orders].sort((a,b)=>b.date?.localeCompare(a.date)).map(o=>{
                    const {total:tot}=paymentSummary(o)
                    return (
                      <tr key={o.id}>
                        <td style={{...s.td,fontSize:11,color:MUTED,letterSpacing:1}}>{o.id}</td>
                        <td style={{...s.td,fontSize:12}}>{o.date}</td>
                        <td style={s.td}>
                          <span style={{fontSize:9,letterSpacing:1,color:o.orderType==='soci'?'#7aaee8':MUTED}}>{o.orderType==='soci'?'Soci/Shop':'Istituzionale'}</span>
                        </td>
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
