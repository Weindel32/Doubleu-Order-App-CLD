import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN, LOSS_REASONS } from '../tokens.js'
import { s, btnStyle, btnGoldStyle } from '../tokens.js'
import { orderTotal } from '../utils/helpers.js'
import { generateQuotePDF } from '../utils/pdfQuote.js'

const RED = '#ef4444'

// ── Modale: scegli il motivo per cui il preventivo è andato perso ──
function LostReasonModal({ quote, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  const finalReason = reason === 'Altro' ? (customReason.trim() || 'Altro') : reason
  const canConfirm = reason && (reason !== 'Altro' || customReason.trim())

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,40,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1e2d50', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 28, width: 440, maxWidth: '100%', boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: CREAM, marginBottom: 4 }}>Preventivo non convertito</div>
        <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1, marginBottom: 20 }}>{quote.client} · {quote.id}</div>
        <div style={{ fontSize: 11, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>Motivo della perdita</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {LOSS_REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)} style={{
              padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
              fontSize: 11, letterSpacing: 0.5,
              border: `1px solid ${reason === r ? CLAY : BORDER}`,
              background: reason === r ? 'rgba(196,98,58,0.15)' : 'transparent',
              color: reason === r ? CLAY : MUTED,
              fontFamily: "'Josefin Sans',sans-serif",
            }}>{r}</button>
          ))}
        </div>
        {reason === 'Altro' && (
          <input autoFocus style={{ ...s.input, marginBottom: 16 }} value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Specifica il motivo..."/>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={btnStyle(false)} onClick={onClose}>Annulla</button>
          <button
            style={{ ...btnStyle(true), opacity: canConfirm ? 1 : 0.4, cursor: canConfirm ? 'pointer' : 'not-allowed' }}
            onClick={() => canConfirm && onConfirm(finalReason)}
          >Segna come Perso</button>
        </div>
      </div>
    </div>
  )
}

// ── Modale: metti in standby, con motivo libero e facoltativo ──────
// A differenza del "Perso", qui non ci sono categorie predefinite: ogni
// standby è legato a una situazione specifica del club (vincolo di
// contratto, stagionalità...), non a una causa ricorrente.
function StandbyModal({ quote, onConfirm, onClose }) {
  const [reason, setReason] = useState('')

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,40,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1e2d50', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 28, width: 440, maxWidth: '100%', boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: CREAM, marginBottom: 4 }}>Metti in Standby</div>
        <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1, marginBottom: 20 }}>{quote.client} · {quote.id}</div>
        <div style={{ fontSize: 11, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>Perché? (facoltativo)</div>
        <textarea autoFocus rows={3} style={{ ...s.input, resize: 'vertical', marginBottom: 20 }} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Es. club vincolato da contratto in corso con l'attuale fornitore..."/>
        <div style={{ fontSize: 10, color: MUTED, marginBottom: 20 }}>
          Il preventivo resta come riferimento — data e storico invariati — ma esce dalla lista "Preventivi in Attesa" della Dashboard finché non lo riattivi.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={btnStyle(false)} onClick={onClose}>Annulla</button>
          <button style={btnStyle(true)} onClick={() => onConfirm(reason.trim())}>Metti in Standby</button>
        </div>
      </div>
    </div>
  )
}

export default function Quotes({ orders, setView, setEditOrder, onDelete, onConvertToOrder, onMarkLost, onRestoreQuote, onMarkStandby, onRestoreFromStandby }) {
  const [search, setSearch]   = useState('')
  const [sortBy, setSortBy]   = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [tab, setTab]         = useState('attivi')          // 'attivi' | 'standby' | 'persi'
  const [lostModal, setLostModal] = useState(null)          // quote in attesa di motivo
  const [standbyModal, setStandbyModal] = useState(null)    // quote in attesa di motivo standby

  const allQuotes = orders.filter(o => o.status === 'PREVENTIVO')
  const activeQuotes  = allQuotes.filter(o => !o.lost && !o.standby)
  const standbyQuotes = allQuotes.filter(o => !o.lost && o.standby)
  const lostQuotes    = allQuotes.filter(o => o.lost)
  const quotes = tab === 'persi' ? lostQuotes : tab === 'standby' ? standbyQuotes : activeQuotes

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }
  const sortIcon = (col) => sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'

  const filtered = quotes
    .filter(o => !search || o.client.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av, bv
      if (sortBy === 'client')  { av = a.client || ''; bv = b.client || '' }
      else if (sortBy === 'date')  { av = a.date || ''; bv = b.date || '' }
      else if (sortBy === 'total') { av = orderTotal(a); bv = orderTotal(b) }
      else { av = a.date || ''; bv = b.date || '' }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const openPDF = (order) => {
    const h = generateQuotePDF(order)
    const w = window.open('', '_blank')
    w.document.write(h)
    w.document.close()
  }

  const thStyle = (col) => ({
    ...s.th, cursor: 'pointer', userSelect: 'none',
    color: sortBy === col ? GOLD : MUTED,
  })

  const tabStyle = (active, color) => ({
    padding: '8px 18px', borderRadius: 4, cursor: 'pointer',
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600,
    fontFamily: "'Josefin Sans',sans-serif",
    border: `1px solid ${active ? color : BORDER}`,
    background: active ? `${color}22` : 'transparent',
    color: active ? color : MUTED,
  })

  const isLostTab = tab === 'persi'
  const isStandbyTab = tab === 'standby'
  const BLUE = '#7aaee8'

  return (
    <div>
      <div style={s.topBar}>
        <div>
          <div style={s.pageTitle}>Preventivi</div>
          <div style={s.pageSub}>{activeQuotes.length} attiv{activeQuotes.length === 1 ? 'o' : 'i'} · {standbyQuotes.length} standby · {lostQuotes.length} pers{lostQuotes.length === 1 ? 'o' : 'i'}</div>
        </div>
        <button style={btnStyle(true)}
          onClick={() => { setEditOrder(null); setView('newQuote') }}>+ Nuovo Preventivo</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button style={tabStyle(tab === 'attivi', GOLD)} onClick={() => setTab('attivi')}>Attivi ({activeQuotes.length})</button>
        <button style={tabStyle(tab === 'standby', BLUE)} onClick={() => setTab('standby')}>Standby ({standbyQuotes.length})</button>
        <button style={tabStyle(tab === 'persi', RED)} onClick={() => setTab('persi')}>Persi ({lostQuotes.length})</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16 }}>
        <input style={{ ...s.input, width: 280, padding: '9px 14px' }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per cliente o codice..."/>
        <div style={{ fontSize: 10, color: MUTED, letterSpacing: 2 }}>{filtered.length} risultati</div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: MUTED }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, marginBottom: 12, color: CREAM }}>
            {isLostTab
              ? (lostQuotes.length === 0 ? 'Nessun preventivo perso' : 'Nessun risultato')
              : isStandbyTab
              ? (standbyQuotes.length === 0 ? 'Nessun preventivo in standby' : 'Nessun risultato')
              : (activeQuotes.length === 0 ? 'Nessun preventivo ancora' : 'Nessun risultato')}
          </div>
          {tab === 'attivi' && activeQuotes.length === 0 && (
            <button style={btnStyle(true)}
              onClick={() => { setEditOrder(null); setView('newQuote') }}>+ Crea Primo Preventivo</button>
          )}
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={thStyle('client')} onClick={() => handleSort('client')}>Cliente {sortIcon('client')}</th>
              <th style={s.th}>Codice</th>
              <th style={thStyle('date')} onClick={() => handleSort('date')}>Data {sortIcon('date')}</th>
              {isLostTab
                ? <th style={s.th}>Motivo Perdita</th>
                : isStandbyTab
                ? <th style={s.th}>Motivo Standby</th>
                : <th style={s.th}>Articoli</th>}
              <th style={s.th}>Pricing</th>
              <th style={thStyle('total')} onClick={() => handleSort('total')}>Totale € {sortIcon('total')}</th>
              <th style={s.th}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const tot     = orderTotal(o)
              const artCount = (o.kits || []).flatMap(k => k.articles || []).length
              const pricingLabel = o.pricingMode === 'kit'
                ? `Kit × ${o.kitQuantity || '?'}`
                : 'Singolo'
              return (
                <tr key={o.id}>
                  <td style={{ ...s.td, fontFamily: "'Cormorant Garamond',serif", fontSize: 16 }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => { setEditOrder(o); setView('newQuote') }}>{o.client}</span>
                  </td>
                  <td style={{ ...s.td, color: MUTED, fontSize: 11, letterSpacing: 1 }}>{o.id}</td>
                  <td style={{ ...s.td, fontSize: 11, color: MUTED }}>{o.date || '—'}</td>
                  {isLostTab ? (
                    <td style={{ ...s.td }}>
                      <span style={{ display: 'inline-block', padding: '4px 11px', borderRadius: 3, fontSize: 11, letterSpacing: 0.5, background: 'rgba(239,68,68,0.1)', color: RED, border: '1px solid rgba(239,68,68,0.3)' }}>
                        {o.lostReason || 'Non specificato'}
                      </span>
                      {o.lostDate && <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{o.lostDate}</div>}
                    </td>
                  ) : isStandbyTab ? (
                    <td style={{ ...s.td, fontSize: 11, color: MUTED, maxWidth: 260 }}>
                      {o.standbyReason || <span style={{ opacity: 0.6, fontStyle: 'italic' }}>Nessun motivo indicato</span>}
                    </td>
                  ) : (
                    <td style={{ ...s.td, textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: GOLD }}>{artCount}</td>
                  )}
                  <td style={{ ...s.td, fontSize: 10, color: MUTED, letterSpacing: 1 }}>{pricingLabel}</td>
                  <td style={{ ...s.td, fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: GOLD }}>
                    {tot > 0 ? `${tot.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €` : <span style={{ color: MUTED, fontSize: 11 }}>—</span>}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {isLostTab ? (
                        <>
                          <button style={{ padding: '7px 13px', fontSize: 10, border: `1px solid rgba(74,158,110,0.4)`, background: 'rgba(74,158,110,0.08)', color: GREEN, borderRadius: 3, cursor: 'pointer' }}
                            onClick={() => onRestoreQuote(o.id)}>↩ Ripristina</button>
                          <button style={{ padding: '7px 13px', fontSize: 10, border: `1px solid rgba(196,98,58,0.4)`, background: 'rgba(196,98,58,0.08)', color: CLAY, borderRadius: 3, cursor: 'pointer' }}
                            onClick={() => openPDF(o)}>PDF</button>
                          <button style={{ padding: '7px 13px', fontSize: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: RED, borderRadius: 3, cursor: 'pointer' }}
                            onClick={() => onDelete(o.id)} title="Elimina definitivamente">✕</button>
                        </>
                      ) : isStandbyTab ? (
                        <>
                          <button style={{ padding: '7px 13px', fontSize: 10, border: `1px solid rgba(90,130,184,0.4)`, background: 'rgba(90,130,184,0.08)', color: BLUE, borderRadius: 3, cursor: 'pointer' }}
                            onClick={() => onRestoreFromStandby(o.id)}>↩ Riattiva</button>
                          <button style={{ ...btnGoldStyle, padding: '7px 13px', fontSize: 10 }}
                            onClick={() => { setEditOrder(o); setView('newQuote') }}>Modifica</button>
                          <button style={{ padding: '7px 13px', fontSize: 10, border: `1px solid rgba(196,98,58,0.4)`, background: 'rgba(196,98,58,0.08)', color: CLAY, borderRadius: 3, cursor: 'pointer' }}
                            onClick={() => openPDF(o)}>PDF</button>
                          <button style={{ padding: '6px 9px', fontSize: 13, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: MUTED, borderRadius: 3, cursor: 'pointer', opacity: 0.75 }}
                            onClick={() => onDelete(o.id)} title="Elimina definitivamente">🗑</button>
                        </>
                      ) : (
                        <>
                          <button style={{ ...btnGoldStyle, padding: '7px 13px', fontSize: 10 }}
                            onClick={() => { setEditOrder(o); setView('newQuote') }}>Modifica</button>
                          <button style={{ padding: '7px 13px', fontSize: 10, border: `1px solid rgba(196,98,58,0.4)`, background: 'rgba(196,98,58,0.08)', color: CLAY, borderRadius: 3, cursor: 'pointer' }}
                            onClick={() => openPDF(o)}>PDF</button>
                          <button style={{ padding: '7px 13px', fontSize: 10, border: `1px solid rgba(74,158,110,0.4)`, background: 'rgba(74,158,110,0.08)', color: GREEN, borderRadius: 3, cursor: 'pointer' }}
                            onClick={() => onConvertToOrder(o)}>→ Ordine</button>
                          <button style={{ padding: '7px 13px', fontSize: 10, border: `1px solid rgba(90,130,184,0.4)`, background: 'rgba(90,130,184,0.08)', color: BLUE, borderRadius: 3, cursor: 'pointer' }}
                            onClick={() => setStandbyModal(o)} title="In attesa per un fattore esterno, non ora">Standby</button>
                          <button style={{ padding: '7px 13px', fontSize: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: RED, borderRadius: 3, cursor: 'pointer' }}
                            onClick={() => setLostModal(o)} title="Il preventivo non è diventato ordine">Perso</button>
                          <button style={{ padding: '6px 9px', fontSize: 13, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: MUTED, borderRadius: 3, cursor: 'pointer', opacity: 0.75 }}
                            onClick={() => onDelete(o.id)} title="Elimina definitivamente">🗑</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {lostModal && (
        <LostReasonModal
          quote={lostModal}
          onClose={() => setLostModal(null)}
          onConfirm={(reason) => { onMarkLost(lostModal.id, reason); setLostModal(null) }}
        />
      )}

      {standbyModal && (
        <StandbyModal
          quote={standbyModal}
          onClose={() => setStandbyModal(null)}
          onConfirm={(reason) => { onMarkStandby(standbyModal.id, reason); setStandbyModal(null) }}
        />
      )}
    </div>
  )
}
