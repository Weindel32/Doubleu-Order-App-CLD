import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CREAM, GOLD, MUTED, CLAY, GREEN, BORDER } from '../tokens.js'

// Finestre nello stile dell'app al posto di window.confirm / alert / prompt,
// che mostrano il riquadro grigio del browser con l'indirizzo del sito.
//
//   askConfirm(opts) → Promise<boolean>      conferma / annulla
//   showAlert(opts)  → Promise<void>         solo "OK"
//   askText(opts)    → Promise<string|null>  campo di testo (null = annullato)
//
//   const ok = await askConfirm({
//     title: 'Applicare le taglie del cliente?',
//     body: ['Primo paragrafo', 'Secondo'],
//     warning: 'Il totale passa da …',      // riquadro evidenziato, facoltativo
//     list: ['riga 1', 'riga 2'],           // elenco puntato, facoltativo
//     confirmLabel: 'Applica', tone: 'green' | 'gold' | 'danger',
//   })
//
// Esc o clic fuori = annulla. askText accetta anche value, placeholder,
// multiline e required (OK disattivato finche' il campo e' vuoto).

const TONES = { green: GREEN, gold: GOLD, danger: '#ef4444' }

function Dialog({ title, body = [], warning, list = [], confirmLabel = 'Conferma', cancelLabel = 'Annulla', tone = 'gold',
  mode = 'confirm', value = '', placeholder = '', multiline = false, required = false, onClose }) {
  const okRef = useRef(null)
  const inputRef = useRef(null)
  const [text, setText] = useState(value)
  const isPrompt = mode === 'prompt'
  const okDisabled = isPrompt && required && !text.trim()
  const finish = (ok) => onClose(isPrompt ? (ok ? text : null) : ok)
  useEffect(() => {
    if (isPrompt) { inputRef.current?.focus(); inputRef.current?.select() } else okRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') finish(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const color = TONES[tone] || GOLD

  return (
    <div onClick={() => finish(false)} style={{
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
        {isPrompt && (() => {
          const Field = multiline ? 'textarea' : 'input'
          return <Field ref={inputRef} value={text} placeholder={placeholder} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !multiline && !okDisabled) finish(true) }}
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 4,
              padding: '10px 12px', color: CREAM, fontSize: 14, fontFamily: 'inherit', outline: 'none', margin: '4px 0 4px',
              ...(multiline ? { minHeight: 80, resize: 'vertical' } : {}) }}/>
        })()}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          {mode !== 'alert' && <button onClick={() => finish(false)} style={{
            padding: '10px 20px', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', borderRadius: 4, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, fontFamily: 'inherit',
          }}>{cancelLabel}</button>}
          <button ref={okRef} disabled={okDisabled} onClick={() => finish(true)} style={{
            padding: '10px 22px', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, borderRadius: 4,
            cursor: okDisabled ? 'default' : 'pointer', opacity: okDisabled ? 0.45 : 1,
            background: color, border: `1px solid ${color}`, color: '#fff', fontFamily: 'inherit',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function open(opts) {
  return new Promise(resolve => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const close = (v) => { root.unmount(); host.remove(); resolve(v) }
    root.render(<Dialog {...opts} onClose={close}/>)
  })
}

export const askConfirm = (opts) => open({ ...opts, mode: 'confirm' })
export const showAlert  = (opts) => open({ title: 'Attenzione', confirmLabel: 'OK', ...opts, mode: 'alert' }).then(() => {})
export const askText    = (opts) => open({ confirmLabel: 'OK', ...opts, mode: 'prompt' })
