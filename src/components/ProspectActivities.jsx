import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN, NAVY } from '../tokens.js'
import { s, btnStyle, btnGoldStyle } from '../tokens.js'
import ActIcon from './ActIcon.jsx'
import DatePicker from './DatePicker.jsx'
import {
  ACT_TYPES, TYPE_LABELS, DIRECTIONS, DIRECTION_LABELS, OUTCOMES, OUTCOME_LABELS, OUTCOME_CFG,
  hasDirection, activityLabel, todayISO, fmtDay, actDay, isPlanned, isReplaced,
  doneActivities, plannedActivities, lastActivity, nextStep, suggestedStage, byRecent,
} from '../lib/activities.js'

// Registro attività di un prospect, condiviso da desktop e mobile.
//
// Un'attività è "fatta" (con direzione ed esito) o "da fare" (un passo
// pianificato con scadenza). Il prossimo passo del prospect è la sua
// attività da fare più vicina: ne ricava la prossima azione e ha il suo
// promemoria su Todoist. Segnare fatta una pianificata chiede l'esito;
// un nuovo prossimo passo può sostituire quello aperto.

const REWARD_TYPES = ['prodotto','provvigione']

export function OutcomeBadge({ outcome, mobile }) {
  const cfg = OUTCOME_CFG[outcome]
  if (!cfg) return null
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:2, fontSize: mobile ? 10 : 9, letterSpacing:1.2, textTransform:'uppercase', whiteSpace:'nowrap', color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}` }}>
      {OUTCOME_LABELS[outcome]}
    </span>
  )
}

// Riga sintetica per la card del prospect in lista: ultima attività fatta
// (tipo, data, esito) e prossimo passo con la scadenza. Le date di
// prossima azione inserite a mano prima del registro restano visibili
// finché il prospect non ha un passo pianificato.
export function ActivitySummary({ prospect, mobile }) {
  const last   = lastActivity(prospect)
  const next   = nextStep(prospect)
  const legacy = !next && prospect.next_action_date
  if (!last && !next && !legacy) return null
  const today  = todayISO()
  const fs     = mobile ? 12 : 11
  const dueDay = next ? actDay(next) : legacy
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop: mobile ? 8 : 7, fontSize:fs, minWidth:0 }}>
      {last && (
        <div style={{ display:'flex', alignItems:'center', gap:7, color:MUTED, minWidth:0 }}>
          <span style={{ color:GOLD, display:'inline-flex' }}><ActIcon type={last.type} size={12}/></span>
          <span style={{ whiteSpace:'nowrap' }}>{activityLabel(last)} · {fmtDay(actDay(last))}</span>
          {last.outcome && <OutcomeBadge outcome={last.outcome} mobile={mobile}/>}
        </div>
      )}
      {(next || legacy) && (
        <div style={{ display:'flex', alignItems:'center', gap:7, color:CREAM, minWidth:0 }}>
          <span style={{ color:GOLD }}>→</span>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>
            {next ? `${TYPE_LABELS[next.type] || next.type}${next.content ? ` — ${next.content}` : ''}` : 'Prossima azione'}
          </span>
          <span style={{ flexShrink:0, color: dueDay <= today ? CLAY : MUTED }}>entro {fmtDay(dueDay)}</span>
        </div>
      )}
    </div>
  )
}

const emptyStep = () => ({ enabled:false, type:'call', date:'', content:'' })

function styles(mobile) {
  if (!mobile) {
    return {
      label: s.label,
      input: { ...s.input, boxSizing:'border-box' },
      triggerStyle: { boxSizing:'border-box' },
      box: { marginBottom:16, padding:14, background:'rgba(255,255,255,0.03)', borderRadius:8, border:`1px solid ${BORDER}` },
      primary: { ...btnGoldStyle, padding:'6px 18px', fontSize:9 },
      ghost:   { ...btnStyle(false), padding:'6px 14px', fontSize:9 },
      small:   { ...btnGoldStyle, padding:'3px 10px', fontSize:9 },
      text: 12, meta: 10, section: 9,
    }
  }
  const input = {
    width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:`1px solid ${BORDER}`,
    borderRadius:6, padding:'12px 14px', color:CREAM, fontSize:14, letterSpacing:0.3,
    outline:'none', fontFamily:"'Josefin Sans', sans-serif", colorScheme:'dark',
  }
  const btn = { flex:1, padding:'13px', borderRadius:6, fontSize:12, letterSpacing:2, textTransform:'uppercase', cursor:'pointer', fontFamily:"'Josefin Sans', sans-serif", WebkitTapHighlightColor:'transparent' }
  return {
    label: { fontSize:11, letterSpacing:2, color:MUTED, textTransform:'uppercase', marginBottom:6, display:'block' },
    input,
    triggerStyle: input,
    box: { background:'rgba(255,255,255,0.03)', border:`1px solid ${BORDER}`, borderRadius:10, padding:14, marginBottom:14 },
    primary: { ...btn, flex:2, background:GOLD, border:'none', color:NAVY, fontWeight:600 },
    ghost:   { ...btn, background:'transparent', border:`1px solid ${BORDER}`, color:MUTED },
    small:   { background:'rgba(184,150,90,0.12)', border:`1px solid ${GOLD}`, borderRadius:5, color:GOLD, fontSize:11, letterSpacing:1.5, textTransform:'uppercase', padding:'6px 10px', cursor:'pointer', fontFamily:"'Josefin Sans', sans-serif", WebkitTapHighlightColor:'transparent' },
    text: 13, meta: 12, section: 11,
  }
}

// ─── Form ─────────────────────────────────────────────────────────
// mode: 'new'      attività fatta, con prossimo passo facoltativo
//       'complete' segna fatta una pianificata, con esito
//       'plan'     nuova attività da fare
//       'edit'     modifica (fatta o da fare, a seconda dell'attività)
function ActivityForm({ prospect, initial, showReward, mobile, onSave, onCancel }) {
  const st = styles(mobile)
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set     = (k, v) => setF(x => ({ ...x, [k]: v }))
  const setStep = (k, v) => setF(x => ({ ...x, step: { ...x.step, [k]: v } }))

  const planned   = f.status === 'da_fare'
  const withStep  = f.mode === 'new' || f.mode === 'complete'
  // Il passo aperto che un nuovo passo può sostituire: il più vicino tra
  // quelli diversi da quello che si sta segnando fatto o modificando.
  const replaceable = plannedActivities(prospect).find(a => a.id !== f.id) || null
  const offersReplace = replaceable && (f.mode === 'plan' || (withStep && f.step.enabled))
  const typeOptions = ACT_TYPES.includes(f.type) ? ACT_TYPES : [...ACT_TYPES, f.type]

  const title = {
    new: 'Nuova attività', plan: 'Pianifica attività', edit: planned ? 'Modifica attività da fare' : 'Modifica attività',
    complete: 'Segna come fatta',
  }[f.mode]

  const handleSave = async () => {
    if (!f.date) { setError(planned ? 'Indica la scadenza.' : 'Indica la data.'); return }
    if (withStep && f.step.enabled && !f.step.date) { setError('Indica entro quando fare il prossimo passo.'); return }
    setSaving(true)
    setError('')
    const ok = await onSave(f)
    setSaving(false)
    if (!ok) setError('Salvataggio non riuscito. Riprova.')
  }

  const grid2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom: mobile ? 12 : 10 }
  const row   = { marginBottom: mobile ? 12 : 10 }

  return (
    <div style={st.box}>
      <div style={{ fontSize: st.section, color:GOLD, letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>{title}</div>
      {f.mode === 'complete' && (
        <div style={{ fontSize: st.meta, color:MUTED, marginBottom:10 }}>
          Previsto entro {fmtDay(f.plannedDate)} — il promemoria su Todoist si chiude.
        </div>
      )}

      <div style={grid2}>
        <div>
          <label style={st.label}>Tipo</label>
          <select style={{ ...st.input, cursor:'pointer' }} value={f.type} onChange={e => set('type', e.target.value)}>
            {typeOptions.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
          </select>
        </div>
        <div>
          <label style={st.label}>{planned ? 'Entro il' : 'Data'}</label>
          <DatePicker triggerStyle={st.triggerStyle} value={f.date} onChange={v => set('date', v)}/>
        </div>
      </div>

      {!planned && (
        <div style={grid2}>
          {hasDirection(f.type) ? (
            <div>
              <label style={st.label}>Direzione</label>
              <select style={{ ...st.input, cursor:'pointer' }} value={f.direction} onChange={e => set('direction', e.target.value)}>
                {DIRECTIONS.map(d => <option key={d} value={d}>{DIRECTION_LABELS[d]}</option>)}
              </select>
            </div>
          ) : <div/>}
          <div>
            <label style={st.label}>Esito</label>
            <select style={{ ...st.input, cursor:'pointer' }} value={f.outcome} onChange={e => set('outcome', e.target.value)}>
              <option value="">— nessuno —</option>
              {OUTCOMES.map(o => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
            </select>
          </div>
        </div>
      )}

      <div style={row}>
        <label style={st.label}>{planned ? 'Cosa fare' : 'Contenuto'}</label>
        <textarea style={{ ...st.input, minHeight: planned ? 48 : 64, resize:'vertical' }} value={f.content} onChange={e => set('content', e.target.value)}/>
      </div>

      {showReward && !planned && (
        <div style={grid2}>
          <div>
            <label style={st.label}>Riconoscimento</label>
            <select style={{ ...st.input, cursor:'pointer' }} value={f.reward_type} onChange={e => set('reward_type', e.target.value)}>
              <option value="">— nessuno —</option>
              {REWARD_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {f.reward_type && (
            <div>
              <label style={st.label}>{f.reward_type === 'prodotto' ? 'Valore Prodotto (€)' : 'Provvigione (€)'}</label>
              <input style={st.input} type="number" inputMode="decimal" placeholder="es. 50" value={f.reward_value} onChange={e => set('reward_value', e.target.value)}/>
            </div>
          )}
        </div>
      )}

      {withStep && (
        <div style={{ ...row, paddingTop:10, borderTop:`1px solid ${BORDER}` }}>
          <label style={{ display:'flex', alignItems:'center', gap:10, fontSize: st.text, color:CREAM, cursor:'pointer', marginBottom: f.step.enabled ? 10 : 0 }}>
            <input type="checkbox" checked={f.step.enabled} onChange={e => setStep('enabled', e.target.checked)}
              style={{ width:16, height:16, accentColor:GOLD, cursor:'pointer' }}/>
            Prossimo passo
          </label>
          {f.step.enabled && (
            <>
              <div style={grid2}>
                <div>
                  <label style={st.label}>Tipo</label>
                  <select style={{ ...st.input, cursor:'pointer' }} value={f.step.type} onChange={e => setStep('type', e.target.value)}>
                    {ACT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={st.label}>Entro il</label>
                  <DatePicker triggerStyle={st.triggerStyle} value={f.step.date} onChange={v => setStep('date', v)}/>
                </div>
              </div>
              <input style={st.input} placeholder="Cosa fare…" value={f.step.content} onChange={e => setStep('content', e.target.value)}/>
            </>
          )}
        </div>
      )}

      {offersReplace && (
        <label style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize: st.meta + 1, color:MUTED, cursor:'pointer', ...row }}>
          <input type="checkbox" checked={f.replace} onChange={e => set('replace', e.target.checked)}
            style={{ width:16, height:16, accentColor:GOLD, cursor:'pointer', marginTop:1, flexShrink:0 }}/>
          <span>
            Sostituisce: <span style={{ color:CREAM }}>{TYPE_LABELS[replaceable.type] || replaceable.type}{replaceable.content ? ` — ${replaceable.content}` : ''}</span> entro {fmtDay(actDay(replaceable))}
          </span>
        </label>
      )}

      {error && <div style={{ fontSize: st.meta + 1, color:'#ef4444', marginBottom:10 }}>{error}</div>}
      <div style={{ display:'flex', gap: mobile ? 10 : 8 }}>
        {mobile && <button style={st.ghost} onClick={onCancel}>Annulla</button>}
        <button style={st.primary} onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
        {!mobile && <button style={st.ghost} onClick={onCancel}>Annulla</button>}
      </div>
    </div>
  )
}

// ─── Registro ─────────────────────────────────────────────────────
export default function ProspectActivities({ prospect, mobile = false, showReward = false, onSave, onDelete, onAdvanceStage }) {
  const st = styles(mobile)
  const [form, setForm] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [suggest, setSuggest] = useState(null)  // stage proposto dopo un esito positivo

  const today   = todayISO()
  const planned = plannedActivities(prospect)
  const history = [
    ...doneActivities(prospect),
    ...(prospect.prospect_activities || []).filter(isReplaced),
  ].sort(byRecent)

  const base = {
    type:'call', date: today, content:'', direction:'inviata', outcome:'',
    reward_type:'', reward_value:'', step: emptyStep(), replace:false,
  }
  const openNew  = () => setForm({ ...base, mode:'new', status:'fatta', replace: !!nextStep(prospect) })
  const openPlan = () => setForm({ ...base, mode:'plan', status:'da_fare', date:'' })
  const openComplete = (act) => setForm({
    ...base, mode:'complete', status:'fatta', id: act.id, type: act.type, content: act.content || '',
    plannedDate: actDay(act),
  })
  const openEdit = (act) => setForm({
    ...base, mode:'edit', id: act.id, status: act.status || 'fatta',
    type: act.type || 'note', date: actDay(act) || today, content: act.content || '',
    direction: act.direction || 'inviata', outcome: act.outcome || '',
    // I tipi storici (es. "Risposta ricevuta") hanno il verso nel nome:
    // la direzione salvata si conserva finché il tipo non cambia.
    origType: act.type, keepDirection: hasDirection(act.type) ? null : act.direction || null,
    reward_type: act.reward_type || '', reward_value: act.reward_value != null ? String(act.reward_value) : '',
  })

  const handleSave = async (f) => {
    const isPlan = f.status === 'da_fare'
    const activity = {
      ...(f.id ? { id: f.id } : {}),
      type: f.type, date: f.date, content: f.content, status: f.status,
      direction: isPlan ? null
        : hasDirection(f.type) ? f.direction
        : f.type === f.origType ? f.keepDirection || null : null,
      outcome:   !isPlan ? f.outcome || null : null,
      reward_type:  showReward && !isPlan ? f.reward_type : null,
      reward_value: showReward && !isPlan ? f.reward_value : null,
    }
    const withStep = (f.mode === 'new' || f.mode === 'complete') && f.step.enabled
    const replaceable = plannedActivities(prospect).find(a => a.id !== f.id)
    const replaceOn = f.replace && replaceable && (f.mode === 'plan' || withStep)
    const result = await onSave({
      activity,
      nextStep:  withStep ? { type: f.step.type, date: f.step.date, content: f.step.content } : null,
      replaceId: replaceOn ? replaceable.id : null,
    })
    if (!result?.ok) return false
    setWarnings(result.warnings || [])
    setForm(null)
    const next = activity.outcome === 'positivo' ? suggestedStage(prospect) : null
    setSuggest(next && onAdvanceStage ? next : null)
    return true
  }

  const handleDelete = async (act) => {
    const msg = isPlanned(act)
      ? 'Eliminare questa attività da fare? Il promemoria su Todoist si chiude.'
      : 'Eliminare questa attività? L\'operazione non è reversibile.'
    if (!confirm(msg)) return
    const result = await onDelete(act)
    setWarnings(result?.warnings || (result?.ok === false ? ['Eliminazione non riuscita, riprova.'] : []))
  }

  const iconBtn = { background:'none', border:'none', cursor:'pointer', lineHeight:1, padding: mobile ? '4px 5px' : '2px 4px', display:'inline-flex', WebkitTapHighlightColor:'transparent' }
  const sectionLabel = { fontSize: st.section, color:MUTED, letterSpacing:2, textTransform:'uppercase', margin:'4px 0 8px' }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom: mobile ? 12 : 16 }}>
        <div style={mobile ? { fontSize:11, letterSpacing:3, color:GOLD, textTransform:'uppercase' } : { ...s.cardTitle, marginBottom:0 }}>Attività</div>
        {!form && (
          <div style={{ display:'flex', gap:8 }}>
            <button style={{ ...st.small, borderColor:BORDER, color:MUTED, background:'transparent' }} onClick={openPlan}>+ Pianifica</button>
            <button style={st.small} onClick={openNew}>+ Registra</button>
          </div>
        )}
      </div>

      {suggest && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap', padding:'10px 12px', marginBottom:12, borderRadius:6, background:'rgba(74,158,110,0.12)', border:'1px solid rgba(74,158,110,0.35)' }}>
          <span style={{ fontSize: st.text, color:CREAM }}>
            Esito positivo. Avanzare da <b>{prospect.stage}</b> a <b>{suggest}</b>?
          </span>
          <span style={{ display:'flex', gap:6 }}>
            <button style={{ ...st.small, color:GREEN, borderColor:GREEN, background:'transparent' }}
              onClick={async () => { const to = suggest; setSuggest(null); await onAdvanceStage(to) }}>
              Avanza a {suggest}
            </button>
            <button style={{ ...st.small, color:MUTED, borderColor:BORDER, background:'transparent' }} onClick={() => setSuggest(null)}>No</button>
          </span>
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ fontSize: st.meta + 1, color:CLAY, marginBottom:12, lineHeight:1.5 }}>
          {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
          <button onClick={() => setWarnings([])} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', padding:0, fontSize: st.meta, textDecoration:'underline' }}>Chiudi avviso</button>
        </div>
      )}

      {form && (
        <ActivityForm key={`${form.mode}-${form.id || 'new'}`} prospect={prospect} initial={form} showReward={showReward} mobile={mobile}
          onSave={handleSave} onCancel={() => setForm(null)}/>
      )}

      {planned.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={sectionLabel}>Da fare</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {planned.map(act => {
              const due = actDay(act)
              const late = due <= today
              return (
                <div key={act.id} style={{ padding:12, borderRadius:6, background:'rgba(184,150,90,0.06)', borderLeft:`3px solid ${late ? CLAY : GOLD}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize: st.text - 1, color:GOLD, letterSpacing:1, display:'inline-flex', alignItems:'center', gap:7 }}>
                      <ActIcon type={act.type}/>{TYPE_LABELS[act.type] || act.type}
                    </span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize: st.meta, color: late ? CLAY : MUTED, whiteSpace:'nowrap' }}>entro {fmtDay(due)}</span>
                      <button style={st.small} onClick={() => openComplete(act)}>Fatta</button>
                      <button title="Modifica" onClick={() => openEdit(act)} style={{ ...iconBtn, color:MUTED }}><ActIcon type="note" size={12}/></button>
                      <button title="Elimina" onClick={() => handleDelete(act)} style={{ ...iconBtn, color:CLAY, fontSize: mobile ? 17 : 15 }}>×</button>
                    </div>
                  </div>
                  {act.content && <div style={{ fontSize: st.text, color:CREAM, lineHeight:1.6, marginTop:4 }}>{act.content}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {history.length === 0 && planned.length === 0 && !form ? (
        <div style={{ fontSize: st.text, color:MUTED, fontStyle:'italic', textAlign:'center', padding: mobile ? '14px 0' : '24px 0' }}>
          Nessuna attività registrata
        </div>
      ) : history.length > 0 && (
        <div>
          {planned.length > 0 && <div style={sectionLabel}>Storico</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {history.map(act => {
              const replaced = isReplaced(act)
              return (
                <div key={act.id} style={{ padding:12, background:'rgba(255,255,255,0.02)', borderRadius:6, borderLeft:`3px solid ${OUTCOME_CFG[act.outcome]?.border || 'rgba(138,154,181,0.3)'}`, opacity: replaced ? 0.5 : 1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize: st.text - 1, color:GOLD, letterSpacing:1, display:'inline-flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                      <ActIcon type={act.type}/>{replaced ? (TYPE_LABELS[act.type] || act.type) : activityLabel(act)}
                      {act.outcome && <OutcomeBadge outcome={act.outcome} mobile={mobile}/>}
                      {replaced && <span style={{ fontSize: st.section, color:MUTED, letterSpacing:1.2, textTransform:'uppercase' }}>non fatta · sostituita</span>}
                    </span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize: st.meta, color:MUTED, whiteSpace:'nowrap' }}>{replaced ? `prevista ${fmtDay(actDay(act))}` : fmtDay(actDay(act))}</span>
                      {!replaced && (
                        <button title="Modifica attività" onClick={() => openEdit(act)} style={{ ...iconBtn, color:MUTED }}><ActIcon type="note" size={12}/></button>
                      )}
                      <button title="Elimina attività" onClick={() => handleDelete(act)} style={{ ...iconBtn, color:CLAY, fontSize: mobile ? 17 : 15 }}>×</button>
                    </div>
                  </div>
                  {act.content && <div style={{ fontSize: st.text, color:CREAM, lineHeight:1.6 }}>{act.content}</div>}
                  {act.reward_type && (
                    <div style={{ marginTop:6, fontSize: st.meta, color:GREEN }}>
                      Riconoscimento: {act.reward_type}{act.reward_value != null ? ` · € ${parseFloat(act.reward_value).toLocaleString('it-IT',{maximumFractionDigits:0})}` : ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
