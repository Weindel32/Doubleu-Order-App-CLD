import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE, GREEN, ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { badgeStyle } from '../tokens.js'
import { getAllArticles, artPieceCount, orderSubtotal, orderIVA, orderTotal, paymentSummary, daysUntilDelivery } from '../utils/helpers.js'

function fmt(n) {
  return '€' + (parseFloat(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 12, marginTop: 24 }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value, valueColor, href }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 10,
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      marginBottom: 10,
    }}>
      <span style={{ fontSize: 11, color: '#a8b8d0', letterSpacing: 1, flexShrink: 0, marginRight: 12 }}>{label}</span>
      {href ? (
        <a href={href} style={{ fontSize: 14, color: valueColor || GOLD, textDecoration: 'none', textAlign: 'right' }}>{value}</a>
      ) : (
        <span style={{ fontSize: 14, color: valueColor || CREAM, textAlign: 'right', maxWidth: '65%' }}>{value}</span>
      )}
    </div>
  )
}

export default function MobileOrderDetail({ order, onBack }) {
  const articles = getAllArticles(order)
  const { total, paid, pending, residual } = paymentSummary(order)
  const days = daysUntilDelivery(order)
  const subtotal = orderSubtotal(order)
  const iva = orderIVA(order)
  const isOverdue = days !== null && days < 0 && order.status !== 'CONSEGNATO'
  const isUrgent = days !== null && days >= 0 && days <= (order.alertDays || 7) && order.status !== 'CONSEGNATO'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a2744',
      color: CREAM,
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Nav bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderBottom: `1px solid ${BORDER}`,
        background: 'rgba(10,18,40,0.97)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <button onClick={onBack} style={{
          background: 'none',
          border: 'none',
          color: GOLD,
          fontSize: 28,
          cursor: 'pointer',
          padding: '0 8px 0 0',
          lineHeight: 1,
          WebkitTapHighlightColor: 'transparent',
        }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.client}</div>
          <div style={{ fontSize: 9, color: GOLD, letterSpacing: 2 }}>{order.id}</div>
        </div>
        <span style={badgeStyle(order.status)}>{order.status}</span>
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>

        {/* Alert banner */}
        {(isOverdue || isUrgent) && (
          <div style={{
            background: 'rgba(196,98,58,0.12)',
            border: '1px solid rgba(196,98,58,0.35)',
            borderRadius: 8,
            padding: '12px 16px',
            marginTop: 16,
            fontSize: 11,
            color: CLAY,
            lineHeight: 1.4,
          }}>
            {isOverdue
              ? `Consegna scaduta di ${Math.abs(days)} giorni`
              : days === 0 ? 'Consegna prevista oggi'
              : `Consegna tra ${days} giorni`}
          </div>
        )}

        {/* Dettaglio ordine */}
        <SectionTitle>Dettaglio Ordine</SectionTitle>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px' }}>
          <InfoRow label="Data ordine" value={order.date} />
          <InfoRow
            label="Consegna"
            value={order.deliveryDate
              ? `${order.deliveryDate}${days !== null ? ` · ${days < 0 ? `-${Math.abs(days)}g` : `+${days}g`}` : ''}`
              : null}
            valueColor={isOverdue ? CLAY : isUrgent ? CLAY : undefined}
          />
          <InfoRow label="Tipo" value={order.orderType === 'istituzionale' ? 'Istituzionale' : 'Soci'} />
          <InfoRow label="Pezzi totali" value={order.pieces ? String(order.pieces) : null} />
          <InfoRow
            label="Prezzo"
            value={order.pricingMode === 'kit'
              ? `Kit · ${order.kitQuantity} giocatori`
              : 'Per pezzo'}
          />
        </div>

        {/* Contatto */}
        {(order.clientPhone || order.clientEmail || order.clientContact || order.clientCity) && (
          <>
            <SectionTitle>Contatto</SectionTitle>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px' }}>
              <InfoRow label="Referente" value={order.clientContact} />
              <InfoRow label="Telefono" value={order.clientPhone} href={order.clientPhone ? `tel:${order.clientPhone}` : undefined} />
              <InfoRow label="Email" value={order.clientEmail} href={order.clientEmail ? `mailto:${order.clientEmail}` : undefined} />
              {order.clientCity && <InfoRow label="Città" value={`${order.clientCity}${order.clientCountry && order.clientCountry !== 'Italia' ? `, ${order.clientCountry}` : ''}`} />}
            </div>
          </>
        )}

        {/* Articoli */}
        {articles.length > 0 && (
          <>
            <SectionTitle>Articoli · {articles.length} voci</SectionTitle>
            {articles.map((art, i) => (
              <div key={art.id || i} style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 8,
                opacity: art.delivered ? 0.55 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div style={{ fontSize: 13, color: CREAM }}>
                      {art.category}{art.line ? ` · ${art.line}` : ''}
                    </div>
                    {art.color && <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>{art.color}</div>}
                    {art.sp && <div style={{ fontSize: 9, color: MUTED, marginTop: 2, letterSpacing: 1 }}>{art.sp}</div>}
                    {art.notes && <div style={{ fontSize: 10, color: MUTED, marginTop: 4, fontStyle: 'italic' }}>{art.notes}</div>}
                    {(() => {
                      const adultEntries = ADULT_SIZES.filter(sz => (art.sizes?.adult?.[sz] || 0) > 0)
                      const kidsEntries  = KIDS_SIZES.filter(sz  => (art.sizes?.kids?.[sz]  || 0) > 0)
                      if (!adultEntries.length && !kidsEntries.length) return null
                      return (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {adultEntries.map(sz => (
                            <span key={sz} style={{
                              fontSize: 9, background: 'rgba(184,150,90,0.12)',
                              border: '1px solid rgba(184,150,90,0.28)',
                              borderRadius: 3, padding: '2px 6px', color: GOLD, letterSpacing: 0.5,
                            }}>{sz} · {art.sizes.adult[sz]}</span>
                          ))}
                          {kidsEntries.map(sz => (
                            <span key={`k${sz}`} style={{
                              fontSize: 9, background: 'rgba(138,154,181,0.1)',
                              border: '1px solid rgba(138,154,181,0.28)',
                              borderRadius: 3, padding: '2px 6px', color: MUTED, letterSpacing: 0.5,
                            }}>{sz} · {art.sizes.kids[sz]}</span>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: GOLD, lineHeight: 1 }}>{artPieceCount(art)}</div>
                    <div style={{ fontSize: 8, color: MUTED, letterSpacing: 1, marginTop: 2 }}>pezzi</div>
                  </div>
                </div>
                {art.delivered && (
                  <div style={{ marginTop: 8, fontSize: 9, color: GREEN, letterSpacing: 2, textTransform: 'uppercase' }}>✓ Consegnato</div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Riepilogo economico */}
        <SectionTitle>Riepilogo Economico</SectionTitle>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px', marginBottom: 8 }}>
          <InfoRow label="Subtotale" value={fmt(subtotal)} />
          {order.ivaEnabled && (
            <InfoRow label={`IVA ${order.ivaRate || 22}%`} value={fmt(iva)} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(184,150,90,0.2)', marginTop: 4 }}>
            <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: GOLD }}>Totale</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: GOLD }}>{fmt(total)}</span>
          </div>
        </div>

        {/* Pagamenti */}
        {(order.payments || []).length > 0 && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px', marginBottom: 8 }}>
            {(order.payments || []).map((p, i) => {
              const isLast = i === order.payments.length - 1
              return (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: isLast ? 0 : 12,
                  paddingBottom: isLast ? 0 : 12,
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: p.paid ? GREEN : MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {p.paid ? '✓' : '○'} {p.type}
                    </div>
                    {p.date && <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{p.date}</div>}
                    {p.method && <div style={{ fontSize: 9, color: MUTED }}>{p.method}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, color: p.paid ? GREEN : CREAM, fontFamily: "'Cormorant Garamond', serif" }}>
                      {fmt(parseFloat(p.amount) || 0)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 10, color: GREEN }}>Pagato: {fmt(paid)}</span>
              {pending > 0 && <span style={{ fontSize: 10, color: GOLD }}>Atteso: {fmt(pending)}</span>}
              {residual > 0 && <span style={{ fontSize: 10, color: CLAY }}>Residuo: {fmt(residual)}</span>}
            </div>
          </div>
        )}

        {/* Note */}
        {order.notes && (
          <>
            <SectionTitle>Note</SectionTitle>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px', fontSize: 12, color: CREAM, lineHeight: 1.65 }}>
              {order.notes}
            </div>
          </>
        )}

        {order.productionNotes && (
          <>
            <SectionTitle>Note Produzione</SectionTitle>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px', fontSize: 12, color: CREAM, lineHeight: 1.65 }}>
              {order.productionNotes}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
