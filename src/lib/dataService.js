import { supabase } from './supabase.js'

export async function fetchClients() {
  const { data, error } = await supabase.from('clients').select('*')
  if (error) { console.error('fetchClients:', error); return [] }
  return data || []
}

export async function upsertClient(name, fields) {
  const { error } = await supabase.from('clients').upsert(
    { name, ...fields },
    { onConflict: 'name' }
  )
  if (error) { console.error('upsertClient:', error); return false }
  return true
}

export async function renameClient(oldName, newName, fields) {
  const { error: e1 } = await supabase.from('orders').update({ client: newName }).eq('client', oldName)
  if (e1) { console.error('renameClient orders:', e1); return false }
  const { error: e2 } = await supabase.from('clients').upsert({ name: newName, ...fields }, { onConflict: 'name' })
  if (e2) { console.error('renameClient upsert:', e2); return false }
  if (oldName !== newName) {
    await supabase.from('clients').delete().eq('name', oldName)
  }
  return true
}

export async function fetchOrders() {
  const { data: orders, error } = await supabase
    .from('orders').select('*').order('created_at', { ascending: false })
  if (error) { console.error('fetchOrders:', error); return [] }

  const full = await Promise.all(orders.map(async (order) => {
    const { data: kits } = await supabase
      .from('kits').select('*').eq('order_id', order.id).order('position')
    const kitsWithArticles = await Promise.all((kits || []).map(async (kit) => {
      const { data: articles } = await supabase
        .from('articles').select('*').eq('kit_id', kit.id)
      return {
        ...kit,
        articles: (articles || []).map(a => ({
          ...a, notes: a.notes || '',
          delivered: a.delivered || false,
          estimatedQty: (a.sizes_adult || {}).__qty || null,
          sizes: { adult: (({ __qty, ...rest }) => rest)(a.sizes_adult || {}), kids: a.sizes_kids || {} }
        }))
      }
    }))
    const { data: payments } = await supabase
      .from('payments').select('*').eq('order_id', order.id)
    return {
      id: order.id, client: order.client,
      clientEmail: order.client_email || '', clientPhone: order.client_phone || '',
      clientAddress: order.client_address || '', clientCity: order.client_city || '',
      clientCountry: order.client_country || 'Italia', clientContact: order.client_contact || '',
      date: order.date, deliveryDate: order.delivery_date, alertDays: order.alert_days,
      status: order.status, pieces: order.pieces, pricingMode: order.pricing_mode,
      kitQuantity: order.kit_quantity || null,
      ivaEnabled: order.iva_enabled || false, ivaRate: order.iva_rate || 22,
      notes: order.notes, productionNotes: order.production_notes,
      showTotalInClientPDF: order.show_total_in_client_pdf,
      orderType: order.order_type || 'istituzionale',
      kits: kitsWithArticles.map(k => ({ ...k, quantity: k.quantity || null })),
      payments: payments || [],
    }
  }))
  const parseDate = str => {
    if (!str) return 0
    const [d, m, y] = str.split('/')
    return new Date(y, m - 1, d).getTime()
  }
  full.sort((a, b) => parseDate(b.date) - parseDate(a.date))
  return full
}

export async function createOrder(order) {
  const { error } = await supabase.from('orders').insert({
    id: order.id, client: order.client,
    client_email: order.clientEmail || null, client_phone: order.clientPhone || null,
    client_address: order.clientAddress || null, client_city: order.clientCity || null,
    client_country: order.clientCountry || 'Italia', client_contact: order.clientContact || null,
    date: order.date, delivery_date: order.deliveryDate || null, alert_days: order.alertDays || 7,
    status: order.status, pieces: order.pieces, pricing_mode: order.pricingMode,
    kit_quantity: order.kitQuantity || null,
    iva_enabled: order.ivaEnabled || false, iva_rate: order.ivaRate || 22,
    notes: order.notes || '', production_notes: order.productionNotes || '',
    show_total_in_client_pdf: order.showTotalInClientPDF || false,
    order_type: order.orderType || 'istituzionale',
  })
  if (error) { console.error('createOrder:', error); return false }
  for (let ki = 0; ki < order.kits.length; ki++) {
    const kit = order.kits[ki]
    const { data: kitData, error: kitErr } = await supabase.from('kits')
      .insert({ order_id: order.id, name: kit.name || null, price: kit.price || null, quantity: parseInt(kit.quantity) || null, position: ki })
      .select().single()
    if (kitErr) { console.error('createKit:', kitErr); continue }
    for (const art of kit.articles) {
      await supabase.from('articles').insert({
        kit_id: kitData.id, sp: art.sp, category: art.category, line: art.line,
        description: art.description, color: art.color, price: art.price || null,
        notes: art.notes || null, delivered: art.delivered || false,
        sizes_adult: { ...(art.sizes?.adult || {}), ...(art.estimatedQty ? { __qty: parseInt(art.estimatedQty) } : {}) },
        sizes_kids: art.sizes?.kids || {},
      })
    }
  }
  for (const p of (order.payments || [])) {
    await supabase.from('payments').insert({
      id: p.id, order_id: order.id, type: p.type, amount: p.amount,
      date: p.date, method: p.method, note: p.note, paid: p.paid,
    })
  }
  return true
}

export async function updateOrder(order) {
  const { error } = await supabase.from('orders').update({
    client: order.client,
    client_email: order.clientEmail || null, client_phone: order.clientPhone || null,
    client_address: order.clientAddress || null, client_city: order.clientCity || null,
    client_country: order.clientCountry || 'Italia', client_contact: order.clientContact || null,
    date: order.date, delivery_date: order.deliveryDate || null, alert_days: order.alertDays || 7,
    status: order.status, pieces: order.pieces, pricing_mode: order.pricingMode,
    kit_quantity: order.kitQuantity || null,
    iva_enabled: order.ivaEnabled || false, iva_rate: order.ivaRate || 22,
    notes: order.notes || '', production_notes: order.productionNotes || '',
    show_total_in_client_pdf: order.showTotalInClientPDF || false,
    order_type: order.orderType || 'istituzionale',
  }).eq('id', order.id)
  if (error) { console.error('updateOrder:', error); return false }
  await supabase.from('kits').delete().eq('order_id', order.id)
  for (let ki = 0; ki < order.kits.length; ki++) {
    const kit = order.kits[ki]
    const { data: kitData, error: kitErr } = await supabase.from('kits')
      .insert({ order_id: order.id, name: kit.name || null, price: kit.price || null, quantity: parseInt(kit.quantity) || null, position: ki })
      .select().single()
    if (kitErr) { console.error('updateKit:', kitErr); continue }
    for (const art of kit.articles) {
      await supabase.from('articles').insert({
        kit_id: kitData.id, sp: art.sp, category: art.category, line: art.line,
        description: art.description, color: art.color, price: art.price || null,
        notes: art.notes || null, delivered: art.delivered || false,
        sizes_adult: { ...(art.sizes?.adult || {}), ...(art.estimatedQty ? { __qty: parseInt(art.estimatedQty) } : {}) },
        sizes_kids: art.sizes?.kids || {},
      })
    }
  }
  await supabase.from('payments').delete().eq('order_id', order.id)
  for (const p of (order.payments || [])) {
    await supabase.from('payments').insert({
      id: p.id || `p${Date.now()}${Math.random()}`,
      order_id: order.id, type: p.type, amount: p.amount,
      date: p.date, method: p.method, note: p.note, paid: p.paid,
    })
  }
  return true
}

export async function quickUpdateStatus(orderId, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
  if (error) { console.error('quickUpdateStatus:', error); return false }
  return true
}

export async function quickTogglePayment(paymentId, paid) {
  const { error } = await supabase.from('payments').update({ paid }).eq('id', paymentId)
  if (error) { console.error('quickTogglePayment:', error); return false }
  return true
}

export async function deleteOrder(orderId) {
  const { error } = await supabase.from('orders').delete().eq('id', orderId)
  if (error) { console.error('deleteOrder:', error); return false }
  return true
}

export async function generateOrderId(orderDate) {
  const year = orderDate ? parseInt(orderDate.split('-')[0]) : new Date().getFullYear()
  const BASE = 1600
  const { data, error } = await supabase.from('orders').select('id')
    .like('id', `DU-${year}-%`).order('id', { ascending: false }).limit(1)
  if (error || !data || data.length === 0) return `DU-${year}-${BASE + 1}`
  const lastNum = parseInt(data[0].id.split('-')[2]) || BASE
  const nextNum = lastNum < BASE ? BASE + 1 : lastNum + 1
  return `DU-${year}-${nextNum}`
}
