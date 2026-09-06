import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN } from '../tokens.js'
import { btnStyle } from '../tokens.js'

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

// Banner proposto quando all'apertura del modulo esiste una bozza non
// salvata sul database (autosalvata in locale durante una compilazione
// precedente, interrotta senza arrivare al salvataggio).
export function DraftBanner({ pendingDraft, onAccept, onDiscard }) {
  if (!pendingDraft) return null
  const club = pendingDraft.data?.club
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '14px 20px', marginBottom: 20, borderRadius: 8,
      background: 'rgba(184,150,90,0.1)', border: `1px solid rgba(184,150,90,0.35)`,
    }}>
      <div style={{ fontSize: 12, color: CREAM }}>
        Trovata una bozza non salvata{club ? ` — ${club}` : ''}, delle {fmtTime(pendingDraft.savedAt)}.
      </div>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button style={{ ...btnStyle(false), padding: '7px 16px', fontSize: 9 }} onClick={onDiscard}>Scarta</button>
        <button style={{ ...btnStyle(true), padding: '7px 16px', fontSize: 9 }} onClick={onAccept}>Riprendi bozza</button>
      </div>
    </div>
  )
}

// Indicatore "Salvato / Modifiche da salvare" — feedback immediato sullo
// stato del modulo, senza dover controllare se il salvataggio è andato a buon fine.
export function SaveStatusBadge({ isDirty }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9, letterSpacing: 1.5,
      textTransform: 'uppercase', color: isDirty ? GOLD : MUTED,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isDirty ? GOLD : GREEN, display: 'inline-block' }} />
      {isDirty ? 'Modifiche da salvare' : 'Salvato'}
    </div>
  )
}
