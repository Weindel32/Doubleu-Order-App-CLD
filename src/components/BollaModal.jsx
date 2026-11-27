import { useState } from 'react'
import { CREAM, GOLD, MUTED, CLAY, GREEN, BORDER } from '../tokens.js'
import { getAllArticles, artPieceCount } from '../utils/helpers.js'
import { buildDeliveryPdf, deliveryPdfName } from '../utils/pdfDelivery.js'
import { shareOrDownload } from '../lib/sizesPdf.js'
import { recordDelivery, removeDelivery, quickUpdateStatus } from '../lib/dataService.js'
import { showAlert, askConfirm } from './ConfirmDialog.jsx'
import DatePicker, { toItalianDate } from './DatePicker.jsx'
import { todayISO } from '../utils/samples.js'

// Bolla di consegna parziale. Generarla registra la spedizione sull'ordine
// (data + articoli, via record_delivery) e segna spediti quegli articoli:
// la volta dopo la selezione propone solo quelli rimasti, e ogni spedizione
// fatta si può riscaricare identica o annullare se registrata per errore.
//
//   <BollaModal order={order} onClose={…} onOrderUpdate={nuovoOrdine => …} />

const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''))
const short = (date) => (date || '').slice(0, 5)

// Ordine con il segno "spedito" aggiornato sugli articoli indicati
const withDelivered = (order, ids, value) => ({
  ...order,
  kits: (order.kits || []).map(k => ({ ...k, articles: (k.articles || []).map(a => ids.includes(a.id) ? { ...a, delivered: value } : a) })),
})

const pdfError = (e) => { console.error('Bolla:', e); showAlert({ title: 'PDF non creato', body: ['Riprova tra poco.'] }) }

export default function BollaModal({ order: initialOrder, onClose, onOrderUpdate }) {
  const [order, setOrder] = useState(initialOrder)
  const allArticles = getAllArticles(order)
  const deliveries = order.deliveries || []
  // Data della spedizione in cui è partito ciascun articolo (l'ultima, se più d'una)
  const shippedOn = {}
  for (const d of deliveries) for (const id of d.articles || []) shippedOn[id] = d.date
  // Si propongono solo gli articoli ancora da spedire
  const [selected, setSelected] = useState(() => new Set(allArticles.map((a, i) => a.delivered ? null : i).filter(i => i !== null)))
  // Ogni spedizione parziale ha la sua data: si parte da oggi, modificabile
  const [shipISO, setShipISO] = useState(todayISO())
  const [busy, setBusy] = useState(false)

  // Registrabile solo un ordine già salvato, con articoli salvati (id del database)
  const savedOrder = order.id && order.id !== 'DU-NEW'
  const picked = allArticles.filter((_, i) => selected.has(i))
  const unsaved = picked.some(a => !isUuid(a.id))
  const canRecord = savedOrder && !unsaved

  const update = (next) => { setOrder(next); onOrderUpdate?.(next) }

  const toggle = (idx) => setSelected(prev => {
    const next = new Set(prev)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    return next
  })

  const toggleAll = () =>
    setSelected(selected.size === allArticles.length ? new Set() : new Set(allArticles.map((_, i) => i)))

  const generate = async () => {
    const date = toItalianDate(shipISO)
    if (!canRecord) {
      // Ordine o articoli non ancora salvati: solo il PDF, niente registro
      buildDeliveryPdf(order, picked, date).then(b => shareOrDownload(b, deliveryPdfName(order))).catch(pdfError)
      onClose()
      return
    }
    setBusy(true)
    const ids = picked.map(a => a.id)
    const list = await recordDelivery(order.id, date, ids)
    setBusy(false)
    if (!list) { showAlert({ title: 'Spedizione non registrata', body: ['La bolla non è stata creata. Controlla la connessione e riprova.'] }); return }
    let next = { ...withDelivered(order, ids, true), deliveries: list, shippedDate: order.shippedDate || date }
    update(next)
    buildDeliveryPdf(next, picked, date).then(b => shareOrDownload(b, deliveryPdfName(next))).catch(pdfError)

    const allShipped = getAllArticles(next).every(a => a.delivered)
    if (allShipped && next.status === 'CONSEGNA PARZIALE') {
      const ok = await askConfirm({
        title: 'Ordine completo?',
        body: ['Con questa spedizione tutti gli articoli risultano spediti.', 'Segnare l\'ordine come CONSEGNATO?'],
        confirmLabel: 'Segna consegnato', cancelLabel: 'Non ancora', tone: 'green',
      })
      if (ok && await quickUpdateStatus(next.id, 'CONSEGNATO')) { next = { ...next, status: 'CONSEGNATO' }; update(next) }
    }
    onClose()
  }

  const redownload = (d) => {
    const ids = d.articles || []
    const arts = allArticles.filter(a => ids.includes(a.id))
    if (!arts.length) { showAlert({ title: 'Articoli non più presenti', body: ['Gli articoli di questa spedizione sono stati tolti dall\'ordine.'] }); return }
    buildDeliveryPdf(order, arts, d.date).then(b => shareOrDownload(b, deliveryPdfName(order))).catch(pdfError)
  }

  const cancel = async (d) => {
    const n = (d.articles || []).length
    const ok = await askConfirm({
      title: `Annullare la spedizione del ${d.date}?`,
      body: [`${n} articol${n === 1 ? 'o torna' : 'i tornano'} da spedire. Usalo solo per una spedizione registrata per errore.`],
      confirmLabel: 'Annulla spedizione', cancelLabel: 'Indietro', tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    const list = await removeDelivery(order.id, d.id)
    setBusy(false)
    if (!list) { showAlert({ title: 'Non annullata', body: ['Riprova tra poco.'] }); return }
    const still = new Set(list.flatMap(x => x.articles || []))
    const freed = (d.articles || []).filter(id => !still.has(id))
    update({ ...withDelivered(order, freed, false), deliveries: list })
    // Gli articoli tornati da spedire rientrano nella selezione
    setSelected(prev => new Set([...prev, ...allArticles.map((a, i) => freed.includes(a.id) ? i : null).filter(i => i !== null)]))
  }

  const piecesOf = (d) => allArticles.filter(a => (d.articles || []).includes(a.id)).reduce((s, a) => s + artPieceCount(a), 0)
  const sortedDeliveries = [...deliveries].sort((a, b) => toISO(b.date).localeCompare(toISO(a.date)))

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#1e2d50', border:`1px solid ${BORDER}`, borderRadius:12, padding:28, width:480, maxWidth:'90vw', maxHeight:'85vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:16 }}>

        <div>
          <div style={{ fontSize:9, letterSpacing:3, color:MUTED, marginBottom:4 }}>BOLLA DI CONSEGNA</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:CREAM }}>{order.client}</div>
          <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>Seleziona gli articoli da includere in questa spedizione</div>
        </div>

        {sortedDeliveries.length > 0 && (
          <div>
            <div style={{ fontSize:9, letterSpacing:2, color:MUTED, marginBottom:6 }}>SPEDIZIONI REGISTRATE</div>
            {sortedDeliveries.map(d => (
              <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ flex:1, fontSize:12, color:CREAM }}>
                  {d.date} <span style={{ color:MUTED }}>· {(d.articles || []).length} articol{(d.articles || []).length === 1 ? 'o' : 'i'} · {piecesOf(d)} pz</span>
                  <div style={{ fontSize:10, color: d.arrived ? GREEN : MUTED, marginTop:2 }}>{d.arrived ? `✓ Arrivata il ${short(d.arrived)}` : 'In viaggio'}</div>
                </div>
                <button onClick={() => redownload(d)} disabled={busy} style={{ padding:'4px 10px', fontSize:10, background:'transparent', border:'1px solid rgba(122,174,232,0.4)', color:'#7aaee8', borderRadius:4, cursor:'pointer' }}>↓ Bolla</button>
                <button onClick={() => cancel(d)} disabled={busy} title="Annulla spedizione" style={{ padding:'4px 8px', fontSize:10, background:'transparent', border:`1px solid ${BORDER}`, color:MUTED, borderRadius:4, cursor:'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <DatePicker label="Data spedizione" value={shipISO} onChange={v => setShipISO(v || todayISO())} />

        <div style={{ borderTop:`1px solid ${BORDER}`, borderBottom:`1px solid ${BORDER}`, overflowY:'auto', maxHeight:340, paddingTop:8, paddingBottom:8 }}>
          <label style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', cursor:'pointer', borderBottom:`1px solid rgba(255,255,255,0.06)`, marginBottom:4 }}>
            <input type="checkbox" checked={selected.size === allArticles.length && allArticles.length > 0} onChange={toggleAll} style={{ accentColor:GOLD, width:15, height:15 }} />
            <span style={{ fontSize:10, letterSpacing:2, color:MUTED }}>SELEZIONA TUTTI</span>
          </label>

          {allArticles.map((art, i) => {
            const pz = artPieceCount(art)
            const done = art.delivered
            return (
              <label key={art.id || i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 4px', cursor:'pointer', borderRadius:4, background: selected.has(i) ? 'rgba(184,150,90,0.08)' : 'transparent', opacity: done && !selected.has(i) ? 0.6 : 1 }}>
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} style={{ accentColor:GOLD, width:15, height:15, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:CREAM }}>{art.description}</div>
                  <div style={{ fontSize:10, color:MUTED }}>{art.category} · {art.line}</div>
                  {done && <div style={{ fontSize:10, color:GREEN, marginTop:2 }}>✓ {shippedOn[art.id] ? `Spedito il ${short(shippedOn[art.id])}` : 'Già segnato spedito'}</div>}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:11, color:CLAY, fontWeight:600 }}>{art.color}</div>
                  <div style={{ fontSize:12, color:GOLD }}>{pz} pz</div>
                </div>
              </label>
            )
          })}
        </div>

        {selected.size > 0 && !canRecord && (
          <div style={{ fontSize:11, color:CLAY }}>
            Salva l'ordine per registrare la spedizione: ora viene creato solo il PDF.
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div style={{ fontSize:11, color:MUTED }}>
            {selected.size > 0
              ? `${selected.size} articol${selected.size === 1 ? 'o' : 'i'} · ${picked.reduce((s,a)=>s+artPieceCount(a),0)} pz`
              : 'Nessun articolo selezionato'}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ padding:'8px 18px', fontSize:11, letterSpacing:1, background:'transparent', border:`1px solid ${BORDER}`, color:MUTED, borderRadius:4, cursor:'pointer' }}>
              Chiudi
            </button>
            <button onClick={generate} disabled={selected.size === 0 || busy} style={{ padding:'8px 18px', fontSize:11, letterSpacing:1, background: selected.size > 0 ? 'rgba(122,174,232,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${selected.size > 0 ? 'rgba(122,174,232,0.4)' : BORDER}`, color: selected.size > 0 ? '#7aaee8' : MUTED, borderRadius:4, cursor: selected.size > 0 && !busy ? 'pointer' : 'default' }}>
              {busy ? 'Registrazione…' : canRecord ? '↓ Genera e registra' : '↓ Genera Bolla'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// gg/mm/aaaa → aaaa-mm-gg, per ordinare le spedizioni dalla più recente
function toISO(it) {
  const [d, m, y] = String(it || '').split('/')
  return y ? `${y}-${(m || '').padStart(2, '0')}-${(d || '').padStart(2, '0')}` : ''
}
