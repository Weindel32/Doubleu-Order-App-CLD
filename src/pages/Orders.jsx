import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, NAVY, GREEN } from '../tokens.js'
import { s, badgeStyle, btnStyle, btnGoldStyle } from '../tokens.js'
import { orderTotal, paymentSummary, daysUntilDelivery, needsAlert } from '../utils/helpers.js'
import { generateProductionPDF } from '../utils/pdfProduction.js'
import { generateClientPDF }     from '../utils/pdfClient.js'
import { generateDeliveryPDF }   from '../utils/pdfDelivery.js'
import { exportSizesCSV, exportAllOrdersCSV } from '../utils/exportCSV.js'
import { quickUpdateStatus, quickTogglePayment } from '../lib/dataService.js'
import { BORDER } from '../tokens.js'
import { STATUS_COLORS, ORDER_STATUSES } from '../tokens.js'

function StatusSelector({ order, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const handleSelect = async (newStatus) => {
    if (newStatus === order.status) { setOpen(false); return }
    setSaving(true)
    const ok = await quickUpdateStatus(order.id, newStatus)
    if (ok) onStatusChange(order.id, newStatus)
    setSaving(false); setOpen(false)
  }
  return (
    <div style={{ position:'relative' }}>
      <div onClick={() => !saving && setOpen(!open)} style={{ cursor: saving?'wait':'pointer' }}>
        <span style={{ ...badgeStyle(order.status), cursor:'pointer' }}>{saving?'...':order.status} {!saving&&'▾'}</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, zIndex:100, marginTop:4, background:'#1e2d50', border:`1px solid ${BORDER}`, borderRadius:8, padding:6, minWidth:180, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
          {ORDER_STATUSES.map(st => {
            const sc = STATUS_COLORS[st] || STATUS_COLORS['PREVENTIVO']
            return <div key={st} onClick={()=>handleSelect(st)} style={{ padding:'8px 12px', borderRadius:4, cursor:'pointer', fontSize:9, letterSpacing:2, fontWeight:700, color:sc.color, background:order.status===st?sc.bg:'transparent', transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=sc.bg}
              onMouseLeave={e=>e.currentTarget.style.background=order.status===st?sc.bg:'transparent'}>
              {st}
            </div>
          })}
        </div>
      )}
    </div>
  )
}

function PaymentQuick({ order, onPaymentToggle }) {
  const { paid, pending, total } = paymentSummary(order)
  const [saving, setSaving] = useState(null)
  const toggle = async (payment) => {
    setSaving(payment.id)
    const ok = await quickTogglePayment(payment.id, !payment.paid)
    if (ok) onPaymentToggle(order.id, payment.id, !payment.paid)
    setSaving(null)
  }
  if (total === 0) return <span style={{ color:MUTED, fontSize:10 }}>—</span>
  return (
    <div>
      {order.payments.map(p => (
        <div key={p.id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
          <div onClick={()=>saving!==p.id&&toggle(p)} style={{ width:14, height:14, borderRadius:'50%', cursor:'pointer', flexShrink:0, border:`1.5px solid ${p.paid?GREEN:GOLD}`, background:p.paid?GREEN:'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', opacity:saving===p.id?0.5:1 }}>
            {p.paid&&<span style={{ color:'white', fontSize:8, lineHeight:1 }}>✓</span>}
          </div>
          <span style={{ fontSize:9, color:p.paid?GREEN:GOLD }}>€ {(p.amount||0).toLocaleString('it-IT',{maximumFractionDigits:0})} {p.type}</span>
        </div>
      ))}
      <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, marginTop:4, overflow:'hidden', display:'flex', width:80 }}>
        <div style={{ width:`${total>0?Math.min(100,(paid/total)*100):0}%`, background:GREEN }}/>
        <div style={{ width:`${total>0?Math.min(100,(pending/total)*100):0}%`, background:GOLD, opacity:0.6 }}/>
      </div>
    </div>
  )
}

export default function Orders({ orders, setView, setEditOrder, onDelete, onOrdersChange }) {
  const [filter, setFilter]   = useState('Tutti')
  const [search, setSearch]   = useState('')
  const [sortBy, setSortBy]   = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const filters = ['Tutti','Preventivo','Confermato','In Produzione','Consegna Parziale','Consegnato']

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const sortIcon = (col) => sortBy===col ? (sortDir==='asc'?'↑':'↓') : '↕'

  const filtered = orders
    .filter(o => {
      const matchFilter = filter==='Tutti' || o.status===filter.toUpperCase()
      const matchSearch = !search || o.client.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase())
      return matchFilter && matchSearch
    })
    .sort((a, b) => {
      let av, bv
      if (sortBy==='client')   { av=a.client||''; bv=b.client||'' }
      else if (sortBy==='date')     { av=a.date||''; bv=b.date||'' }
      else if (sortBy==='delivery') { av=a.deliveryDate||''; bv=b.deliveryDate||'' }
      else if (sortBy==='total')    { av=orderTotal(a); bv=orderTotal(b) }
      else if (sortBy==='pieces')   { av=a.pieces||0; bv=b.pieces||0 }
      else { av=a.date||''; bv=b.date||'' }
      if (av<bv) return sortDir==='asc'?-1:1
      if (av>bv) return sortDir==='asc'?1:-1
      return 0
    })

  const openPDF = (gen, order) => {
    const h=gen(order); const w=window.open('','_blank'); w.document.write(h); w.document.close()
  }

  const handleStatusChange   = (orderId, newStatus) => onOrdersChange(orders.map(o=>o.id===orderId?{...o,status:newStatus}:o))
  const handlePaymentToggle  = (orderId, paymentId, newPaid) => onOrdersChange(orders.map(o=>o.id!==orderId?o:{...o,payments:o.payments.map(p=>p.id===paymentId?{...p,paid:newPaid}:p)}))

  const thStyle = (col) => ({
    ...s.th, cursor:'pointer', userSelect:'none',
    color: sortBy===col ? GOLD : MUTED,
  })

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
        <input style={{...s.input,width:260,padding:'9px 14px'}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca per cliente o codice..."/>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {filters.map(f=>(
            <button key={f} style={{padding:'7px 14px',borderRadius:2,border:'none',cursor:'pointer',fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:2,textTransform:'uppercase',background:filter===f?GOLD:'rgba(255,255,255,0.05)',color:filter===f?NAVY:MUTED,fontWeight:filter===f?700:400}}
              onClick={()=>setFilter(f)}>{f}</button>
          ))}
        </div>
        <div style={{fontSize:10,color:MUTED,letterSpacing:2}}>{filtered.length} risultati</div>
      </div>

      {filtered.length===0 ? (
        <div style={{textAlign:'center',padding:'60px 0',color:MUTED}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,marginBottom:8}}>Nessun ordine trovato</div>
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={thStyle('client')} onClick={()=>handleSort('client')}>Cliente {sortIcon('client')}</th>
              <th style={s.th}>Codice</th>
              <th style={thStyle('delivery')} onClick={()=>handleSort('delivery')}>Consegna {sortIcon('delivery')}</th>
              <th style={s.th}>Stato</th>
              <th style={thStyle('pieces')} onClick={()=>handleSort('pieces')}>Pezzi {sortIcon('pieces')}</th>
              <th style={thStyle('total')} onClick={()=>handleSort('total')}>Totale € {sortIcon('total')}</th>
              <th style={s.th}>Pagamenti</th>
              <th style={s.th}>PDF</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o=>{
              const {total:tot} = paymentSummary(o)
              const days  = daysUntilDelivery(o)
              const alert = needsAlert(o)
              return (
                <tr key={o.id} style={{background:alert?'rgba(196,98,58,0.04)':'transparent'}}>
                  <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>
                    {alert&&<span style={{color:CLAY,marginRight:6}}>⚠</span>}
                    <span style={{cursor:'pointer'}} onClick={()=>{setEditOrder(o);setView('new')}}>{o.client}</span>
                  </td>
                  <td style={{...s.td,color:MUTED,fontSize:11,letterSpacing:1}}>{o.id}</td>
                  <td style={{...s.td,fontSize:11,color:days!==null&&days<=7&&o.status!=='CONSEGNATO'?CLAY:MUTED}}>
                    {o.deliveryDate||'—'}
                    {days!==null&&o.status!=='CONSEGNATO'&&<div style={{fontSize:9,marginTop:2}}>{days<0?`scad.${Math.abs(days)}gg`:days===0?'oggi':`${days}gg`}</div>}
                  </td>
                  <td style={s.td}><StatusSelector order={o} onStatusChange={handleStatusChange}/></td>
                  <td style={{...s.td,textAlign:'center'}}>{o.pieces}</td>
                  <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:GOLD}}>
                    {tot.toLocaleString('it-IT',{minimumFractionDigits:2})} €
                  </td>
                  <td style={s.td}><PaymentQuick order={o} onPaymentToggle={handlePaymentToggle}/></td>
                  <td style={s.td}>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      <button style={{...btnGoldStyle,padding:'4px 8px',fontSize:8}} onClick={()=>{setEditOrder(o);setView('new')}}>Apri</button>
                      <button style={{padding:'4px 8px',fontSize:8,border:'1px solid rgba(196,98,58,0.4)',background:'rgba(196,98,58,0.08)',color:CLAY,borderRadius:3,cursor:'pointer'}} onClick={()=>openPDF(generateProductionPDF,o)}>Prod.</button>
                      <button style={{padding:'4px 8px',fontSize:8,border:`1px solid rgba(184,150,90,0.3)`,background:'rgba(184,150,90,0.06)',color:GOLD,borderRadius:3,cursor:'pointer'}} onClick={()=>openPDF(generateClientPDF,o)}>Cliente</button>
                      <button style={{padding:'4px 8px',fontSize:8,border:'1px solid rgba(122,174,232,0.3)',background:'rgba(122,174,232,0.06)',color:'#7aaee8',borderRadius:3,cursor:'pointer'}} onClick={()=>openPDF(generateDeliveryPDF,o)}>Bolla</button>
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
