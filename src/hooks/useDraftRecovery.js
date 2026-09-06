import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 800

// Bozza recuperabile per un modulo (ordine o preventivo) salvata in
// localStorage: autosalvataggio con debounce mentre si compila, proposta
// di ripristino se si torna sul modulo con una bozza pendente non ancora
// salvata sul database, e avviso alla chiusura scheda/refresh se ci sono
// modifiche non salvate. `snapshot` è lo stato corrente del modulo (un
// oggetto semplice); `restore(data)` deve richiamare i setter dello stato
// per riapplicare i valori della bozza.
export function useDraftRecovery(draftKey, snapshot, restore) {
  const [pendingDraft, setPendingDraft] = useState(null)
  const [checked, setChecked] = useState(false)
  const [, forceRender] = useState(0)
  const savedSnapshotRef = useRef(null)
  const serialized = JSON.stringify(snapshot)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) setPendingDraft(JSON.parse(raw))
    } catch { /* bozza corrotta o storage non disponibile: ignora */ }
    setChecked(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  // La base di confronto per "modifiche da salvare" si fissa solo dopo il
  // controllo iniziale, così il form non risulta già "sporco" al primo giro.
  useEffect(() => {
    if (checked && savedSnapshotRef.current === null) savedSnapshotRef.current = serialized
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked])

  useEffect(() => {
    if (!checked || pendingDraft) return
    const t = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), data: snapshot })) } catch { /* storage pieno o non disponibile */ }
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, checked, pendingDraft, draftKey])

  const isDirty = checked && savedSnapshotRef.current !== null && savedSnapshotRef.current !== serialized

  useEffect(() => {
    if (!isDirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const markSaved = () => {
    savedSnapshotRef.current = serialized
    try { localStorage.removeItem(draftKey) } catch { /* noop */ }
    // savedSnapshotRef è un ref: mutarlo non fa ripartire il render, quindi
    // l'indicatore "Salvato" non cambierebbe finché non arriva un altro
    // aggiornamento di stato qualsiasi. Un piccolo trigger forza subito il
    // ricalcolo di isDirty.
    forceRender(v => v + 1)
  }
  const acceptDraft = () => {
    if (pendingDraft) restore(pendingDraft.data)
    setPendingDraft(null)
  }
  const discardDraft = () => {
    try { localStorage.removeItem(draftKey) } catch { /* noop */ }
    setPendingDraft(null)
  }
  const confirmDiscardIfDirty = (message = 'Ci sono modifiche non salvate. Uscire comunque?') =>
    !isDirty || window.confirm(message)

  return { pendingDraft, acceptDraft, discardDraft, isDirty, markSaved, confirmDiscardIfDirty }
}
