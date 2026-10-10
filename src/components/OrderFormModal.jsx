import { useState } from 'react'
import { CREAM, GOLD, MUTED, CLAY, GREEN, BORDER, ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { artPieceCount, orderTotal } from '../utils/helpers.js'
import { updateOrder } from '../lib/dataService.js'
import { askConfirm } from './ConfirmDialog.jsx'
import {
  buildFormLines, createOrderForm, setOrderFormStatus, patchOrderForm, applyFormToOrder, notifyFormApplied, notifyRequestDone, sendFormEmail,
  formUrl, linePieces, formPieces, lineDiff, LOCKING_STATUSES, GRIDS, GRID_LABEL, FORM_STATUS_LABEL,
} from '../lib/orderForms.js'

// Modulo taglie da mandare al cliente, per un ordine: crea il link,
// lo condivide, e quando il cliente ha inviato mostra le taglie accanto a
// quelle dell'ordine per applicarle con un clic.

const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}) : ''

const chip = (on, color = GOLD) => ({
  padding: '4px 10px', borderRadius: 3, fontSize: 10, letterSpacing: 1, cursor: 'pointer',
  border: `1px solid ${on ? color : BORDER}`, background: on ? 'rgba(184,150,90,0.14)' : 'transparent',
  color: on ? CREAM : MUTED,
})
const btn = (color, filled) => ({
  padding: '9px 16px', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600,
  borderRadius: 4, cursor: 'pointer', border: `1px solid ${color}`,
  background: filled ? color : 'transparent', color: filled ? '#fff' : color,
})

function sizesText(grids, s) {
  if (!s) return '—'
  const parts = []
  if (grids.includes('adult')) for (const sz of ADULT_SIZES) if ((s.adult?.[sz] || 0) > 0) parts.push(`${sz}: ${s.adult[sz]}`)
  if (grids.includes('kids'))  for (const sz of KIDS_SIZES)  if ((s.kids?.[sz]  || 0) > 0) parts.push(`${sz} anni: ${s.kids[sz]}`)
  if (grids.includes('uni') && (s.uni || 0) > 0) parts.push(`TU: ${s.uni}`)
  return parts.join(' · ') || '—'
}

const shareText = (order) =>
  `Ciao${order.clientContact ? ' ' + order.clientContact.split(' ')[0] : ''}, ecco il modulo per indicarci le taglie del vostro ordine DOUBLEU. Si compila dal telefono e si salva da solo:`

// Numero in formato internazionale senza '+': '333 123 4567' → '393331234567'.
// Un cellulare italiano scritto senza prefisso prende il +39.
function intlPhone(raw) {
  let phone = (raw || '').replace(/[^\d+]/g, '')
  if (phone.startsWith('+')) phone = phone.slice(1)
  else if (phone.startsWith('00')) phone = phone.slice(2)
  else if (/^3\d{8,9}$/.test(phone)) phone = '39' + phone
  return phone.replace(/\D/g, '')
}

function whatsappHref(order, url, phone) {
  return `https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(`${shareText(order)} ${url}`)}`
}

// Email dal programma di posta di chi invia (Mail, Gmail, Outlook): parte
// dal suo indirizzo, resta nella sua posta inviata e si puo' ritoccare.
function mailHref(order, url, email) {
  const name = order.clientContact ? ' ' + order.clientContact.split(' ')[0] : ''
  const subject = `DOUBLEU · Taglie ordine ${order.id}`
  const body = [
    `Ciao${name},`,
    '',
    'ecco il modulo per indicarci le taglie del vostro ordine DOUBLEU:',
    url,
    '',
    'Si compila anche dal telefono e si salva da solo: potete raccogliere le taglie con calma e inviarle quando siete pronti.',
    '',
    'Grazie,',
    'DOUBLEU',
  ].join('\n')
  return `mailto:${(email || '').replace(/[\s?&#,;]/g, '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// iOS vuole '&body=', Android '?body=': '?&body=' funziona su entrambi.
function smsHref(order, url, phone) {
  const n = intlPhone(phone)
  return `sms:${n ? '+' + n : ''}?&body=${encodeURIComponent(`${shareText(order)} ${url}`)}`
}

function Setup({ order, onCreated }) {
  const base = buildFormLines(order)
  const arts = (order.kits || []).flatMap(k => k.articles || [])
  const [grids, setGrids]   = useState(() => Object.fromEntries(base.map(l => [l.key, l.grids])))
  const [prefill, setPrefill] = useState(() => arts.some(a => artPieceCount(a) > 0))
  const [expiry, setExpiry] = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')

  const toggle = (key, g) => setGrids(prev => {
    const cur = prev[key]
    const next = cur.includes(g) ? cur.filter(x => x !== g) : GRIDS.filter(x => x === g || cur.includes(x))
    return next.length ? { ...prev, [key]: next } : prev
  })

  const create = async () => {
    setBusy(true); setErr('')
    const lines = buildFormLines(order, grids)
    const expiresAt = expiry ? new Date(`${expiry}T23:59:59`).toISOString() : null
    const form = await createOrderForm(order, lines, { prefill, expiresAt })
    setBusy(false)
    if (!form) { setErr('Creazione non riuscita. Se e\' il primo modulo, va eseguita la migrazione "modulo taglie" in SEED_DATA.sql.'); return }
    onCreated(form)
  }

  if (!base.length) return <div style={{ color: MUTED, fontSize: 12 }}>L'ordine non ha articoli: aggiungili prima di creare il modulo.</div>

  return (
    <>
      <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>
        Il cliente vedrà solo questi articoli e le griglie scelte, senza prezzi.
      </div>
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, overflowY: 'auto', maxHeight: 340 }}>
        {base.map(l => (
          <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ fontSize: 13, color: CREAM }}>{l.description || l.category || 'Articolo'} <span style={{ color: CLAY }}>{l.color}</span></div>
              <div style={{ fontSize: 10, color: MUTED }}>{[l.sp, l.kit, l.expected ? `${l.expected} pz previsti` : null].filter(Boolean).join(' · ')}</div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {GRIDS.map(g => (
                <span key={g} role="button" tabIndex={0} style={chip(grids[l.key].includes(g))} onClick={() => toggle(l.key, g)}
                  onKeyDown={e => e.key === 'Enter' && toggle(l.key, g)}>{g === 'uni' ? 'TU' : GRID_LABEL[g]}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: CREAM, cursor: 'pointer' }}>
        <input type="checkbox" checked={prefill} onChange={e => setPrefill(e.target.checked)} style={{ accentColor: GOLD }}/>
        Parti dalle taglie già inserite nell'ordine
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: MUTED, flexWrap: 'wrap' }}>
        Compilabile fino al
        <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '6px 10px', color: CREAM, colorScheme: 'dark', fontSize: 12 }}/>
        <span style={{ fontSize: 10 }}>{expiry ? '' : 'nessuna scadenza'}</span>
      </label>
      {err && <div style={{ color: CLAY, fontSize: 12 }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btn(GOLD, false)} disabled={busy} onClick={create}>{busy ? 'Creazione…' : 'Crea link per il cliente'}</button>
      </div>
    </>
  )
}

function LinkBox({ order, form }) {
  const url = formUrl(form.token)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    catch { window.prompt('Copia il link:', url) }
  }
  // Sul telefono il foglio di condivisione di sistema arriva a WhatsApp,
  // Messaggi, Mail: stesso testo del bottone WhatsApp.
  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  const [phone, setPhone] = useState(order.clientPhone || '')
  const validPhone = intlPhone(phone).length >= 8
  const [email, setEmail] = useState(order.clientEmail || '')
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const [copyToMe, setCopyToMe] = useState(true)
  const [mail, setMail] = useState({ state: 'idle', msg: '' })   // idle | sending | sent | error
  const sendMail = async () => {
    setMail({ state: 'sending', msg: '' })
    const r = await sendFormEmail({
      token: form.token, to: email.trim(), copyToMe,
      firstName: order.clientContact ? order.clientContact.split(' ')[0] : '',
    })
    setMail(r.ok ? { state: 'sent', msg: `Email inviata a ${email.trim()}` } : { state: 'error', msg: r.error })
  }
  const share = () => navigator.share({ title: 'Modulo taglie DOUBLEU', text: shareText(order), url }).catch(() => {})
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 6, padding: 12 }}>
      <div style={{ fontSize: 11, color: GOLD, wordBreak: 'break-all', marginBottom: 12 }}>{url}</div>
      <label style={{ display: 'block', fontSize: 10, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase', marginBottom: 6 }}>Invia al numero</label>
      <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)}
        placeholder="es. 333 123 4567 oppure +41 79…"
        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '10px 12px', color: CREAM, fontSize: 16, marginBottom: 10, outline: 'none' }}/>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a style={{ ...btn(GREEN, validPhone), textDecoration: 'none' }} href={whatsappHref(order, url, phone)} target="_blank" rel="noreferrer">WhatsApp</a>
        <a style={{ ...btn(GREEN, false), textDecoration: 'none' }} href={smsHref(order, url, phone)}>SMS</a>
      </div>
      <label style={{ display: 'block', fontSize: 10, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase', margin: '14px 0 6px' }}>Invia all'email</label>
      <input type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="es. segreteria@tennisclub.it"
        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '10px 12px', color: CREAM, fontSize: 16, marginBottom: 10, outline: 'none' }}/>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button style={btn(GOLD, validEmail && mail.state !== 'sending')} disabled={!validEmail || mail.state === 'sending'} onClick={sendMail}>
          {mail.state === 'sending' ? 'Invio…' : mail.state === 'sent' ? 'Invia di nuovo' : 'Invia email'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: MUTED, cursor: 'pointer' }}>
          <input type="checkbox" checked={copyToMe} onChange={e => setCopyToMe(e.target.checked)} style={{ accentColor: GOLD }}/>
          copia a me
        </label>
        <a style={{ fontSize: 11, color: MUTED, alignSelf: 'center', marginLeft: 'auto' }} href={mailHref(order, url, email)}>oppure dalla mia posta</a>
      </div>
      {mail.msg && <div style={{ fontSize: 12, color: mail.state === 'sent' ? GREEN : CLAY, marginTop: -6, marginBottom: 12 }}>{mail.state === 'sent' ? '✓ ' : ''}{mail.msg}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
        <button style={btn(GOLD, false)} onClick={copy}>{copied ? 'Copiato ✓' : 'Copia link'}</button>
        {canShare && <button style={btn(CREAM, false)} onClick={share}>Condividi…</button>}
        <a style={{ ...btn(MUTED, false), textDecoration: 'none' }} href={url} target="_blank" rel="noreferrer">Apri come cliente</a>
      </div>
    </div>
  )
}

const eur = (n) => `€ ${(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Comparison({ order, form }) {
  const arts = (order.kits || []).map(k => k.articles || [])
  // Cosa e' cambiato: rispetto alle taglie applicate, oppure (se non ancora
  // applicate) rispetto all'invio precedente.
  const base = form.status === 'inviato' ? (form.applied_sizes || form.prev_submitted_sizes) : null
  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, overflowY: 'auto', maxHeight: 300 }}>
      {form.lines.map(l => {
        const n = linePieces(l, form.sizes)
        const cur = arts[l.kitIndex]?.[l.articleIndex]
        return (
          <div key={l.key} style={{ padding: '10px 2px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 13, color: CREAM }}>{l.description || l.category} <span style={{ color: CLAY }}>{l.color}</span></div>
              <div style={{ fontSize: 13, color: l.expected && n !== l.expected ? CLAY : GOLD, whiteSpace: 'nowrap' }}>
                {n} pz{l.expected ? <span style={{ color: MUTED, fontSize: 10 }}> / {l.expected}</span> : null}
              </div>
            </div>
            <div style={{ fontSize: 11, color: CREAM, marginTop: 3 }}>Cliente: {sizesText(l.grids, form.sizes?.[l.key])}</div>
            {base && (d => d && <div style={{ fontSize: 11, color: GOLD, marginTop: 2 }}>Variazioni{form.applied_sizes ? ' rispetto all\'ordine' : ' rispetto all\'invio precedente'}: {d}</div>)(lineDiff(l, base, form.sizes))}
            {cur && artPieceCount(cur) > 0 && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Ordine ora: {sizesText(GRIDS, cur.sizes)}</div>}
          </div>
        )
      })}
    </div>
  )
}

export default function OrderFormModal({ order, form: initialForm, onClose, onFormChange, onOrderUpdated }) {
  const [form, setForm]   = useState(initialForm || null)
  const [fresh, setFresh] = useState(!initialForm)
  const [busy, setBusy]   = useState(false)
  const [msg, setMsg]     = useState('')

  const changed = (f) => { setForm(f); onFormChange(f) }

  const setStatus = async (status, confirm) => {
    if (confirm && !(await askConfirm(confirm))) return
    setBusy(true)
    const f = await setOrderFormStatus(form.token, status)
    setBusy(false)
    if (!f) { setMsg('Operazione non riuscita.'); return }
    if (status === 'revocato') { onFormChange(f); setForm(null); setFresh(true); return }
    changed(f)
  }

  const apply = async () => {
    const { order: next, unmatched } = applyFormToOrder(order, form)
    // Piu' o meno pezzi cambiano il totale, non le rate gia' impostate.
    const before = orderTotal(order), after = orderTotal(next)
    const money = Math.abs(after - before) >= 0.01
      ? `Il totale dell'ordine passa da ${eur(before)} a ${eur(after)}: controlla acconto e rate nei pagamenti.`
      : ''
    const confirmed = await askConfirm({
      title: 'Applicare le taglie del cliente?',
      body: [
        `Le taglie dell'ordine vengono sostituite con quelle inviate dal cliente: ${formPieces(form.lines, form.sizes)} pezzi.`,
        unmatched.length ? `${unmatched.length === 1 ? 'Una riga non corrisponde' : `${unmatched.length} righe non corrispondono`} più all'ordine (articolo modificato o rimosso) e non verrà applicata:` : null,
      ],
      list: unmatched.map(l => `${l.description} ${l.color}`.trim()),
      warning: money || null,
      confirmLabel: 'Applica', tone: 'green',
    })
    if (!confirmed) return
    setBusy(true); setMsg('')
    const ok = await updateOrder(next)
    if (!ok) { setBusy(false); setMsg('Salvataggio ordine non riuscito: nessuna modifica applicata.'); return }
    onOrderUpdated(next)
    notifyFormApplied(order.id)
    const f = await setOrderFormStatus(form.token, 'applicato', { applied_sizes: form.sizes })
    setBusy(false)
    if (f) changed(f)
    setMsg((unmatched.length ? `Taglie applicate. ${unmatched.length} righe da sistemare a mano.` : 'Taglie applicate all\'ordine.')
      + (money ? ` Totale ordine ora ${eur(after)}: controlla i pagamenti.` : ''))
  }

  const toggleLock = async () => {
    setBusy(true)
    const f = await patchOrderForm(form.token, { locked: !form.locked })
    setBusy(false)
    if (f) changed(f); else setMsg('Operazione non riuscita.')
  }

  const requestDone = async () => {
    setBusy(true)
    const f = await patchOrderForm(form.token, { change_request: null, change_requested_at: null })
    setBusy(false)
    if (!f) { setMsg('Operazione non riuscita.'); return }
    changed(f)
    notifyRequestDone(order.id)
  }

  const status = form?.status
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1e2d50', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 'clamp(16px, 4vw, 28px)', width: 620, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: MUTED, marginBottom: 4 }}>MODULO TAGLIE CLIENTE</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: CREAM }}>{order.client}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{order.id}</div>
          </div>
          {form && !fresh && <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 2, color: '#fff', background: status === 'inviato' ? GREEN : status === 'applicato' ? '#53769e' : '#8c7244' }}>{FORM_STATUS_LABEL[status]}</span>}
        </div>

        {fresh || !form ? (
          <>
            <Setup order={order} onCreated={(f) => { changed(f); setFresh(false) }}/>
          </>
        ) : (
          <>
            <LinkBox order={order} form={form}/>
            {form.change_request && (
              <div style={{ background: 'rgba(196,98,58,0.12)', border: '1px solid rgba(196,98,58,0.4)', borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, color: CLAY, textTransform: 'uppercase', marginBottom: 6 }}>
                  Richiesta del cliente · {fmtDateTime(form.change_requested_at)}
                </div>
                <div style={{ fontSize: 13, color: CREAM, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{form.change_request}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button style={btn(CLAY, false)} disabled={busy} onClick={requestDone}>Segna come gestita</button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12, color: MUTED }}>
              <span style={{ flex: 1 }}>
                {LOCKING_STATUSES.includes(order.status)
                  ? <>Modifiche del cliente <b style={{ color: CLAY }}>bloccate</b>: ordine {order.status.toLowerCase()}. Può solo mandarti richieste.</>
                  : form.locked
                    ? <>Modifiche del cliente <b style={{ color: CLAY }}>bloccate a mano</b>. Può solo mandarti richieste.</>
                    : <>Il cliente può correggere le taglie dallo stesso link fino a IN PRODUZIONE.</>}
              </span>
              {!LOCKING_STATUSES.includes(order.status) && (
                <button style={btn(MUTED, false)} disabled={busy} onClick={toggleLock}>{form.locked ? 'Sblocca' : 'Blocca ora'}</button>
              )}
            </div>
            {status === 'aperto' && (
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                {form.applied_at ? 'Il cliente ha riaperto il modulo per correggere le taglie già applicate: non ha ancora reinviato.' : 'Il cliente non ha ancora inviato.'}{form.updated_at && form.updated_at !== form.created_at ? ` Ultima modifica ${fmtDateTime(form.updated_at)}.` : ''}
                {form.expires_at ? ` Scade il ${new Date(form.expires_at).toLocaleDateString('it-IT')}.` : ''}
              </div>
            )}
            {(status === 'inviato' || status === 'applicato') && (
              <>
                <div style={{ fontSize: 12, color: CREAM, lineHeight: 1.6 }}>
                  Inviato {fmtDateTime(form.submitted_at)}{form.contact_name ? ` da ${form.contact_name}` : ''} · <b>{formPieces(form.lines, form.sizes)} pezzi</b>
                  {form.client_note && <div style={{ color: MUTED, marginTop: 6, whiteSpace: 'pre-wrap' }}>Nota: {form.client_note}</div>}
                </div>
                <Comparison order={order} form={form}/>
              </>
            )}
            {msg && <div style={{ fontSize: 12, color: msg.startsWith('Taglie applicate') ? GREEN : CLAY }}>{msg}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button style={btn('#ef4444', false)} disabled={busy} onClick={() => setStatus('revocato', { title: 'Revocare il link?', body: ['Il cliente non potrà più aprire il modulo. Le taglie già inviate restano visibili qui.'], confirmLabel: 'Revoca', tone: 'danger' })}>Revoca link</button>
              {status === 'inviato' && !LOCKING_STATUSES.includes(order.status) && !form.locked && <button style={btn(MUTED, false)} disabled={busy} onClick={() => setStatus('aperto', { title: 'Riaprire il modulo al cliente?', body: ['Potrà modificare le taglie e inviarle di nuovo dallo stesso link.'], confirmLabel: 'Riapri', tone: 'gold' })}>Riapri al cliente</button>}
              {status === 'inviato' && <button style={btn(GREEN, true)} disabled={busy} onClick={apply}>{busy ? 'Applico…' : 'Applica all\'ordine'}</button>}
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', fontSize: 11, letterSpacing: 1, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 4, cursor: 'pointer' }}>Chiudi</button>
        </div>
      </div>
    </div>
  )
}
