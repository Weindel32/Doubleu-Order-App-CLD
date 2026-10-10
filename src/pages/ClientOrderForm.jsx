import { useState, useEffect, useRef, useCallback } from 'react'
import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { getPublicForm, savePublicForm, reopenPublicForm, requestPublicChange, linePieces, formPieces, GRID_LABEL } from '../lib/orderForms.js'

// Pagina pubblica del modulo taglie (/taglie/<token>): la vede il cliente, dal
// telefono, senza login. Mostra solo gli articoli dell'ordine e le
// taglie: nessun prezzo, nessun dato interno. Fondo chiaro e non il navy
// dell'app: si compila spesso in piedi, al circolo, anche in pieno sole.

const C = {
  bg: '#f6f2ea', card: '#ffffff', ink: '#111d38', muted: '#5f6a80', faint: '#9aa3b5',
  line: '#e4dccd', gold: '#8c6d3a', goldSoft: 'rgba(184,150,90,0.14)',
  clay: '#b4532c', green: '#2f7a51', greenSoft: 'rgba(47,122,81,0.1)',
}
const serif = "'Cormorant Garamond', serif"
const sans  = "'Josefin Sans', sans-serif"

const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : ''
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: 'long' }) : ''

const SIZE_LIST = { adult: ADULT_SIZES, kids: KIDS_SIZES }

function sizesSummary(line, s) {
  const parts = []
  for (const g of line.grids) {
    if (g === 'uni') { if ((s?.uni || 0) > 0) parts.push(`TU: ${s.uni}`); continue }
    for (const sz of SIZE_LIST[g]) {
      const v = s?.[g]?.[sz] || 0
      if (v > 0) parts.push(`${g === 'kids' ? sz + ' anni' : sz}: ${v}`)
    }
  }
  return parts.join(' · ')
}

function Shell({ children, clientName }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: sans }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px 140px' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 600, letterSpacing: 6, color: C.ink }}>DOUBLEU</div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: C.gold, textTransform: 'uppercase', marginTop: 4 }}>Modulo taglie</div>
          {clientName && <div style={{ fontFamily: serif, fontSize: 22, marginTop: 18, color: C.ink }}>{clientName}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}

function Message({ title, text, clientName }) {
  return (
    <Shell clientName={clientName}>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '28px 22px', textAlign: 'center' }}>
        <div style={{ fontFamily: serif, fontSize: 24, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{text}</div>
      </div>
    </Shell>
  )
}

function SizeCell({ label, value, onChange, disabled }) {
  const on = value > 0
  return (
    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 12, letterSpacing: 1, fontWeight: 600, color: on ? C.ink : C.faint }}>{label}</span>
      <input
        type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" disabled={disabled}
        value={value > 0 ? String(value) : ''} placeholder="0"
        onFocus={e => e.target.select()}
        onChange={e => onChange(Math.min(9999, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))}
        aria-label={`Taglia ${label}`}
        style={{
          width: '100%', height: 46, textAlign: 'center', fontSize: 18, fontFamily: sans,
          color: C.ink, background: on ? C.goldSoft : '#fbf9f5',
          border: `1px solid ${on ? C.gold : C.line}`, borderRadius: 8, outline: 'none',
          WebkitAppearance: 'none', padding: 0,
        }}
      />
    </label>
  )
}

function LineCard({ line, sizes, setLineSizes, readOnly }) {
  const s = sizes[line.key] || {}
  const n = linePieces(line, sizes)
  const exp = line.expected
  const matches = exp && n === exp
  const set = (grid, sz, v) => setLineSizes(line.key, grid === 'uni'
    ? { ...s, uni: v }
    : { ...s, [grid]: { ...(s[grid] || {}), [sz]: v } })

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '18px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.15 }}>{line.description || line.category || 'Articolo'}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {line.color && <span style={{ color: C.clay, fontWeight: 600 }}>{line.color}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: serif, fontSize: 30, lineHeight: 1, color: matches ? C.green : C.ink }}>{n}</div>
          <div style={{ fontSize: 10, letterSpacing: 1, color: C.muted, marginTop: 3 }}>
            {exp ? <>di {exp} previsti</> : 'pezzi'}
          </div>
        </div>
      </div>

      {line.grids.map(grid => (
        <div key={grid} style={{ marginTop: 10 }}>
          {line.grids.length > 1 && (
            <div style={{ fontSize: 10, letterSpacing: 2, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>
              {GRID_LABEL[grid]}{grid === 'kids' ? ' · anni' : ''}
            </div>
          )}
          {grid === 'uni' ? (
            <div style={{ width: 92 }}>
              <SizeCell label="TU" value={s.uni || 0} onChange={v => set('uni', null, v)} disabled={readOnly}/>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${grid === 'adult' ? 6 : 7}, minmax(0, 1fr))`, gap: 6 }}>
              {SIZE_LIST[grid].map(sz => (
                <SizeCell key={sz} label={sz} value={s[grid]?.[sz] || 0} onChange={v => set(grid, sz, v)} disabled={readOnly}/>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function KitHeader({ name }) {
  return <div style={{ fontSize: 11, letterSpacing: 2.5, color: C.gold, textTransform: 'uppercase', margin: '22px 2px 10px' }}>{name}</div>
}

function Summary({ lines, sizes }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '6px 16px' }}>
      {lines.map((l, i) => {
        const n = linePieces(l, sizes)
        const off = l.expected && n !== l.expected
        return (
          <div key={l.key} style={{ padding: '12px 0', borderTop: i ? `1px solid ${C.line}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 14 }}>{l.description || l.category} <span style={{ color: C.clay }}>{l.color}</span></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: n === 0 || off ? C.clay : C.ink, whiteSpace: 'nowrap' }}>{n} pz</div>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              {n === 0 ? 'Nessuna taglia inserita' : sizesSummary(l, sizes[l.key])}
              {off ? <span style={{ color: C.clay }}>{` · previsti ${l.expected}`}</span> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const btn = (primary, disabled) => ({
  padding: '15px 20px', borderRadius: 8, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase',
  fontWeight: 600, fontFamily: sans, cursor: disabled ? 'default' : 'pointer', width: '100%',
  border: primary ? 'none' : `1px solid ${C.line}`,
  background: primary ? (disabled ? '#c9c2b5' : C.ink) : C.card,
  color: primary ? '#ffffff' : C.ink,
})

const inputStyle = {
  width: '100%', padding: '13px 14px', fontSize: 16, fontFamily: sans, color: C.ink,
  background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, outline: 'none',
}

// Richiesta a testo libero: per l'ordine gia' in produzione, o per cio' che
// il modulo non copre (un articolo in piu', un colore diverso). Non cambia
// niente da sola: arriva a DOUBLEU, che risponde.
function ChangeRequest({ token, form, setForm, locked }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')
  const send = async () => {
    if (!text.trim()) return
    setBusy(true); setErr('')
    const r = await requestPublicChange(token, text)
    setBusy(false)
    if (r.error) { setErr('Invio non riuscito. Riprova tra qualche istante.'); return }
    setForm(r.form); setText('')
  }
  return (
    <div style={{ marginTop: 30, borderTop: `1px solid ${C.line}`, paddingTop: 22 }}>
      <div style={{ fontFamily: serif, fontSize: 20, marginBottom: 6 }}>{locked ? 'Serve una modifica?' : 'Altre richieste'}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
        {locked
          ? 'Scrivici cosa va cambiato: verifichiamo se è ancora possibile e ti rispondiamo.'
          : 'Per aggiungere articoli o cambiare qualcosa che qui non trovi, scrivici: ti rispondiamo noi.'}
      </div>
      {form.change_request && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: C.gold, marginBottom: 4 }}>
            Richiesta inviata{form.change_requested_at ? ` il ${fmtDateTime(form.change_requested_at)}` : ''}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', color: C.ink }}>{form.change_request}</div>
        </div>
      )}
      <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={text} onChange={e => setText(e.target.value)}
        placeholder={locked ? 'Es. 2 felpe M in più, una L diventa XL' : 'Es. aggiungere 10 cappellini'} maxLength={2000}/>
      {err && <div style={{ color: C.clay, fontSize: 13, marginTop: 10 }}>{err}</div>}
      <div style={{ marginTop: 10 }}>
        <button style={btn(false, busy || !text.trim())} disabled={busy || !text.trim()} onClick={send}>{busy ? 'Invio…' : 'Invia la richiesta'}</button>
      </div>
    </div>
  )
}

export default function ClientOrderForm({ token }) {
  const [state, setState]     = useState('loading')   // loading | ready | missing | error
  const [form, setForm]       = useState(null)
  const [sizes, setSizes]     = useState({})
  const [contact, setContact] = useState('')
  const [note, setNote]       = useState('')
  const [step, setStep]       = useState('edit')      // edit | review | done
  const [save, setSave]       = useState('idle')      // idle | pending | saving | saved | error
  const [submitErr, setSubmitErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [reopenErr, setReopenErr] = useState('')
  const dirty = useRef(false)
  const latest = useRef({})
  latest.current = { sizes, contact, note }

  useEffect(() => {
    document.title = 'DOUBLEU · Modulo taglie'
    // Il body dell'app e' navy: si vedrebbe nel rimbalzo dello scroll.
    document.body.style.background = C.bg
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', C.bg)
    getPublicForm(token).then(({ form, error }) => {
      if (error) { setState('error'); return }
      if (!form) { setState('missing'); return }
      setForm(form); setSizes(form.sizes || {}); setContact(form.contact_name || ''); setNote(form.client_note || '')
      if (form.status !== 'aperto' || form.locked) setStep('done')
      setState('ready')
    })
  }, [token])

  const flush = useCallback(async () => {
    if (!dirty.current) return
    dirty.current = false
    setSave('saving')
    const r = await savePublicForm(token, { ...latest.current })
    if (r.error) { setSave('error'); dirty.current = true } else setSave('saved')
  }, [token])

  // Salvataggio automatico: il cliente puo' chiudere e riprendere dallo
  // stesso link, anche giorni dopo, mentre raccoglie le taglie.
  useEffect(() => {
    if (save !== 'pending') return
    const t = setTimeout(flush, 1200)
    return () => clearTimeout(t)
  }, [save, sizes, contact, note, flush])

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [flush])

  const touch = () => { dirty.current = true; setSave('pending') }
  const setLineSizes = (key, v) => { setSizes(prev => ({ ...prev, [key]: v })); touch() }

  if (state === 'loading') return <Message title="Caricamento…" text=""/>
  if (state === 'missing') return <Message title="Modulo non disponibile" text="Il link non è valido o è stato disattivato. Contatta DOUBLEU per riceverne uno nuovo."/>
  if (state === 'error')   return <Message title="Qualcosa non ha funzionato" text="Non riusciamo a caricare il modulo. Controlla la connessione e ricarica la pagina."/>

  const lines = form.lines || []
  const total = formPieces(lines, sizes)
  const readOnly = step === 'done' || form.expired

  if (form.expired && form.status === 'aperto') {
    return <Message clientName={form.client_name} title="Modulo scaduto" text="Il tempo per compilare questo modulo è terminato. Contatta DOUBLEU per riaprirlo."/>
  }

  const submit = async () => {
    if (!contact.trim()) { setSubmitErr('Inserisci il nome di chi compila il modulo.'); return }
    setSubmitting(true); setSubmitErr('')
    dirty.current = false
    const r = await savePublicForm(token, { sizes, contact, note, submit: true })
    setSubmitting(false)
    if (r.error) {
      setSubmitErr(/gia inviato/.test(r.error) ? 'Il modulo risulta già inviato.' : /scaduto/.test(r.error) ? 'Il modulo è scaduto.'
        : /bloccato/.test(r.error) ? 'L\'ordine è entrato in produzione: le taglie non sono più modificabili. Contatta DOUBLEU.'
        : 'Invio non riuscito. Riprova tra qualche istante.')
      return
    }
    setForm(r.form); setStep('done'); window.scrollTo(0, 0)
  }

  if (step === 'done') {
    const reopen = async () => {
      setReopening(true); setReopenErr('')
      const r = await reopenPublicForm(token)
      setReopening(false)
      if (r.error) {
        setReopenErr(/bloccato/.test(r.error) ? 'L\'ordine è entrato in produzione: non è più possibile modificare le taglie.' : /scaduto/.test(r.error) ? 'Il modulo è scaduto.' : 'Non riusciamo a riaprire il modulo. Riprova.')
        if (r.form) setForm(r.form)
        return
      }
      setForm(r.form); setSizes(r.form.sizes || {}); setStep('edit'); window.scrollTo(0, 0)
    }
    const canEdit = !form.locked && !form.expired
    return (
      <Shell clientName={form.client_name}>
        {form.locked ? (
          <div style={{ background: C.goldSoft, border: `1px solid rgba(140,109,58,0.35)`, borderRadius: 12, padding: '18px 18px', marginBottom: 20 }}>
            <div style={{ fontFamily: serif, fontSize: 22, color: C.ink }}>Ordine in produzione</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
              Le taglie qui sotto sono quelle in lavorazione e non si possono più modificare da qui.
              Se serve un cambiamento, scrivici con il modulo in fondo alla pagina.
            </div>
          </div>
        ) : (
          <div style={{ background: C.greenSoft, border: `1px solid rgba(47,122,81,0.3)`, borderRadius: 12, padding: '18px 18px', marginBottom: 20 }}>
            <div style={{ fontFamily: serif, fontSize: 22, color: C.green }}>Taglie inviate</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
              {form.submitted_at ? `Ricevute il ${fmtDateTime(form.submitted_at)}` : 'Ricevute'}{form.contact_name ? ` da ${form.contact_name}` : ''}.
              {' '}{canEdit ? 'Finché l\'ordine non entra in produzione puoi ancora correggerle da questo link.' : 'Le verifichiamo e ti confermiamo l\'ordine.'}
            </div>
          </div>
        )}
        {canEdit && (
          <div style={{ marginBottom: 20 }}>
            <button style={btn(true, reopening)} disabled={reopening} onClick={reopen}>{reopening ? 'Apertura…' : 'Modifica le taglie'}</button>
            {reopenErr && <div style={{ color: C.clay, fontSize: 13, marginTop: 10 }}>{reopenErr}</div>}
          </div>
        )}
        <Summary lines={lines} sizes={sizes}/>
        <div style={{ textAlign: 'center', fontSize: 13, color: C.muted, marginTop: 16 }}>Totale {total} pezzi</div>
        {form.client_note && <div style={{ fontSize: 13, color: C.muted, marginTop: 14, whiteSpace: 'pre-wrap' }}>Note: {form.client_note}</div>}
        <ChangeRequest token={token} form={form} setForm={setForm} locked={form.locked}/>
      </Shell>
    )
  }


  if (step === 'review') {
    const zero = lines.filter(l => linePieces(l, sizes) === 0).length
    const off  = lines.filter(l => l.expected && linePieces(l, sizes) !== l.expected && linePieces(l, sizes) > 0).length
    return (
      <Shell clientName={form.client_name}>
        <div style={{ fontFamily: serif, fontSize: 24, marginBottom: 6 }}>Controlla e invia</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          Potrai correggerle dallo stesso link finché l'ordine non entra in produzione.
        </div>
        {(zero > 0 || off > 0) && (
          <div style={{ background: 'rgba(180,83,44,0.08)', border: `1px solid rgba(180,83,44,0.3)`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: C.clay, marginBottom: 14, lineHeight: 1.5 }}>
            {zero > 0 && <div>{zero === 1 ? '1 articolo senza taglie.' : `${zero} articoli senza taglie.`}</div>}
            {off > 0 && <div>{off === 1 ? '1 articolo ha' : `${off} articoli hanno`} un numero di pezzi diverso da quello previsto.</div>}
          </div>
        )}
        <Summary lines={lines} sizes={sizes}/>
        <div style={{ textAlign: 'right', fontSize: 14, margin: '12px 4px 22px' }}>Totale <b>{total}</b> pezzi</div>

        <label style={{ display: 'block', fontSize: 11, letterSpacing: 2, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>Compilato da *</label>
        <input style={inputStyle} value={contact} onChange={e => { setContact(e.target.value); touch() }} placeholder="Nome e cognome" autoComplete="name" maxLength={120}/>
        <label style={{ display: 'block', fontSize: 11, letterSpacing: 2, color: C.muted, textTransform: 'uppercase', margin: '18px 0 8px' }}>Note (facoltative)</label>
        <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={note} onChange={e => { setNote(e.target.value); touch() }} placeholder="Indicazioni per noi" maxLength={2000}/>

        {submitErr && <div style={{ color: C.clay, fontSize: 13, marginTop: 14 }}>{submitErr}</div>}
        <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
          <button style={btn(true, submitting)} disabled={submitting} onClick={submit}>{submitting ? 'Invio…' : form.submit_count > 0 ? 'Invia le modifiche' : 'Invia le taglie'}</button>
          <button style={btn(false)} onClick={() => { setStep('edit'); window.scrollTo(0, 0) }}>Torna a modificare</button>
        </div>
      </Shell>
    )
  }

  const saveLabel = { pending: 'Modifiche in corso…', saving: 'Salvataggio…', saved: 'Bozza salvata', error: 'Non salvato · riprova', idle: '' }[save]

  return (
    <Shell clientName={form.client_name}>
      <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 6 }}>
        Inserisci quanti pezzi servono per ogni taglia. Le modifiche si salvano da sole: puoi chiudere e riprendere da questo link.
        {form.expires_at && <> Compilabile fino al <b style={{ color: C.ink }}>{fmtDate(form.expires_at)}</b>.</>}
      </div>

      {lines.map((l, i) => (
        <div key={l.key}>
          {l.kit && (i === 0 || lines[i - 1].kit !== l.kit || lines[i - 1].kitIndex !== l.kitIndex) && <KitHeader name={l.kit}/>}
          {!l.kit && i === 0 && <div style={{ height: 12 }}/>}
          <LineCard line={l} sizes={sizes} setLineSizes={setLineSizes} readOnly={readOnly}/>
        </div>
      ))}

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: 'rgba(246,242,234,0.96)', borderTop: `1px solid ${C.line}`, backdropFilter: 'blur(6px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15 }}><b>{total}</b> pezzi</div>
            <div style={{ fontSize: 11, color: save === 'error' ? C.clay : C.muted, marginTop: 2 }}>{saveLabel}</div>
          </div>
          <button style={{ ...btn(true, total === 0), width: 'auto', padding: '14px 22px' }} disabled={total === 0}
            onClick={() => { flush(); setStep('review'); window.scrollTo(0, 0) }}>Rivedi e invia</button>
        </div>
      </div>
    </Shell>
  )
}
