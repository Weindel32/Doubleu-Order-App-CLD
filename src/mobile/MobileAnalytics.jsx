import { useState, useRef, useEffect } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE } from '../tokens.js'
import { orderTotal, getAllArticles, artPieceCount } from '../utils/helpers.js'

function fmt(n) {
  return '€' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </div>
  )
}

function MonthlyChart({ monthlyByYear }) {
  const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
  const [tooltip, setTooltip] = useState(null)
  const containerRef = useRef(null)
  const hideTimer = useRef(null)

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])

  const years = Object.keys(monthlyByYear).map(Number).sort()
  if (years.length === 0) return null

  const maxVal = Math.max(...years.flatMap(y => monthlyByYear[y]), 1)
  const BAR_H = 100

  const PALETTE = [
    { bar: 'rgba(90,140,210,0.75)', dot: '#5a8cd2', opacity: 1 },
    { bar: '#4db8c8',               dot: '#4db8c8', opacity: 0.9 },
    { bar: `linear-gradient(180deg,${CLAY},${GOLD})`, dot: GOLD, opacity: 1 },
  ]
  const getStyle = (year) => PALETTE[Math.max(0, PALETTE.length - years.length + years.indexOf(year))]
  const barW = years.length === 1 ? 14 : years.length === 2 ? 9 : 7

  const showTip = (e, text) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (!containerRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cRect = containerRef.current.getBoundingClientRect()
    setTooltip({ x: rect.left - cRect.left + rect.width / 2, y: rect.top - cRect.top, text })
  }
  const hideTip = () => setTooltip(null)
  const handleTap = (e, text) => {
    if (tooltip?.text === text) { hideTip(); return }
    showTip(e, text)
    hideTimer.current = setTimeout(() => setTooltip(null), 2500)
  }

  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px', marginBottom: 20, position: 'relative' }} ref={containerRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase' }}>Fatturato Mensile</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {years.map(year => {
            const st = getStyle(year)
            return (
              <span key={year} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: MUTED, letterSpacing: 2 }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 1, background: st.dot }} />
                {year}
              </span>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 4 }}>
        {MONTHS.map((m, i) => {
          const hasData = years.some(y => monthlyByYear[y][i] > 0)
          const tipLines = [m]
          years.forEach(y => { const v = monthlyByYear[y][i]; if (v > 0) tipLines.push(`${y}: € ${v.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`) })
          return (
            <div
              key={m}
              role="button"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: hasData ? 'pointer' : 'default' }}
              onClick={e => { if (hasData) handleTap(e, tipLines.join('\n')) }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: years.length > 1 ? 1 : 0, height: BAR_H }}>
                {years.map(year => {
                  const val = monthlyByYear[year][i]
                  const h = val > 0 ? Math.max(Math.round((val / maxVal) * BAR_H), 3) : 1
                  const st = getStyle(year)
                  return (
                    <div
                      key={year}
                      onMouseEnter={e => { if (val > 0) showTip(e, `${year}: € ${val.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`) }}
                      onMouseLeave={hideTip}
                      style={{
                        width: barW, height: h,
                        background: val > 0 ? st.bar : 'rgba(255,255,255,0.05)',
                        opacity: val > 0 ? st.opacity : 1,
                        borderRadius: '2px 2px 0 0', alignSelf: 'flex-end', transition: 'height 0.5s',
                      }}
                    />
                  )
                })}
              </div>
              <span style={{ fontSize: 7, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' }}>{m}</span>
            </div>
          )
        })}
      </div>
      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x, top: Math.max(tooltip.y - 48, 8),
          transform: 'translateX(-50%)', background: 'rgba(10,18,40,0.95)',
          border: `1px solid ${BORDER}`, borderRadius: 4, padding: '6px 12px',
          fontSize: 11, color: CREAM, letterSpacing: 0.5, whiteSpace: 'pre',
          lineHeight: 1.7, pointerEvents: 'none', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}

export default function MobileAnalytics({ orders }) {
  const confirmed = orders.filter(o => o.status !== 'PREVENTIVO')

  const monthlyByYear = {}
  confirmed.forEach(o => {
    if (!o.date) return
    const parts = o.date.split('/')
    if (parts.length < 3) return
    const month = parseInt(parts[1]) - 1
    const year = parseInt(parts[2])
    if (month < 0 || month > 11 || isNaN(year) || year < 2000 || year > 2100) return
    if (!monthlyByYear[year]) monthlyByYear[year] = Array(12).fill(0)
    monthlyByYear[year][month] += orderTotal(o)
  })

  const currentYear = new Date().getFullYear()
  const currentYearRevenue = (monthlyByYear[currentYear] || []).reduce((s, v) => s + v, 0)

  const currentYearOrders = confirmed.filter(o => {
    if (!o.date) return false
    const parts = o.date.split('/')
    return parts.length >= 3 && parseInt(parts[2]) === currentYear
  })
  const currentYearTotal = currentYearOrders.reduce((s, o) => s + orderTotal(o), 0)
  const istituzionale = currentYearOrders.filter(o => o.orderType !== 'soci').reduce((s, o) => s + orderTotal(o), 0)
  const sociShop = currentYearOrders.filter(o => o.orderType === 'soci').reduce((s, o) => s + orderTotal(o), 0)
  const pctIst = currentYearTotal > 0 ? Math.round(istituzionale / currentYearTotal * 100) : 0
  const pctSoci = currentYearTotal > 0 ? Math.round(sociShop / currentYearTotal * 100) : 0

  const totalPieces = confirmed.reduce((sum, o) => sum + getAllArticles(o).reduce((s, a) => s + artPieceCount(a), 0), 0)

  const byClient = {}
  confirmed.forEach(o => { byClient[o.client] = (byClient[o.client] || 0) + orderTotal(o) })
  const topClients = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const maxClientVal = topClients[0]?.[1] || 1

  if (orders.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: MUTED, marginBottom: 8 }}>Nessun dato ancora</div>
        <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1 }}>I grafici appariranno una volta inseriti gli ordini</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Fatturato {currentYear}</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: GOLD, lineHeight: 1 }}>{fmt(currentYearRevenue)}</div>
        </div>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Pezzi Prodotti</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: CREAM, lineHeight: 1 }}>{totalPieces}</div>
        </div>
      </div>

      {/* Monthly chart */}
      <MonthlyChart monthlyByYear={monthlyByYear} />

      {/* Split istituzionale / soci */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Split Ordini {currentYear}</SectionTitle>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, padding: '16px', borderRight: `1px solid rgba(184,150,90,0.12)` }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Istituzionale</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: GOLD }}>{fmt(istituzionale)}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{pctIst}%</div>
            </div>
            <div style={{ flex: 1, padding: '16px' }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Soci / Shop</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: CLAY }}>{fmt(sociShop)}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{pctSoci}%</div>
            </div>
          </div>
          <div style={{ height: 3, display: 'flex' }}>
            <div style={{ width: `${pctIst}%`, background: GOLD, transition: 'width 0.6s' }} />
            <div style={{ flex: 1, background: CLAY }} />
          </div>
        </div>
      </div>

      {/* Top clienti */}
      {topClients.length > 0 && (
        <div>
          <SectionTitle>Top Clienti</SectionTitle>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
            {topClients.map(([name, val], i) => (
              <div key={name} style={{
                padding: '12px 16px',
                borderBottom: i < topClients.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: CREAM }}>{name}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: GOLD }}>{fmt(val)}</div>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((val / maxClientVal) * 100)}%`, background: `linear-gradient(90deg,${GOLD},${CLAY})`, borderRadius: 2, transition: 'width 0.6s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
