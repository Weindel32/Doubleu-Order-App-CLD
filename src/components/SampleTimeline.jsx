import { GOLD, MUTED, CREAM, CLAY, GREEN, BORDER } from '../tokens.js'
import { s, btnGoldStyle } from '../tokens.js'
import {
  PURPOSE_LABELS, PURPOSE_CFG, GIFT_CFG, isGift, OUTCOME_LABELS, OUTCOME_CFG, fmtDate, euro,
  samplePieces, sampleCostValue, sampleInvested, sampleOutstanding,
  needsFollowUp, returnOverdue, returnPending, daysSince, itemOutcome, followUpBaseDate,
} from '../utils/samples.js'

export function OutcomeBadge({ outcome, count }) {
  const cfg = OUTCOME_CFG[outcome] || OUTCOME_CFG.in_attesa
  const label = (OUTCOME_LABELS[outcome] || outcome || 'In attesa').toUpperCase()
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 2, fontSize: 11,
      letterSpacing: 1.5, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {label}{count > 1 ? ` ×${count}` : ''}
    </span>
  )
}

// Motivo dell'invio (valutazione, omaggio, ecc.), stesso stile del badge esito.
export function PurposeBadge({ purpose }) {
  const cfg = PURPOSE_CFG[purpose] || PURPOSE_CFG.valutazione
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 2, fontSize: 11,
      letterSpacing: 1.5, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {(PURPOSE_LABELS[purpose] || purpose || '—').toUpperCase()}
    </span>
  )
}

// Merce regalata: affianca il motivo, non lo sostituisce.
export function GiftBadge() {
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 2, fontSize: 11,
      letterSpacing: 1.5, fontWeight: 600, background: GIFT_CFG.bg, color: GIFT_CFG.color,
      border: `1px solid ${GIFT_CFG.border}` }}>
      OMAGGIO
    </span>
  )
}

// Follow-up da sollecitare o reso scaduto: stesso allarme, due testi.
export function FollowUpBadge({ overdue }) {
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 2, fontSize: 11,
      letterSpacing: 1, fontWeight: 600, color: CLAY,
      background: 'rgba(196,98,58,0.15)', border: '1px solid rgba(196,98,58,0.35)' }}>
      {overdue ? '⚠ RESO SCADUTO' : '⚠ DA SOLLECITARE'}
    </span>
  )
}

// Riepilogo esiti di un invio: articoli diversi possono avere feedback
// diversi, quindi non collassiamo tutto a un badge unico.
function ItemOutcomeRow({ it }) {
  const outcome = itemOutcome(it)
  const cfg = OUTCOME_CFG[outcome]
  const label = [it.sp, it.description, it.color, it.size, it.quantity > 1 ? `×${it.quantity}` : null]
    .filter(Boolean).join(' ')
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <span style={{ fontSize: 13, color: MUTED }}>{label || '—'}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {it.revision_requested && <span style={{ fontSize: 11, color: '#e8c96e' }} title="Richiede modifiche">✎</span>}
        <OutcomeBadge outcome={outcome}/>
      </div>
    </div>
  )
}

// Riga compatta di un invio: cosa, quando, com'è finito.
// Usata nella scheda cliente e nella scheda prospect.
export default function SampleTimeline({ shipments, onOpen, onNew, emptyText = 'Nessuna campionatura registrata', compact = false }) {
  const list = [...(shipments || [])].sort((a, b) => (b.shipped_date || '').localeCompare(a.shipped_date || ''))

  const invested    = list.reduce((v, sh) => v + sampleInvested(sh), 0)
  const outstanding = list.reduce((v, sh) => v + sampleOutstanding(sh), 0)

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ ...s.cardTitle, marginBottom: 0 }}>Campionature ({list.length})</div>
        {onNew && (
          <button style={{ ...btnGoldStyle, padding: '4px 14px', fontSize: 9 }} onClick={onNew}>+ Registra invio</button>
        )}
      </div>

      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: MUTED, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
          {emptyText}
        </div>
      ) : (
        <>
          {!compact && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED }}>INVESTITO IN CAMPIONI</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: GOLD }}>{euro(invested, 2)}</div>
              </div>
              {outstanding > 0 && (
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED }}>DA RIENTRARE</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: CLAY }}>{euro(outstanding, 2)}</div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(sh => {
              const overdue  = returnOverdue(sh)
              const followUp = needsFollowUp(sh)
              const days     = daysSince(followUpBaseDate(sh))
              return (
                <div key={sh.id} onClick={onOpen ? () => onOpen(sh) : undefined}
                  style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 6,
                    borderLeft: `3px solid ${GOLD}`, cursor: onOpen ? 'pointer' : 'default' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: CREAM, letterSpacing: 0.5 }}>
                        {fmtDate(sh.shipped_date)}{sh.delivery_date ? ` → ${fmtDate(sh.delivery_date)}` : ''}
                      </span>
                      <PurposeBadge purpose={sh.purpose}/>
                      {isGift(sh) && <GiftBadge/>}
                      {overdue && <FollowUpBadge overdue/>}
                      {!overdue && followUp && <FollowUpBadge/>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                      <span style={{ fontSize: 13, color: MUTED }}>{samplePieces(sh)} pz</span>
                      <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: GOLD }}>
                        {euro(sampleCostValue(sh), 2)}
                      </span>
                    </div>
                  </div>

                  <div>
                    {(sh.items || []).map((it, i) => <ItemOutcomeRow key={it.id || i} it={it}/>)}
                  </div>

                  {(sh.carrier || sh.tracking) && (
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 5 }}>
                      Spedito con {sh.carrier || '—'}{sh.tracking ? ` · ${sh.tracking}` : ''}
                    </div>
                  )}

                  {sh.notes && (
                    <div style={{ fontSize: 13, color: CREAM, marginTop: 6, lineHeight: 1.6 }}>{sh.notes}</div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                    {returnPending(sh) && !overdue && (
                      <span style={{ fontSize: 12, color: '#e8c96e' }}>
                        Da rientrare{sh.return_due_date ? ` entro il ${fmtDate(sh.return_due_date)}` : ''}
                      </span>
                    )}
                    {overdue && (
                      <span style={{ fontSize: 12, color: CLAY }}>Scaduto il {fmtDate(sh.return_due_date)}</span>
                    )}
                    {sh.returned_date && (
                      <span style={{ fontSize: 12, color: GREEN }}>Rientrato il {fmtDate(sh.returned_date)}</span>
                    )}
                    {followUp && (
                      <span style={{ fontSize: 12, color: MUTED }}>Nessun esito da {days} giorni</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
