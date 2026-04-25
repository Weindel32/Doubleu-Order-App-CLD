import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER } from '../tokens.js'
import MobileHome from './MobileHome.jsx'
import MobileOrders from './MobileOrders.jsx'
import MobileClients from './MobileClients.jsx'
import MobileOrderDetail from './MobileOrderDetail.jsx'

const TABS = [
  { key: 'home',    label: 'Home',    icon: '◈' },
  { key: 'orders',  label: 'Ordini',  icon: '≡' },
  { key: 'clients', label: 'Clienti', icon: '◎' },
]

export default function MobileApp({ orders, clients, onLogout, onUpsertClient }) {
  const [tab, setTab] = useState('home')
  const [ordersFilter, setOrdersFilter] = useState('Attivi')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const goToOrders = (filter) => {
    setOrdersFilter(filter)
    setTab('orders')
  }

  if (selectedOrder) {
    return <MobileOrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a2744',
      color: CREAM,
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: `1px solid ${BORDER}`,
        background: 'rgba(10,18,40,0.97)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: CREAM, letterSpacing: 4, lineHeight: 1 }}>DOUBLEU</div>
          <div style={{ fontSize: 8, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginTop: 4 }}>Order View</div>
        </div>
        <button onClick={onLogout} style={{
          background: 'rgba(196,98,58,0.1)',
          border: '1px solid rgba(196,98,58,0.3)',
          borderRadius: 4,
          color: CLAY,
          fontSize: 9,
          letterSpacing: 2,
          textTransform: 'uppercase',
          padding: '8px 14px',
          cursor: 'pointer',
          fontFamily: "'Josefin Sans', sans-serif",
        }}>Esci</button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
      }}>
        {tab === 'home'    && <MobileHome    orders={orders} onSelectOrder={setSelectedOrder} onGoToOrders={goToOrders} />}
        {tab === 'orders'  && <MobileOrders  orders={orders} onSelectOrder={setSelectedOrder} filter={ordersFilter} onFilterChange={setOrdersFilter} />}
        {tab === 'clients' && <MobileClients clients={clients} orders={orders} onSelectOrder={setSelectedOrder} onUpsertClient={onUpsertClient} />}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(60px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(10,18,40,0.97)',
        borderTop: `1px solid ${BORDER}`,
        display: 'flex',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 30,
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1,
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            cursor: 'pointer',
            color: tab === t.key ? GOLD : MUTED,
            transition: 'color 0.2s',
            padding: '8px 0 4px',
            fontFamily: "'Josefin Sans', sans-serif",
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>{t.label}</span>
            {tab === t.key && (
              <span style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 56px)', width: 24, height: 2, background: GOLD, borderRadius: 1 }} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
