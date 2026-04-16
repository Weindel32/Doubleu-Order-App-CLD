import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, NAVY, GREEN } from '../tokens.js'
import { s, badgeStyle, btnStyle, btnGoldStyle } from '../tokens.js'
import { orderTotal, paymentSummary, daysUntilDelivery, needsAlert } from '../utils/helpers.js'
import { generateProductionPDF } from '../utils/pdfProduction.js'
import { generateClientPDF }     from '../utils/pdfClient.js'
import { exportSizesCSV, exportAllOrdersCSV } from '../utils/exportCSV.js'

export default function Orders({ orders, setView, setEditOrder, onDelete }) {
  const [filter, setFilter] = useState('Tutti')
  const [search, setSearch] = useState('')
  const filters = ['Tutti','Preventivo','Confermato','In Produzione','Consegna Parziale','Consegnato']

  const filtered = orders.filter(o => {
    const matchFilter = filter === 'Tutti' || o.status === filter.toUpperCase()
    const matchSearch = !search || o.client.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const openPDF = (gen, order) => {
    const h = gen(order); const w = window.open('','_blank'); w.document.write(h); w.document.close()
  }

  return (
    <div>
      <div style={s.topBar}>
        <div>
          <div style={s.pageTitle}>Archivio Ordini</div>
          <div style={s.pageSub}>{orders.length} ordini in archivio</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button style={{...btnStyle(false),color:'#7aaee8',border:'1px solid rgba(122,174,232,0.3)',background:'rgba(122,174,232,0.06)',padding:'9px 18px'}}
            onClick={()=>exportAllOrdersCSV(orders)}>↓ Export CSV</button>
          <button style={btnStyle(true)} onClick={()=>{setEditOrder(null);setView('new')}}>+ Nuovo Ordine</button>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,gap:16,flexWrap:'wrap'}}>
        <input style={{...s.input,width:260,padding:'9px 14px'}} value={search}
          onChange={e=>setSearch(e.target.value)} placeholder="Cerca per cliente o codice..."/>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {filters.map(f=>(
            <button key={f} style={{padding:'7px 14px',borderRadius:2,border:'none',cursor:'pointer',fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:2,textTransform:'uppercase',background:filter===f?GOLD:'rgba(255,255,255,0.05)',color:filter===f?NAVY:MUTED,fontWeight:filter===f?700:400,transition:'all 0.2s'}}
              onClick={()=>setFilter(f)}>{f}</button>
          ))}
        </div>
        <div style={{fontSize:10,color:MUTED,letterSpacing:2}}>{filtered.length} risultati</div>
      </div>

      {filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 0',color:MUTED}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,marginBottom:8}}>Nessun ordine trovato</div>
          <div style={{fontSize:11,letterSpacing:1}}>Modifica i filtri o la ricerca</div>
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>{['Cliente','Codice','Consegna','Stato','Pezzi','Totale €','Pagamenti','Azioni'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(o=>{
              const {paid,pending,total:tot} = paymentSummary(o)
              const days  = daysUntilDelivery(o)
              const alert = needsAlert(o)
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
                    {tot>0?<div>
                      <div style={{fontSize:9,color:GREEN}}>✓ {paid.toLocaleString('it-IT',{maximumFractionDigits:0})} €</div>
                      {pending>0&&<div style={{fontSize:9,color:GOLD}}>⧖ {pending.toLocaleString('it-IT',{maximumFractionDigits:0})} €</div>}
                      <div style={{height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,marginTop:4,overflow:'hidden',display:'flex',width:80}}>
                        <div style={{width:`${tot>0?Math.min(100,(paid/tot)*100):0}%`,background:GREEN}}/>
                        <div style={{width:`${tot>0?Math.min(100,(pending/tot)*100):0}%`,background:GOLD,opacity:0.6}}/>
                      </div>
                    </div>:<span style={{color:MUTED,fontSize:10}}>—</span>}
                  </td>
                  <td style={s.td}>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      <button style={{...btnGoldStyle,padding:'4px 8px',fontSize:8}} onClick={()=>{setEditOrder(o);setView('new')}}>Apri</button>
                      <button style={{padding:'4px 8px',fontSize:8,border:'1px solid rgba(196,98,58,0.4)',background:'rgba(196,98,58,0.08)',color:CLAY,borderRadius:3,cursor:'pointer'}} onClick={()=>openPDF(generateProductionPDF,o)}>Prod.</button>
                      <button style={{padding:'4px 8px',fontSize:8,border:`1px solid rgba(184,150,90,0.3)`,background:'rgba(184,150,90,0.06)',color:GOLD,borderRadius:3,cursor:'pointer'}} onClick={()=>openPDF(generateClientPDF,o)}>Cliente</button>
                      <button style={{padding:'4px 8px',fontSize:8,border:'1px solid rgba(122,174,232,0.3)',background:'rgba(122,174,232,0.06)',color:'#7aaee8',borderRadius:3,cursor:'pointer'}} onClick={()=>exportSizesCSV(o)}>CSV</button>
                      <button style={{padding:'4px 8px',fontSize:8,border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.06)',color:'#ef4444',borderRadius:3,cursor:'pointer'}} onClick={()=>onDelete(o.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
