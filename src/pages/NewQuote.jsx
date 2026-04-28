import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, CATEGORIES, LINES } from '../tokens.js'
import { s, btnStyle, btnGoldStyle } from '../tokens.js'
import { orderSubtotal, orderIVA, orderTotal as calcOrderTotal } from '../utils/helpers.js'
import { generateQuotePDF } from '../utils/pdfQuote.js'
import { createOrder, updateOrder, generateOrderId } from '../lib/dataService.js'

const STEPS = ['Club & Note', 'Articoli & Prezzi', 'Riepilogo']

const emptyArticle = () => ({
  sp: '', category: 'Felpa', line: 'Performance', description: '', color: '', price: '', notes: '',
  delivered: false,
  sizes: { adult: {}, kids: {} },
})
const emptyKit = () => ({ name: '', price: '', articles: [emptyArticle()] })

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

function toItalianDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function DatePicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const today = new Date()
  const parsed = value ? new Date(value) : today
  const [viewYear, setViewYear]   = useState(parsed.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed.getMonth())
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startPad    = firstDay === 0 ? 6 : firstDay - 1
  const selectedDate = value ? new Date(value) : null
  const displayValue = value ? toItalianDate(value) : ''
  const selectDay = (day) => {
    onChange(`${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
    setOpen(false)
  }
  return (
    <div style={{ position: 'relative' }}>
      {label && <label style={s.label}>{label}</label>}
      <div onClick={() => setOpen(!open)} style={{ ...s.input, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
        <span style={{ color: displayValue ? CREAM : MUTED }}>{displayValue || 'Seleziona data...'}</span>
        <span style={{ color: GOLD, fontSize: 14 }}>📅</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, zIndex:1000, marginTop:4, background:'#1e2d50', border:`1px solid ${BORDER}`, borderRadius:10, padding:16, width:280, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <button onClick={()=>{ if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1)}else setViewMonth(m=>m-1) }} style={{ background:'none', border:'none', color:GOLD, fontSize:18, cursor:'pointer', padding:'0 8px' }}>‹</button>
            <div style={{ fontSize:12, color:CREAM, letterSpacing:2, fontWeight:600 }}>{MONTHS[viewMonth]} {viewYear}</div>
            <button onClick={()=>{ if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1)}else setViewMonth(m=>m+1) }} style={{ background:'none', border:'none', color:GOLD, fontSize:18, cursor:'pointer', padding:'0 8px' }}>›</button>
          </div>
          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
            {[2023,2024,2025,2026].map(y=>(
              <button key={y} onClick={()=>setViewYear(y)} style={{ padding:'3px 10px', borderRadius:3, border:`1px solid ${y===viewYear?GOLD:BORDER}`, background:y===viewYear?'rgba(184,150,90,0.2)':'transparent', color:y===viewYear?GOLD:MUTED, cursor:'pointer', fontSize:10 }}>{y}</button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
            {['Lu','Ma','Me','Gi','Ve','Sa','Do'].map(d=><div key={d} style={{ textAlign:'center', fontSize:9, color:MUTED, padding:'2px 0' }}>{d}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {Array(startPad).fill(null).map((_,i)=><div key={`e${i}`}/>)}
            {Array(daysInMonth).fill(null).map((_,i)=>{
              const day=i+1
              const isSel = selectedDate && selectedDate.getDate()===day && selectedDate.getMonth()===viewMonth && selectedDate.getFullYear()===viewYear
              const isTod = today.getDate()===day && today.getMonth()===viewMonth && today.getFullYear()===viewYear
              return <button key={day} onClick={()=>selectDay(day)} style={{ padding:'6px 2px', borderRadius:4, border:'none', cursor:'pointer', textAlign:'center', fontSize:12, fontWeight:isSel?700:400, background:isSel?GOLD:isTod?'rgba(184,150,90,0.15)':'transparent', color:isSel?'#1a2744':isTod?GOLD:CREAM }}>{day}</button>
            })}
          </div>
          <div style={{ marginTop:10, display:'flex', justifyContent:'space-between' }}>
            <button onClick={()=>{onChange('');setOpen(false)}} style={{ background:'none', border:'none', color:MUTED, fontSize:10, cursor:'pointer' }}>Cancella</button>
            <button onClick={()=>{ const t=new Date(); setViewMonth(t.getMonth()); setViewYear(t.getFullYear()); selectDay(t.getDate()) }} style={{ background:'none', border:`1px solid ${GOLD}`, color:GOLD, fontSize:10, cursor:'pointer', padding:'4px 10px', borderRadius:3 }}>Oggi</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewQuote({ editOrder, setView, onSaved, prefillClient }) {
  const isEdit = !!editOrder && editOrder.status === 'PREVENTIVO'

  const [step, setStep]               = useState(prefillClient ? 2 : 1)
  const [club, setClub]               = useState(prefillClient?.name    || editOrder?.client        || '')
  const [clientEmail, setEmail]       = useState(prefillClient?.email   || editOrder?.clientEmail   || '')
  const [clientPhone, setPhone]       = useState(prefillClient?.phone   || editOrder?.clientPhone   || '')
  const [clientAddress, setAddress]   = useState(prefillClient?.address || editOrder?.clientAddress || '')
  const [clientCity, setCity]         = useState(prefillClient?.city    || editOrder?.clientCity    || '')
  const [clientCountry, setCountry]   = useState(prefillClient?.country || editOrder?.clientCountry || 'Italia')
  const [clientContact, setContact]   = useState(prefillClient?.contact || editOrder?.clientContact || '')
  const [orderDate, setOrderDate]     = useState(editOrder ? (editOrder.date?.split('/').length === 3 ? `${editOrder.date.split('/')[2]}-${editOrder.date.split('/')[1]}-${editOrder.date.split('/')[0]}` : editOrder.date) : new Date().toISOString().split('T')[0])
  const [clientNotes, setCN]          = useState(editOrder?.notes || '')
  const [pricingMode, setPM]          = useState(editOrder?.pricingMode || 'singolo')
  const [kitQuantity, setKitQty]      = useState(editOrder?.kitQuantity || '')
  const [ivaEnabled, setIvaEnabled]   = useState(editOrder?.ivaEnabled || false)
  const [ivaRate]                     = useState(22)
  const [kits, setKits]               = useState(editOrder?.kits || [emptyKit()])
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState(null)

  const allArticles = kits.flatMap(k => k.articles)

  const quoteObj = () => ({
    id: editOrder?.id || 'DU-NEW',
    client: club || '—', clientEmail, clientPhone, clientAddress, clientCity, clientCountry, clientContact,
    date: toItalianDate(orderDate) || new Date().toLocaleDateString('it-IT'),
    deliveryDate: '', alertDays: 7, status: 'PREVENTIVO',
    pieces: 0, orderType: 'istituzionale',
    notes: clientNotes, productionNotes: '', pricingMode,
    kitQuantity: parseInt(kitQuantity) || null,
    ivaEnabled, ivaRate, kits, payments: [],
    showTotalInClientPDF: true,
  })

  const currentQuote = quoteObj()
  const subtotal     = orderSubtotal(currentQuote)
  const ivaAmount    = orderIVA(currentQuote)
  const total        = calcOrderTotal(currentQuote)

  const updateKit = (ki, f, v) => setKits(kits.map((k, i) => i === ki ? { ...k, [f]: v } : k))
  const addKit    = ()         => setKits([...kits, emptyKit()])
  const removeKit = (ki)       => setKits(kits.filter((_, i) => i !== ki))
  const addArt    = (ki)       => setKits(kits.map((k, i) => i === ki ? { ...k, articles: [...k.articles, emptyArticle()] } : k))
  const removeArt = (ki, ai)   => setKits(kits.map((k, i) => i === ki ? { ...k, articles: k.articles.filter((_, j) => j !== ai) } : k))
  const updateArt = (ki, ai, f, v) => setKits(kits.map((k, i) => i !== ki ? k : { ...k, articles: k.articles.map((a, j) => j !== ai ? a : { ...a, [f]: v }) }))

  const duplicateArt = (ki, ai) => {
    const copy = { ...JSON.parse(JSON.stringify(kits[ki].articles[ai])), color: kits[ki].articles[ai].color + ' (copia)' }
    setKits(kits.map((k, i) => i !== ki ? k : {
      ...k,
      articles: [...k.articles.slice(0, ai + 1), copy, ...k.articles.slice(ai + 1)],
    }))
  }

  const openPDF = () => {
    const h = generateQuotePDF(currentQuote)
    const w = window.open('', '_blank')
    w.document.write(h)
    w.document.close()
  }

  const canGo2 = allArticles.some(a => a.sp && a.description)
  const inp    = { ...s.input }

  const handleSave = async () => {
    if (!club.trim()) { alert('Inserisci il nome del club'); return }
    if (pricingMode === 'kit' && !kitQuantity) { alert('Inserisci il numero di kit stimati'); return }
    setSaving(true); setSaveError(null)
    try {
      const id    = editOrder?.id || await generateOrderId(orderDate)
      const order = { ...quoteObj(), id }
      const ok    = isEdit ? await updateOrder(order) : await createOrder(order)
      if (ok) { onSaved() } else { setSaveError('Errore nel salvataggio. Riprova.') }
    } catch (e) { setSaveError('Errore: ' + e.message) }
    setSaving(false)
  }

  const NavBtns = ({ prev, next, nextLabel = 'Continua →', nextDisabled = false }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
      <button style={btnStyle(false)} onClick={prev}>← Indietro</button>
      <button style={{ ...btnStyle(true), opacity: nextDisabled ? 0.4 : 1 }} onClick={() => !nextDisabled && next()}>{nextLabel}</button>
    </div>
  )

  const TotalBox = () => (
    <div style={{ ...s.card, background: 'rgba(184,150,90,0.07)', border: `1px solid rgba(184,150,90,0.2)` }}>
      <div style={s.cardTitle}>Importo Preventivo</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pricingMode === 'kit' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MUTED }}>
            <span>Prezzo kit × {kitQuantity || '?'} kit stimati</span>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: GOLD }}>€ {subtotal.toFixed(2)}</span>
          </div>
        )}
        {pricingMode === 'singolo' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MUTED }}>
            <span>Subtotale</span>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: GOLD }}>€ {subtotal.toFixed(2)}</span>
          </div>
        )}
        {ivaEnabled && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MUTED }}>
            <span>IVA {ivaRate}%</span>
            <span style={{ color: CREAM }}>€ {ivaAmount.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 11, letterSpacing: 2, color: GOLD }}>TOTALE PREVENTIVO</span>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: GOLD }}>€ {total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={s.topBar}>
        <div>
          <div style={s.pageTitle}>{isEdit ? 'Modifica Preventivo' : 'Nuovo Preventivo'}{prefillClient ? ' · ' + prefillClient.name : ''}</div>
          <div style={s.pageSub}>{editOrder?.id || 'Nuovo'} · {toItalianDate(orderDate)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, marginBottom: 4 }}>ARTICOLI</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, color: GOLD, lineHeight: 1 }}>{allArticles.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: 36 }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ flex: 1, cursor: 'pointer' }} onClick={() => setStep(i + 1)}>
            <div style={{ height: 2, background: i + 1 <= step ? CLAY : 'rgba(255,255,255,0.08)', marginBottom: 6, transition: 'all 0.3s' }}/>
            <div style={{ fontSize: 9, letterSpacing: 2, color: i + 1 <= step ? CLAY : MUTED, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div>
          <div style={s.card}>
            <div style={s.cardTitle}>Dati Club / Cliente</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div><label style={s.label}>Nome Club *</label><input style={inp} value={club} onChange={e => setClub(e.target.value)} placeholder="Es. Tennis Club Milano"/></div>
              <div><label style={s.label}>Referente</label><input style={inp} value={clientContact} onChange={e => setContact(e.target.value)} placeholder="Es. Mario Rossi"/></div>
              <div><label style={s.label}>Email</label><input style={inp} type="email" value={clientEmail} onChange={e => setEmail(e.target.value)} placeholder="club@email.com"/></div>
              <div><label style={s.label}>Telefono</label><input style={inp} value={clientPhone} onChange={e => setPhone(e.target.value)} placeholder="+39 333 000 0000"/></div>
              <div><label style={s.label}>Indirizzo</label><input style={inp} value={clientAddress} onChange={e => setAddress(e.target.value)} placeholder="Via Roma 1"/></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={s.label}>Città</label><input style={inp} value={clientCity} onChange={e => setCity(e.target.value)} placeholder="Milano"/></div>
                <div><label style={s.label}>Nazione</label><input style={inp} value={clientCountry} onChange={e => setCountry(e.target.value)} placeholder="Italia"/></div>
              </div>
            </div>
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>Data Preventivo</div>
            <div style={{ maxWidth: 240 }}>
              <DatePicker label="Data" value={orderDate} onChange={setOrderDate}/>
            </div>
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>Note per il Cliente</div>
            <textarea rows={3} style={{ ...inp, resize: 'vertical' }} value={clientNotes} onChange={e => setCN(e.target.value)} placeholder="Es. Prezzi validi 30 giorni, personalizzazione colori club inclusa..."/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button style={btnStyle(false)} onClick={() => setView('quotes')}>Annulla</button>
            <button style={btnStyle(true)} onClick={() => setStep(2)}>Continua →</button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div>
          <div style={s.card}>
            <div style={s.cardTitle}>Modalità Pricing</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              {['singolo', 'kit'].map(mode => (
                <button key={mode} style={{ padding: '10px 28px', borderRadius: 3, border: `1px solid ${pricingMode === mode ? CLAY : BORDER}`, background: pricingMode === mode ? 'rgba(196,98,58,0.12)' : 'transparent', color: pricingMode === mode ? CLAY : MUTED, cursor: 'pointer', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}
                  onClick={() => setPM(mode)}>{mode === 'singolo' ? 'Articolo singolo' : 'Prezzo per Kit'}</button>
              ))}
            </div>
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>IVA</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div onClick={() => setIvaEnabled(!ivaEnabled)} style={{ width: 40, height: 22, borderRadius: 11, position: 'relative', cursor: 'pointer', background: ivaEnabled ? GOLD : 'rgba(255,255,255,0.12)', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: ivaEnabled ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }}/>
              </div>
              <span style={{ fontSize: 12, color: CREAM }}>Applica IVA 22%</span>
            </label>
          </div>

          {pricingMode === 'kit' && (
            <div style={s.card}>
              <div style={s.cardTitle}>Numero Kit Stimati *</div>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'center' }}>
                <div>
                  <label style={s.label}>Quanti kit circa?</label>
                  <input type="number" min="1" style={inp} value={kitQuantity} onChange={e => setKitQty(e.target.value)} placeholder="Es. 80"/>
                </div>
                <div style={{ fontSize: 11, color: MUTED, paddingTop: 20 }}>
                  Totale stimato: € {((kits.reduce((s, k) => s + (parseFloat(k.price) || 0), 0)) * (parseInt(kitQuantity) || 0)).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {kits.map((kit, ki) => (
            <div key={ki} style={{ ...s.card, border: `1px solid rgba(196,98,58,0.25)` }}>
              {pricingMode === 'kit' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 16, marginBottom: 20 }}>
                  <div><label style={s.label}>Nome Kit</label><input style={inp} value={kit.name} onChange={e => updateKit(ki, 'name', e.target.value)} placeholder="Es. Kit Completo Padel"/></div>
                  <div><label style={s.label}>Prezzo Kit € (per giocatore)</label><input type="number" style={inp} value={kit.price} onChange={e => updateKit(ki, 'price', e.target.value)} placeholder="30"/></div>
                </div>
              )}
              <div style={{ fontSize: 9, letterSpacing: 3, color: MUTED, marginBottom: 14 }}>{pricingMode === 'kit' ? 'ARTICOLI NEL KIT' : 'ARTICOLI'}</div>
              {kit.articles.map((art, ai) => (
                <div key={ai} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px', marginBottom: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={s.label}>Codice SP *</label><input style={inp} value={art.sp} onChange={e => updateArt(ki, ai, 'sp', e.target.value)} placeholder="SP-206"/></div>
                    <div><label style={s.label}>Descrizione *</label><input style={inp} value={art.description} onChange={e => updateArt(ki, ai, 'description', e.target.value)} placeholder="Felpa zip cappuccio"/></div>
                    <div><label style={s.label}>Colore / Pantone</label><input style={inp} value={art.color} onChange={e => updateArt(ki, ai, 'color', e.target.value)} placeholder="Navy/Cream"/></div>
                    <div><label style={s.label}>Categoria</label><select style={inp} value={art.category} onChange={e => updateArt(ki, ai, 'category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                    <div><label style={s.label}>Linea</label><select style={inp} value={art.line} onChange={e => updateArt(ki, ai, 'line', e.target.value)}>{LINES.map(l => <option key={l}>{l}</option>)}</select></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: pricingMode === 'singolo' ? '140px 1fr' : '1fr', gap: 10 }}>
                    {pricingMode === 'singolo' && (
                      <div><label style={s.label}>Prezzo unitario €</label><input type="number" style={inp} value={art.price} onChange={e => updateArt(ki, ai, 'price', e.target.value)} placeholder="28"/></div>
                    )}
                    <div><label style={s.label}>Note articolo</label><input style={inp} value={art.notes || ''} onChange={e => updateArt(ki, ai, 'notes', e.target.value)} placeholder="Es. logo ricamato fronte sinistra..."/></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={{ ...btnGoldStyle, padding: '5px 14px', fontSize: 9, borderColor: CLAY, color: CLAY }} onClick={() => duplicateArt(ki, ai)}>⧉ Duplica</button>
                    {kit.articles.length > 1 && <button style={{ ...btnStyle(false), padding: '5px 10px', fontSize: 9, color: CLAY }} onClick={() => removeArt(ki, ai)}>Rimuovi</button>}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <button style={{ ...btnGoldStyle, padding: '7px 16px', fontSize: 9, borderColor: CLAY, color: CLAY }} onClick={() => addArt(ki)}>+ Articolo</button>
                {kits.length > 1 && <button style={{ ...btnStyle(false), padding: '7px 14px', fontSize: 9, color: CLAY }} onClick={() => removeKit(ki)}>Rimuovi kit</button>}
              </div>
            </div>
          ))}
          {pricingMode === 'kit' && <button style={{ ...btnGoldStyle, marginBottom: 16, borderColor: CLAY, color: CLAY }} onClick={addKit}>+ Aggiungi Kit</button>}
          <TotalBox/>
          <NavBtns prev={() => setStep(1)} next={() => setStep(3)} nextDisabled={!canGo2}/>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div>
          <div style={s.card}>
            <div style={s.cardTitle}>Riepilogo Preventivo</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
              {[
                { l: 'CLUB',      v: club || '—',          serif: true },
                { l: 'ARTICOLI',  v: allArticles.length,   serif: true, color: GOLD },
                pricingMode === 'kit'
                  ? { l: 'KIT STIMATI', v: kitQuantity || '—', serif: true, color: GOLD }
                  : { l: 'DATA',        v: toItalianDate(orderDate) || '—' },
              ].map(item => (
                <div key={item.l}>
                  <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 6 }}>{item.l}</div>
                  <div style={{ fontFamily: item.serif ? "'Cormorant Garamond',serif" : undefined, fontSize: item.serif ? 20 : 14, color: item.color || CREAM }}>{item.v}</div>
                </div>
              ))}
            </div>
            <TotalBox/>
            {saveError && (
              <div style={{ marginTop: 12, padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: 12 }}>{saveError}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 8 }}>
            <button style={btnStyle(false)} onClick={() => setStep(2)}>← Indietro</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...btnGoldStyle, borderColor: CLAY, color: CLAY }} onClick={openPDF}>↓ PDF Preventivo</button>
              <button style={{ ...btnStyle(false), opacity: saving ? 0.5 : 1 }} onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
