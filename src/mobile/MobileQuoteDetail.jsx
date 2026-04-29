import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE } from '../tokens.js'
import { orderSubtotal, orderIVA, orderTotal } from '../utils/helpers.js'
import { generateQuotePDF } from '../utils/pdfQuote.js'

function fmt(n) {
  return '€ ' + (parseFloat(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
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
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 10,
    }}>
      <span style={{ fontSize: 10, color: MUTED, letterSpacing: 1, flexShrink: 0, marginRight: 12 }}>{label}</span>
      {href
        ? <a href={href} style={{ fontSize: 12, color: valueColor || GOLD, textDecoration: 'none', textAlign: 'right' }}>{value}</a>
        : <span style={{ fontSize: 12, color: valueColor || CREAM, textAlign: 'right', maxWidth: '65%' }}>{value}</span>
      }
    </div>
  )
}

export default function MobileQuoteDetail({ quote, onBack }) {
  const subtotal    = orderSubtotal(quote)
  const iva         = orderIVA(quote)
  const total       = orderTotal(quote)
  const allArticles = (quote.kits || []).flatMap(k => k.articles || [])

  const openPDF = () => {
    const h = generateQuotePDF(quote)
    const w = window.open('', '_blank')
    if (!w) { alert('Abilita i popup per visualizzare il PDF.'); return }
    w.document.write(h)
    w.document.close()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a2744', color: CREAM, paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
        background: 'rgba(10,18,40,0.97)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: GOLD, fontSize: 28,
          cursor: 'pointer', padding: '0 8px 0 0', lineHeight: 1,
          WebkitTapHighlightColor: 'transparent',
        }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {quote.client}
          </div>
          <div style={{ fontSize: 9, color: GOLD, letterSpacing: 2 }}>{quote.id}</div>
        </div>
        <span style={{
          fontSize: 8, letterSpacing: 2, color: CLAY,
          border: '1px solid rgba(196,98,58,0.4)',
          background: 'rgba(196,98,58,0.1)',
          padding: '4px 8px', borderRadius: 3, flexShrink: 0,
        }}>PREVENTIVO</span>
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

        {/* Dati */}
        <SectionTitle>Dati Preventivo</SectionTitle>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px' }}>
          <InfoRow label="Data" value={quote.date} />
          <InfoRow label="Modalità" value={quote.pricingMode === 'kit' ? 'Prezzo per Kit' : 'Articolo Singolo'} />
          {quote.pricingMode === 'kit' && <InfoRow label="Kit" value={String(quote.kits?.length || 0)} />}
          <InfoRow label="Articoli" value={String(allArticles.length)} />
        </div>

        {/* Contatto */}
        {(quote.clientContact || quote.clientPhone || quote.clientEmail || quote.clientCity) && (
          <>
            <SectionTitle>Contatto</SectionTitle>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px' }}>
              <InfoRow label="Referente" value={quote.clientContact} />
              <InfoRow label="Telefono"  value={quote.clientPhone}   href={quote.clientPhone  ? `tel:${quote.clientPhone}`      : undefined} />
              <InfoRow label="Email"     value={quote.clientEmail}   href={quote.clientEmail  ? `mailto:${quote.clientEmail}`   : undefined} />
              {quote.clientCity && (
                <InfoRow label="Città" value={`${quote.clientCity}${quote.clientCountry && quote.clientCountry !== 'Italia' ? `, ${quote.clientCountry}` : ''}`} />
              )}
            </div>
          </>
        )}

        {/* Kit (modalità kit) */}
        {quote.pricingMode === 'kit' && (
          <>
            <SectionTitle>Kit · {quote.kits?.length || 0} tipologie</SectionTitle>
            {(quote.kits || []).map((kit, ki) => {
              const qty     = parseInt(kit.quantity) || 0
              const kitTotal = (parseFloat(kit.price) || 0) * qty
              return (
                <div key={ki} style={{
                  background: SURFACE, border: `1px solid ${BORDER}`,
                  borderRadius: 10, padding: '14px 16px', marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: CREAM }}>
                      {kit.name || `Kit ${ki + 1}`}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: GOLD }}>{fmt(kitTotal)}</div>
                      {qty > 0 && <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>€ {kit.price} × {qty} pers.</div>}
                    </div>
                  </div>
                  {(kit.articles || []).map((art, ai) => (
                    <div key={ai} style={{
                      fontSize: 10, color: MUTED,
                      paddingTop: 6, marginTop: 4,
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {art.description}{art.color ? ` · ${art.color}` : ''}
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )}

        {/* Articoli (modalità singolo) */}
        {quote.pricingMode !== 'kit' && allArticles.length > 0 && (
          <>
            <SectionTitle>Articoli · {allArticles.length} voci</SectionTitle>
            {allArticles.map((art, i) => {
              const qty     = parseInt(art.estimatedQty) || 0
              const artTotal = (parseFloat(art.price) || 0) * qty
              return (
                <div key={i} style={{
                  background: SURFACE, border: `1px solid ${BORDER}`,
                  borderRadius: 10, padding: '14px 16px', marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, marginRight: 12 }}>
                      <div style={{ fontSize: 13, color: CREAM }}>{art.description}</div>
                      {art.color && <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>{art.color}</div>}
                      {art.sp    && <div style={{ fontSize: 9,  color: MUTED, marginTop: 2, letterSpacing: 1 }}>{art.sp}</div>}
                      {art.notes && <div style={{ fontSize: 10, color: MUTED, marginTop: 4, fontStyle: 'italic' }}>{art.notes}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {artTotal > 0
                        ? <>
                            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: GOLD }}>{fmt(artTotal)}</div>
                            <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>€ {art.price} × {qty} pz</div>
                          </>
                        : art.price
                          ? <div style={{ fontSize: 13, color: GOLD }}>€ {art.price} / pz</div>
                          : null
                      }
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Importi */}
        <SectionTitle>Importi</SectionTitle>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px' }}>
          {quote.pricingMode === 'kit' && (quote.kits || []).map((kit, ki) => {
            const qty      = parseInt(kit.quantity) || 0
            const kitTotal = (parseFloat(kit.price) || 0) * qty
            return (
              <div key={ki} style={{
                display: 'flex', justifyContent: 'space-between',
                paddingBottom: 8, marginBottom: 8,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{ fontSize: 10, color: MUTED }}>{kit.name || `Kit ${ki + 1}`}</span>
                <span style={{ fontSize: 12, color: CREAM }}>{fmt(kitTotal)}</span>
              </div>
            )
          })}
          <InfoRow label="Subtotale" value={fmt(subtotal)} />
          {quote.ivaEnabled && <InfoRow label={`IVA ${quote.ivaRate || 22}%`} value={fmt(iva)} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(184,150,90,0.2)', marginTop: 4 }}>
            <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: GOLD }}>Totale Preventivo</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: GOLD }}>{fmt(total)}</span>
          </div>
        </div>

        {/* Note */}
        {quote.notes && (
          <>
            <SectionTitle>Note</SectionTitle>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px', fontSize: 12, color: CREAM, lineHeight: 1.65 }}>
              {quote.notes}
            </div>
          </>
        )}
      </div>

      {/* PDF Button fisso in basso */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: `12px 16px env(safe-area-inset-bottom)`,
        background: 'rgba(10,18,40,0.97)',
        borderTop: `1px solid ${BORDER}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <button onClick={openPDF} style={{
          width: '100%', padding: '14px',
          background: 'rgba(196,98,58,0.12)',
          border: '1px solid rgba(196,98,58,0.4)',
          borderRadius: 8, color: CLAY,
          fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif",
          WebkitTapHighlightColor: 'transparent',
        }}>
          ↓ Apri PDF Preventivo
        </button>
      </div>
    </div>
  )
}
