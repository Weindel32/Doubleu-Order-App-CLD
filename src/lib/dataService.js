import { supabase } from './supabase.js'

export async function fetchClients() {
  const { data, error } = await supabase.from('clients').select('*').order('name')
  if (error) { console.error('fetchClients:', error); return [] }
  return data || []
}

const CLIENT_FIELDS = ['category', 'city', 'province', 'country', 'vat_number', 'email', 'phone', 'shop_attivo']

export async function upsertClient(name, fields) {
  const safe = {}
  CLIENT_FIELDS.forEach(k => { if (fields[k] !== undefined) safe[k] = fields[k] })
  const { error } = await supabase.from('clients').upsert(
    { name, ...safe },
    { onConflict: 'name' }
  )
  if (error) { console.error('upsertClient:', error); return false }
  return true
}

export async function updateClient(id, fields) {
  const safe = {}
  ;['name', ...CLIENT_FIELDS].forEach(k => { if (fields[k] !== undefined) safe[k] = fields[k] })
  const { error } = await supabase.from('clients').update(safe).eq('id', id)
  if (error) { console.error('updateClient:', error); return false }
  return true
}

export async function createClient(fields) {
  const { data, error } = await supabase.from('clients').insert(fields).select().single()
  if (error) { console.error('createClient:', error); return null }
  return data
}

export async function linkOrderToClient(orderId, clientId) {
  const { error } = await supabase.from('orders').update({ client_id: clientId }).eq('id', orderId)
  if (error) { console.error('linkOrderToClient:', error); return false }
  return true
}

export async function renameClient(oldName, newName, fields) {
  const { error: e1 } = await supabase.from('orders').update({ client: newName }).eq('client', oldName)
  if (e1) { console.error('renameClient orders:', e1); return false }
  const safe = {}
  CLIENT_FIELDS.forEach(k => { if (fields[k] !== undefined) safe[k] = fields[k] })
  const { error: e2 } = await supabase.from('clients').upsert({ name: newName, ...safe }, { onConflict: 'name' })
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
          omaggio: a.omaggio || 0,
          estimatedQty: (a.sizes_adult || {}).__qty || null,
          sizes: { adult: (({ __qty, __uni, ...rest }) => rest)(a.sizes_adult || {}), kids: a.sizes_kids || {}, uni: (a.sizes_adult || {}).__uni || 0 }
        }))
      }
    }))
    const { data: payments } = await supabase
      .from('payments').select('*').eq('order_id', order.id)
    return {
      id: order.id, client: order.client, clientId: order.client_id || null,
      clientEmail: order.client_email || '', clientPhone: order.client_phone || '',
      clientAddress: order.client_address || '', clientCity: order.client_city || '',
      clientCountry: order.client_country || 'Italia', clientContact: order.client_contact || '',
      date: order.date, deliveryDate: order.delivery_date, actualDeliveryDate: order.actual_delivery_date || null, alertDays: order.alert_days,
      status: order.status, pieces: order.pieces, pricingMode: order.pricing_mode,
      lost: order.lost || false, lostReason: order.lost_reason || '', lostDate: order.lost_date || null,
      cancelReason: order.cancel_reason || '', cancelDate: order.cancel_date || null,
      convertedFromQuote: order.converted_from_quote || false,
      kitQuantity: order.kit_quantity || null,
      ivaEnabled: order.iva_enabled || false, ivaRate: order.iva_rate || 22,
      shipping: order.shipping || 0,
      invoiceNumber: order.invoice_number || '',
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
    date: order.date, delivery_date: order.deliveryDate || null, actual_delivery_date: order.actualDeliveryDate || null, alert_days: order.alertDays || 7,
    status: order.status, pieces: order.pieces, pricing_mode: order.pricingMode,
    lost: order.lost || false, lost_reason: order.lostReason || null, lost_date: order.lostDate || null,
    cancel_reason: order.cancelReason || null, cancel_date: order.cancelDate || null,
    converted_from_quote: order.convertedFromQuote || false,
    kit_quantity: order.kitQuantity || null,
    iva_enabled: order.ivaEnabled || false, iva_rate: order.ivaRate || 22,
    shipping: order.shipping || 0,
    invoice_number: order.invoiceNumber || null,
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
        omaggio: art.omaggio || 0,
        sizes_adult: { ...(art.sizes?.adult || {}), ...(art.estimatedQty ? { __qty: parseInt(art.estimatedQty) } : {}), ...(art.sizes?.uni ? { __uni: parseInt(art.sizes.uni) } : {}) },
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
    date: order.date, delivery_date: order.deliveryDate || null, actual_delivery_date: order.actualDeliveryDate || null, alert_days: order.alertDays || 7,
    status: order.status, pieces: order.pieces, pricing_mode: order.pricingMode,
    lost: order.lost || false, lost_reason: order.lostReason || null, lost_date: order.lostDate || null,
    cancel_reason: order.cancelReason || null, cancel_date: order.cancelDate || null,
    converted_from_quote: order.convertedFromQuote || false,
    kit_quantity: order.kitQuantity || null,
    iva_enabled: order.ivaEnabled || false, iva_rate: order.ivaRate || 22,
    shipping: order.shipping || 0,
    invoice_number: order.invoiceNumber || null,
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
        omaggio: art.omaggio || 0,
        sizes_adult: { ...(art.sizes?.adult || {}), ...(art.estimatedQty ? { __qty: parseInt(art.estimatedQty) } : {}), ...(art.sizes?.uni ? { __uni: parseInt(art.sizes.uni) } : {}) },
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

export async function quickUpdateStatus(orderId, status, extraFields = {}) {
  const { error } = await supabase.from('orders').update({ status, ...extraFields }).eq('id', orderId)
  if (error) { console.error('quickUpdateStatus:', error); return false }
  return true
}

// Segna un preventivo come "perso" (non diventato ordine) — resta in archivio per le statistiche
export async function markQuoteLost(orderId, reason) {
  const today = new Date().toLocaleDateString('it-IT')
  const { error } = await supabase.from('orders')
    .update({ lost: true, lost_reason: reason || null, lost_date: today })
    .eq('id', orderId)
  if (error) { console.error('markQuoteLost:', error); return false }
  return true
}

// Riporta un preventivo perso tra quelli attivi
export async function restoreQuote(orderId) {
  const { error } = await supabase.from('orders')
    .update({ lost: false, lost_reason: null, lost_date: null })
    .eq('id', orderId)
  if (error) { console.error('restoreQuote:', error); return false }
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

// ─── PROSPECTS ───────────────────────────────────────────────────

export async function fetchProspects() {
  const { data, error } = await supabase
    .from('prospects')
    .select('*, prospect_activities(*)')
    .order('updated_at', { ascending: false })
  if (error) { console.error('fetchProspects:', error); return [] }
  return data || []
}

const PROSPECT_FIELDS = [
  'name','category','city','province','country','channel_origin','stage',
  'deal_value_est','contact_name','contact_email','contact_phone',
  'language','next_action_date','notes','client_id',
  'contact_type','referred_by','vincolo_altro_brand','relazione_pregressa',
]

export async function upsertProspect(prospect) {
  const { id, prospect_activities, ...rest } = prospect

  const row = {}
  PROSPECT_FIELDS.forEach(k => { if (rest[k] !== undefined) row[k] = rest[k] || null })
  row.vincolo_altro_brand = rest.vincolo_altro_brand || false
  row.stage = rest.stage || 'contatto'
  row.contact_type = rest.contact_type || 'cliente'

  // Auto-create client only when won + contact_type='cliente'
  if (row.stage === 'won' && row.contact_type === 'cliente' && !row.client_id) {
    const { data: existing } = await supabase.from('clients').select('id').eq('name', row.name).maybeSingle()
    if (existing) {
      row.client_id = existing.id
    } else {
      const { data: newClient } = await supabase.from('clients').insert({
        name: row.name,
        email: row.contact_email || null,
        phone: row.contact_phone || null,
        country: row.country || 'Italia',
        province: row.province || null,
      }).select().single()
      if (newClient) row.client_id = newClient.id
    }
  }

  if (id) {
    const { error } = await supabase.from('prospects').update(row).eq('id', id)
    if (error) { console.error('upsertProspect update:', error); return null }
    return { id, ...row }
  } else {
    const { data, error } = await supabase.from('prospects').insert(row).select().single()
    if (error) { console.error('upsertProspect insert:', error); return null }
    return data
  }
}

export async function deleteProspect(prospectId) {
  // Scollega eventuali prospect segnalati da questo (FK referred_by)
  await supabase.from('prospects').update({ referred_by: null }).eq('referred_by', prospectId)
  await supabase.from('prospect_activities').delete().eq('prospect_id', prospectId)
  const { error } = await supabase.from('prospects').delete().eq('id', prospectId)
  if (error) { console.error('deleteProspect:', error); return false }
  return true
}

export async function addProspectActivity(prospectId, activity) {
  const { data, error } = await supabase.from('prospect_activities').insert({
    prospect_id:  prospectId,
    type:         activity.type || 'note',
    content:      activity.content  || null,
    reward_type:  activity.reward_type  || null,
    reward_value: activity.reward_value ? parseFloat(activity.reward_value) : null,
  }).select().single()
  if (error) { console.error('addProspectActivity:', error); return null }
  return data
}

export async function updateProspectActivity(activityId, activity) {
  const { error } = await supabase.from('prospect_activities').update({
    type:         activity.type || 'note',
    content:      activity.content  || null,
    reward_type:  activity.reward_type  || null,
    reward_value: activity.reward_value ? parseFloat(activity.reward_value) : null,
  }).eq('id', activityId)
  if (error) { console.error('updateProspectActivity:', error); return false }
  return true
}

export async function deleteProspectActivity(activityId) {
  const { error } = await supabase.from('prospect_activities').delete().eq('id', activityId)
  if (error) { console.error('deleteProspectActivity:', error); return false }
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
