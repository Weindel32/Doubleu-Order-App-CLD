import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN } from '../tokens.js'
import { s, btnStyle, btnGoldStyle } from '../tokens.js'
import StatCard from '../components/StatCard.jsx'

// ─── Config ──────────────────────────────────────────────────────
const STAGE_CFG = {
  contatto:     { color: MUTED,     border: 'rgba(138,154,181,0.3)',  bg: 'rgba(138,154,181,0.12)' },
  sample:       { color: '#7aaee8', border: 'rgba(90,130,184,0.35)',  bg: 'rgba(90,130,184,0.15)'  },
  negoziazione: { color: GOLD,      border: 'rgba(184,150,90,0.35)',  bg: 'rgba(184,150,90,0.15)'  },
  won:          { color: GREEN,     border: 'rgba(74,158,110,0.35)',  bg: 'rgba(74,158,110,0.15)'  },
  lost:         { color: CLAY,      border: 'rgba(196,98,58,0.3)',    bg: 'rgba(196,98,58,0.12)'   },
}
const STAGES = ['contatto','sample','negoziazione','won','lost']

const CT_CFG = {
  cliente:     { color: GOLD,     border: 'rgba(184,150,90,0.3)',  bg: 'rgba(184,150,90,0.15)'  },
  ambassador:  { color: '#7aaee8',border: 'rgba(90,130,184,0.35)', bg: 'rgba(90,130,184,0.15)'  },
  segnalatore: { color: GREEN,    border: 'rgba(74,158,110,0.3)',  bg: 'rgba(74,158,110,0.15)'  },
}
const CONTACT_TYPES   = ['cliente','ambassador','segnalatore']
const CHANNELS        = ['linkedin','referral','fiera','outbound','web','instagram','facebook']
const LANGUAGES       = ['it','de','es','en']
const ACT_TYPES       = ['email_sent','reply_received','sample_shipped','call','note']
const REWARD_TYPES    = ['prodotto','provvigione']

const ACT_LABELS = {
  email_sent:      '✉ Email inviata',
  reply_received:  '↩ Risposta ricevuta',
  sample_shipped:  '📦 Sample spedito',
  call:            '📞 Chiamata',
  note:            '📝 Nota',
}

const EMPTY_PROSPECT = () => ({
  name:'', category:'', city:'', province:'', country:'', channel_origin:'',
  stage:'contatto', deal_value_est:'', contact_name:'', contact_email:'',
  contact_phone:'', language:'', next_action_date:'', notes:'',
  contact_type:'cliente', referred_by:'', vincolo_altro_brand:false,
  relazione_pregressa:'',
})
const EMPTY_ACTIVITY = () => ({ type:'note', content:'', reward_type:'', reward_value:'' })

// ─── Sub-components ───────────────────────────────────────────────
function StageBadge({ stage }) {
  const c = STAGE_CFG[stage] || STAGE_CFG.contatto
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:2, fontSize:9, letterSpacing:2, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      {stage}
    </span>
  )
}

function CTChip({ ct }) {
  const c = CT_CFG[ct] || CT_CFG.cliente
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:2, fontSize:9, letterSpacing:1, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      {ct}
    </span>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize:9, color:MUTED, letterSpacing:2, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, color:CREAM }}>{value}</div>
    </div>
  )
}

const inp = { ...s.input }

// ─── Prospect form (create / edit) ───────────────────────────────
function ProspectForm({ form, setForm, prospects, onSave, onCancel, saving, title }) {
  const others = prospects.filter(p => p.id !== form.id)
  return (
    <div>
      <div style={{ background:'rgba(255,255,255,0.04)', padding:'20px 28px', borderBottom:`1px solid ${BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:CREAM, letterSpacing:2 }}>{title}</div>
        <button onClick={onCancel} style={{ background:'none', border:'none', color:MUTED, fontSize:24, cursor:'pointer', lineHeight:1 }}>×</button>
      </div>
      <div style={{ padding:'24px 28px', overflowY:'auto', maxHeight:'75vh' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

          <div style={{ gridColumn:'span 2' }}>
            <label style={s.label}>Nome / Ragione Sociale *</label>
            <input style={inp} value={form.name} autoFocus onChange={e => setForm(f => ({ ...f, name:e.target.value }))}/>
          </div>

          <div>
            <label style={s.label}>Tipo Contatto</label>
            <select style={{ ...inp, cursor:'pointer' }} value={form.contact_type} onChange={e => setForm(f => ({ ...f, contact_type:e.target.value }))}>
              {CONTACT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Stage</label>
            <select style={{ ...inp, cursor:'pointer' }} value={form.stage} onChange={e => setForm(f => ({ ...f, stage:e.target.value }))}>
              {STAGES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          <div>
            <label style={s.label}>Canale Origine</label>
            <select style={{ ...inp, cursor:'pointer' }} value={form.channel_origin} onChange={e => setForm(f => ({ ...f, channel_origin:e.target.value }))}>
              <option value="">— nessuno —</option>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Lingua</label>
            <select style={{ ...inp, cursor:'pointer' }} value={form.language} onChange={e => setForm(f => ({ ...f, language:e.target.value }))}>
              <option value="">—</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label style={s.label}>Referente</label>
            <input style={inp} value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name:e.target.value }))}/>
          </div>
          <div>
            <label style={s.label}>Email</label>
            <input style={inp} type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email:e.target.value }))}/>
          </div>
          <div>
            <label style={s.label}>Telefono</label>
            <input style={inp} value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone:e.target.value }))}/>
          </div>
          <div>
            <label style={s.label}>Valore Stimato (€)</label>
            <input style={inp} type="number" placeholder="es. 2500" value={form.deal_value_est} onChange={e => setForm(f => ({ ...f, deal_value_est:e.target.value }))}/>
          </div>

          <div>
            <label style={s.label}>Città</label>
            <input style={inp} value={form.city||''} onChange={e => setForm(f => ({ ...f, city:e.target.value }))}/>
          </div>
          <div>
            <label style={s.label}>Provincia</label>
            <input style={inp} value={form.province} onChange={e => setForm(f => ({ ...f, province:e.target.value }))} placeholder="es. MI"/>
          </div>
          <div>
            <label style={s.label}>Paese</label>
            <input style={inp} value={form.country} onChange={e => setForm(f => ({ ...f, country:e.target.value }))}/>
          </div>

          <div>
            <label style={s.label}>Prossima Azione</label>
            <input style={inp} type="date" value={form.next_action_date} onChange={e => setForm(f => ({ ...f, next_action_date:e.target.value }))}/>
          </div>
          <div>
            <label style={s.label}>Categoria</label>
            <input style={inp} value={form.category} placeholder="es. circolo, scuola…" onChange={e => setForm(f => ({ ...f, category:e.target.value }))}/>
          </div>

          <div style={{ gridColumn:'span 2' }}>
            <label style={s.label}>Segnalato da</label>
            <select style={{ ...inp, cursor:'pointer' }} value={form.referred_by} onChange={e => setForm(f => ({ ...f, referred_by:e.target.value }))}>
              <option value="">— nessuno —</option>
              {others.map(p => <option key={p.id} value={p.id}>{p.name} ({p.contact_type})</option>)}
            </select>
          </div>

          <div style={{ gridColumn:'span 2', display:'flex', alignItems:'center', gap:12 }}>
            <input type="checkbox" id="vincolo" checked={form.vincolo_altro_brand} onChange={e => setForm(f => ({ ...f, vincolo_altro_brand:e.target.checked }))} style={{ cursor:'pointer', width:16, height:16, accentColor:CLAY }}/>
            <label htmlFor="vincolo" style={{ fontSize:12, color:CREAM, cursor:'pointer' }}>Vincolo con altro brand</label>
          </div>

          <div style={{ gridColumn:'span 2' }}>
            <label style={s.label}>Relazione Pregressa</label>
            <textarea style={{ ...inp, minHeight:64, resize:'vertical' }} value={form.relazione_pregressa} onChange={e => setForm(f => ({ ...f, relazione_pregressa:e.target.value }))}/>
          </div>

          <div style={{ gridColumn:'span 2' }}>
            <label style={s.label}>Note</label>
            <textarea style={{ ...inp, minHeight:80, resize:'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes:e.target.value }))}/>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, marginTop:20 }}>
          <button style={{ ...btnGoldStyle, padding:'8px 24px' }} onClick={onSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
          <button style={{ ...btnStyle(false), padding:'8px 20px' }} onClick={onCancel}>Annulla</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────
export default function Prospects({ prospects, onUpsert, onAddActivity, onDelete }) {
  const [tab,         setTab]         = useState('club')
  const [search,      setSearch]      = useState('')
  const [filterCT,    setFilterCT]    = useState('all')
  const [filterStage, setFilterStage] = useState('all')
  const [selectedId,  setSelectedId]  = useState(null)
  const [editForm,    setEditForm]    = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [newForm,     setNewForm]     = useState(null)
  const [actForm,     setActForm]     = useState(null)
  const [actSaving,   setActSaving]   = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  const isRete   = tab === 'rete'
  const today    = new Date().toISOString().slice(0,10)
  const selected = selectedId ? prospects.find(p => p.id === selectedId) : null

  const clubs = prospects.filter(p => p.contact_type === 'cliente')
  const rete  = prospects.filter(p => p.contact_type !== 'cliente')

  const referredBy   = (id) => prospects.filter(x => x.referred_by === id)
  const rewardsTotal = (p)  => (p.prospect_activities || []).reduce((s,a) => s + (parseFloat(a.reward_value)||0), 0)

  const filtered = (isRete ? rete : clubs).filter(p => {
    const q = search.toLowerCase()
    if (q && !p.name.toLowerCase().includes(q) && !(p.contact_email||'').toLowerCase().includes(q)) return false
    if (!isRete && filterStage !== 'all' && p.stage        !== filterStage) return false
    if (isRete  && filterCT    !== 'all' && p.contact_type !== filterCT)    return false
    return true
  })

  const pipeline     = clubs.filter(p => !['won','lost'].includes(p.stage)).reduce((s,p) => s + (parseFloat(p.deal_value_est)||0), 0)
  const overdueCount = clubs.filter(p => p.next_action_date && p.next_action_date <= today && !['won','lost'].includes(p.stage)).length
  const totalReferrals = rete.reduce((s,m) => s + referredBy(m.id).length, 0)
  const totalRewards   = rete.reduce((s,m) => s + rewardsTotal(m), 0)
  const reteOverdue    = rete.filter(p => p.next_action_date && p.next_action_date <= today).length

  const closeModal = () => { setSelectedId(null); setEditForm(null); setActForm(null) }

  const handleSaveEdit = async () => {
    if (!editForm?.name?.trim()) return
    setSaving(true)
    await onUpsert(editForm)
    setEditForm(null)
    setSaving(false)
  }

  const handleCreate = async () => {
    if (!newForm?.name?.trim()) return
    setSaving(true)
    await onUpsert(newForm)
    setNewForm(null)
    setSaving(false)
  }

  const handleStageClick = async (stage) => {
    if (!selected) return
    const { prospect_activities, ...rest } = selected
    await onUpsert({ ...rest, stage })
  }

  const handleAddAct = async () => {
    if (!actForm || !selectedId) return
    setActSaving(true)
    await onAddActivity(selectedId, actForm)
    setActForm(null)
    setActSaving(false)
  }

  const handleDelete = async (p) => {
    if (!confirm(`Eliminare "${p.name}"? L'operazione non è reversibile.`)) return
    setDeleting(true)
    const ok = await onDelete(p.id)
    setDeleting(false)
    if (ok && selectedId === p.id) closeModal()
  }

  return (
    <div>
      {/* Top bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={s.pageTitle}>Prospects</div>
          <div style={s.pageSub}>Pipeline commerciale e segnalatori</div>
        </div>
        <button style={{ ...btnGoldStyle, marginTop:8 }}
          onClick={() => setNewForm({ ...EMPTY_PROSPECT(), contact_type: isRete ? 'segnalatore' : 'cliente' })}>
          {isRete ? '+ Nuovo Contatto' : '+ Nuovo Club'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${BORDER}`, marginBottom:24 }}>
        {[{ k:'club', label:`Pipeline Club (${clubs.length})` }, { k:'rete', label:`Ambassador / Referral (${rete.length})` }].map(t => (
          <button key={t.k} onClick={() => { setTab(t.k); setFilterStage('all'); setFilterCT('all') }}
            style={{ padding:'12px 24px', background:'transparent', border:'none', borderBottom: tab===t.k ? `2px solid ${GOLD}` : '2px solid transparent', color: tab===t.k ? GOLD : MUTED, fontSize:11, letterSpacing:2, textTransform:'uppercase', cursor:'pointer', marginBottom:-1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {isRete ? (
        <div style={s.grid4}>
          <StatCard label="Contatti"       value={rete.length} sub="Ambassador e referral"/>
          <StatCard label="Segnalazioni"   value={totalReferrals} sub="Club presentati"/>
          <StatCard label="Riconoscimenti" value={totalRewards > 0 ? `€ ${totalRewards.toLocaleString('it-IT',{maximumFractionDigits:0})}` : '—'} accent/>
          <StatCard label="Azioni Scadute" value={reteOverdue} sub="Da completare"/>
        </div>
      ) : (
        <div style={s.grid4}>
          <StatCard label="Club"           value={clubs.length}/>
          <StatCard label="Won"            value={clubs.filter(p => p.stage==='won').length} sub="Convertiti"/>
          <StatCard label="Pipeline Est."  value={pipeline > 0 ? `€ ${pipeline.toLocaleString('it-IT',{maximumFractionDigits:0})}` : '—'} accent/>
          <StatCard label="Azioni Scadute" value={overdueCount} sub="Da completare"/>
        </div>
      )}

      <div style={s.divider}/>

      {/* Search + filtri */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input style={{ ...inp, maxWidth:260, flex:'1 1 180px' }}
          placeholder="Cerca per nome o email…"
          value={search} onChange={e => setSearch(e.target.value)}/>

        {isRete ? (
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {['all','ambassador','segnalatore'].map(ct => (
              <button key={ct} onClick={() => setFilterCT(ct)}
                style={{ padding:'5px 12px', borderRadius:3, fontSize:9, letterSpacing:1.5, cursor:'pointer', border:`1px solid ${filterCT===ct ? (CT_CFG[ct]?.border||GOLD) : BORDER}`, background: filterCT===ct ? (CT_CFG[ct]?.bg||'rgba(184,150,90,0.12)') : 'transparent', color: filterCT===ct ? (CT_CFG[ct]?.color||GOLD) : MUTED }}>
                {ct === 'all' ? 'Tutti' : ct}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {['all',...STAGES].map(st => (
              <button key={st} onClick={() => setFilterStage(st)}
                style={{ padding:'5px 12px', borderRadius:3, fontSize:9, letterSpacing:1.5, cursor:'pointer', border:`1px solid ${filterStage===st ? (STAGE_CFG[st]?.border||GOLD) : BORDER}`, background: filterStage===st ? (STAGE_CFG[st]?.bg||'rgba(184,150,90,0.12)') : 'transparent', color: filterStage===st ? (STAGE_CFG[st]?.color||GOLD) : MUTED }}>
                {st === 'all' ? 'Tutti' : st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:MUTED }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24 }}>
            {(isRete ? rete : clubs).length === 0
              ? (isRete ? 'Nessun contatto ancora' : 'Nessun club in pipeline')
              : 'Nessun risultato per i filtri attivi'}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(p => {
            const zona    = [p.city, p.province, p.country].filter(Boolean).join(', ')
            const sub     = [p.contact_name, p.channel_origin, zona].filter(Boolean).join('  ·  ')
            const overdue = p.next_action_date && p.next_action_date <= today
            const nRef    = isRete ? referredBy(p.id).length : 0
            const rewards = isRete ? rewardsTotal(p) : 0
            return (
              <div key={p.id} className="du-card" onClick={() => setSelectedId(p.id)}
                style={{ display:'flex', alignItems:'center', gap:20, padding:'16px 22px', background:'rgba(255,255,255,0.03)', border:`1px solid ${BORDER}`, borderRadius:10, cursor:'pointer', flexWrap:'wrap' }}>

                {/* Nome + badge + dettagli */}
                <div style={{ flex:'1 1 260px', minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:CREAM, letterSpacing:0.5 }}>{p.name}</span>
                    {isRete ? <CTChip ct={p.contact_type}/> : <StageBadge stage={p.stage}/>}
                  </div>
                  {sub && (
                    <div style={{ fontSize:11, color:MUTED, marginTop:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {sub}
                    </div>
                  )}
                </div>

                {/* Prossima azione — solo se presente */}
                {p.next_action_date && (
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:9, color:MUTED, letterSpacing:2, marginBottom:2 }}>PROSSIMA AZIONE</div>
                    <div style={{ fontSize:12, color: overdue ? CLAY : CREAM }}>{p.next_action_date}</div>
                  </div>
                )}

                {isRete ? (
                  <>
                    {/* Segnalazioni */}
                    <div style={{ textAlign:'right', flexShrink:0, minWidth:80 }}>
                      <div style={{ fontSize:9, color:MUTED, letterSpacing:2, marginBottom:2 }}>SEGNALAZIONI</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color: nRef > 0 ? GREEN : MUTED }}>{nRef}</div>
                    </div>
                    {/* Riconoscimenti — solo se presenti */}
                    {rewards > 0 && (
                      <div style={{ textAlign:'right', flexShrink:0, minWidth:90 }}>
                        <div style={{ fontSize:9, color:MUTED, letterSpacing:2, marginBottom:2 }}>RICONOSCIMENTI</div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:GOLD }}>
                          € {rewards.toLocaleString('it-IT',{maximumFractionDigits:0})}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Valore stimato — solo se presente */
                  p.deal_value_est && (
                    <div style={{ textAlign:'right', flexShrink:0, minWidth:80 }}>
                      <div style={{ fontSize:9, color:MUTED, letterSpacing:2, marginBottom:2 }}>VALORE EST.</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:GOLD }}>
                        € {parseFloat(p.deal_value_est).toLocaleString('it-IT',{maximumFractionDigits:0})}
                      </div>
                    </div>
                  )
                )}

                {/* Azioni */}
                <div onClick={e => e.stopPropagation()} style={{ display:'flex', gap:6, flexShrink:0, marginLeft:'auto' }}>
                  <button style={{ ...btnGoldStyle, padding:'6px 16px', fontSize:9 }} onClick={() => setSelectedId(p.id)}>Apri</button>
                  <button disabled={deleting}
                    style={{ padding:'6px 16px', fontSize:9, letterSpacing:1.5, cursor:'pointer', borderRadius:3, background:'transparent', border:'1px solid rgba(196,98,58,0.35)', color:CLAY }}
                    onClick={() => handleDelete(p)}>
                    Elimina
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Detail modal ── */}
      {selected && !editForm && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:500, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 20px', overflowY:'auto' }}
          onClick={closeModal}>
          <div style={{ background:'#1e2d50', border:`1px solid ${BORDER}`, borderRadius:14, width:'100%', maxWidth:960, overflow:'hidden' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background:'rgba(255,255,255,0.04)', padding:'22px 32px', borderBottom:`1px solid ${BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:CREAM, letterSpacing:2 }}>{selected.name}</div>
                <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap', alignItems:'center' }}>
                  {selected.contact_type === 'cliente' && <StageBadge stage={selected.stage}/>}
                  <CTChip ct={selected.contact_type}/>
                  {selected.channel_origin && <span style={{ fontSize:11, color:MUTED }}>{selected.channel_origin}</span>}
                  {selected.vincolo_altro_brand && (
                    <span style={{ fontSize:9, letterSpacing:1, color:CLAY, background:'rgba(196,98,58,0.1)', border:'1px solid rgba(196,98,58,0.3)', padding:'2px 8px', borderRadius:2 }}>VINCOLO BRAND</span>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <button style={{ ...btnStyle(false), padding:'7px 18px', fontSize:9 }}
                  onClick={() => setEditForm({ id:selected.id, ...selected, prospect_activities:undefined, deal_value_est: selected.deal_value_est||'', next_action_date: selected.next_action_date||'', referred_by: selected.referred_by||'' })}>
                  Modifica
                </button>
                <button disabled={deleting}
                  style={{ padding:'7px 18px', fontSize:9, letterSpacing:1.5, cursor:'pointer', borderRadius:3, background:'transparent', border:'1px solid rgba(196,98,58,0.35)', color:CLAY }}
                  onClick={() => handleDelete(selected)}>
                  {deleting ? 'Eliminazione…' : 'Elimina'}
                </button>
                <button onClick={closeModal} style={{ background:'none', border:'none', color:MUTED, fontSize:24, cursor:'pointer', lineHeight:1 }}>×</button>
              </div>
            </div>

            <div style={{ padding:'24px 32px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>

              {/* ── Left: info ── */}
              <div>
                {/* Stage selector — solo per i club */}
                {selected.contact_type === 'cliente' && (
                  <div style={{ ...s.card, marginBottom:16 }}>
                    <div style={s.cardTitle}>Avanza Stage</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {STAGES.map(st => {
                        const c = STAGE_CFG[st]
                        const active = selected.stage === st
                        return (
                          <button key={st} onClick={() => handleStageClick(st)}
                            style={{ padding:'6px 14px', borderRadius:3, border:`1px solid ${active ? c.border : BORDER}`, background: active ? c.bg : 'transparent', color: active ? c.color : MUTED, cursor:'pointer', fontSize:9, letterSpacing:1.5, fontWeight: active ? 700 : 400 }}>
                            {st}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Club segnalati — solo per la rete */}
                {selected.contact_type !== 'cliente' && (
                  <div style={{ ...s.card, marginBottom:16 }}>
                    <div style={s.cardTitle}>Club Segnalati ({referredBy(selected.id).length})</div>
                    {referredBy(selected.id).length === 0 ? (
                      <div style={{ fontSize:12, color:MUTED, fontStyle:'italic' }}>Nessuna segnalazione ancora</div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {referredBy(selected.id).map(c => (
                          <div key={c.id} onClick={() => setSelectedId(c.id)}
                            style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderRadius:6, border:`1px solid ${BORDER}`, cursor:'pointer' }}>
                            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:CREAM, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                            <StageBadge stage={c.stage}/>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Contatto */}
                <div style={{ ...s.card, marginBottom:16 }}>
                  <div style={s.cardTitle}>Contatto</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {selected.contact_name  && <InfoRow label="REFERENTE"     value={selected.contact_name}/>}
                    {selected.contact_email && <InfoRow label="EMAIL"         value={selected.contact_email}/>}
                    {selected.contact_phone && <InfoRow label="TELEFONO"      value={selected.contact_phone}/>}
                    {selected.language      && <InfoRow label="LINGUA"        value={selected.language}/>}
                    {selected.city     && <InfoRow label="CITTÀ"    value={selected.city}/>}
                    {selected.province && <InfoRow label="PROVINCIA" value={selected.province}/>}
                    {selected.country  && <InfoRow label="PAESE"     value={selected.country}/>}
                    {selected.deal_value_est && <InfoRow label="VALORE EST."  value={`€ ${parseFloat(selected.deal_value_est).toLocaleString('it-IT',{minimumFractionDigits:2})}`}/>}
                    {selected.next_action_date && (
                      <InfoRow label="PROSSIMA AZIONE"
                        value={<span style={{ color: selected.next_action_date <= today ? CLAY : CREAM }}>{selected.next_action_date}</span>}/>
                    )}
                  </div>
                </div>

                {/* Relazione */}
                {(selected.referred_by || selected.relazione_pregressa || selected.vincolo_altro_brand) && (
                  <div style={{ ...s.card, marginBottom:16 }}>
                    <div style={s.cardTitle}>Relazione</div>
                    {selected.referred_by && (
                      <InfoRow label="SEGNALATO DA" value={prospects.find(p => p.id === selected.referred_by)?.name || '—'}/>
                    )}
                    {selected.vincolo_altro_brand && (
                      <div style={{ fontSize:12, color:CLAY, marginTop:8 }}>⚠ Vincolo con altro brand attivo</div>
                    )}
                    {selected.relazione_pregressa && (
                      <div style={{ marginTop:10 }}>
                        <div style={{ fontSize:9, color:MUTED, letterSpacing:2, marginBottom:3 }}>RELAZIONE PREGRESSA</div>
                        <div style={{ fontSize:12, color:CREAM, lineHeight:1.7 }}>{selected.relazione_pregressa}</div>
                      </div>
                    )}
                  </div>
                )}

                {selected.notes && (
                  <div style={s.card}>
                    <div style={s.cardTitle}>Note</div>
                    <div style={{ fontSize:12, color:CREAM, lineHeight:1.7 }}>{selected.notes}</div>
                  </div>
                )}
              </div>

              {/* ── Right: activities ── */}
              <div>
                <div style={s.card}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <div style={s.cardTitle}>Attività</div>
                    {!actForm && (
                      <button style={{ ...btnGoldStyle, padding:'4px 14px', fontSize:9 }} onClick={() => setActForm(EMPTY_ACTIVITY())}>
                        + Aggiungi
                      </button>
                    )}
                  </div>

                  {actForm && (
                    <div style={{ marginBottom:16, padding:14, background:'rgba(255,255,255,0.03)', borderRadius:8, border:`1px solid ${BORDER}` }}>
                      <div style={{ marginBottom:10 }}>
                        <label style={s.label}>Tipo</label>
                        <select style={{ ...inp, cursor:'pointer' }} value={actForm.type} onChange={e => setActForm(f => ({ ...f, type:e.target.value }))}>
                          {ACT_TYPES.map(t => <option key={t} value={t}>{ACT_LABELS[t]}</option>)}
                        </select>
                      </div>
                      <div style={{ marginBottom:10 }}>
                        <label style={s.label}>Contenuto</label>
                        <textarea style={{ ...inp, minHeight:72, resize:'vertical' }} value={actForm.content} onChange={e => setActForm(f => ({ ...f, content:e.target.value }))}/>
                      </div>
                      {(selected.contact_type === 'ambassador' || selected.contact_type === 'segnalatore') && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                          <div>
                            <label style={s.label}>Riconoscimento</label>
                            <select style={{ ...inp, cursor:'pointer' }} value={actForm.reward_type} onChange={e => setActForm(f => ({ ...f, reward_type:e.target.value }))}>
                              <option value="">— nessuno —</option>
                              {REWARD_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          {actForm.reward_type && (
                            <div>
                              <label style={s.label}>Valore</label>
                              <input style={inp} type="number" placeholder="es. 50" value={actForm.reward_value} onChange={e => setActForm(f => ({ ...f, reward_value:e.target.value }))}/>
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ display:'flex', gap:8 }}>
                        <button style={{ ...btnGoldStyle, padding:'6px 18px', fontSize:9 }} onClick={handleAddAct} disabled={actSaving}>
                          {actSaving ? 'Salvataggio…' : 'Salva'}
                        </button>
                        <button style={{ ...btnStyle(false), padding:'6px 14px', fontSize:9 }} onClick={() => setActForm(null)}>Annulla</button>
                      </div>
                    </div>
                  )}

                  {(selected.prospect_activities || []).length === 0 && !actForm ? (
                    <div style={{ fontSize:12, color:MUTED, fontStyle:'italic', textAlign:'center', padding:'24px 0' }}>
                      Nessuna attività registrata
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {[...(selected.prospect_activities || [])].sort((a,b) => b.created_at.localeCompare(a.created_at)).map(act => (
                        <div key={act.id} style={{ padding:12, background:'rgba(255,255,255,0.02)', borderRadius:6, borderLeft:`3px solid ${STAGE_CFG.contatto.border}` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                            <span style={{ fontSize:11, color:GOLD, letterSpacing:1 }}>{ACT_LABELS[act.type] || act.type}</span>
                            <span style={{ fontSize:10, color:MUTED }}>{act.created_at?.slice(0,10)}</span>
                          </div>
                          {act.content && <div style={{ fontSize:12, color:CREAM, lineHeight:1.6 }}>{act.content}</div>}
                          {act.reward_type && (
                            <div style={{ marginTop:6, fontSize:10, color:GREEN }}>
                              Riconoscimento: {act.reward_type}{act.reward_value != null ? ` · ${act.reward_value}` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editForm && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}
          onClick={() => setEditForm(null)}>
          <div style={{ background:'#1e2d50', border:`1px solid ${BORDER}`, borderRadius:14, width:'100%', maxWidth:600 }}
            onClick={e => e.stopPropagation()}>
            <ProspectForm form={editForm} setForm={setEditForm} prospects={prospects}
              onSave={handleSaveEdit} onCancel={() => setEditForm(null)} saving={saving} title="Modifica Prospect"/>
          </div>
        </div>
      )}

      {/* ── New prospect modal ── */}
      {newForm && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}
          onClick={() => setNewForm(null)}>
          <div style={{ background:'#1e2d50', border:`1px solid ${BORDER}`, borderRadius:14, width:'100%', maxWidth:600 }}
            onClick={e => e.stopPropagation()}>
            <ProspectForm form={newForm} setForm={setNewForm} prospects={prospects}
              onSave={handleCreate} onCancel={() => setNewForm(null)} saving={saving} title="Nuovo Prospect"/>
          </div>
        </div>
      )}
    </div>
  )
}
