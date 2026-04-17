import { useState, useEffect } from 'react'
import { GOLD, MUTED, BORDER, CLAY } from './tokens.js'
import { s } from './tokens.js'
import Dashboard from './pages/Dashboard.jsx'
import Orders    from './pages/Orders.jsx'
import Clients   from './pages/Clients.jsx'
import NewOrder  from './pages/NewOrder.jsx'
import Analytics from './pages/Analytics.jsx'
import { fetchOrders, deleteOrder } from './lib/dataService.js'
import { needsAlert } from './utils/helpers.js'

function Sidebar({ view, setView, orders }) {
  const alertCount   = orders.filter(o => needsAlert(o)).length
  const pendingCount = orders.filter(o =>
    o.status !== 'PREVENTIVO' && (o.payments || []).some(p => !p.paid)
  ).length

  const items = [
    { key: 'dashboard', label: 'Dashboard',      icon: '◈', badge: alertCount > 0 ? alertCount : null },
    { key: 'orders',    label: 'Archivio Ordini', icon: '≡', badge: pendingCount > 0 ? pendingCount : null },
    { key: 'clients',   label: 'Clienti',         icon: '◎' },
    { key: 'analytics', label: 'Analytics',       icon: '◉' },
    { key: 'new',       label: '+ Nuovo Ordine',  icon: '+' },
  ]

  return (
    <div style={s.sidebar}>
      <div style={s.logo}>
        <div style={s.logoMark}>DOUBLEU</div>
        <div style={s.logoSub}>Order App · v8</div>
      </div>
      <nav style={{ marginTop: 16 }}>
        {items.map(item => (
          <div key={item.key} style={s.navItem(view === item.key)}
            onClick={() => setView(item.key)} role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setView(item.key)}>
            <span style={{ fontSize: 13, opacity: 0.6 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span style={{ background: CLAY, color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', padding: '0 24px', borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED }}>BUILD</div>
        <div style={{ fontSize: 11, color: GOLD, marginTop: 4 }}>v8 · Supabase</div>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView]           = useState('dashboard')
  const [editOrder, setEditOrder] = useState(null)
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    setLoading(true)
    const data = await fetchOrders()
    setOrders(data)
    setLoading(false)
  }

  const navigate  = (v) => { setView(v); window.scrollTo(0, 0) }
  const goToOrder = (order) => { setEditOrder(order); navigate('new') }

  const handleDelete = async (orderId) => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return
    const ok = await deleteOrder(orderId)
    if (ok) setOrders(orders.filter(o => o.id !== orderId))
  }

  const handleSaved = () => { loadOrders(); navigate('orders') }

  // For optimistic local updates (status, payments)
  const handleOrdersChange = (newOrders) => setOrders(newOrders)

  if (loading) {
    return (
      <div style={{ ...s.app, alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: GOLD, letterSpacing: 6, marginBottom: 16 }}>DOUBLEU</div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: MUTED }}>CARICAMENTO...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.app}>
      <Sidebar view={view} setView={navigate} orders={orders} />
      <main style={s.main}>
        {view === 'dashboard' && <Dashboard orders={orders} setView={navigate} setEditOrder={goToOrder} onDelete={handleDelete} onOrdersChange={handleOrdersChange} />}
        {view === 'orders'    && <Orders    orders={orders} setView={navigate} setEditOrder={goToOrder} onDelete={handleDelete} onOrdersChange={handleOrdersChange} />}
        {view === 'clients'   && <Clients   orders={orders} />}
        {view === 'analytics' && <Analytics orders={orders} />}
        {view === 'new'       && <NewOrder  editOrder={editOrder} setView={navigate} onSaved={handleSaved} />}
      </main>
    </div>
  )
}
