import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE, GREEN } from '../tokens.js'
import { badgeStyle } from '../tokens.js'
import { orderTotal } from '../utils/helpers.js'

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

export default function MobileClients({ clients, orders, onSelectOrder, onUpsertClient }) {
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)

  // Merge: clients table + any client name that appears in orders but not in table
  const clientsMap = new Map(clients.map(c => [c.name, c]))
  orders.forEach(o => {
    if (o.client && !clientsMap.has(o.client)) {
      clientsMap.set(o.client, { name: o.client })
    }
  })
  const allClients = [...clientsMap.values()]

  const sorted = [...allClients].sort((a, b) => {
    const ra = orders.filter(o => o.client === a.name && o.status === 'CONSEGNATO').reduce((s, o) => s + orderTotal(o), 0)
    const rb = orders.filter(o => o.client === b.name && o.status === 'CONSEGNATO').reduce((s, o) => s + orderTotal(o), 0)
    return rb - ra
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' }}>
          {sorted.length} clienti
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

      {/* Lista clienti */}
      {sorted.map(c => {
        const category = getCategory(c, orders)
        const cat = CATEGORY_STYLE[category] || CATEGORY_STYLE.SCOUT
        const active = orders.filter(o => o.client === c.name && o.status !== 'CONSEGNATO').length
        return (
          <div key={c.name} onClick={() => setSelected(c)} style={{
            background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10,
            padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM, marginBottom: 4 }}>{c.name}</div>
              {active > 0 && (
                <div style={{ fontSize: 10, color: GOLD }}>
                  {active} ordine{active > 1 ? 'i' : ''} attivo{active > 1 ? 'i' : ''}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 2,
                fontSize: 8, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase',
                background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
              }}>{category}</span>
              {c.phone && <div style={{ fontSize: 10, color: MUTED }}>{c.phone}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
