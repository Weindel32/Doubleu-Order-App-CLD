import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE, GREEN } from '../tokens.js'
import ActIcon from '../components/ActIcon.jsx'

// ─── Config (allineata alla pagina desktop) ──────────────────────
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
const CT_LABELS = { cliente:'cliente', ambassador:'ambassador', segnalatore:'referral' }

const CHANNELS   = ['linkedin','referral','fiera','outbound','web','instagram','facebook']
const ACT_TYPES  = ['email_sent','reply_received','sample_shipped','call','note']
const ACT_LABELS = {
  email_sent:     'Email inviata',
  reply_received: 'Risposta ricevuta',
  sample_shipped: 'Sample spedito',
  call:           'Chiamata',
  note:           'Nota',
}
const REWARD_TYPES = ['prodotto','provvigione']

const fmt = n => '€ ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

// ─── UI helpers ───────────────────────────────────────────────────
const labelStyle = { fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 6, display: 'block' }

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '12px 14px',
  color: CREAM, fontSize: 14, letterSpacing: 0.3,
  outline: 'none', fontFamily: "'Josefin Sans', sans-serif", colorScheme: 'dark',
}

function Chip({ cfg, children }) {
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:2, fontSize:8, letterSpacing:2, textTransform:'uppercase', background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
      {children}
    </span>
  )
}

function BtnGold({ children, onClick, disabled, flex }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: flex || 'none', padding: '13px', borderRadius: 6,
      background: disabled ? 'rgba(184,150,90,0.3)' : 'linear-gradient(135deg, #b8965a, #9a7a45)',
      border: 'none', color: CREAM, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
      cursor: disabled ? 'default' : 'pointer', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600,
      WebkitTapHighlightColor: 'transparent',
    }}>{children}</button>
  )
}

function BtnGhost({ children, onClick, flex, danger }) {
  return (
    <button onClick={onClick} style={{
      flex: flex || 'none', padding: '13px', borderRadius: 6,
      background: 'transparent', border: `1px solid ${danger ? 'rgba(196,98,58,0.35)' : BORDER}`,
      color: danger ? CLAY : MUTED, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
      cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif",
      WebkitTapHighlightColor: 'transparent',
    }}>{children}</button>
  )
}

// ─── Form nuovo/modifica prospect ────────────────────────────────
function ProspectForm({ initial, isRete, prospects, onSave, onCancel }) {
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  const referrers = prospects.filter(p => p.contact_type !== 'cliente' && p.id !== f.id)

  const handleSave = async () => {
    if (!f.name?.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true)
    await onSave(f)
    setSaving(false)
  }

  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 16px', marginBottom: 20 }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 18 }}>
        {f.id ? 'Modifica' : 'Nuovo'} {isRete ? 'Contatto' : 'Club'}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nome{isRete ? '' : ' Club'} *</label>
        <input style={inputStyle} value={f.name} autoCapitalize="words"
          onChange={e => { set('name', e.target.value); setError('') }}/>
        {error ? <div style={{ fontSize: 10, color: CLAY, marginTop: 5 }}>{error}</div> : null}
      </div>

      {isRete && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Tipo</label>
          <select style={inputStyle} value={f.contact_type} onChange={e => set('contact_type', e.target.value)}>
            <option value="segnalatore">referral</option>
            <option value="ambassador">ambassador</option>
          </select>
        </div>
      )}

      {!isRete && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Referente</label>
          <input style={inputStyle} value={f.contact_name} autoCapitalize="words" onChange={e => set('contact_name', e.target.value)}/>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Telefono</label>
        <input style={inputStyle} type="tel" inputMode="tel" value={f.contact_phone} onChange={e => set('contact_phone', e.target.value)}/>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Email</label>
        <input style={inputStyle} type="email" inputMode="email" autoCapitalize="none" value={f.contact_email} onChange={e => set('contact_email', e.target.value)}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Città</label>
          <input style={inputStyle} autoCapitalize="words" value={f.city} onChange={e => set('city', e.target.value)}/>
        </div>
        <div>
          <label style={labelStyle}>Canale</label>
          <select style={inputStyle} value={f.channel_origin} onChange={e => set('channel_origin', e.target.value)}>
            <option value="">—</option>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {!isRete && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Valore Est. (€)</label>
            <input style={inputStyle} type="number" inputMode="decimal" placeholder="es. 2500" value={f.deal_value_est} onChange={e => set('deal_value_est', e.target.value)}/>
          </div>
          <div>
            <label style={labelStyle}>Prossima Azione</label>
            <input style={inputStyle} type="date" value={f.next_action_date} onChange={e => set('next_action_date', e.target.value)}/>
          </div>
        </div>
      )}

      {!isRete && referrers.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Segnalato da</label>
          <select style={inputStyle} value={f.referred_by} onChange={e => set('referred_by', e.target.value)}>
            <option value="">— nessuno —</option>
            {referrers.map(p => <option key={p.id} value={p.id}>{p.name} ({CT_LABELS[p.contact_type] || p.contact_type})</option>)}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Note</label>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={f.notes} onChange={e => set('notes', e.target.value)}/>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <BtnGhost flex={1} onClick={onCancel}>Annulla</BtnGhost>
        <BtnGold flex={2} onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</BtnGold>
      </div>
    </div>
  )
}

// ─── Form attività (aggiungi / modifica) ─────────────────────────
function ActivityForm({ initial, showReward, onSave, onCancel }) {
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await onSave(f)
    setSaving(false)
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>
        {f.id ? 'Modifica Attività' : 'Nuova Attività'}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Tipo</label>
        <select style={inputStyle} value={f.type} onChange={e => set('type', e.target.value)}>
          {ACT_TYPES.map(t => <option key={t} value={t}>{ACT_LABELS[t]}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Contenuto</label>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={f.content} onChange={e => set('content', e.target.value)}/>
      </div>
      {showReward && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Riconoscimento</label>
            <select style={inputStyle} value={f.reward_type} onChange={e => set('reward_type', e.target.value)}>
              <option value="">— nessuno —</option>
              {REWARD_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {f.reward_type && (
            <div>
              <label style={labelStyle}>{f.reward_type === 'prodotto' ? 'Costo Prod. (€)' : 'Provvigione (€)'}</label>
              <input style={inputStyle} type="number" inputMode="decimal" placeholder="es. 50" value={f.reward_value} onChange={e => set('reward_value', e.target.value)}/>
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <BtnGhost flex={1} onClick={onCancel}>Annulla</BtnGhost>
        <BtnGold flex={2} onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</BtnGold>
      </div>
    </div>
  )
}

// ─── Dettaglio prospect ───────────────────────────────────────────
function ProspectDetail({ prospect: p, prospects, onBack, onSelectProspect, onUpsert, onAddActivity, onUpdateActivity, onDeleteActivity, onDelete }) {
  const [actForm, setActForm] = useState(null)
  const [editing, setEditing] = useState(false)

  const isRete    = p.contact_type !== 'cliente'
  const today     = new Date().toISOString().slice(0,10)
  const referred  = prospects.filter(x => x.referred_by === p.id)
  const activities = [...(p.prospect_activities || [])].sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''))

  const handleStageClick = async (stage) => {
    const { prospect_activities, ...rest } = p
    await onUpsert({ ...rest, stage })
  }

  const handleSaveAct = async (f) => {
    if (f.id) await onUpdateActivity(f.id, f)
    else      await onAddActivity(p.id, f)
    setActForm(null)
  }

  const handleDeleteAct = async (act) => {
    if (!confirm('Eliminare questa attività?')) return
    await onDeleteActivity(act.id)
  }

  const handleDeleteProspect = async () => {
    if (!confirm(`Eliminare "${p.name}"? L'operazione non è reversibile.`)) return
    const ok = await onDelete(p.id)
    if (ok) onBack()
  }

  if (editing) {
    return (
      <div style={{ padding: '20px 16px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
        <ProspectForm
          initial={{
            id: p.id, name: p.name || '', contact_type: p.contact_type,
            stage: p.stage, contact_name: p.contact_name || '',
            contact_phone: p.contact_phone || '', contact_email: p.contact_email || '',
            city: p.city || '', channel_origin: p.channel_origin || '',
            deal_value_est: p.deal_value_est || '', next_action_date: p.next_action_date || '',
            referred_by: p.referred_by || '', notes: p.notes || '',
            province: p.province, country: p.country, category: p.category,
            language: p.language, vincolo_altro_brand: p.vincolo_altro_brand,
            relazione_pregressa: p.relazione_pregressa, client_id: p.client_id,
          }}
          isRete={isRete} prospects={prospects}
          onSave={async (f) => { await onUpsert(f); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: GOLD, cursor: 'pointer', padding: '20px 0 10px',
        display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Josefin Sans', sans-serif",
        fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', WebkitTapHighlightColor: 'transparent',
      }}>‹ Prospects</button>

      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: CREAM, lineHeight: 1.2, marginBottom: 8 }}>
        {p.name}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <Chip cfg={CT_CFG[p.contact_type] || CT_CFG.cliente}>{CT_LABELS[p.contact_type] || p.contact_type}</Chip>
        {!isRete && <Chip cfg={STAGE_CFG[p.stage] || STAGE_CFG.contatto}>{p.stage}</Chip>}
        {p.channel_origin && <span style={{ fontSize: 10, color: MUTED, alignSelf: 'center' }}>{p.channel_origin}</span>}
      </div>

      {/* Stage advance — solo club */}
      {!isRete && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>Avanza Stage</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STAGES.map(st => {
              const c = STAGE_CFG[st]
              const active = p.stage === st
              return (
                <button key={st} onClick={() => handleStageClick(st)} style={{
                  padding: '9px 13px', borderRadius: 5, border: `1px solid ${active ? c.border : BORDER}`,
                  background: active ? c.bg : 'transparent', color: active ? c.color : MUTED,
                  cursor: 'pointer', fontSize: 9, letterSpacing: 1.5, fontWeight: active ? 700 : 400,
                  fontFamily: "'Josefin Sans', sans-serif", WebkitTapHighlightColor: 'transparent',
                }}>{st}</button>
              )
            })}
          </div>
        </div>
      )}

      {/* Club segnalati — solo rete */}
      {isRete && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>
            Club Segnalati ({referred.length})
          </div>
          {referred.length === 0 ? (
            <div style={{ fontSize: 11, color: MUTED, fontStyle: 'italic' }}>Nessuna segnalazione ancora</div>
          ) : referred.map(c => (
            <div key={c.id} onClick={() => onSelectProspect(c.id)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              padding: '11px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6,
              border: `1px solid ${BORDER}`, marginBottom: 8, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: CREAM }}>{c.name}</span>
              <Chip cfg={STAGE_CFG[c.stage] || STAGE_CFG.contatto}>{c.stage}</Chip>
            </div>
          ))}
        </div>
      )}

      {/* Contatti */}
      {(p.contact_name || p.contact_phone || p.contact_email || p.city || p.deal_value_est || p.next_action_date) && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>Contatto</div>
          {p.contact_name && <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>Referente: {p.contact_name}</div>}
          {p.contact_phone && (
            <a href={`tel:${p.contact_phone}`} style={{ display: 'block', fontSize: 16, color: GOLD, textDecoration: 'none', marginBottom: 8, fontFamily: "'Cormorant Garamond', serif" }}>
              {p.contact_phone}
            </a>
          )}
          {p.contact_email && (
            <a href={`mailto:${p.contact_email}`} style={{ display: 'block', fontSize: 12, color: GOLD, textDecoration: 'none', marginBottom: 8 }}>
              {p.contact_email}
            </a>
          )}
          {p.city && <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>{[p.city, p.province, p.country].filter(Boolean).join(', ')}</div>}
          {p.deal_value_est && (
            <div style={{ fontSize: 11, color: MUTED }}>Valore est.: <span style={{ color: GOLD }}>{fmt(parseFloat(p.deal_value_est))}</span></div>
          )}
          {p.next_action_date && (
            <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>
              Prossima azione: <span style={{ color: p.next_action_date <= today ? CLAY : CREAM }}>{p.next_action_date}</span>
            </div>
          )}
        </div>
      )}

      {p.notes && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 10 }}>Note</div>
          <div style={{ fontSize: 12, color: CREAM, lineHeight: 1.7 }}>{p.notes}</div>
        </div>
      )}

      {/* Attività */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase' }}>Attività</div>
          {!actForm && (
            <button onClick={() => setActForm({ type:'note', content:'', reward_type:'', reward_value:'' })} style={{
              background: 'rgba(184,150,90,0.12)', border: `1px solid ${GOLD}`, borderRadius: 6,
              color: GOLD, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', padding: '7px 12px',
              cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif", WebkitTapHighlightColor: 'transparent',
            }}>+ Aggiungi</button>
          )}
        </div>

        {actForm && (
          <ActivityForm initial={actForm} showReward={isRete} onSave={handleSaveAct} onCancel={() => setActForm(null)}/>
        )}

        {activities.length === 0 && !actForm ? (
          <div style={{ fontSize: 11, color: MUTED, fontStyle: 'italic', textAlign: 'center', padding: '14px 0' }}>
            Nessuna attività registrata
          </div>
        ) : activities.map(act => (
          <div key={act.id} style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 6, borderLeft: `3px solid ${STAGE_CFG.contatto.border}`, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: GOLD, letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <ActIcon type={act.type}/>{ACT_LABELS[act.type] || act.type}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: MUTED }}>{act.created_at?.slice(0,10)}</span>
                <button onClick={() => setActForm({ id: act.id, type: act.type || 'note', content: act.content || '', reward_type: act.reward_type || '', reward_value: act.reward_value != null ? String(act.reward_value) : '' })}
                  style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: '4px 5px', display: 'inline-flex', WebkitTapHighlightColor: 'transparent' }}>
                  <ActIcon type="note" size={13}/>
                </button>
                <button onClick={() => handleDeleteAct(act)}
                  style={{ background: 'none', border: 'none', color: CLAY, fontSize: 17, cursor: 'pointer', lineHeight: 1, padding: '2px 5px', WebkitTapHighlightColor: 'transparent' }}>×</button>
              </div>
            </div>
            {act.content && <div style={{ fontSize: 12, color: CREAM, lineHeight: 1.6 }}>{act.content}</div>}
            {act.reward_type && (
              <div style={{ marginTop: 6, fontSize: 10, color: GREEN }}>
                Riconoscimento: {act.reward_type}{act.reward_value != null ? ` · ${fmt(parseFloat(act.reward_value))}` : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Azioni */}
      <div style={{ display: 'flex', gap: 10 }}>
        <BtnGhost flex={1} onClick={() => setEditing(true)}>Modifica</BtnGhost>
        <BtnGhost flex={1} danger onClick={handleDeleteProspect}>Elimina</BtnGhost>
      </div>
    </div>
  )
}

// ─── Pagina principale ────────────────────────────────────────────
export default function MobileProspects({ prospects, onUpsert, onAddActivity, onUpdateActivity, onDeleteActivity, onDelete }) {
  const [tab, setTab]           = useState('club')
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const isRete = tab === 'rete'
  const today  = new Date().toISOString().slice(0,10)
  const clubs  = prospects.filter(p => p.contact_type === 'cliente')
  const rete   = prospects.filter(p => p.contact_type !== 'cliente')
  const list   = isRete ? rete : clubs

  const referralCount = id => prospects.filter(x => x.referred_by === id).length
  const rewardsOf = (p, type) => (p.prospect_activities || []).filter(a => a.reward_type === type).reduce((s,a) => s + (parseFloat(a.reward_value)||0), 0)

  const selected = selectedId ? prospects.find(p => p.id === selectedId) : null

  if (selected) {
    return (
      <ProspectDetail
        prospect={selected} prospects={prospects}
        onBack={() => setSelectedId(null)}
        onSelectProspect={setSelectedId}
        onUpsert={onUpsert} onAddActivity={onAddActivity}
        onUpdateActivity={onUpdateActivity} onDeleteActivity={onDeleteActivity}
        onDelete={onDelete}
      />
    )
  }

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Segmented control */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 3, marginBottom: 16 }}>
        {[{ k:'club', label:`Club (${clubs.length})` }, { k:'rete', label:`Ambassador / Referral (${rete.length})` }].map(t => (
          <button key={t.k} onClick={() => { setTab(t.k); setShowForm(false) }} style={{
            flex: 1, padding: '10px 6px', borderRadius: 6, border: 'none',
            background: tab === t.k ? 'rgba(184,150,90,0.18)' : 'transparent',
            color: tab === t.k ? GOLD : MUTED, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif", fontWeight: tab === t.k ? 700 : 400,
            WebkitTapHighlightColor: 'transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Header + nuovo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' }}>
          {list.length} {isRete ? 'contatti' : 'club in pipeline'}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={{
            background: 'rgba(184,150,90,0.12)', border: `1px solid ${GOLD}`, borderRadius: 6,
            color: GOLD, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', padding: '8px 14px',
            cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif", WebkitTapHighlightColor: 'transparent',
          }}>+ Nuovo</button>
        )}
      </div>

      {/* Form nuovo prospect */}
      {showForm && (
        <ProspectForm
          initial={{
            name:'', contact_type: isRete ? 'segnalatore' : 'cliente', stage:'contatto',
            contact_name:'', contact_phone:'', contact_email:'', city:'',
            channel_origin:'', deal_value_est:'', next_action_date:'', referred_by:'', notes:'',
          }}
          isRete={isRete} prospects={prospects}
          onSave={async (f) => { const ok = await onUpsert(f); if (ok) setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Lista */}
      {list.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: MUTED }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20 }}>
            {isRete ? 'Nessun contatto ancora' : 'Nessun club in pipeline'}
          </div>
        </div>
      ) : list.map(p => {
        const overdue = p.next_action_date && p.next_action_date <= today
        const nRef    = isRete ? referralCount(p.id) : 0
        const provv   = isRete ? rewardsOf(p, 'provvigione') : 0
        const prod    = isRete ? rewardsOf(p, 'prodotto') : 0
        return (
          <div key={p.id} onClick={() => setSelectedId(p.id)} style={{
            background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10,
            padding: '14px 16px', marginBottom: 10, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM, lineHeight: 1.25 }}>{p.name}</div>
              {isRete
                ? <Chip cfg={CT_CFG[p.contact_type] || CT_CFG.cliente}>{CT_LABELS[p.contact_type] || p.contact_type}</Chip>
                : <Chip cfg={STAGE_CFG[p.stage] || STAGE_CFG.contatto}>{p.stage}</Chip>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 10, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[p.contact_name, p.city].filter(Boolean).join(' · ') || p.channel_origin || ''}
              </div>
              <div style={{ display: 'flex', gap: 12, flexShrink: 0, alignItems: 'center' }}>
                {isRete ? (
                  <>
                    <span style={{ fontSize: 10, color: nRef > 0 ? GREEN : MUTED }}>{nRef} segnalaz.</span>
                    {(provv + prod) > 0 && <span style={{ fontSize: 10, color: GOLD }}>{fmt(provv + prod)}</span>}
                  </>
                ) : (
                  <>
                    {p.next_action_date && <span style={{ fontSize: 10, color: overdue ? CLAY : MUTED }}>{p.next_action_date}</span>}
                    {p.deal_value_est && <span style={{ fontSize: 12, color: GOLD, fontFamily: "'Cormorant Garamond', serif" }}>{fmt(parseFloat(p.deal_value_est))}</span>}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
