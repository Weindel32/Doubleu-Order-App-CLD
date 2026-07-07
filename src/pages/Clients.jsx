import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN } from '../tokens.js'
import { s, badgeStyle, btnStyle, btnGoldStyle } from '../tokens.js'
import StatCard from '../components/StatCard.jsx'
import { orderTotal, paymentSummary } from '../utils/helpers.js'

const TIER_COLORS = {
  ANCHOR: { bg: 'rgba(184,150,90,0.18)', color: GOLD,      border: 'rgba(184,150,90,0.35)' },
  ALLIED: { bg: 'rgba(90,130,184,0.18)', color: '#7aaee8', border: 'rgba(90,130,184,0.35)' },
  SCOUT:  { bg: 'rgba(196,98,58,0.15)',  color: CLAY,      border: 'rgba(196,98,58,0.3)'  },
}
const getTier = (total) => total >= 4000 ? 'ANCHOR' : total >= 1000 ? 'ALLIED' : 'SCOUT'

const CAT_COLORS = {
  circolo:     { bg: 'rgba(90,130,184,0.15)', color: '#7aaee8', border: 'rgba(90,130,184,0.3)' },
  scuola:      { bg: 'rgba(74,158,110,0.15)', color: GREEN,     border: 'rgba(74,158,110,0.3)' },
  negozio:     { bg: 'rgba(184,150,90,0.15)', color: GOLD,      border: 'rgba(184,150,90,0.3)' },
  rivenditore: { bg: 'rgba(196,98,58,0.15)',  color: CLAY,      border: 'rgba(196,98,58,0.3)'  },
}
const DB_CATEGORIES = ['circolo', 'scuola', 'negozio', 'rivenditore']

function TierBadge({ tier }) {
  const tc = TIER_COLORS[tier] || TIER_COLORS.SCOUT
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:2, fontSize:9, letterSpacing:2, background:tc.bg, color:tc.color, border:`1px solid ${tc.border}` }}>
      {tier}
    </span>
  )
}

function CatChip({ cat }) {
  if (!cat) return null
  const cc = CAT_COLORS[cat] || {}
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:2, fontSize:9, letterSpacing:1, background:cc.bg||'rgba(255,255,255,0.06)', color:cc.color||MUTED, border:`1px solid ${cc.border||BORDER}` }}>
      {cat}
    </span>
  )
}

function InfoField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize:9, color:MUTED, letterSpacing:2, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, color:CREAM }}>{value}</div>
    </div>
  )
}

const inp = { ...s.input }

export default function Clients({ orders, clients, setView, setEditOrder, onNewOrderFromClient, onNewQuoteFromClient, onUpdateClient, onCreateClient, onLinkOrder }) {
  const [selectedId, setSelectedId]   = useState(null)
  const [editForm,   setEditForm]     = useState(null)
  const [editSaving, setEditSaving]   = useState(false)
  const [linking,    setLinking]      = useState(false)
  const [newForm,    setNewForm]      = useState(null)
  const [newSaving,  setNewSaving]    = useState(false)

  const enriched = clients.map(c => {
    const linked    = orders.filter(o => o.clientId === c.id)
    const textMatch = orders.filter(o => !o.clientId && o.client === c.name)
    const allOrders = [...linked, ...textMatch]
    const confirmed = allOrders.filter(o => o.status !== 'PREVENTIVO')
    const total     = confirmed.reduce((sum, o) => sum + orderTotal(o), 0)
    const pieces    = confirmed.reduce((sum, o) => sum + (o.pieces || 0), 0)
    const totalIst  = confirmed.filter(o => o.orderType !== 'soci').reduce((sum, o) => sum + orderTotal(o), 0)
    const totalSoci = confirmed.filter(o => o.orderType === 'soci').reduce((sum, o)  => sum + orderTotal(o), 0)
    const unlinkable = textMatch.filter(o => o.status !== 'PREVENTIVO')
    return { ...c, confirmed, total, pieces, totalIst, totalSoci, tier: getTier(total), unlinkable }
  }).sort((a, b) => b.total - a.total)

  const selected     = selectedId ? enriched.find(c => c.id === selectedId) : null
  const totalRevenue = enriched.reduce((s, c) => s + c.total, 0)
  const anchorCount  = enriched.filter(c => c.tier === 'ANCHOR').length
  const alliedCount  = enriched.filter(c => c.tier === 'ALLIED').length

  const closeModal = () => { setSelectedId(null); setEditForm(null) }

  const openEdit = () => {
    if (!selected) return
    setEditForm({
      name:        selected.name,
      category:    selected.category   || '',
      province:    selected.province   || '',
      country:     selected.country    || 'Italia',
      vat_number:  selected.vat_number || '',
      email:       selected.email      || '',
      phone:       selected.phone      || '',
      shop_attivo: selected.shop_attivo || false,
    })
  }

  const handleSave = async () => {
    if (!editForm || !selected || !editForm.name.trim()) return
    setEditSaving(true)
    await onUpdateClient(selected.id, {
      name:        editForm.name.trim(),
      category:    editForm.category   || null,
      province:    editForm.province   || null,
      country:     editForm.country    || 'Italia',
      vat_number:  editForm.vat_number || null,
      email:       editForm.email      || null,
      phone:       editForm.phone      || null,
      shop_attivo: editForm.shop_attivo || false,
    })
    setEditForm(null)
    setEditSaving(false)
  }

  const handleLinkOne = async (orderId) => {
    if (!selected) return
    setLinking(true)
    await onLinkOrder(orderId, selected.id)
    setLinking(false)
  }

  const handleLinkAll = async () => {
    if (!selected) return
    setLinking(true)
    for (const o of selected.unlinkable) await onLinkOrder(o.id, selected.id)
    setLinking(false)
  }

  const handleCreateNew = async () => {
    if (!newForm?.name?.trim()) return
    setNewSaving(true)
    await onCreateClient({
      name:       newForm.name.trim(),
      category:   newForm.category   || null,
      province:   newForm.province   || null,
      country:    newForm.country    || 'Italia',
      vat_number: newForm.vat_number || null,
      email:      newForm.email      || null,
      phone:      newForm.phone      || null,
    })
    setNewForm(null)
    setNewSaving(false)
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={s.pageTitle}>Clienti</div>
          <div style={s.pageSub}>Anagrafica e storico commerciale</div>
        </div>
        <button style={{ ...btnGoldStyle, marginTop:8 }}
          onClick={() => setNewForm({ name:'', category:'', province:'', country:'Italia', vat_number:'', email:'', phone:'' })}>
          + Nuovo Cliente
        </button>
      </div>

      <div style={s.grid4}>
        <StatCard label="Clienti in Archivio" value={clients.length}/>
        <StatCard label="Fatturato Totale"     value={`${totalRevenue.toLocaleString('it-IT',{maximumFractionDigits:0})} €`} accent sub="Ordini confermati"/>
        <StatCard label="ANCHOR"               value={anchorCount} sub="Fatturato ≥ 4.000 €"/>
        <StatCard label="ALLIED"               value={alliedCount} sub="Fatturato ≥ 1.000 €"/>
      </div>

      <div style={s.divider}/>

      {clients.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:MUTED }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24 }}>Nessun cliente ancora</div>
          <div style={{ fontSize:12, marginTop:8 }}>Clicca "+ Nuovo Cliente" per aggiungerne uno</div>
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              {['Cliente','Cat.','Paese','Ordini','Fatturato','Tier','Shop',''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enriched.map(c => (
              <tr key={c.id} style={{ cursor:'pointer' }} onClick={() => setSelectedId(c.id)}>
                <td style={{ ...s.td, fontFamily:"'Cormorant Garamond',serif", fontSize:18 }}>
                  {c.name}
                  {c.unlinkable.length > 0 && (
                    <span style={{ marginLeft:8, fontSize:9, letterSpacing:1, color:CLAY, background:'rgba(196,98,58,0.1)', border:'1px solid rgba(196,98,58,0.3)', padding:'2px 6px', borderRadius:2, verticalAlign:'middle' }}>
                      {c.unlinkable.length} da collegare
                    </span>
                  )}
                </td>
                <td style={s.td}><CatChip cat={c.category}/></td>
                <td style={{ ...s.td, fontSize:12, color:MUTED }}>{c.country || '—'}</td>
                <td style={{ ...s.td, textAlign:'center' }}>{c.confirmed.length}</td>
                <td style={{ ...s.td, fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:GOLD }}>
                  {c.total > 0 ? `${c.total.toLocaleString('it-IT',{minimumFractionDigits:2})} €` : '—'}
                </td>
                <td style={s.td}><TierBadge tier={c.tier}/></td>
                <td style={s.td} onClick={e => e.stopPropagation()}>
                  <div
                    title={c.shop_attivo ? 'Shop attivo — clicca per disattivare' : 'Shop non attivo — clicca per attivare'}
                    onClick={() => onUpdateClient(c.id, { shop_attivo: !c.shop_attivo })}
                    style={{ width:36, height:20, borderRadius:10, position:'relative', cursor:'pointer', background: c.shop_attivo ? GREEN : 'rgba(255,255,255,0.12)', transition:'background 0.2s', flexShrink:0, display:'inline-block' }}>
                    <div style={{ position:'absolute', top:2, left: c.shop_attivo ? 18 : 2, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s' }}/>
                  </div>
                </td>
                <td style={s.td} onClick={e => e.stopPropagation()}>
                  <button style={{ ...btnGoldStyle, padding:'4px 12px', fontSize:9 }}
                    onClick={() => setSelectedId(c.id)}>Apri</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Client detail modal ───────────────────────────────────── */}
      {selected && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:500, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 20px', overflowY:'auto' }}
          onClick={closeModal}>
          <div style={{ background:'#1e2d50', border:`1px solid ${BORDER}`, borderRadius:14, width:'100%', maxWidth:880, overflow:'hidden' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background:'rgba(255,255,255,0.04)', padding:'24px 32px', borderBottom:`1px solid ${BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:CREAM, letterSpacing:2 }}>{selected.name}</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8, flexWrap:'wrap' }}>
                  <TierBadge tier={selected.tier}/>
                  {selected.category && <CatChip cat={selected.category}/>}
                  {selected.province && <span style={{ fontSize:11, color:MUTED }}>{selected.province}</span>}
                  {selected.country && selected.country !== 'Italia' && (
                    <span style={{ fontSize:11, color:MUTED }}>{selected.country}</span>
                  )}
                  {selected.shop_attivo && (
                    <span style={{ fontSize:9, letterSpacing:2, color:GREEN, background:'rgba(74,158,110,0.12)', border:'1px solid rgba(74,158,110,0.3)', padding:'2px 8px', borderRadius:2 }}>SHOP ATTIVO</span>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <button style={{ ...btnStyle(false), border:`1px solid ${CLAY}`, color:CLAY }} onClick={() => {
                  closeModal()
                  onNewQuoteFromClient({ name:selected.name, email:selected.email, phone:selected.phone, country:selected.country })
                }}>+ Preventivo</button>
                <button style={btnStyle(true)} onClick={() => {
                  closeModal()
                  onNewOrderFromClient({ name:selected.name, email:selected.email, phone:selected.phone, country:selected.country })
                }}>+ Ordine</button>
                <button onClick={closeModal} style={{ background:'none', border:'none', color:MUTED, fontSize:24, cursor:'pointer', lineHeight:1 }}>×</button>
              </div>
            </div>

            <div style={{ padding:'24px 32px' }}>

              {/* Anagrafica */}
              <div style={{ ...s.card, marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: editForm ? 16 : 12 }}>
                  <div style={s.cardTitle}>Anagrafica</div>
                  {!editForm && (
                    <button style={{ ...btnStyle(false), padding:'4px 14px', fontSize:9 }} onClick={openEdit}>Modifica</button>
                  )}
                </div>

                {editForm ? (
                  <div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                      <div style={{ gridColumn:'span 2' }}>
                        <label style={s.label}>Nome / Ragione Sociale *</label>
                        <input style={inp} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name:e.target.value }))}/>
                      </div>
                      <div>
                        <label style={s.label}>Categoria</label>
                        <select style={{ ...inp, cursor:'pointer' }} value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category:e.target.value }))}>
                          <option value="">— nessuna —</option>
                          {DB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={s.label}>P.IVA</label>
                        <input style={inp} value={editForm.vat_number} onChange={e => setEditForm(f => ({ ...f, vat_number:e.target.value }))}/>
                      </div>
                      <div>
                        <label style={s.label}>Email</label>
                        <input style={inp} type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email:e.target.value }))}/>
                      </div>
                      <div>
                        <label style={s.label}>Telefono</label>
                        <input style={inp} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone:e.target.value }))}/>
                      </div>
                      <div>
                        <label style={s.label}>Provincia</label>
                        <input style={inp} value={editForm.province} onChange={e => setEditForm(f => ({ ...f, province:e.target.value }))} placeholder="es. MI"/>
                      </div>
                      <div>
                        <label style={s.label}>Paese</label>
                        <input style={inp} value={editForm.country} onChange={e => setEditForm(f => ({ ...f, country:e.target.value }))}/>
                      </div>
                      <div style={{ gridColumn:'span 2', display:'flex', alignItems:'center', gap:12, paddingTop:4 }}>
                        <div onClick={() => setEditForm(f => ({ ...f, shop_attivo: !f.shop_attivo }))}
                          style={{ width:40, height:22, borderRadius:11, position:'relative', cursor:'pointer', background: editForm.shop_attivo ? GREEN : 'rgba(255,255,255,0.12)', transition:'background 0.2s', flexShrink:0 }}>
                          <div style={{ position:'absolute', top:3, left: editForm.shop_attivo ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s' }}/>
                        </div>
                        <span style={{ fontSize:12, color: editForm.shop_attivo ? GREEN : MUTED }}>Shop Online Attivo</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button style={{ ...btnGoldStyle, padding:'8px 24px' }} onClick={handleSave} disabled={editSaving || !editForm.name.trim()}>
                        {editSaving ? 'Salvataggio…' : 'Salva'}
                      </button>
                      <button style={{ ...btnStyle(false), padding:'8px 20px' }} onClick={() => setEditForm(null)}>Annulla</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {selected.email      && <InfoField label="EMAIL"    value={selected.email}/>}
                    {selected.phone      && <InfoField label="TELEFONO" value={selected.phone}/>}
                    {selected.vat_number && <InfoField label="P.IVA"    value={selected.vat_number}/>}
                    {selected.province   && <InfoField label="PROVINCIA" value={selected.province}/>}
                    {selected.country    && <InfoField label="PAESE"     value={selected.country}/>}
                    {!selected.email && !selected.phone && !selected.vat_number && (
                      <div style={{ gridColumn:'span 2', fontSize:12, color:MUTED, fontStyle:'italic' }}>
                        Nessun dato anagrafico — clicca Modifica per aggiungere
                      </div>
                    )}
                    <div style={{ gridColumn:'span 2', display:'flex', alignItems:'center', gap:12, paddingTop:4, borderTop:`1px solid ${BORDER}`, marginTop:4 }}>
                      <div onClick={() => onUpdateClient(selected.id, { shop_attivo: !selected.shop_attivo })}
                        style={{ width:40, height:22, borderRadius:11, position:'relative', cursor:'pointer', background: selected.shop_attivo ? GREEN : 'rgba(255,255,255,0.12)', transition:'background 0.2s', flexShrink:0 }}>
                        <div style={{ position:'absolute', top:3, left: selected.shop_attivo ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s' }}/>
                      </div>
                      <span style={{ fontSize:12, color: selected.shop_attivo ? GREEN : MUTED }}>Shop Online Attivo</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Revenue stats */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:20 }}>
                {[
                  { l:'Fatturato',     v: selected.total    > 0 ? `€ ${selected.total.toLocaleString('it-IT',{minimumFractionDigits:2})}` : '—', color:GOLD },
                  { l:'Istituzionale', v: selected.totalIst > 0 ? `€ ${selected.totalIst.toLocaleString('it-IT',{maximumFractionDigits:0})}` : '—', color:CREAM },
                  { l:'Soci / Shop',   v: selected.totalSoci > 0 ? `€ ${selected.totalSoci.toLocaleString('it-IT',{maximumFractionDigits:0})}` : '—', color:'#7aaee8' },
                  { l:'Pezzi',         v: selected.pieces || 0, color:CREAM },
                ].map(item => (
                  <div key={item.l} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${BORDER}`, borderRadius:8, padding:'14px 16px' }}>
                    <div style={{ fontSize:9, letterSpacing:2, color:MUTED, marginBottom:6 }}>{item.l}</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:item.color }}>{item.v}</div>
                  </div>
                ))}
              </div>

              {/* Ordini da collegare */}
              {selected.unlinkable.length > 0 && (
                <div style={{ ...s.card, marginBottom:20, borderColor:'rgba(196,98,58,0.4)' }}>
                  <div style={{ ...s.cardTitle, color:CLAY }}>
                    Ordini da Collegare ({selected.unlinkable.length})
                  </div>
                  <div style={{ fontSize:12, color:MUTED, marginBottom:12 }}>
                    Questi ordini hanno il nome corrispondente ma non sono ancora collegati via <code style={{color:GOLD}}>client_id</code>.
                  </div>
                  <table style={s.table}>
                    <thead>
                      <tr>{['Codice','Data','Stato','Totale',''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {selected.unlinkable.map(o => {
                        const { total:tot } = paymentSummary(o)
                        return (
                          <tr key={o.id}>
                            <td style={{ ...s.td, fontSize:11, color:MUTED, letterSpacing:1 }}>{o.id}</td>
                            <td style={{ ...s.td, fontSize:12 }}>{o.date}</td>
                            <td style={s.td}><span style={badgeStyle(o.status)}>{o.status}</span></td>
                            <td style={{ ...s.td, fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:GOLD }}>
                              {tot.toLocaleString('it-IT',{minimumFractionDigits:2})} €
                            </td>
                            <td style={s.td}>
                              <button
                                style={{ padding:'4px 14px', borderRadius:3, border:'none', cursor: linking ? 'wait' : 'pointer', fontSize:9, letterSpacing:1.5, background:'rgba(196,98,58,0.8)', color:CREAM }}
                                disabled={linking}
                                onClick={() => handleLinkOne(o.id)}>
                                {linking ? '…' : 'Collega'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {selected.unlinkable.length > 1 && (
                    <button
                      style={{ ...btnStyle(false), marginTop:12, fontSize:9, border:`1px solid ${CLAY}`, color:CLAY }}
                      disabled={linking}
                      onClick={handleLinkAll}>
                      {linking ? 'Collegamento…' : `Collega tutti (${selected.unlinkable.length})`}
                    </button>
                  )}
                </div>
              )}

              {/* Storico ordini */}
              {selected.confirmed.length > 0 && (
                <>
                  <div style={s.cardTitle}>Storico Ordini</div>
                  <table style={s.table}>
                    <thead>
                      <tr>{['Codice','Data','Tipo','Stato','Pezzi','Totale',''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {[...selected.confirmed].sort((a, b) => (b.date||'').localeCompare(a.date||'')).map(o => {
                        const { total:tot } = paymentSummary(o)
                        return (
                          <tr key={o.id}>
                            <td style={{ ...s.td, fontSize:11, color:MUTED, letterSpacing:1 }}>{o.id}</td>
                            <td style={{ ...s.td, fontSize:12 }}>{o.date}</td>
                            <td style={s.td}>
                              <span style={{ fontSize:9, letterSpacing:1, color: o.orderType === 'soci' ? '#7aaee8' : MUTED }}>
                                {o.orderType === 'soci' ? 'Soci/Shop' : 'Istituzionale'}
                              </span>
                            </td>
                            <td style={s.td}><span style={badgeStyle(o.status)}>{o.status}</span></td>
                            <td style={{ ...s.td, textAlign:'center' }}>{o.pieces}</td>
                            <td style={{ ...s.td, fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:GOLD }}>
                              {tot.toLocaleString('it-IT',{minimumFractionDigits:2})} €
                            </td>
                            <td style={s.td}>
                              <button style={{ ...btnGoldStyle, padding:'4px 10px', fontSize:8 }}
                                onClick={() => { setEditOrder(o); setView('new'); closeModal() }}>
                                Apri
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Nuovo cliente modal ───────────────────────────────────── */}
      {newForm && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}
          onClick={() => setNewForm(null)}>
          <div style={{ background:'#1e2d50', border:`1px solid ${BORDER}`, borderRadius:14, width:'100%', maxWidth:520, padding:32 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:CREAM, letterSpacing:2, marginBottom:20 }}>Nuovo Cliente</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={s.label}>Nome / Ragione Sociale *</label>
                <input style={inp} value={newForm.name} autoFocus
                  onChange={e => setNewForm(f => ({ ...f, name:e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleCreateNew()}/>
              </div>
              <div>
                <label style={s.label}>Categoria</label>
                <select style={{ ...inp, cursor:'pointer' }} value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category:e.target.value }))}>
                  <option value="">— nessuna —</option>
                  {DB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>P.IVA</label>
                <input style={inp} value={newForm.vat_number} onChange={e => setNewForm(f => ({ ...f, vat_number:e.target.value }))}/>
              </div>
              <div>
                <label style={s.label}>Email</label>
                <input style={inp} type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email:e.target.value }))}/>
              </div>
              <div>
                <label style={s.label}>Telefono</label>
                <input style={inp} value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone:e.target.value }))}/>
              </div>
              <div>
                <label style={s.label}>Provincia</label>
                <input style={inp} value={newForm.province} onChange={e => setNewForm(f => ({ ...f, province:e.target.value }))} placeholder="es. MI"/>
              </div>
              <div>
                <label style={s.label}>Paese</label>
                <input style={inp} value={newForm.country} onChange={e => setNewForm(f => ({ ...f, country:e.target.value }))}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...btnGoldStyle, padding:'8px 24px' }} onClick={handleCreateNew} disabled={newSaving || !newForm.name.trim()}>
                {newSaving ? 'Salvataggio…' : 'Crea Cliente'}
              </button>
              <button style={{ ...btnStyle(false), padding:'8px 20px' }} onClick={() => setNewForm(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
