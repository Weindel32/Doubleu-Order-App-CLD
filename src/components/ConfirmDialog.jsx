import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { CREAM, GOLD, MUTED, CLAY, GREEN, BORDER } from '../tokens.js'

// Conferma nello stile dell'app al posto di window.confirm, che mostra la
// finestra grigia del browser con l'indirizzo del sito in testa.
//
//   const ok = await askConfirm({
//     title: 'Applicare le taglie del cliente?',
//     body: ['Primo paragrafo', 'Secondo'],
//     warning: 'Il totale passa da …',      // riquadro evidenziato, facoltativo
//     list: ['riga 1', 'riga 2'],           // elenco puntato, facoltativo
//     confirmLabel: 'Applica', tone: 'green' | 'gold' | 'danger',
//   })
//
// Restituisce una Promise<boolean>. Esc o clic fuori = annulla.

const TONES = { green: GREEN, gold: GOLD, danger: '#ef4444' }

function Dialog({ title, body = [], warning, list = [], confirmLabel = 'Conferma', cancelLabel = 'Annulla', tone = 'gold', onClose }) {
  const okRef = useRef(null)
  useEffect(() => {
    okRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const color = TONES[tone] || GOLD

  return (
    <div onClick={() => onClose(false)} style={{
      position: 'fixed', inset: 0, background: 'rgba(5,10,24,0.72)', zIndex: 3000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{
        background: '#1e2d50', border: `1px solid ${BORDER}`, borderTop: `2px solid ${color}`, borderRadius: 12,
        padding: 'clamp(18px, 4vw, 26px)', width: 460, maxWidth: '100%', boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
        fontFamily: "'Josefin Sans', sans-serif",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: MUTED, marginBottom: 6 }}>DOUBLEU · ORDER APP</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: CREAM, lineHeight: 1.2, marginBottom: 14 }}>{title}</div>
        {body.filter(Boolean).map((p, i) => (
          <p key={i} style={{ margin: '0 0 10px', fontSize: 13, color: CREAM, lineHeight: 1.6, opacity: 0.9 }}>{p}</p>
        ))}
        {list.length > 0 && (
          <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
            {list.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        )}
        {warning && (
          <div style={{ background: 'rgba(196,98,58,0.14)', border: '1px solid rgba(196,98,58,0.45)', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: CREAM, lineHeight: 1.55, margin: '4px 0 12px' }}>
            <span style={{ color: CLAY, fontWeight: 700, letterSpacing: 1 }}>ATTENZIONE · </span>{warning}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <button onClick={() => onClose(false)} style={{
            padding: '10px 20px', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', borderRadius: 4, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, fontFamily: 'inherit',
          }}>{cancelLabel}</button>
          <button ref={okRef} onClick={() => onClose(true)} style={{
            padding: '10px 22px', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, borderRadius: 4, cursor: 'pointer',
            background: color, border: `1px solid ${color}`, color: '#fff', fontFamily: 'inherit',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function askConfirm(opts) {
  return new Promise(resolve => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const close = (v) => { root.unmount(); host.remove(); resolve(v) }
    root.render(<Dialog {...opts} onClose={close}/>)
  })
}
