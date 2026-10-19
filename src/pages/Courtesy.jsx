import { useEffect } from 'react'

// Pagina di cortesia per chi apre l'indirizzo senza un link (es. un cliente
// che accorcia il link del modulo taglie): niente schermata di accesso
// dell'app interna, solo il marchio e un rimando al sito. Lo staff entra
// da «Accesso staff» (vedi main.jsx).

const C = { bg: '#f6f2ea', ink: '#111d38', muted: '#5f6a80', faint: '#9aa3b5', gold: '#8c6d3a', line: '#e4dccd' }
const serif = "'Cormorant Garamond', serif"
const sans  = "'Josefin Sans', sans-serif"

export default function Courtesy({ onStaff }) {
  useEffect(() => {
    document.title = 'DOUBLEU'
    document.body.style.background = C.bg
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', C.bg)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: sans, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <div style={{ fontFamily: serif, fontSize: 40, fontWeight: 600, letterSpacing: 9, paddingLeft: 9 }}>DOUBLEU</div>
          <div style={{ fontSize: 10, letterSpacing: 3.5, color: C.gold, textTransform: 'uppercase', marginTop: 6 }}>Area ordini club</div>
          <div style={{ width: 40, height: 1, background: C.gold, opacity: 0.5, margin: '28px auto' }}/>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            Questo indirizzo è riservato ai moduli d'ordine dei club.
            Se hai ricevuto un link da DOUBLEU, aprilo direttamente dal messaggio:
            ti porta al tuo modulo.
          </p>
          <a href="https://doubleutennis.com" style={{
            display: 'inline-block', marginTop: 32, padding: '14px 28px', borderRadius: 8, background: C.ink, color: '#fff',
            fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none',
          }}>Visita doubleutennis.com</a>
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '0 24px calc(24px + env(safe-area-inset-bottom))', fontSize: 11, color: C.faint }}>
        Made in Italy
        <span style={{ margin: '0 10px' }}>·</span>
        <button onClick={onStaff} style={{ background: 'none', border: 'none', padding: 0, color: C.faint, fontSize: 11, fontFamily: sans, cursor: 'pointer', textDecoration: 'underline' }}>
          Accesso staff
        </button>
      </div>
    </div>
  )
}
