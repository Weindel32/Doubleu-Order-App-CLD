import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE, GREEN } from '../tokens.js'
import { badgeStyle } from '../tokens.js'
import { orderTotal, parseDate, isConfirmed } from '../utils/helpers.js'

function fmt(n) {
  return '€' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const CATEGORY_STYLE = {
  ANCHOR: { color: '#b8965a', border: 'rgba(184,150,90,0.4)', bg: 'rgba(184,150,90,0.1)' },
  ALLIED: { color: '#7aaee8', border: 'rgba(90,130,184,0.4)', bg: 'rgba(90,130,184,0.1)' },
  SCOUT:  { color: '#8a9ab5', border: 'rgba(138,154,181,0.3)', bg: 'rgba(138,154,181,0.07)' },
}

function getCategory(clientObj, orders) {
  if (clientObj.category_override) return clientObj.category_override
  const revenue = orders
    .filter(o => o.client === clientObj.name && o.status === 'CONSEGNATO')
    .reduce((s, o) => s + orderTotal(o), 0)
  if (revenue >= 4000) return 'ANCHOR'
  if (revenue >= 1000) return 'ALLIED'
  return 'SCOUT'
}

function CategoryBadge({ category }) {
  const s = CATEGORY_STYLE[category] || CATEGORY_STYLE.SCOUT
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 2,
      fontSize: 8, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{category}</span>
  )
}

function inputStyle(focused) {
  return {
    width: '100%', boxSizing: 'border-box',
    background: focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${focused ? GOLD : BORDER}`,
    borderRadius: 6, padding: '12px 14px',
    color: CREAM, fontSize: 14, letterSpacing: 0.3,
    outline: 'none', fontFamily: "'Josefin Sans', sans-serif",
    transition: 'border-color 0.2s, background 0.2s',
  }
}

function NewClientForm({ onSave, onCancel }) {
  const [fields, setFields] = useState({ name: '', contact: '', phone: '', email: '', city: '' })
  const [focused, setFocused] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!fields.name.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true)
    const { name, ...rest } = fields
    const ok = await onSave(name.trim(), {
      contact: rest.contact.trim() || null,
      phone: rest.phone.trim() || null,
      email: rest.email.trim() || null,
      city: rest.city.trim() || null,
    })
    setSaving(false)
    if (ok !== false) onCancel()
  }

  const labelStyle = { fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 6, display: 'block' }

  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 16px', marginBottom: 20 }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 18 }}>Nuovo Cliente</div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nome Club *</label>
        <input
          value={fields.name}
          onChange={e => { set('name', e.target.value); setError('') }}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
          placeholder="es. TC Calisio"
          style={inputStyle(focused === 'name')}
          autoCapitalize="words"
        />
        {error ? <div style={{ fontSize: 10, color: CLAY, marginTop: 5 }}>{error}</div> : null}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Referente</label>
        <input
          value={fields.contact}
          onChange={e => set('contact', e.target.value)}
          onFocus={() => setFocused('contact')}
          onBlur={() => setFocused(null)}
          placeholder="Nome cognome"
          style={inputStyle(focused === 'contact')}
          autoCapitalize="words"
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Telefono</label>
        <input
          value={fields.phone}
          onChange={e => set('phone', e.target.value)}
          onFocus={() => setFocused('phone')}
          onBlur={() => setFocused(null)}
          placeholder="+39 000 000 0000"
          style={inputStyle(focused === 'phone')}
          type="tel"
          inputMode="tel"
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Email</label>
        <input
          value={fields.email}
          onChange={e => set('email', e.target.value)}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused(null)}
          placeholder="email@club.it"
          style={inputStyle(focused === 'email')}
          type="email"
          inputMode="email"
          autoCapitalize="none"
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Città</label>
        <input
          value={fields.city}
          onChange={e => set('city', e.target.value)}
          onFocus={() => setFocused('city')}
          onBlur={() => setFocused(null)}
          placeholder="Milano"
          style={inputStyle(focused === 'city')}
          autoCapitalize="words"
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '13px', borderRadius: 6,
          background: 'transparent', border: `1px solid ${BORDER}`,
          color: MUTED, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif",
          WebkitTapHighlightColor: 'transparent',
        }}>Annulla</button>
        <button onClick={handleSave} disabled={saving} style={{
          flex: 2, padding: '13px', borderRadius: 6,
          background: saving ? 'rgba(184,150,90,0.3)' : `linear-gradient(135deg, #b8965a, #9a7a45)`,
          border: 'none', color: CREAM,
          fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
          cursor: saving ? 'default' : 'pointer',
          fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600,
          WebkitTapHighlightColor: 'transparent',
        }}>{saving ? 'Salvataggio...' : 'Salva Cliente'}</button>
      </div>
    </div>
  )
}

function ClientDetail({ client, orders, onBack, onSelectOrder }) {
  const clientOrders = orders.filter(o => o.client === client.name)
  const activeOrders = clientOrders.filter(o => o.status !== 'CONSEGNATO')
  const revenue = clientOrders
    .filter(o => o.status === 'CONSEGNATO')
    .reduce((s, o) => s + orderTotal(o), 0)
  const category = getCategory(client, orders)

  return (
    <div style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '0 16px' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: GOLD,
          cursor: 'pointer', padding: '20px 0 10px',
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
          WebkitTapHighlightColor: 'transparent',
        }}>‹ Clienti</button>

        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: CREAM, lineHeight: 1.2, marginBottom: 8 }}>
          {client.name}
        </div>
        <CategoryBadge category={category} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20, marginBottom: 20 }}>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: GOLD, lineHeight: 1 }}>{activeOrders.length}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginTop: 6 }}>Ordini Attivi</div>
          </div>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: GOLD, lineHeight: 1 }}>{fmt(revenue)}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginTop: 6 }}>Revenue</div>
          </div>
        </div>

        {(client.phone || client.email || client.contact || client.city) && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px', marginBottom: 20 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 14 }}>Contatti</div>
            {client.contact && <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>Referente: {client.contact}</div>}
            {client.phone && (
              <a href={`tel:${client.phone}`} style={{ display: 'block', fontSize: 16, color: GOLD, textDecoration: 'none', marginBottom: 8, fontFamily: "'Cormorant Garamond', serif" }}>
                {client.phone}
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} style={{ display: 'block', fontSize: 12, color: GOLD, textDecoration: 'none', marginBottom: 8 }}>
                {client.email}
              </a>
            )}
            {client.city && (
              <div style={{ fontSize: 11, color: MUTED }}>
                {client.city}{client.country && client.country !== 'Italia' ? `, ${client.country}` : ''}
              </div>
            )}
          </div>
        )}

        {clientOrders.length > 0 && (
          <>
            <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>Storico Ordini</div>
            {clientOrders.map(o => (
              <div key={o.id} onClick={() => onSelectOrder(o)} style={{
                background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10,
                padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: MUTED }}>{o.id} · {o.date}</span>
                  <span style={badgeStyle(o.status)}>{o.status}</span>
                </div>
                {o.deliveryDate && <div style={{ fontSize: 10, color: MUTED }}>Consegna: {o.deliveryDate}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

const SORT_LABELS = { total: 'Fatturato', name: 'Nome', last: 'Ultimo ordine', orders: 'N° ordini' }

function mChip(active, tc) {
  return {
    padding: '7px 12px', borderRadius: 6, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Josefin Sans', sans-serif",
    WebkitTapHighlightColor: 'transparent',
    background: active ? (tc?.bg || 'rgba(184,150,90,0.14)') : 'rgba(255,255,255,0.04)',
    color:      active ? (tc?.color || GOLD) : MUTED,
    border:     `1px solid ${active ? (tc?.border || 'rgba(184,150,90,0.35)') : BORDER}`,
  }
}

export default function MobileClients({ clients, orders, onSelectOrder, onUpsertClient }) {
  const [selected, setSelected]   = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [search,   setSearch]     = useState('')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [shopOnly, setShopOnly]   = useState(false)
  const [sortKey,  setSortKey]    = useState('total')
  const [sortDir,  setSortDir]    = useState('desc')
  const [searchFocus, setSearchFocus] = useState(false)

  // Merge: clients table + any client name that appears in orders but not in table
  const clientsMap = new Map(clients.map(c => [c.name, c]))
  orders.forEach(o => {
    if (o.client && !clientsMap.has(o.client)) {
      clientsMap.set(o.client, { name: o.client })
    }
  })
  const allClients = [...clientsMap.values()]

  const enriched = allClients.map(c => {
    const cOrders   = orders.filter(o => o.client === c.name)
    const confirmed = cOrders.filter(isConfirmed)
    const revenue   = cOrders.filter(o => o.status === 'CONSEGNATO').reduce((s, o) => s + orderTotal(o), 0)
    const active    = cOrders.filter(o => isConfirmed(o) && o.status !== 'CONSEGNATO').length
    const tier      = getCategory(c, orders)
    const lastTs    = confirmed.reduce((m, o) => { const d = parseDate(o.date); return d && d.getTime() > m ? d.getTime() : m }, 0)
    const lastOrder = confirmed.reduce((b, o) => { const d = parseDate(o.date); return d && d.getTime() === lastTs ? o.date : b }, null)
    return { ...c, revenue, active, tier, lastTs, lastOrder, ordersCount: confirmed.length }
  })

  const q = search.trim().toLowerCase()
  const filtered = enriched.filter(c => {
    if (tierFilter !== 'ALL' && c.tier !== tierFilter) return false
    if (shopOnly && !c.shop_attivo) return false
    if (q) {
      const hay = [c.name, c.city, c.country, c.email].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let cmp
    if      (sortKey === 'name')   cmp = (a.name || '').localeCompare(b.name || '', 'it')
    else if (sortKey === 'orders') cmp = a.ordersCount - b.ordersCount
    else if (sortKey === 'last')   cmp = a.lastTs - b.lastTs
    else                           cmp = a.revenue - b.revenue
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (selected) {
    return (
      <ClientDetail
        client={selected}
        orders={orders}
        onBack={() => setSelected(null)}
        onSelectOrder={onSelectOrder}
      />
    )
  }

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Header con bottone nuovo cliente */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' }}>
          {sorted.length} {sorted.length === 1 ? 'cliente' : 'clienti'}{sorted.length !== enriched.length ? ` di ${enriched.length}` : ''}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={{
            background: 'rgba(184,150,90,0.12)',
            border: `1px solid ${GOLD}`,
            borderRadius: 6,
            color: GOLD,
            fontSize: 9,
            letterSpacing: 2,
            textTransform: 'uppercase',
            padding: '8px 14px',
            cursor: 'pointer',
            fontFamily: "'Josefin Sans', sans-serif",
            WebkitTapHighlightColor: 'transparent',
          }}>+ Nuovo</button>
        )}
      </div>

      {/* Form nuovo cliente */}
      {showForm && (
        <NewClientForm
          onSave={onUpsertClient}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Ricerca */}
      {!showForm && (
        <>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontSize: 15, pointerEvents: 'none' }}>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder="Cerca per nome, città, email…"
              autoCapitalize="none"
              style={{ ...inputStyle(searchFocus), paddingLeft: 36, paddingRight: 34 }}
            />
            {search && (
              <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</span>
            )}
          </div>

          {/* Filtri Tier + Shop (scroll orizzontale) */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, WebkitOverflowScrolling: 'touch' }}>
            {['ALL', 'ANCHOR', 'ALLIED', 'SCOUT'].map(t => (
              <button key={t} onClick={() => setTierFilter(t)} style={mChip(tierFilter === t, t === 'ALL' ? null : CATEGORY_STYLE[t])}>
                {t === 'ALL' ? 'Tutti' : t}
              </button>
            ))}
            <button onClick={() => setShopOnly(v => !v)} style={mChip(shopOnly, { bg: 'rgba(74,158,110,0.16)', color: GREEN, border: 'rgba(74,158,110,0.35)' })}>
              ● Shop
            </button>
          </div>

          {/* Ordinamento */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 8, letterSpacing: 2, color: MUTED, textTransform: 'uppercase' }}>Ordina</span>
            <select value={sortKey} onChange={e => setSortKey(e.target.value)}
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '9px 12px', color: CREAM, fontSize: 12, outline: 'none', fontFamily: "'Josefin Sans', sans-serif" }}>
              {Object.entries(SORT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              style={{ padding: '9px 13px', fontSize: 13, color: GOLD, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,150,90,0.35)', borderRadius: 6, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
              {sortDir === 'asc' ? '▲' : '▼'}
            </button>
          </div>
        </>
      )}

      {/* Lista clienti */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: MUTED, fontSize: 12, fontStyle: 'italic' }}>
          Nessun cliente trovato
        </div>
      ) : sorted.map(c => {
        const cat = CATEGORY_STYLE[c.tier] || CATEGORY_STYLE.SCOUT
        const sub = [c.city, c.ordersCount > 0 ? `${c.ordersCount} ordin${c.ordersCount > 1 ? 'i' : 'e'}` : null].filter(Boolean).join(' · ')
        return (
          <div key={c.name} onClick={() => setSelected(c)} className="du-card" style={{
            background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10,
            padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM }}>{c.name}</span>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 2,
                  fontSize: 8, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase',
                  background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
                }}>{c.tier}</span>
                {c.shop_attivo && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, flexShrink: 0 }} title="Shop attivo"/>
                )}
              </div>
              {sub && <div style={{ fontSize: 10, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
              {c.active > 0 && (
                <div style={{ fontSize: 10, color: GOLD, marginTop: 2 }}>
                  {c.active} attiv{c.active > 1 ? 'i' : 'o'}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: c.revenue > 0 ? GOLD : MUTED, lineHeight: 1 }}>
                {c.revenue > 0 ? fmt(c.revenue) : '—'}
              </div>
              <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1, marginTop: 4 }}>
                {c.lastOrder ? `Ult. ${c.lastOrder}` : 'Nessun ordine'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
