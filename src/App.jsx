import { useState, useEffect } from 'react'
import { GOLD, MUTED, BORDER, CLAY } from './tokens.js'
import { s } from './tokens.js'
import Dashboard from './pages/Dashboard.jsx'
import Orders    from './pages/Orders.jsx'
import Clients   from './pages/Clients.jsx'
import NewOrder  from './pages/NewOrder.jsx'
import Analytics from './pages/Analytics.jsx'
import Login     from './pages/Login.jsx'
import { fetchOrders, deleteOrder } from './lib/dataService.js'
import { needsAlert } from './utils/helpers.js'
import { supabase } from './lib/supabase.js'

function Sidebar({ view, setView, orders, onLogout }) {
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
        <div style={s.logoSub}>Order App · v11</div>
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
        <div style={{ fontSize: 11, color: GOLD, marginTop: 4 }}>v11 · Supabase</div>
        <button onClick={onLogout} style={{ marginTop: 16, width: '100%', padding: '8px', background: 'rgba(196,98,58,0.1)', border: `1px solid rgba(196,98,58,0.3)`, borderRadius: 4, color: CLAY, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif" }}>
          Esci
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView]               = useState('dashboard')
  const [editOrder, setEditOrder]     = useState(null)
  const [prefillClient, setPrefill]   = useState(null)
  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [session, setSession]         = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session); setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) loadOrders() }, [session])

  const loadOrders = async () => {
    setLoading(true)
    const data = await fetchOrders()
    setOrders(data)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setOrders([]); setView('dashboard')
  }

  const [ordersFilter, setOrdersFilter] = useState('Tutti')

  const navigate  = (v) => { if (v === 'orders') setOrdersFilter('Tutti'); setView(v); window.scrollTo(0, 0) }
  const goToOrder = (order) => { setEditOrder(order); setPrefill(null); navigate('new') }
  const navigateToOrders = (filter) => { setOrdersFilter(filter); setView('orders'); window.scrollTo(0, 0) }

  // New order from client profile — prefill client data
  const handleNewOrderFromClient = (clientData) => {
    setEditOrder(null)
    setPrefill(clientData)
    navigate('new')
  }

  const handleDelete = async (orderId) => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return
    const ok = await deleteOrder(orderId)
    if (ok) setOrders(orders.filter(o => o.id !== orderId))
  }

  const handleSaved        = () => { loadOrders(); navigate('orders') }
  const handleOrdersChange = (newOrders) => setOrders(newOrders)

  if (authLoading) {
    return (
      <div style={{ minHeight:'100vh', background:'#1a2744', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, color:GOLD, letterSpacing:6, marginBottom:16 }}>DOUBLEU</div>
          <div style={{ fontSize:10, letterSpacing:3, color:MUTED }}>CARICAMENTO...</div>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  if (loading) {
    return (
      <div style={{ ...s.app, alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, color:GOLD, letterSpacing:6, marginBottom:16 }}>DOUBLEU</div>
          <div style={{ fontSize:10, letterSpacing:3, color:MUTED }}>CARICAMENTO ORDINI...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.app}>
      <Sidebar view={view} setView={navigate} orders={orders} onLogout={handleLogout}/>
      <main style={s.main}>
        {view==='dashboard' && <Dashboard orders={orders} setView={navigate} setEditOrder={goToOrder} onDelete={handleDelete} onOrdersChange={handleOrdersChange} navigateToOrders={navigateToOrders}/>}
        {view==='orders'    && <Orders    orders={orders} setView={navigate} setEditOrder={goToOrder} onDelete={handleDelete} onOrdersChange={handleOrdersChange} initialFilter={ordersFilter}/>}
        {view==='clients'   && <Clients   orders={orders} setView={navigate} setEditOrder={goToOrder} onNewOrderFromClient={handleNewOrderFromClient}/>}
        {view==='analytics' && <Analytics orders={orders}/>}
        {view==='new'       && <NewOrder  editOrder={editOrder} prefillClient={prefillClient} setView={navigate} onSaved={handleSaved}/>}
      </main>
    </div>
  )
}
