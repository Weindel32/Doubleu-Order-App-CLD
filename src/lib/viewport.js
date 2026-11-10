// Telefono: schermo stretto, o basso e non troppo largo (telefono in orizzontale).
// Stessa regola che sceglie la versione mobile in App.jsx.
export const isPhoneViewport = () =>
  typeof window !== 'undefined' && (window.innerWidth <= 480 || (window.innerHeight <= 480 && window.innerWidth <= 960))

// Corpo del testo nei componenti condivisi tra desktop e telefono (modulo
// taglie, trattativa, attivita', campionature…): sul telefono la stessa scala
// delle schermate mobile, niente sotto 12; sul desktop resta com'era.
const PHONE_SIZE = { 9: 12, 10: 12, 10.5: 12, 11: 12, 11.5: 12, 12: 13, 13: 15, 14: 16, 15: 16, 16: 17 }
export const pfs = (n) => (isPhoneViewport() ? (PHONE_SIZE[n] ?? n) : n)
