import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// /taglie/<token> (e il vecchio /m/<token>): modulo taglie del cliente, pubblico e senza login. Tutto
// il resto e' l'app interna. Caricati separatamente: chi apre il link dal
// telefono non scarica l'intera app.
const App             = lazy(() => import('./App.jsx'))
const ClientOrderForm = lazy(() => import('./pages/ClientOrderForm.jsx'))

const formToken = window.location.pathname.match(/^\/(?:taglie|m)\/([A-Za-z0-9]{20,64})\/?$/)?.[1]

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      {formToken ? <ClientOrderForm token={formToken} /> : <App />}
    </Suspense>
  </React.StrictMode>
)
