import { useState, useEffect } from 'react'
import MobileApp from './mobile/MobileApp.jsx'
import { GOLD, MUTED, BORDER, CLAY } from './tokens.js'
import { s } from './tokens.js'
import Dashboard from './pages/Dashboard.jsx'
import Orders    from './pages/Orders.jsx'
import Quotes    from './pages/Quotes.jsx'
import Clients    from './pages/Clients.jsx'
import Prospects  from './pages/Prospects.jsx'
import NavIcon    from './components/NavIcon.jsx'
import NewOrder  from './pages/NewOrder.jsx'
import NewQuote  from './pages/NewQuote.jsx'
import Analytics from './pages/Analytics.jsx'
import Login     from './pages/Login.jsx'
import { fetchOrders, deleteOrder, fetchClients, upsertClient, renameClient, updateClient, createClient, linkOrderToClient, fetchProspects, upsertProspect, addProspectActivity, updateProspectActivity, deleteProspectActivity, deleteProspect, markQuoteLost, restoreQuote } from './lib/dataService.js'
import { needsAlert } from './utils/helpers.js'
import { supabase } from './lib/supabase.js'

// Telefono: schermo stretto (portrait) oppure basso e non troppo largo (landscape)
const isPhoneViewport = () => window.innerWidth <= 480 || (window.innerHeight <= 480 && window.innerWidth <= 960)

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(isPhoneViewport)
  useEffect(() => {
    const check = () => setIsMobile(isPhoneViewport())
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function Sidebar({ view, setView, orders, onLogout }) {
  const alertCount   = orders.filter(o => needsAlert(o)).length
  const pendingCount = orders.filter(o =>
    o.status !== 'PREVENTIVO' && (o.payments || []).some(p => !p.paid)
  ).length
  const quoteCount   = orders.filter(o => o.status === 'PREVENTIVO' && !o.lost).length

  const items = [
    { key: 'dashboard',  label: 'Dashboard',          icon: 'dashboard', badge: alertCount > 0 ? alertCount : null },
    { key: 'quotes',     label: 'Preventivi',         icon: 'quotes',    badge: quoteCount > 0 ? quoteCount : null, badgeColor: CLAY },
    { key: 'orders',     label: 'Archivio Ordini',    icon: 'orders',    badge: pendingCount > 0 ? pendingCount : null },
    { key: 'clients',    label: 'Clienti',            icon: 'clients' },
    { key: 'prospects',  label: 'Prospects',          icon: 'prospects' },
    { key: 'analytics',  label: 'Analytics',          icon: 'analytics' },
    { key: 'newQuote',   label: '+ Nuovo Preventivo', icon: 'plus', accent: CLAY },
    { key: 'new',        label: '+ Nuovo Ordine',     icon: 'plus' },
  ]

  return (
    <div style={s.sidebar}>
      <div style={s.logo}>
        <div style={s.logoMark}>DOUBLEU</div>
        <div style={s.logoSub}>Order App · v17</div>
      </div>
      <nav style={{ marginTop: 16 }}>
        {items.map(item => (
          <div key={item.key} style={s.navItem(view === item.key)}
            onClick={() => setView(item.key)} role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setView(item.key)}>
            <span style={{ opacity: 0.65, color: item.accent || undefined, display: 'inline-flex' }}><NavIcon name={item.icon}/></span>
            <span style={{ flex: 1, color: item.accent && view !== item.key ? item.accent : undefined }}>{item.label}</span>
            {item.badge && (
              <span style={{ background: item.badgeColor || CLAY, color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', padding: '0 24px', borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED }}>BUILD</div>
        <div style={{ fontSize: 11, color: GOLD, marginTop: 4 }}>v17 · Supabase</div>
        <button onClick={onLogout} style={{ marginTop: 16, width: '100%', padding: '8px', background: 'rgba(196,98,58,0.1)', border: `1px solid rgba(196,98,58,0.3)`, borderRadius: 4, color: CLAY, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif" }}>
          Esci
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const isMobile = useIsMobile()
  const [view, setView]               = useState('dashboard')
  const [editOrder, setEditOrder]     = useState(null)
  const [prefillClient, setPrefill]   = useState(null)
  const [orders, setOrders]           = useState([])
  const [clients, setClients]         = useState([])
  const [prospects, setProspects]     = useState([])
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
    const [data, clientData, prospectData] = await Promise.all([fetchOrders(), fetchClients(), fetchProspects()])
    setOrders(data)
    setClients(clientData)
    setProspects(prospectData)
    setLoading(false)
  }

  const handleUpsertClient = async (name, fields) => {
    const ok = await upsertClient(name, fields)
    if (ok) {
      const clientData = await fetchClients()
      setClients(clientData)
    }
  }

  const handleRenameClient = async (oldName, newName, fields) => {
    const ok = await renameClient(oldName, newName, fields)
    if (ok) {
      const [ordersData, clientData] = await Promise.all([fetchOrders(), fetchClients()])
      setOrders(ordersData)
      setClients(clientData)
    }
    return ok
  }

  const handleUpdateClient = async (id, fields) => {
    const ok = await updateClient(id, fields)
    if (ok) { const clientData = await fetchClients(); setClients(clientData) }
    return ok
  }

  const handleCreateClient = async (fields) => {
    const row = await createClient(fields)
    if (row) { const clientData = await fetchClients(); setClients(clientData) }
    return row
  }

  const handleLinkOrder = async (orderId, clientId) => {
    const ok = await linkOrderToClient(orderId, clientId)
    if (ok) { await loadOrders() }
    return ok
  }

  const handleUpsertProspect = async (prospect) => {
    const result = await upsertProspect(prospect)
    if (result) {
      const [prospectData, clientData] = await Promise.all([fetchProspects(), fetchClients()])
      setProspects(prospectData)
      setClients(clientData)
    }
    return result
  }

  const handleAddActivity = async (prospectId, activity) => {
    const result = await addProspectActivity(prospectId, activity)
    if (result) { setProspects(await fetchProspects()) }
    return result
  }

  const handleDeleteProspect = async (prospectId) => {
    const ok = await deleteProspect(prospectId)
    if (ok) setProspects(await fetchProspects())
    return ok
  }

  const handleUpdateActivity = async (activityId, activity) => {
    const ok = await updateProspectActivity(activityId, activity)
    if (ok) setProspects(await fetchProspects())
    return ok
  }

  const handleDeleteActivity = async (activityId) => {
    const ok = await deleteProspectActivity(activityId)
    if (ok) setProspects(await fetchProspects())
    return ok
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setOrders([]); setView('dashboard')
  }

  const [ordersFilter, setOrdersFilter] = useState('Tutti')

  const navigate  = (v) => { if (v === 'orders') setOrdersFilter('Tutti'); setView(v); window.scrollTo(0, 0) }
  const goToOrder = (order) => { setEditOrder(order); setPrefill(null); navigate('new') }
  const goToQuote = (quote) => { setEditOrder(quote); setPrefill(null); navigate('newQuote') }
  const navigateToOrders = (filter) => { setOrdersFilter(filter); setView('orders'); window.scrollTo(0, 0) }

  const handleNewOrderFromClient = (clientData) => {
    setEditOrder(null)
    setPrefill(clientData)
    navigate('new')
  }

  const handleNewQuoteFromClient = (clientData) => {
    setEditOrder(null)
    setPrefill(clientData)
    navigate('newQuote')
  }

  const handleConvertToOrder = (quote) => {
    setEditOrder({ ...quote, status: 'CONFERMATO', convertedFromQuote: true, lost: false })
    setPrefill(null)
    navigate('new')
  }

  const handleDelete = async (orderId) => {
    if (!confirm('Sei sicuro di voler eliminare questo elemento?')) return
    const ok = await deleteOrder(orderId)
    if (ok) setOrders(orders.filter(o => o.id !== orderId))
  }

  const handleMarkQuoteLost = async (orderId, reason) => {
    const ok = await markQuoteLost(orderId, reason)
    if (ok) {
      const today = new Date().toLocaleDateString('it-IT')
      setOrders(orders.map(o => o.id === orderId ? { ...o, lost: true, lostReason: reason, lostDate: today } : o))
    }
  }

  const handleRestoreQuote = async (orderId) => {
    const ok = await restoreQuote(orderId)
    if (ok) setOrders(orders.map(o => o.id === orderId ? { ...o, lost: false, lostReason: '', lostDate: null } : o))
  }

  const handleSavedOrder = () => { loadOrders(); navigate('orders') }
  const handleSavedQuote = () => { loadOrders(); navigate('quotes') }
  const handleOrdersChange = (newOrders) => setOrders(newOrders)

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, color: GOLD, letterSpacing: 6, marginBottom: 16 }}>DOUBLEU</div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: MUTED }}>CARICAMENTO...</div>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  if (loading) {
    return (
      <div style={{ ...s.app, alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, color: GOLD, letterSpacing: 6, marginBottom: 16 }}>DOUBLEU</div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: MUTED }}>CARICAMENTO ORDINI...</div>
        </div>
      </div>
    )
  }

  if (isMobile) {
    return <MobileApp orders={orders} clients={clients} prospects={prospects}
      onLogout={handleLogout} onUpsertClient={handleUpsertClient}
      onUpsertProspect={handleUpsertProspect} onAddActivity={handleAddActivity}
      onUpdateActivity={handleUpdateActivity} onDeleteActivity={handleDeleteActivity}
      onDeleteProspect={handleDeleteProspect} />
  }

  return (
    <div style={s.app}>
      <Sidebar view={view} setView={navigate} orders={orders} onLogout={handleLogout}/>
      <main style={s.main}>
        {view === 'dashboard'  && <Dashboard orders={orders} setView={navigate} setEditOrder={goToOrder} onDelete={handleDelete} onOrdersChange={handleOrdersChange} navigateToOrders={navigateToOrders} onNavigateToQuotes={() => navigate('quotes')}/>}
        {view === 'quotes'     && <Quotes    orders={orders} setView={navigate} setEditOrder={goToQuote} onDelete={handleDelete} onOrdersChange={handleOrdersChange} onConvertToOrder={handleConvertToOrder} onMarkLost={handleMarkQuoteLost} onRestoreQuote={handleRestoreQuote}/>}
        {view === 'orders'     && <Orders    orders={orders} setView={navigate} setEditOrder={goToOrder} onDelete={handleDelete} onOrdersChange={handleOrdersChange} initialFilter={ordersFilter}/>}
        {view === 'clients'    && <Clients   orders={orders} clients={clients} setView={navigate} setEditOrder={goToOrder} onNewOrderFromClient={handleNewOrderFromClient} onNewQuoteFromClient={handleNewQuoteFromClient} onUpsertClient={handleUpsertClient} onRenameClient={handleRenameClient} onUpdateClient={handleUpdateClient} onCreateClient={handleCreateClient} onLinkOrder={handleLinkOrder}/>}
        {view === 'prospects'  && <Prospects prospects={prospects} onUpsert={handleUpsertProspect} onAddActivity={handleAddActivity} onUpdateActivity={handleUpdateActivity} onDeleteActivity={handleDeleteActivity} onDelete={handleDeleteProspect}/>}
        {view === 'analytics'  && <Analytics orders={orders}/>}
        {view === 'new'        && <NewOrder  editOrder={editOrder} prefillClient={prefillClient} clients={clients} setView={navigate} onSaved={handleSavedOrder} onUpsertClient={handleUpsertClient}/>}
        {view === 'newQuote'   && <NewQuote  editOrder={editOrder} prefillClient={prefillClient} clients={clients} setView={navigate} onSaved={handleSavedQuote} onUpsertClient={handleUpsertClient}/>}
      </main>
    </div>
  )
}
