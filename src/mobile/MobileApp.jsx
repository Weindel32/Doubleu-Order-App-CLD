import { useState } from 'react'
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

const PRIMARY_TABS = [
  { key: 'home',      label: 'Home',       icon: 'home' },
  { key: 'orders',    label: 'Ordini',     icon: 'orders' },
  { key: 'quotes',    label: 'Prev.',      icon: 'quotes' },
  { key: 'clients',   label: 'Clienti',    icon: 'clients' },
  { key: 'analytics', label: 'Stats',      icon: 'analytics' },
]

const MORE_TABS = [
  { key: 'prospects', label: 'Prospect',   icon: 'prospects' },
  { key: 'samples',   label: 'Campioni',   icon: 'samples' },
]

export default function MobileApp({ orders, clients, prospects, onLogout, onUpsertClient, onUpsertProspect, onAddActivity, onUpdateActivity, onDeleteActivity, onDeleteProspect, onSetHibernated, shipments = [], onUpsertShipment, onDeleteShipment, onSampleItemOutcome, onMarkSampleReturned }) {
  const [tab, setTab]                   = useState('home')
  const [ordersFilter, setOrdersFilter] = useState('Attivi')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [moreOpen, setMoreOpen]         = useState(false)

  const isMoreTab = MORE_TABS.some(t => t.key === tab)
  const selectTab = (key) => { setTab(key); setMoreOpen(false) }

  const quotes = orders.filter(o => o.status === 'PREVENTIVO' && !o.lost)
  const activeOrders = orders.filter(o => o.status !== 'PREVENTIVO')

  const goToOrders = (filter) => { setOrdersFilter(filter); setTab('orders') }

  if (selectedOrder) return <MobileOrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
  if (selectedQuote) return <MobileQuoteDetail quote={selectedQuote} onBack={() => setSelectedQuote(null)} />

  return (
    <div style={{
      minHeight: '100vh', background: '#1a2744', color: CREAM,
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px 14px', borderBottom: `1px solid ${BORDER}`,
        background: 'rgba(10,18,40,0.97)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: CREAM, letterSpacing: 4, lineHeight: 1 }}>DOUBLEU</div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginTop: 4 }}>Order View</div>
        </div>
        <button onClick={onLogout} style={{
          background: 'rgba(196,98,58,0.1)', border: '1px solid rgba(196,98,58,0.3)',
          borderRadius: 4, color: CLAY, fontSize: 11, letterSpacing: 2,
          textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer',
          fontFamily: "'Josefin Sans', sans-serif",
        }}>Esci</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
        {tab === 'home'      && <MobileHome      orders={activeOrders} onSelectOrder={setSelectedOrder} onGoToOrders={goToOrders} />}
        {tab === 'orders'    && <MobileOrders    orders={activeOrders} onSelectOrder={setSelectedOrder} filter={ordersFilter} onFilterChange={setOrdersFilter} />}
        {tab === 'quotes'    && <MobileQuotes    quotes={quotes} onSelectQuote={setSelectedQuote} />}
        {tab === 'clients'   && <MobileClients   clients={clients} orders={orders} onSelectOrder={setSelectedOrder} onUpsertClient={onUpsertClient} />}
        {tab === 'prospects' && <MobileProspects prospects={prospects} onUpsert={onUpsertProspect} onAddActivity={onAddActivity} onUpdateActivity={onUpdateActivity} onDeleteActivity={onDeleteActivity} onDelete={onDeleteProspect} onSetHibernated={onSetHibernated} />}
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
                <span style={{ fontSize: 14, letterSpacing: 1 }}>{t.label}</span>
              </button>
            ))}
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
            <span style={{ fontSize: 9.5, letterSpacing: 0.5, textTransform: 'uppercase' }}>{t.label}</span>
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
          <span style={{ fontSize: 9.5, letterSpacing: 0.5, textTransform: 'uppercase' }}>Altro</span>
          {(moreOpen || isMoreTab) && (
            <span style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 56px)', width: 24, height: 2, background: GOLD, borderRadius: 1 }} />
          )}
        </button>
      </div>
    </div>
  )
}
