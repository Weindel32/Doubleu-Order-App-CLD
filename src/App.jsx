import { useState } from 'react'
import { GOLD, MUTED, BORDER } from './tokens.js'
import { s } from './tokens.js'
import Dashboard from './pages/Dashboard.jsx'
import Orders    from './pages/Orders.jsx'
import Clients   from './pages/Clients.jsx'
import NewOrder  from './pages/NewOrder.jsx'
import Analytics from './pages/Analytics.jsx'
import { MOCK_ORDERS, needsAlert } from './data/mockData.js'

function Sidebar({ view, setView }) {
  const alertCount = MOCK_ORDERS.filter(o => needsAlert(o)).length
  const pendingPayments = MOCK_ORDERS.filter(o =>
    o.status !== 'PREVENTIVO' && (o.payments||[]).some(p=>!p.paid)
  ).length

  const items = [
    { key: 'dashboard', label: 'Dashboard',      icon: '◈', badge: alertCount > 0 ? alertCount : null },
    { key: 'orders',    label: 'Archivio Ordini', icon: '≡', badge: pendingPayments > 0 ? pendingPayments : null },
    { key: 'clients',   label: 'Clienti',         icon: '◎' },
    { key: 'analytics', label: 'Analytics',       icon: '◉' },
    { key: 'new',       label: '+ Nuovo Ordine',  icon: '+' },
  ]

  return (
    <div style={s.sidebar}>
      <div style={s.logo}>
        <div style={s.logoMark}>DOUBLEU</div>
        <div style={s.logoSub}>Order App · v4</div>
      </div>
      <nav style={{marginTop:16}}>
        {items.map(item=>(
          <div key={item.key} style={s.navItem(view===item.key)}
            onClick={()=>setView(item.key)} role="button" tabIndex={0}
            onKeyDown={e=>e.key==='Enter'&&setView(item.key)}>
            <span style={{fontSize:13,opacity:0.6}}>{item.icon}</span>
            <span style={{flex:1}}>{item.label}</span>
            {item.badge && (
              <span style={{
                background:'#c4623a', color:'white', borderRadius:'50%',
                width:18, height:18, fontSize:9, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>{item.badge}</span>
            )}
          </div>
        ))}
      </nav>
      <div style={{marginTop:'auto',padding:'0 24px',borderTop:`1px solid ${BORDER}`,paddingTop:20}}>
        <div style={{fontSize:9,letterSpacing:2,color:MUTED}}>BUILD</div>
        <div style={{fontSize:11,color:GOLD,marginTop:4}}>v4 · Apr 2026</div>
      </div>
    </div>
  )
}

export default function App() {
  const [view,setView]           = useState('dashboard')
  const [editOrder,setEditOrder] = useState(null)

  const navigate  = (v) => { setView(v); window.scrollTo(0,0) }
  const goToOrder = (o) => { setEditOrder(o); navigate('new') }

  return (
    <div style={s.app}>
      <Sidebar view={view} setView={navigate}/>
      <main style={s.main}>
        {view==='dashboard' && <Dashboard setView={navigate} setEditOrder={goToOrder}/>}
        {view==='orders'    && <Orders    setView={navigate} setEditOrder={goToOrder}/>}
        {view==='clients'   && <Clients/>}
        {view==='analytics' && <Analytics/>}
        {view==='new'       && <NewOrder  editOrder={editOrder} setView={navigate}/>}
      </main>
    </div>
  )
}
