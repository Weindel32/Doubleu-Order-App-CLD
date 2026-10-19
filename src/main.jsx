import React, { lazy, Suspense, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// /taglie/<token> (e il vecchio /m/<token>): modulo taglie del cliente, pubblico e senza login. Tutto
// il resto e' l'app interna. Caricati separatamente: chi apre il link dal
// telefono non scarica l'intera app.
const App             = lazy(() => import('./App.jsx'))
const ClientOrderForm = lazy(() => import('./pages/ClientOrderForm.jsx'))
const Courtesy        = lazy(() => import('./pages/Courtesy.jsx'))

const formToken = window.location.pathname.match(/^\/(?:taglie|m)\/([A-Za-z0-9]{20,64})\/?$/)?.[1]

// Chi apre l'indirizzo nudo senza essere collegato vede la pagina di
// cortesia, non la schermata di accesso dell'app interna. Si va dritti
// all'app se: c'e' gia' una sessione, il dispositivo ha usato «Accesso
// staff», o l'indirizzo porta parametri (?accesso, link di recupero
// password di Supabase con ?code= o #access_token).
const STAFF_KEY = 'du-staff'
const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* privata */ } },
  hasSession: () => {
    try { return Object.keys(localStorage).some(k => /^sb-.+-auth-token$/.test(k)) } catch { return false }
  },
}
const showCourtesy = !formToken
  && window.location.pathname === '/'
  && !window.location.search && !window.location.hash
  && !store.hasSession() && !store.get(STAFF_KEY)

function Root() {
  const [courtesy, setCourtesy] = useState(showCourtesy)
  if (formToken) return <ClientOrderForm token={formToken} />
  if (courtesy) return <Courtesy onStaff={() => {
    store.set(STAFF_KEY, '1')
    document.body.style.background = ''
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1a2744')
    document.title = 'DOUBLEU · Order App'
    setCourtesy(false)
  }} />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </React.StrictMode>
)
