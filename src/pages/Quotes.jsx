import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, NAVY, BORDER } from '../tokens.js'
import { s, badgeStyle, btnStyle, btnGoldStyle } from '../tokens.js'
import { orderTotal } from '../utils/helpers.js'
import { generateQuotePDF } from '../utils/pdfQuote.js'
import { quickUpdateStatus } from '../lib/dataService.js'

export default function Quotes({ orders, setView, setEditOrder, onDelete, onOrdersChange, onConvertToOrder }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy]   = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  const quotes = orders.filter(o => o.status === 'PREVENTIVO')

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

  return (
    <div>
      <div style={s.topBar}>
        <div>
          <div style={s.pageTitle}>Preventivi</div>
          <div style={s.pageSub}>{quotes.length} preventiv{quotes.length === 1 ? 'o' : 'i'} in archivio</div>
        </div>
        <button style={{ ...btnStyle(true), background: `linear-gradient(135deg, ${CLAY}, #a0502e)` }}
          onClick={() => { setEditOrder(null); setView('newQuote') }}>+ Nuovo Preventivo</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16 }}>
        <input style={{ ...s.input, width: 280, padding: '9px 14px' }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per cliente o codice..."/>
        <div style={{ fontSize: 10, color: MUTED, letterSpacing: 2 }}>{filtered.length} risultati</div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: MUTED }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, marginBottom: 12, color: CREAM }}>
            {quotes.length === 0 ? 'Nessun preventivo ancora' : 'Nessun risultato'}
          </div>
          {quotes.length === 0 && (
            <button style={{ ...btnStyle(true), background: `linear-gradient(135deg, ${CLAY}, #a0502e)` }}
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
              <th style={s.th}>Articoli</th>
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
                  <td style={{ ...s.td, textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: GOLD }}>{artCount}</td>
                  <td style={{ ...s.td, fontSize: 10, color: MUTED, letterSpacing: 1 }}>{pricingLabel}</td>
                  <td style={{ ...s.td, fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: GOLD }}>
                    {tot > 0 ? `${tot.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €` : <span style={{ color: MUTED, fontSize: 11 }}>—</span>}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button style={{ ...btnGoldStyle, padding: '4px 8px', fontSize: 8 }}
                        onClick={() => { setEditOrder(o); setView('newQuote') }}>Modifica</button>
                      <button style={{ padding: '4px 8px', fontSize: 8, border: `1px solid rgba(196,98,58,0.4)`, background: 'rgba(196,98,58,0.08)', color: CLAY, borderRadius: 3, cursor: 'pointer' }}
                        onClick={() => openPDF(o)}>PDF</button>
                      <button style={{ padding: '4px 8px', fontSize: 8, border: `1px solid rgba(74,158,110,0.4)`, background: 'rgba(74,158,110,0.08)', color: '#4a9e6e', borderRadius: 3, cursor: 'pointer' }}
                        onClick={() => onConvertToOrder(o)}>→ Ordine</button>
                      <button style={{ padding: '4px 8px', fontSize: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', borderRadius: 3, cursor: 'pointer' }}
                        onClick={() => onDelete(o.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
