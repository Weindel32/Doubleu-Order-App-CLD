export const MOCK_ORDERS = [
  {
    id: 'DU-2026-0066',
    client: 'Eco Village (Kit Squadra)',
    date: '14/04/2026',
    deliveryDate: '30/04/2026',
    alertDays: 7,
    status: 'PREVENTIVO',
    pieces: 12,
    showTotalInClientPDF: false,
    notes: 'Consegna entro fine aprile',
    productionNotes: 'Pantone ECO-verde 356C per tutti i loghi',
    pricingMode: 'kit',
    payments: [],
    kits: [
      {
        name: 'Kit Completo ECO',
        price: 90,
        articles: [
          { sp: 'SP-206', category: 'Felpa', line: 'Performance', description: 'Felpa zip cappuccio', color: 'Forest Green/Cream', sizes: { adult: { XS:2, S:3, M:4, L:2, XL:1, XXL:0 }, kids: {} } },
          { sp: 'SP-091', category: 'Short', line: 'Performance', description: 'Short da gioco', color: 'Forest Green', sizes: { adult: { XS:2, S:3, M:4, L:2, XL:1, XXL:0 }, kids: {} } },
        ],
      },
    ],
  },
  {
    id: 'DU-2026-0040',
    client: 'SNAUWAERT',
    date: '17/03/2026',
    deliveryDate: '15/04/2026',
    alertDays: 5,
    status: 'CONSEGNATO',
    pieces: 15,
    showTotalInClientPDF: true,
    notes: '',
    productionNotes: 'Piping bianco su manica raglan',
    pricingMode: 'singolo',
    payments: [
      { id: 'p1', type: 'acconto', amount: 83,    date: '17/03/2026', method: 'Bonifico', note: 'Acconto 50%',         paid: true },
      { id: 'p2', type: 'saldo',   amount: 83.33, date: '15/04/2026', method: 'Bonifico', note: 'Saldo alla consegna', paid: true },
    ],
    kits: [
      {
        name: null, price: null,
        articles: [
          { sp: 'SP-088', category: 'Polo', line: 'Club', description: 'Polo manica corta', color: 'White/Navy', price: 28, sizes: { adult: { XS:1, S:3, M:4, L:4, XL:2, XXL:1 }, kids: {} } },
        ],
      },
    ],
  },
  {
    id: 'DU-2026-0038',
    client: 'ECO VILLAGE',
    date: '10/12/2025',
    deliveryDate: '28/02/2026',
    alertDays: 10,
    status: 'CONSEGNATO',
    pieces: 242,
    showTotalInClientPDF: true,
    notes: 'Cliente premium - priorità assoluta',
    productionNotes: 'Verde ECO pantone 356C. Logo fronte ricamato, retro stampa.',
    pricingMode: 'kit',
    payments: [
      { id: 'p1', type: 'acconto',   amount: 4320, date: '10/12/2025', method: 'Bonifico', note: 'Acconto 90%',    paid: true },
      { id: 'p2', type: 'saldo',     amount: 480,  date: '28/02/2026', method: 'Bonifico', note: 'Saldo consegna', paid: true },
    ],
    kits: [
      {
        name: 'Kit Completo ECO Village', price: 90,
        articles: [
          { sp: 'SP-206', category: 'Felpa',   line: 'Performance', description: 'Felpa zip cappuccio',  color: 'Forest Green/Cream', sizes: { adult: { XS:8, S:22, M:35, L:30, XL:18, XXL:7 }, kids: { '4':5,'6':8,'8':10,'10':12,'12':8,'14':6,'16':3 } } },
          { sp: 'SP-112', category: 'T-Shirt', line: 'Performance', description: 'T-shirt manica corta', color: 'Forest Green',       sizes: { adult: { XS:5, S:15, M:22, L:18, XL:10, XXL:4 }, kids: { '4':3,'6':5,'8':6,'10':7,'12':5,'14':3,'16':2 } } },
        ],
      },
    ],
  },
  {
    id: 'DU-2026-0030',
    client: 'ALL ROUND Sport&Wellness',
    date: '10/10/2025',
    deliveryDate: '15/12/2025',
    alertDays: 7,
    status: 'CONSEGNATO',
    pieces: 320,
    showTotalInClientPDF: true,
    notes: '',
    productionNotes: '',
    pricingMode: 'singolo',
    payments: [
      { id: 'p1', type: 'acconto',    amount: 2996, date: '10/10/2025', method: 'Bonifico', note: 'Acconto 50%',               paid: true },
      { id: 'p2', type: 'intermedio', amount: 1498, date: '01/12/2025', method: 'Bonifico', note: 'Pagamento intermedio 25%',  paid: true },
      { id: 'p3', type: 'saldo',      amount: 1498, date: '15/12/2025', method: 'Bonifico', note: 'Saldo consegna',            paid: true },
    ],
    kits: [
      {
        name: null, price: null,
        articles: [
          { sp: 'SP-103', category: 'T-Shirt', line: 'Performance', description: 'T-shirt tecnica', color: 'White/Teal', price: 22, sizes: { adult: { XS:20, S:60, M:80, L:70, XL:50, XXL:20 }, kids: { '4':2,'6':4,'8':4,'10':4,'12':3,'14':2,'16':1 } } },
        ],
      },
    ],
  },
  {
    id: 'DU-2026-0034',
    client: 'MTC Ausstellungspark',
    date: '09/06/2025',
    deliveryDate: '20/08/2025',
    alertDays: 14,
    status: 'CONSEGNATO',
    pieces: 160,
    showTotalInClientPDF: true,
    notes: 'Primo ordine cliente',
    productionNotes: 'Navy #1a2744 + Gold #b8965a. Logo fronte e retro.',
    pricingMode: 'kit',
    payments: [
      { id: 'p1', type: 'acconto', amount: 3280, date: '09/06/2025', method: 'Bonifico', note: 'Acconto 50%',    paid: true },
      { id: 'p2', type: 'saldo',   amount: 3280, date: '20/08/2025', method: 'Bonifico', note: 'Saldo consegna', paid: true },
    ],
    kits: [
      {
        name: 'Kit MTC Full', price: 85,
        articles: [
          { sp: 'SP-206', category: 'Felpa', line: 'Performance', description: 'Felpa zip cappuccio', color: 'Navy/Gold', sizes: { adult: { XS:10, S:25, M:40, L:35, XL:20, XXL:10 }, kids: { '4':2,'6':3,'8':4,'10':4,'12':3,'14':2,'16':2 } } },
          { sp: 'SP-091', category: 'Short', line: 'Club',        description: 'Short da gioco',      color: 'Navy',     sizes: { adult: { XS:5, S:10, M:15, L:12, XL:8, XXL:4 },   kids: {} } },
        ],
      },
    ],
  },
  {
    id: 'DU-2026-0031',
    client: 'MTC Ausstellungspark',
    date: '20/12/2025',
    deliveryDate: '30/04/2026',
    alertDays: 7,
    status: 'IN PRODUZIONE',
    pieces: 30,
    showTotalInClientPDF: false,
    notes: '',
    productionNotes: 'Logo ricamato fronte sinistra.',
    pricingMode: 'singolo',
    payments: [
      { id: 'p1', type: 'acconto', amount: 975, date: '20/12/2025', method: 'Bonifico', note: 'Acconto 50%',         paid: true  },
      { id: 'p2', type: 'saldo',   amount: 975, date: '30/04/2026', method: 'Bonifico', note: 'Saldo alla consegna', paid: false },
    ],
    kits: [
      {
        name: null, price: null,
        articles: [
          { sp: 'SP-044', category: 'Giacca', line: 'Performance', description: 'Giacca antivento', color: 'Navy/Gold', price: 65, sizes: { adult: { XS:2, S:5, M:8, L:8, XL:5, XXL:2 }, kids: {} } },
        ],
      },
    ],
  },
  {
    id: 'DU-2026-0028',
    client: 'Paco Alcocer',
    date: '02/12/2025',
    deliveryDate: '20/01/2026',
    alertDays: 7,
    status: 'CONSEGNATO',
    pieces: 38,
    showTotalInClientPDF: true,
    notes: '',
    productionNotes: '',
    pricingMode: 'singolo',
    payments: [
      { id: 'p1', type: 'acconto', amount: 470, date: '02/12/2025', method: 'Bonifico', note: 'Acconto 50%',    paid: true },
      { id: 'p2', type: 'saldo',   amount: 470, date: '20/01/2026', method: 'Bonifico', note: 'Saldo consegna', paid: true },
    ],
    kits: [
      {
        name: null, price: null,
        articles: [
          { sp: 'SP-088', category: 'Polo', line: 'Club', description: 'Polo manica corta', color: 'White/Clay', price: 28, sizes: { adult: { XS:3, S:8, M:10, L:10, XL:5, XXL:2 }, kids: {} } },
        ],
      },
    ],
  },
  {
    id: 'DU-2026-0025',
    client: 'AL TENNIS',
    date: '19/09/2025',
    deliveryDate: '15/11/2025',
    alertDays: 10,
    status: 'CONSEGNATO',
    pieces: 106,
    showTotalInClientPDF: true,
    notes: '',
    productionNotes: 'Verde lime su inserti laterali. Pantone 382C.',
    pricingMode: 'singolo',
    payments: [
      { id: 'p1', type: 'acconto', amount: 1019, date: '19/09/2025', method: 'Bonifico', note: 'Acconto 50%',    paid: true },
      { id: 'p2', type: 'saldo',   amount: 1019, date: '15/11/2025', method: 'Bonifico', note: 'Saldo consegna', paid: true },
    ],
    kits: [
      {
        name: null, price: null,
        articles: [
          { sp: 'SP-112', category: 'T-Shirt', line: 'Performance', description: 'T-shirt manica corta', color: 'White/Lime', price: 22, sizes: { adult: { XS:5, S:20, M:30, L:25, XL:15, XXL:5 }, kids: { '4':1,'6':1,'8':2,'10':1,'12':1,'14':0,'16':0 } } },
        ],
      },
    ],
  },
]

export const MOCK_CLIENTS = [
  { id: 1, name: 'MTC Ausstellungspark',      orders: 2, total: 7754,   lastOrder: '20/12/2025', category: 'Core',       pieces: 190 },
  { id: 2, name: 'ALL ROUND Sport&Wellness',  orders: 1, total: 5992,   lastOrder: '10/10/2025', category: 'Core',       pieces: 320 },
  { id: 3, name: 'ECO VILLAGE',               orders: 1, total: 4800,   lastOrder: '10/12/2025', category: 'Core',       pieces: 242 },
  { id: 4, name: 'AL TENNIS',                 orders: 1, total: 2038,   lastOrder: '19/09/2025', category: 'Occasional', pieces: 106 },
  { id: 5, name: 'Paco Alcocer',              orders: 1, total: 940,    lastOrder: '02/12/2025', category: 'Occasional', pieces: 38  },
  { id: 6, name: 'Eco Village (Kit Squadra)', orders: 1, total: 480,    lastOrder: '14/04/2026', category: 'Occasional', pieces: 12  },
  { id: 7, name: 'SNAUWAERT',                 orders: 2, total: 347.47, lastOrder: '17/03/2026', category: 'Occasional', pieces: 33  },
]

// ─── HELPERS ─────────────────────────────────────────────────────
import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'

export function getAllArticles(order) {
  return order.kits.flatMap(k => k.articles)
}

export function artPieceCount(art) {
  return ADULT_SIZES.reduce((s, sz) => s + (art.sizes.adult?.[sz] || 0), 0)
       + KIDS_SIZES.reduce((s, sz)  => s + (art.sizes.kids?.[sz]  || 0), 0)
}

export function orderTotal(order) {
  if (order.pricingMode === 'kit') {
    return order.kits.reduce((sum, kit) => {
      const kitPieces = kit.articles.reduce((s, a) => s + artPieceCount(a), 0)
      return sum + (parseFloat(kit.price) || 0) * kitPieces
    }, 0)
  }
  return order.kits.flatMap(k => k.articles).reduce((sum, a) => {
    return sum + (parseFloat(a.price) || 0) * artPieceCount(a)
  }, 0)
}

export function paymentSummary(order) {
  const total   = orderTotal(order)
  const paid    = (order.payments || []).filter(p => p.paid).reduce((s, p) => s + p.amount, 0)
  const pending = (order.payments || []).filter(p => !p.paid).reduce((s, p) => s + p.amount, 0)
  return { total, paid, pending, residual: Math.max(0, total - paid - pending) }
}

export function parseDate(str) {
  if (!str) return null
  const [d, m, y] = str.split('/')
  return new Date(+y, +m - 1, +d)
}

export function daysUntilDelivery(order) {
  const delivery = parseDate(order.deliveryDate)
  if (!delivery) return null
  const today = new Date(); today.setHours(0,0,0,0)
  return Math.round((delivery - today) / 86400000)
}

export function needsAlert(order) {
  if (['CONSEGNATO'].includes(order.status)) return false
  const days = daysUntilDelivery(order)
  if (days === null) return false
  return days <= (order.alertDays || 7)
}
