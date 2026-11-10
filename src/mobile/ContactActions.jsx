import { GOLD, MUTED, BORDER, SURFACE } from '../tokens.js'
import { intlPhone } from '../lib/phone.js'
import NavIcon from '../components/NavIcon.jsx'

// Chiama, WhatsApp, Email col referente del club: le cose che si fanno dal
// telefono, in cima al dettaglio. Senza numero o email il pulsante resta
// spento invece di sparire, cosi' si vede cosa manca nell'anagrafica.
export default function ContactActions({ phone, email, contact }) {
  const tel = intlPhone(phone)
  const first = (contact || '').split(' ')[0]
  const actions = [
    { label: 'Chiama',   icon: 'phone', href: tel ? `tel:+${tel}` : null },
    { label: 'WhatsApp', icon: 'chat',  href: tel ? `https://wa.me/${tel}${first ? `?text=${encodeURIComponent(`Ciao ${first}, `)}` : ''}` : null },
    { label: 'Email',    icon: 'mail',  href: email ? `mailto:${email}` : null },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
      {actions.map(a => {
        const on = !!a.href
        const style = {
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
          minHeight: 64, borderRadius: 10, textDecoration: 'none',
          background: SURFACE, border: `1px solid ${on ? 'rgba(184,150,90,0.4)' : BORDER}`,
          color: on ? GOLD : MUTED, opacity: on ? 1 : 0.45,
          fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif",
          WebkitTapHighlightColor: 'transparent',
        }
        const body = <><NavIcon name={a.icon} size={22}/><span>{a.label}</span></>
        return on
          ? <a key={a.label} href={a.href} target={a.icon === 'chat' ? '_blank' : undefined} rel="noreferrer" style={style}>{body}</a>
          : <div key={a.label} aria-disabled="true" title={a.icon === 'mail' ? 'Email mancante' : 'Telefono mancante'} style={style}>{body}</div>
      })}
    </div>
  )
}
