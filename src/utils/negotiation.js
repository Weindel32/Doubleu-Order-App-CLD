// Trattativa di un preventivo: stato e condizioni concordate con il club.
// Le condizioni possono arrivare dall'Analisi ordine del Kit Builder, ma
// restano sempre modificabili qui: Order App e' dove si tiene traccia di
// cosa e' stato promesso al cliente.
//
// Forma salvata in orders.negotiation (jsonb):
// { stage, gifts: [{ label, qty, note }], depositPct, installments: [{ pct, days }],
//   note, source: { from, analysis, at } | null, editedAt }

export const NEG_STAGES = [
  { key: 'inviato',    label: 'Inviato',                color: '#8a9ab5' },
  { key: 'trattativa', label: 'In trattativa',          color: '#b8965a' },
  { key: 'accettato',  label: 'Accettato con condizioni', color: '#4a9e6e' },
]

export const stageOf = (neg) => NEG_STAGES.find(s => s.key === neg?.stage) || NEG_STAGES[0]

export const emptyNegotiation = () => ({
  stage: 'inviato', gifts: [], depositPct: null, installments: [], note: '', source: null, editedAt: null,
})

export const normalizeNegotiation = (neg) => ({
  ...emptyNegotiation(),
  ...(neg || {}),
  gifts: Array.isArray(neg?.gifts) ? neg.gifts : [],
  installments: Array.isArray(neg?.installments) ? neg.installments : [],
})

// Ci sono condizioni di pagamento da applicare (acconto o rate)?
export const hasPaymentTerms = (neg) =>
  !!neg && ((Number(neg.depositPct) > 0) || (neg.installments || []).some(r => Number(r.pct) > 0))

const round2 = (n) => Math.round(n * 100) / 100

// Condizioni di pagamento in una riga, come si scrivono al club:
// "Acconto 50% alla conferma dell'ordine · 25% a 30 giorni dalla consegna · …".
// Con importi (total > 0) per uso interno; senza, per il PDF del cliente.
export function paymentTermsLines(neg, total = 0) {
  if (!hasPaymentTerms(neg)) return []
  const eur = (n) => '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const amt = (pct) => total > 0 ? ` (${eur(Math.round(total * pct) / 100)})` : ''
  const fmt = (n) => String(n).replace('.', ',')
  const dep = Math.max(0, Math.min(100, Number(neg.depositPct) || 0))
  const rate = (neg.installments || [])
    .map(r => ({ pct: Number(r.pct) || 0, days: Math.max(0, parseInt(r.days) || 0) }))
    .filter(r => r.pct > 0).sort((a, b) => a.days - b.days)
  const atDelivery = Math.max(0, 100 - dep - rate.reduce((a, r) => a + r.pct, 0))
  const out = []
  if (dep > 0) out.push(`Acconto ${fmt(dep)}% alla conferma dell'ordine${amt(dep)}`)
  if (atDelivery > 0.001) out.push(`${fmt(Math.round(atDelivery * 100) / 100)}% alla consegna${amt(atDelivery)}`)
  rate.forEach(r => out.push(`${fmt(r.pct)}% a ${r.days} giorni dalla consegna${amt(r.pct)}`))
  return out
}

// Rate dell'ordine dalle condizioni concordate: acconto alla conferma,
// saldo alla consegna per la parte non rateizzata, rate a N giorni dalla
// consegna. L'ultima riga assorbe gli arrotondamenti.
export function paymentsFromNegotiation(neg, total, todayDisplay) {
  const rows = []
  const now = Date.now()
  const dep = Math.max(0, Math.min(100, Number(neg.depositPct) || 0))
  const rate = (neg.installments || [])
    .map(r => ({ pct: Math.max(0, Number(r.pct) || 0), days: Math.max(0, parseInt(r.days) || 0) }))
    .filter(r => r.pct > 0)
    .sort((a, b) => a.days - b.days)
  const rateSum = rate.reduce((a, r) => a + r.pct, 0)
  const atDelivery = Math.max(0, 100 - dep - rateSum)
  if (dep > 0) rows.push({
    id: `p${now}`, type: 'acconto', amount: round2(total * dep / 100), method: 'Bonifico',
    note: `Acconto ${dep}% (condizioni concordate)`, paid: false,
    dueMode: 'fissa', dueOffsetDays: 0, date: todayDisplay, paidDate: null,
  })
  if (atDelivery > 0.001) rows.push({
    id: `p${now + 1}`, type: rate.length ? 'intermedio' : 'saldo', amount: round2(total * atDelivery / 100), method: 'Bonifico',
    note: `${atDelivery}% alla consegna`, paid: false,
    dueMode: 'consegna', dueOffsetDays: 0, paidDate: null,
  })
  rate.forEach((r, i) => rows.push({
    id: `p${now + 2 + i}`, type: i === rate.length - 1 ? 'saldo' : 'intermedio', amount: round2(total * r.pct / 100), method: 'Bonifico',
    note: `Rata ${r.pct}% a ${r.days} gg dalla consegna`, paid: false,
    dueMode: 'consegna', dueOffsetDays: r.days, paidDate: null,
  }))
  // Arrotondamenti: la differenza va sull'ultima riga
  const sum = rows.reduce((a, p) => a + p.amount, 0)
  if (rows.length && Math.abs(total - sum) >= 0.005 && dep + rateSum <= 100.0001) rows.at(-1).amount = round2(rows.at(-1).amount + total - sum)
  return { rows, installments: rate.length > 0, over: dep + rateSum > 100.0001 }
}
