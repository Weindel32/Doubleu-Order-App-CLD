import { useState } from 'react'
import { MUTED, CREAM, BORDER } from '../tokens.js'
import { s } from '../tokens.js'

const groupLabelStyle = { fontSize: 9, letterSpacing: 2, color: MUTED, padding: '10px 14px 4px' }
const rowStyle = { padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: CREAM, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }

// Ricerca unica per nome/codice su clienti, prospect e ordini, con
// risultati raggruppati per tipo. Il click su un cliente o un prospect
// apre direttamente la sua scheda (storico commerciale unificato),
// non una semplice card anagrafica; il click su un ordine lo apre
// per la modifica.
export default function GlobalSearch({ clients = [], prospects = [], orders = [], onOpenClient, onOpenProspect, onOpenOrder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)

  const q = query.trim().toLowerCase()
  const matchClients   = q ? clients.filter(c => (c.name || '').toLowerCase().includes(q)).slice(0, 6) : []
  const matchProspects = q ? prospects.filter(p => (p.name || '').toLowerCase().includes(q)).slice(0, 6) : []
  const matchOrders    = q ? orders.filter(o => o.id.toLowerCase().includes(q) || (o.client || '').toLowerCase().includes(q)).slice(0, 6) : []
  const hasResults = matchClients.length + matchProspects.length + matchOrders.length > 0

  const select = (fn, arg) => { fn(arg); setQuery(''); setOpen(false) }

  return (
    <div style={{ position: 'relative', maxWidth: 420, marginBottom: 20 }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontSize: 13, pointerEvents: 'none' }}>⌕</span>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Cerca cliente, prospect o ordine…"
        style={{ ...s.input, paddingLeft: 32 }}
      />
      {open && q && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: '#1e2d50', border: `1px solid ${BORDER}`, borderRadius: 8, zIndex: 300, maxHeight: 420, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {!hasResults ? (
            <div style={{ padding: 14, fontSize: 12, color: MUTED, fontStyle: 'italic' }}>Nessun risultato</div>
          ) : (
            <>
              {matchClients.length > 0 && (
                <>
                  <div style={groupLabelStyle}>CLIENTI</div>
                  {matchClients.map(c => (
                    <div key={c.id} style={rowStyle} onMouseDown={() => select(onOpenClient, c.id)}>
                      <span>{c.name}</span>
                    </div>
                  ))}
                </>
              )}
              {matchProspects.length > 0 && (
                <>
                  <div style={groupLabelStyle}>PROSPECT</div>
                  {matchProspects.map(p => (
                    <div key={p.id} style={rowStyle} onMouseDown={() => select(onOpenProspect, p.id)}>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </>
              )}
              {matchOrders.length > 0 && (
                <>
                  <div style={groupLabelStyle}>ORDINI</div>
                  {matchOrders.map(o => (
                    <div key={o.id} style={rowStyle} onMouseDown={() => select(onOpenOrder, o)}>
                      <span style={{ color: MUTED, fontSize: 11, letterSpacing: 1 }}>{o.id}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.client}</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
