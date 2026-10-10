import { askConfirm } from './ConfirmDialog.jsx'
import { useState, useEffect } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN } from '../tokens.js'
import { btnGoldStyle } from '../tokens.js'
import { fetchContactRequests, setContactRequestStatus } from '../lib/dataService.js'
import { syncWebLeadToProspectFinder, webLeadSyncMessage } from '../lib/prospectFinder.js'

// Richieste arrivate dal modulo contatti di doubleutennis.com.
//
// Non entrano da sole in pipeline: una richiesta non e' ancora un prospect
// (puo' essere un privato, un fornitore, uno spam passato dai filtri). Qui
// si smistano: "Converti" crea il prospect con canale 'web' e il messaggio
// come prima attivita', "Archivia" la toglie dalla vista. Restano tutte in
// archivio, cosi' il canale web si puo' misurare.

const TYPE_LABEL = { club:'Collezione Club', capsule:'Capsule WFOX / SURFACES', info:'Informazioni generali', altro:'Altro' }
const SOURCE_LABEL = { form:'form sito', web3forms:'form sito (storico)' }

const fmtDate = (iso) => new Date(iso).toLocaleString('it-IT', {
  timeZone:'Europe/Rome', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit',
})

const chip = (color, bg, border) => ({
  display:'inline-block', padding:'2px 8px', borderRadius:2, fontSize:9, letterSpacing:1.2,
  color, background:bg, border:`1px solid ${border}`, textTransform:'uppercase',
})

// Un prospect gia' esistente per la stessa persona o lo stesso club: meglio
// collegare la richiesta a quello che creare un doppione in pipeline.
function findExisting(prospects, r) {
  const email = (r.email || '').toLowerCase()
  const club  = (r.club || '').trim().toLowerCase()
  return prospects.find(p =>
    (email && (p.contact_email || '').toLowerCase() === email) ||
    (club && (p.name || '').trim().toLowerCase() === club))
}

function RequestCard({ r, prospects, busy, mobile, onConvert, onArchive, onRestore, onOpenProspect }) {
  const [open, setOpen] = useState(false)
  const linked = r.prospect_id ? prospects.find(p => p.id === r.prospect_id) : null
  const long   = (r.message || '').length > 220
  const text   = open || !long ? r.message : r.message.slice(0, 220).trimEnd() + '…'

  return (
    <div style={{ padding: mobile ? '14px 14px' : '16px 22px', background:'rgba(255,255,255,0.03)', border:`1px solid ${r.status === 'nuova' ? 'rgba(184,150,90,0.45)' : BORDER}`, borderRadius:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', alignItems:'flex-start' }}>
        <div style={{ minWidth:0, flex:'1 1 240px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize: mobile ? 18 : 20, color:CREAM }}>
              {r.name}{r.club ? <span style={{ color:MUTED }}>{'  ·  '}{r.club}</span> : null}
            </span>
            {r.status === 'nuova'      && <span style={chip(GOLD, 'rgba(184,150,90,0.15)', 'rgba(184,150,90,0.35)')}>nuova</span>}
            {r.status === 'convertita' && <span style={chip(GREEN, 'rgba(74,158,110,0.15)', 'rgba(74,158,110,0.35)')}>in pipeline</span>}
            {r.status === 'archiviata' && <span style={chip(MUTED, 'rgba(138,154,181,0.12)', 'rgba(138,154,181,0.3)')}>archiviata</span>}
          </div>
          <div style={{ fontSize:11, color:MUTED, marginTop:5, display:'flex', gap:10, flexWrap:'wrap' }}>
            <span>{fmtDate(r.created_at)}</span>
            <span>{SOURCE_LABEL[r.source] || r.source}</span>
            {r.request_type && <span>{TYPE_LABEL[r.request_type] || r.request_type}</span>}
            <span>{(r.lang || '').toUpperCase()}</span>
            <a href={`mailto:${r.email}`} style={{ color:GOLD, textDecoration:'none' }}>{r.email}</a>
          </div>
        </div>

        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {r.status === 'nuova' && (
            <>
              <button disabled={busy} style={{ ...btnGoldStyle, padding:'6px 14px', fontSize:9 }} onClick={() => onConvert(r)}>
                Converti in prospect
              </button>
              <button disabled={busy} onClick={() => onArchive(r)}
                style={{ padding:'6px 14px', fontSize:9, letterSpacing:1.5, cursor:'pointer', borderRadius:3, background:'transparent', border:`1px solid ${BORDER}`, color:MUTED, textTransform:'uppercase' }}>
                Archivia
              </button>
            </>
          )}
          {r.status === 'convertita' && linked && (
            <button style={{ ...btnGoldStyle, padding:'6px 14px', fontSize:9 }} onClick={() => onOpenProspect(linked.id)}>
              Apri prospect
            </button>
          )}
          {r.status === 'archiviata' && (
            <button disabled={busy} onClick={() => onRestore(r)}
              style={{ padding:'6px 14px', fontSize:9, letterSpacing:1.5, cursor:'pointer', borderRadius:3, background:'transparent', border:`1px solid ${BORDER}`, color:MUTED, textTransform:'uppercase' }}>
              Rimetti tra le nuove
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize:13, color:CREAM, lineHeight:1.6, marginTop:12, whiteSpace:'pre-line', opacity:0.92 }}>{text}</div>
      {long && (
        <button onClick={() => setOpen(o => !o)} style={{ background:'none', border:'none', color:GOLD, fontSize:10, letterSpacing:1.5, cursor:'pointer', padding:'6px 0 0', textTransform:'uppercase' }}>
          {open ? 'Riduci' : 'Leggi tutto'}
        </button>
      )}
    </div>
  )
}

export default function WebRequests({ prospects, onUpsert, onAddActivity, onOpenProspect, mobile = false }) {
  const [requests, setRequests] = useState([])
  const [loaded,   setLoaded]   = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [showAll,  setShowAll]  = useState(false)
  const [busyId,   setBusyId]   = useState(null)
  const [error,    setError]    = useState('')
  const [notice,   setNotice]   = useState(null)  // null | { warn, text }

  const load = async () => { setRequests(await fetchContactRequests()); setLoaded(true) }
  useEffect(() => { load() }, [])

  const nuove   = requests.filter(r => r.status === 'nuova')
  const visible = showAll ? requests : nuove

  const handleConvert = async (r) => {
    setBusyId(r.id); setError(''); setNotice(null)
    try {
      const existing = findExisting(prospects, r)
      let prospectId = null
      if (existing && await askConfirm({ title: 'Prospect già presente', body: [`Esiste già il prospect «${existing.name}». Collego la richiesta a quello invece di crearne uno nuovo?`], confirmLabel: 'Collega', cancelLabel: 'Crea nuovo', tone: 'gold' })) {
        prospectId = existing.id
      } else {
        const when = new Date(r.created_at).toLocaleDateString('it-IT', { timeZone:'Europe/Rome' })
        const saved = await onUpsert({
          name:           r.club || r.name,
          contact_name:   r.name,
          contact_email:  r.email,
          language:       (r.lang || '').toLowerCase() || null,
          channel_origin: 'web',
          stage:          'contatto',
          contact_type:   'cliente',
          notes:          `Origine: form contatti doubleutennis.com, ${when}` +
                          (r.request_type ? ` — ${TYPE_LABEL[r.request_type] || r.request_type}` : ''),
        })
        if (!saved?.id) throw new Error('Creazione del prospect non riuscita')
        prospectId = saved.id
      }
      // Il messaggio originale entra nella cronologia del prospect con la
      // sua data vera: e' il primo contatto, non una nota scritta oggi.
      await onAddActivity(prospectId, { type:'message', direction:'ricevuta', content:r.message, created_at:r.created_at })
      const ok = await setContactRequestStatus(r.id, 'convertita', prospectId)
      if (!ok) throw new Error('Prospect creato, ma la richiesta non e\' stata aggiornata')
      // Il club potrebbe essere in una sequenza a freddo su Prospect Finder:
      // va fermata. Un errore qui non annulla la conversione, ma si dice.
      try {
        const sync = await syncWebLeadToProspectFinder(r)
        const text = webLeadSyncMessage(sync)
        if (text) setNotice({ warn: sync.email_programmate > 0, text })
      } catch (e) {
        setNotice({ warn: true, text: `Prospect creato. Controllo su Prospect Finder non riuscito (${e.message}): verifica a mano che il club non sia in sequenza.` })
      }
      await load()
    } catch (e) {
      setError(e.message || 'Operazione non riuscita, riprova.')
    }
    setBusyId(null)
  }

  const handleStatus = async (r, status) => {
    setBusyId(r.id); setError('')
    const ok = await setContactRequestStatus(r.id, status)
    if (!ok) setError('Aggiornamento non riuscito, riprova.')
    await load()
    setBusyId(null)
  }

  if (!loaded || requests.length === 0) return null

  return (
    <div style={{ marginBottom: mobile ? 18 : 28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, marginBottom: expanded ? 12 : 0, flexWrap:'wrap' }}>
        <button onClick={() => setExpanded(e => !e)}
          style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, letterSpacing:2, color:GOLD, textTransform:'uppercase' }}>Richieste dal sito</span>
          {nuove.length > 0 && (
            <span style={{ minWidth:20, height:20, padding:'0 6px', borderRadius:10, background:CLAY, color:'#fff', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
              {nuove.length}
            </span>
          )}
          <span style={{ color:MUTED, fontSize:11 }}>{expanded ? '▾' : '▸'}</span>
        </button>
        {expanded && (
          <button onClick={() => setShowAll(v => !v)}
            style={{ background:'none', border:'none', color:MUTED, fontSize:10, letterSpacing:1.5, cursor:'pointer', textTransform:'uppercase' }}>
            {showAll ? 'Solo nuove' : `Archivio (${requests.length})`}
          </button>
        )}
      </div>

      {expanded && (
        <>
          {error && <div style={{ fontSize:12, color:CLAY, marginBottom:10 }}>{error}</div>}
          {notice && (
            <div style={{ fontSize:12, color: notice.warn ? CLAY : GREEN, marginBottom:10, lineHeight:1.5 }}>
              {notice.text}
              <button onClick={() => setNotice(null)} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', marginLeft:8, fontSize:12 }}>×</button>
            </div>
          )}
          {visible.length === 0 ? (
            <div style={{ fontSize:12, color:MUTED, padding:'4px 0' }}>Nessuna richiesta da smistare.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {visible.map(r => (
                <RequestCard key={r.id} r={r} prospects={prospects} mobile={mobile}
                  busy={busyId === r.id}
                  onConvert={handleConvert}
                  onArchive={r => handleStatus(r, 'archiviata')}
                  onRestore={r => handleStatus(r, 'nuova')}
                  onOpenProspect={onOpenProspect}/>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
