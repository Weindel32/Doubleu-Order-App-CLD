import { useState, useEffect } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER } from '../tokens.js'
import { s, btnStyle, btnGoldStyle } from '../tokens.js'
import StatCard from '../components/StatCard.jsx'
import SampleModal, { emptyShipment, shipmentToForm } from '../components/SampleModal.jsx'
import { exportSamplesCSV } from '../utils/exportCSV.js'
import { generateSamplePDF } from '../utils/pdfSample.js'
import {
  PURPOSE_LABELS, fmtDate, euro, samplePieces, sampleCostValue, itemOutcome,
  sampleStats, recipientLabel, needsFollowUp, returnPending, shipmentNeedsRevision,
} from '../utils/samples.js'

const inp = { ...s.input }

const VIEW_FILTERS = [
  { k: 'all',       label: 'Tutti' },
  { k: 'open',      label: 'In attesa' },
  { k: 'followup',  label: 'Da sollecitare' },
  { k: 'toreturn',  label: 'Da rientrare' },
  { k: 'revision',  label: 'Da rivedere' },
  { k: 'converted', label: 'Convertiti' },
]

export default function Samples({
  shipments, clients, prospects, orders,
  onUpsert, onDelete,
  initialDraft, onDraftConsumed,
}) {
  const [form,     setForm]     = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [year,     setYear]     = useState('all')

  // Arrivo da "+ Registra invio" su una scheda cliente o prospect:
  // il form si apre già intestato al destinatario giusto.
  useEffect(() => {
    if (!initialDraft) return
    setForm(initialDraft)
    onDraftConsumed && onDraftConsumed()
  }, [initialDraft])

  const list = shipments || []

  const years = [...new Set(list.map(sh => (sh.shipped_date || '').slice(0, 4)).filter(Boolean))].sort().reverse()

  const q = search.trim().toLowerCase()
  const filtered = list.filter(sh => {
    if (year !== 'all' && (sh.shipped_date || '').slice(0, 4) !== year) return false
    if (filter === 'open'      && !(sh.items || []).some(it => itemOutcome(it) === 'in_attesa')) return false
    if (filter === 'followup'  && !needsFollowUp(sh))  return false
    if (filter === 'toreturn'  && !returnPending(sh))  return false
    if (filter === 'revision'  && !shipmentNeedsRevision(sh)) return false
    if (filter === 'converted' && !(sh.items || []).some(it => itemOutcome(it) === 'ordine')) return false
    if (q) {
      const hay = [
        recipientLabel(sh, clients, prospects), sh.contact_name, sh.carrier, sh.tracking, sh.notes,
        ...(sh.items || []).flatMap(it => [it.sp, it.description, it.color, it.size]),
      ].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }).sort((a, b) => (b.shipped_date || '').localeCompare(a.shipped_date || ''))

  const stats = sampleStats(year === 'all' ? list : list.filter(sh => (sh.shipped_date || '').slice(0, 4) === year))

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    await onUpsert(form)
    setSaving(false)
    setForm(null)
  }

  const handleDelete = async (sh) => {
    if (!confirm(`Eliminare la campionatura del ${fmtDate(sh.shipped_date)} per ${recipientLabel(sh, clients, prospects)}? L'operazione non è reversibile.`)) return
    setDeleting(true)
    await onDelete(sh.id)
    setDeleting(false)
    setForm(null)
  }

  const openSamplePDF = (sh) => {
    const html = generateSamplePDF(sh, clients, prospects)
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={s.pageTitle}>Campionature</div>
          <div style={s.pageSub}>Registro invii campioni · clienti e prospect</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {filtered.length > 0 && (
            <button style={{ ...btnStyle(false) }}
              onClick={() => exportSamplesCSV(filtered, clients, prospects)}>
              Esporta CSV
            </button>
          )}
          <button style={btnGoldStyle} onClick={() => setForm(emptyShipment())}>+ Registra Invio</button>
        </div>
      </div>

      <div style={s.grid4}>
        <StatCard label="Invii Registrati" value={stats.count} sub={`${stats.pieces} pezzi`}/>
        <StatCard label="Investito"        value={euro(stats.invested)} accent
          sub={stats.outstanding > 0 ? `${euro(stats.outstanding)} da rientrare` : 'Costo merce non rientrata + spedizioni'}/>
        <StatCard label="Conversione"
          value={stats.conversion === null ? '—' : `${stats.conversion.toFixed(0)}%`}
          sub={stats.conversion === null ? 'Nessun esito ancora' : `${stats.converted} articoli convertiti`}/>
        <StatCard label="Da Seguire" value={stats.toFollowUp + stats.overdue}
          sub={`${stats.toFollowUp} solleciti · ${stats.overdue} resi scaduti`}/>
      </div>

      <div style={s.divider}/>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...inp, maxWidth: 280, flex: '1 1 200px' }}
          placeholder="Cerca per cliente, codice DUSP, corriere…"
          value={search} onChange={e => setSearch(e.target.value)}/>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {VIEW_FILTERS.map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              style={{ padding: '5px 12px', borderRadius: 3, fontSize: 9, letterSpacing: 1.5, cursor: 'pointer',
                border: `1px solid ${filter === f.k ? GOLD : BORDER}`,
                background: filter === f.k ? 'rgba(184,150,90,0.12)' : 'transparent',
                color: filter === f.k ? GOLD : MUTED }}>
              {f.label}
            </button>
          ))}
        </div>

        {years.length > 1 && (
          <select style={{ ...inp, width: 'auto', cursor: 'pointer' }} value={year} onChange={e => setYear(e.target.value)}>
            <option value="all">Tutti gli anni</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {/* Elenco */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: MUTED }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24 }}>
            {list.length === 0 ? 'Nessuna campionatura registrata' : 'Nessun risultato per i filtri attivi'}
          </div>
          {list.length === 0 && (
            <div style={{ fontSize: 12, marginTop: 10 }}>
              Registra qui ogni invio di campioni: data, articoli e destinatario restano tracciati.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(sh => (
            <div key={sh.id} className="du-card"
              style={{ padding: '20px 26px', background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${BORDER}`, borderLeft: `3px solid ${GOLD}`, borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>

              {/* Destinatario — le altre informazioni (articoli, esiti, resi,
                  solleciti) si vedono aprendo l'invio: qui basta il colpo
                  d'occhio su chi, quanto e cosa fare. */}
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 21, color: CREAM, letterSpacing: 0.5 }}>
                    {recipientLabel(sh, clients, prospects)}
                  </span>
                  {sh.prospect_id && (
                    <span style={{ fontSize: 9, letterSpacing: 1.5, color: '#7aaee8' }}>PROSPECT</span>
                  )}
                  {shipmentNeedsRevision(sh) && (
                    <span style={{ fontSize: 9, letterSpacing: 1, color: '#e8c96e' }}>✎ DA RIVEDERE</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 5 }}>
                  {[fmtDate(sh.shipped_date), PURPOSE_LABELS[sh.purpose] || sh.purpose, sh.contact_name, sh.carrier]
                    .filter(Boolean).join('  ·  ')}
                </div>
              </div>

              {/* Pezzi */}
              <div style={{ textAlign: 'right', flexShrink: 0, width: 80 }}>
                <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 3 }}>PEZZI</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: CREAM }}>{samplePieces(sh)}</div>
              </div>

              {/* Valore */}
              <div style={{ textAlign: 'right', flexShrink: 0, width: 120 }}>
                <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 3 }}>COSTO</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: GOLD }}>
                  {euro(sampleCostValue(sh), 2)}
                </div>
              </div>

              {/* Azioni */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
                <button style={{ ...btnStyle(false), padding: '7px 16px', fontSize: 9 }}
                  onClick={() => openSamplePDF(sh)}>
                  Bolla Campioni
                </button>
                <button style={{ ...btnGoldStyle, padding: '7px 18px', fontSize: 9 }}
                  onClick={() => setForm(shipmentToForm(sh))}>
                  Apri
                </button>
                <button disabled={deleting}
                  style={{ padding: '7px 16px', fontSize: 9, letterSpacing: 1.5, cursor: 'pointer', borderRadius: 3,
                    background: 'transparent', border: '1px solid rgba(196,98,58,0.35)', color: CLAY }}
                  onClick={() => handleDelete(sh)}>
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {form && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 600,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 20px', overflowY: 'auto' }}
          onClick={() => setForm(null)}>
          <div style={{ background: '#1e2d50', border: `1px solid ${BORDER}`, borderRadius: 14, width: '100%', maxWidth: 900 }}
            onClick={e => e.stopPropagation()}>
            <SampleModal form={form} setForm={setForm} clients={clients} prospects={prospects} orders={orders}
              onSave={handleSave} onCancel={() => setForm(null)} saving={saving}
              title={form.id ? 'Modifica Campionatura' : 'Registra Invio Campioni'}/>
          </div>
        </div>
      )}
    </div>
  )
}
