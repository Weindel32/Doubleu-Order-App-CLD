import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CREAM, GOLD, MUTED, CLAY, GREEN, BORDER } from '../tokens.js'
import { supabase } from '../lib/supabase.js'

// Cambio password, nello stile di ConfirmDialog.
//
//   openPasswordDialog({ mode: 'change', email })  → Promise<boolean>
//     da dentro l'app: chiede la password attuale (verificata rifacendo
//     l'accesso) prima di accettare la nuova, così chi trova il computer
//     aperto non può cambiarla.
//   openPasswordDialog({ mode: 'recovery' })        → Promise<boolean>
//     dopo il link "Password dimenticata?": la sessione arriva dal link
//     nella mail, si chiede solo la nuova. Non si chiude senza salvare.

const MIN_LEN = 10

const inp = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 4,
  padding: '10px 12px', color: CREAM, fontSize: 14, fontFamily: 'inherit', outline: 'none',
}
const lbl = { fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', display: 'block', margin: '12px 0 6px' }

function Dialog({ mode, email, onClose }) {
  const recovery = mode === 'recovery'
  const [current, setCurrent] = useState('')
  const [next, setNext]       = useState('')
  const [repeat, setRepeat]   = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState(null)
  const [done, setDone]       = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape' && !recovery && !busy) onClose(done) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, done]) // eslint-disable-line react-hooks/exhaustive-deps

  const problem =
    (!recovery && !current) ? 'Inserisci la password attuale.'
    : next.length < MIN_LEN ? `La nuova password deve avere almeno ${MIN_LEN} caratteri.`
    : next !== repeat ? 'Le due password nuove non coincidono.'
    : (!recovery && next === current) ? 'La nuova password è uguale a quella attuale.'
    : null

  const save = async () => {
    if (problem) { setError(problem); return }
    setBusy(true); setError(null)
    if (!recovery) {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: current })
      if (authErr) { setBusy(false); setError('La password attuale non è corretta.'); return }
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: next })
    setBusy(false)
    if (updErr) {
      setError(/same|different/i.test(updErr.message || '')
        ? 'La nuova password deve essere diversa da quella attuale.'
        : 'Non è stato possibile salvare la password. Riprova tra qualche minuto.')
      return
    }
    setDone(true)
  }

  const onEnter = (e) => { if (e.key === 'Enter' && !busy) save() }

  return (
    <div onClick={() => { if (!recovery && !busy) onClose(done) }} style={{
      position: 'fixed', inset: 0, background: 'rgba(5,10,24,0.72)', zIndex: 3000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{
        background: '#1e2d50', border: `1px solid ${BORDER}`, borderTop: `2px solid ${done ? GREEN : GOLD}`, borderRadius: 12,
        padding: 'clamp(18px, 4vw, 26px)', width: 420, maxWidth: '100%', boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
        fontFamily: "'Josefin Sans', sans-serif",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: MUTED, marginBottom: 6 }}>DOUBLEU · ORDER APP</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: CREAM, lineHeight: 1.2, marginBottom: 10 }}>
          {done ? 'Password aggiornata' : recovery ? 'Imposta una nuova password' : 'Cambia password'}
        </div>

        {done ? (
          <p style={{ margin: '0 0 6px', fontSize: 13, color: CREAM, lineHeight: 1.6, opacity: 0.9 }}>
            Dal prossimo accesso vale la nuova password.
          </p>
        ) : (
          <>
            {recovery && (
              <p style={{ margin: '0 0 4px', fontSize: 13, color: CREAM, lineHeight: 1.6, opacity: 0.9 }}>
                Sei entrato dal link ricevuto via email. Scegli la nuova password per continuare.
              </p>
            )}
            {!recovery && (
              <>
                <label style={lbl}>Password attuale</label>
                <input ref={firstRef} type="password" autoComplete="current-password" value={current}
                  onChange={e => setCurrent(e.target.value)} onKeyDown={onEnter} style={inp}/>
              </>
            )}
            <label style={lbl}>Nuova password</label>
            <input ref={recovery ? firstRef : null} type="password" autoComplete="new-password" value={next}
              onChange={e => setNext(e.target.value)} onKeyDown={onEnter} style={inp}/>
            <label style={lbl}>Ripeti la nuova password</label>
            <input type="password" autoComplete="new-password" value={repeat}
              onChange={e => setRepeat(e.target.value)} onKeyDown={onEnter} style={inp}/>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
              Almeno {MIN_LEN} caratteri. Meglio tre o quattro parole a caso più un numero, usata solo qui.
            </div>
            {error && (
              <div style={{ background: 'rgba(196,98,58,0.14)', border: '1px solid rgba(196,98,58,0.45)', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: CLAY, lineHeight: 1.5, marginTop: 12 }}>
                {error}
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          {!done && !recovery && <button onClick={() => !busy && onClose(false)} style={{
            padding: '10px 20px', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', borderRadius: 4, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, fontFamily: 'inherit',
          }}>Annulla</button>}
          <button disabled={busy} onClick={() => done ? onClose(true) : save()} style={{
            padding: '10px 22px', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, borderRadius: 4,
            cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
            background: done ? GREEN : GOLD, border: `1px solid ${done ? GREEN : GOLD}`, color: '#fff', fontFamily: 'inherit',
          }}>{done ? 'OK' : busy ? 'Salvataggio…' : 'Salva password'}</button>
        </div>
      </div>
    </div>
  )
}

export function openPasswordDialog({ mode = 'change', email } = {}) {
  return new Promise(resolve => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const close = (v) => { root.unmount(); host.remove(); resolve(v) }
    root.render(<Dialog mode={mode} email={email} onClose={close}/>)
  })
}
