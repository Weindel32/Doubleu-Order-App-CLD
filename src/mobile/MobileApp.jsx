import { useState, useEffect } from 'react'
import { fetchOrderForms } from '../lib/orderForms.js'
import { GOLD, MUTED, CREAM, CLAY, BORDER } from '../tokens.js'
import MobileHome        from './MobileHome.jsx'
import MobileOrders      from './MobileOrders.jsx'
import MobileClients     from './MobileClients.jsx'
import MobileOrderDetail from './MobileOrderDetail.jsx'
import MobileAnalytics   from './MobileAnalytics.jsx'
import MobileQuotes      from './MobileQuotes.jsx'
import MobileQuoteDetail from './MobileQuoteDetail.jsx'
import MobileProspects   from './MobileProspects.jsx'
import MobileSamples     from './MobileSamples.jsx'
import NavIcon           from '../components/NavIcon.jsx'

// Cinque schede in basso, come vuole iOS. Statistiche, Prospect, Campioni
// e account stanno in "Altro".
const PRIMARY_TABS = [
  { key: 'home',      label: 'Home',       icon: 'home' },
  { key: 'orders',    label: 'Ordini',     icon: 'orders' },
  { key: 'quotes',    label: 'Preventivi', icon: 'quotes' },
  { key: 'clients',   label: 'Clienti',    icon: 'clients' },
]

const MORE_TABS = [
  { key: 'analytics', label: 'Statistiche', icon: 'analytics' },
  { key: 'prospects', label: 'Prospect',    icon: 'prospects' },
  { key: 'samples',   label: 'Campioni',    icon: 'samples' },
]

// Titolo della pagina nella testata (in Home il marchio).
const TITLES = { orders: 'Ordini', quotes: 'Preventivi', clients: 'Clienti', analytics: 'Statistiche', prospects: 'Prospect', samples: 'Campionature' }

export default function MobileApp({ orders, onSaveNegotiation, onOrderUpdated, clients, prospects, onLogout, onChangePassword, onUpsertClient, onUpsertProspect, onAddActivity, onSaveActivity, onDeleteActivity, onDeleteProspect, onSetHibernated, shipments = [], onUpsertShipment, onDeleteShipment, onSampleItemOutcome, onMarkSampleReturned }) {
  const [tab, setTab]                   = useState('home')
  const [ordersFilter, setOrdersFilter] = useState('Attivi')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [moreOpen, setMoreOpen]         = useState(false)
  // Moduli taglie per ordine (il piu' recente), per la lista "Da fare" in Home.
  const [forms, setForms]               = useState({})
  useEffect(() => {
    fetchOrderForms().then(rows => {
      if (!rows) return
      const map = {}
      for (const f of rows) if (!map[f.order_id]) map[f.order_id] = f
      setForms(map)
    })
  }, [])

  // Testata grande in cima alla pagina, compatta quando si scorre.
  const [scrolled, setScrolled]         = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isMoreTab = MORE_TABS.some(t => t.key === tab)
  const selectTab = (key) => { setTab(key); setMoreOpen(false); window.scrollTo(0, 0) }

  const quotes = orders.filter(o => o.status === 'PREVENTIVO' && !o.lost)
  const activeOrders = orders.filter(o => o.status !== 'PREVENTIVO')

  const goToOrders = (filter) => { setOrdersFilter(filter); setTab('orders') }

  if (selectedOrder) return <MobileOrderDetail order={orders.find(o => o.id === selectedOrder.id) || selectedOrder} onBack={() => setSelectedOrder(null)} onOrderUpdated={onOrderUpdated} />
  if (selectedQuote) return <MobileQuoteDetail quote={orders.find(o => o.id === selectedQuote.id) || selectedQuote} onBack={() => setSelectedQuote(null)} onSaveNegotiation={onSaveNegotiation} />

  return (
    <div style={{
      minHeight: '100vh', background: '#1a2744', color: CREAM,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header: titolo della pagina, si riduce quando si scorre */}
      <div style={{
        // Lo spazio sotto ora e Dynamic Island sta nella testata fissa: scorrendo
        // il contenuto non ci finisce sotto.
        padding: scrolled ? '10px 20px' : '16px 20px 14px',
        paddingTop: `calc(${scrolled ? 10 : 16}px + env(safe-area-inset-top))`, borderBottom: `1px solid ${scrolled ? BORDER : 'transparent'}`,
        background: 'rgba(10,18,40,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 20, transition: 'padding 0.2s, border-color 0.2s',
      }}>
        {tab === 'home' ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: scrolled ? 22 : 28, fontWeight: 600, color: CREAM, letterSpacing: 4, lineHeight: 1.1, transition: 'font-size 0.2s' }}>DOUBLEU</div>
            {!scrolled && <div style={{ fontSize: 12, letterSpacing: 2, color: GOLD, textTransform: 'uppercase' }}>Order View</div>}
          </div>
        ) : (
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: scrolled ? 22 : 32, color: CREAM, lineHeight: 1.1, transition: 'font-size 0.2s' }}>{TITLES[tab]}</div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
        {tab === 'home'      && <MobileHome      orders={activeOrders} allOrders={orders} forms={forms} shipments={shipments}
                                  clients={clients} prospects={prospects} onSelectOrder={setSelectedOrder}
                                  onSelectQuote={setSelectedQuote} onGoToOrders={goToOrders} onGoToTab={selectTab} />}
        {tab === 'orders'    && <MobileOrders    orders={activeOrders} onSelectOrder={setSelectedOrder} filter={ordersFilter} onFilterChange={setOrdersFilter} />}
        {tab === 'quotes'    && <MobileQuotes    quotes={quotes} onSelectQuote={setSelectedQuote} />}
        {tab === 'clients'   && <MobileClients   clients={clients} orders={orders} onSelectOrder={setSelectedOrder} onUpsertClient={onUpsertClient} />}
        {tab === 'prospects' && <MobileProspects prospects={prospects} onUpsert={onUpsertProspect} onAddActivity={onAddActivity} onSaveActivity={onSaveActivity} onDeleteActivity={onDeleteActivity} onDelete={onDeleteProspect} onSetHibernated={onSetHibernated} />}
        {tab === 'samples'   && <MobileSamples   shipments={shipments} clients={clients} prospects={prospects}
                                  onUpsert={onUpsertShipment} onDelete={onDeleteShipment}
                                  onItemOutcome={onSampleItemOutcome} onMarkReturned={onMarkSampleReturned} />}
        {tab === 'analytics' && <MobileAnalytics orders={orders} />}
      </div>

      {/* "Altro" bottom sheet */}
      {moreOpen && (
        <>
          <div onClick={() => setMoreOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(6,11,24,0.55)', zIndex: 35,
          }} />
          <div style={{
            position: 'fixed', left: 0, right: 0,
            bottom: 'calc(60px + env(safe-area-inset-bottom))',
            background: 'rgba(16,26,50,0.99)', borderTop: `1px solid ${BORDER}`,
            borderTopLeftRadius: 16, borderTopRightRadius: 16,
            padding: '10px 8px calc(10px + env(safe-area-inset-bottom))',
            zIndex: 36, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.35)',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: BORDER, margin: '2px auto 12px' }} />
            {MORE_TABS.map(t => (
              <button key={t.key} onClick={() => selectTab(t.key)} style={{
                width: '100%', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 14px', borderRadius: 10, cursor: 'pointer',
                color: tab === t.key ? GOLD : CREAM,
                fontFamily: "'Josefin Sans', sans-serif",
                WebkitTapHighlightColor: 'transparent',
              }}>
                <NavIcon name={t.icon} size={20}/>
                <span style={{ fontSize: 16, letterSpacing: 1 }}>{t.label}</span>
              </button>
            ))}
            <div style={{ height: 1, background: BORDER, margin: '6px 14px' }}/>
            {[
              { label: 'Cambia password', icon: 'key', color: CREAM, onClick: () => { setMoreOpen(false); onChangePassword() } },
              { label: 'Esci', icon: 'logout', color: CLAY, onClick: () => { setMoreOpen(false); onLogout() } },
            ].map(a => (
              <button key={a.label} onClick={a.onClick} style={{
                width: '100%', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 14px', borderRadius: 10, cursor: 'pointer', color: a.color,
                fontFamily: "'Josefin Sans', sans-serif", WebkitTapHighlightColor: 'transparent',
              }}>
                <NavIcon name={a.icon} size={20}/>
                <span style={{ fontSize: 16, letterSpacing: 1 }}>{a.label}</span>
              </button>
            ))}
            <div style={{ textAlign: 'center', fontSize: 12, letterSpacing: 1, color: MUTED, padding: '10px 0 2px' }}>
              Order App · v{__APP_VERSION__}
            </div>
          </div>
        </>
      )}

      {/* Bottom Tab Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'calc(60px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(10,18,40,0.97)', borderTop: `1px solid ${BORDER}`,
        display: 'flex', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 30,
      }}>
        {PRIMARY_TABS.map(t => (
          <button key={t.key} onClick={() => selectTab(t.key)} style={{
            flex: 1, background: 'none', border: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, cursor: 'pointer', color: tab === t.key ? GOLD : MUTED,
            transition: 'color 0.2s', padding: '8px 0 4px', position: 'relative',
            fontFamily: "'Josefin Sans', sans-serif",
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ lineHeight: 1, display: 'inline-flex' }}><NavIcon name={t.icon} size={20}/></span>
            <span style={{ fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>{t.label}</span>
            {tab === t.key && (
              <span style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 56px)', width: 24, height: 2, background: GOLD, borderRadius: 1 }} />
            )}
          </button>
        ))}
        <button onClick={() => setMoreOpen(o => !o)} style={{
          flex: 1, background: 'none', border: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 4, cursor: 'pointer', color: (moreOpen || isMoreTab) ? GOLD : MUTED,
          transition: 'color 0.2s', padding: '8px 0 4px', position: 'relative',
          fontFamily: "'Josefin Sans', sans-serif",
          WebkitTapHighlightColor: 'transparent',
        }}>
          <span style={{ lineHeight: 1, display: 'inline-flex' }}><NavIcon name="more" size={20}/></span>
          <span style={{ fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>Altro</span>
          {(moreOpen || isMoreTab) && (
            <span style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 56px)', width: 24, height: 2, background: GOLD, borderRadius: 1 }} />
          )}
        </button>
      </div>
    </div>
  )
}
