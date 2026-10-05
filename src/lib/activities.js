// Registro attività dei prospect: tipi, direzione, esiti e stati.
// Condiviso da desktop, mobile e Clienti, così le etichette e le regole
// (prossimo passo, ultima attività, avanzamento suggerito) restano una
// sola cosa. Esiti e direzione usano gli stessi valori di Prospect
// Finder: quando un club viene ibernato passano di là senza traduzioni.

import { GOLD, MUTED, CLAY, GREEN } from '../tokens.js'

// Tipi per le attività nuove: la direzione sta nel suo campo, non nel tipo.
export const ACT_TYPES = ['email','message','call','meeting','note']

// Tipi registrati prima del registro CRM: restano leggibili e modificabili,
// ma non si scelgono più per le attività nuove.
export const LEGACY_ACT_TYPES = ['email_sent','reply_received','message_sent','message_received','sample_shipped']

export const TYPE_LABELS = {
  email:   'Email',
  message: 'Messaggio',
  call:    'Chiamata',
  meeting: 'Meeting',
  note:    'Nota',
  email_sent:       'Email inviata',
  reply_received:   'Risposta ricevuta',
  message_sent:     'Messaggio inviato',
  message_received: 'Messaggio ricevuto',
  sample_shipped:   'Sample spedito',
}

// Meeting e note non hanno un verso: la direzione si chiede solo qui.
export const hasDirection = type => ['email','message','call'].includes(type)

export const DIRECTIONS = ['inviata','ricevuta']
export const DIRECTION_LABELS = { inviata:'In uscita', ricevuta:'In entrata' }

const DIRECTION_SUFFIX = {
  email:   { inviata:'inviata', ricevuta:'ricevuta' },
  message: { inviata:'inviato', ricevuta:'ricevuto' },
  call:    { inviata:'fatta',   ricevuta:'ricevuta' },
}

export const OUTCOMES = ['positivo','interessato','neutro','negativo','nessuna_risposta','rinvio_referente']
export const OUTCOME_LABELS = {
  positivo:         'Positivo',
  interessato:      'Interessato',
  neutro:           'Neutro',
  negativo:         'Negativo',
  nessuna_risposta: 'Nessuna risposta',
  rinvio_referente: 'Rinvio a referente',
}
export const OUTCOME_CFG = {
  positivo:         { color: GREEN,     bg: 'rgba(74,158,110,0.15)',  border: 'rgba(74,158,110,0.35)' },
  interessato:      { color: '#7aaee8', bg: 'rgba(90,130,184,0.15)',  border: 'rgba(90,130,184,0.35)' },
  neutro:           { color: MUTED,     bg: 'rgba(138,154,181,0.12)', border: 'rgba(138,154,181,0.3)' },
  negativo:         { color: CLAY,      bg: 'rgba(196,98,58,0.12)',   border: 'rgba(196,98,58,0.3)'   },
  nessuna_risposta: { color: MUTED,     bg: 'transparent',            border: 'rgba(138,154,181,0.3)' },
  rinvio_referente: { color: GOLD,      bg: 'rgba(184,150,90,0.15)',  border: 'rgba(184,150,90,0.35)' },
}

// Etichetta completa: "Email inviata", "Chiamata ricevuta", "Meeting".
export function activityLabel(act) {
  const base = TYPE_LABELS[act.type] || act.type
  const suffix = act.direction && DIRECTION_SUFFIX[act.type]?.[act.direction]
  return suffix ? `${base} ${suffix}` : base
}

export const todayISO = () => new Date().toISOString().slice(0, 10)
export const fmtDay   = iso => (iso || '').slice(0, 10).split('-').reverse().join('/')
export const actDay   = act => (act.created_at || '').slice(0, 10)

// La data scelta si salva a mezzogiorno UTC: evita che, a seconda del
// fuso, la data mostrata (created_at.slice(0,10)) scivoli di un giorno.
export const dayToTimestamp = day => (day ? `${day}T12:00:00.000Z` : undefined)

// Le attività registrate prima del registro CRM non hanno stato: valgono
// come fatte.
export const isPlanned  = act => act.status === 'da_fare'
export const isReplaced = act => act.status === 'sostituita'
export const isDone     = act => !act.status || act.status === 'fatta'

export const doneActivities = p =>
  (p.prospect_activities || []).filter(isDone).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

// Attività da fare, dalla scadenza più vicina: la prima è il prossimo passo.
export const plannedActivities = p =>
  (p.prospect_activities || []).filter(isPlanned).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))

export const lastActivity = p => doneActivities(p)[0] || null
export const nextStep     = p => plannedActivities(p)[0] || null

// Avanzamento proposto dopo un esito positivo. Solo un suggerimento: lo
// stage lo cambia sempre una persona.
const NEXT_STAGE = { contatto:'sample', sample:'negoziazione', negoziazione:'won' }
export const suggestedStage = p =>
  p && p.contact_type === 'cliente' && !p.hibernated_at ? NEXT_STAGE[p.stage] || null : null

// Titolo del promemoria su Todoist: "Chiamata · Tennis Club X — conferma taglie".
export function todoistTitle(step, prospectName) {
  const text = (step.content || '').trim()
  return `${TYPE_LABELS[step.type] || 'Attività'} · ${prospectName}${text ? ` — ${text}` : ''}`
}
