// Dalle righe del database (orders, kits, articles, payments, sample_*)
// agli oggetti che usa tutta l'app (order.kits[].articles[], order.payments,
// shipment.items). Funzioni pure: le usano dataService.js nel browser e il
// connettore MCP lato server, così leggono gli stessi dati allo stesso modo.

export function assembleOrders(orders, allKits, allPayments, allArticles) {
  const articlesByKit = {}
  for (const a of allArticles) (articlesByKit[a.kit_id] ||= []).push(a)
  const kitsByOrder = {}
  for (const k of allKits) (kitsByOrder[k.order_id] ||= []).push(k)
  const paymentsByOrder = {}
  for (const p of allPayments) (paymentsByOrder[p.order_id] ||= []).push(p)

  const full = orders.map((order) => {
    const kitsWithArticles = (kitsByOrder[order.id] || []).map((kit) => ({
      ...kit,
      articles: (articlesByKit[kit.id] || []).map(a => ({
        ...a, notes: a.notes || '',
        delivered: a.delivered || false,
        omaggio: a.omaggio || 0,
        discountType: a.discount_type || 'percentuale', discountValue: a.discount_value || 0,
        estimatedQty: (a.sizes_adult || {}).__qty || null,
        sizes: { adult: (({ __qty, __uni, ...rest }) => rest)(a.sizes_adult || {}), kids: a.sizes_kids || {}, uni: (a.sizes_adult || {}).__uni || 0 }
      }))
    }))
    const payments = (paymentsByOrder[order.id] || []).map(p => ({
      id: p.id, type: p.type, amount: p.amount, date: p.date, method: p.method,
      note: p.note, paid: p.paid,
      dueMode: p.due_mode || 'fissa',
      dueOffsetDays: p.due_offset_days || 0,
      paidDate: p.paid_date || null,
      paidDateVerified: p.paid_date_verified !== false,
      invoiceNumber: p.invoice_number || '',
    }))
    return {
      id: order.id, client: order.client, clientId: order.client_id || null,
      clientEmail: order.client_email || '', clientPhone: order.client_phone || '',
      clientAddress: order.client_address || '', clientCity: order.client_city || '',
      clientCountry: order.client_country || 'Italia', clientContact: order.client_contact || '',
      date: order.date, deliveryDate: order.delivery_date, shippedDate: order.shipped_date || null, actualDeliveryDate: order.actual_delivery_date || null, alertDays: order.alert_days,
      status: order.status, pieces: order.pieces, pricingMode: order.pricing_mode,
      lost: order.lost || false, lostReason: order.lost_reason || '', lostDate: order.lost_date || null,
      standby: order.standby || false, standbyReason: order.standby_reason || '',
      installmentsGranted: order.installments_granted || false,
      negotiation: order.negotiation || null,
      productionDays: order.production_days || null, productionStart: order.production_start || null,
      cancelReason: order.cancel_reason || '', cancelDate: order.cancel_date || null,
      convertedFromQuote: order.converted_from_quote || false,
      kitQuantity: order.kit_quantity || null,
      ivaEnabled: order.iva_enabled || false, ivaRate: order.iva_rate || 22,
      shipping: order.shipping || 0,
      discountMode: order.discount_mode || 'ordine',
      discountType: order.discount_type || 'percentuale', discountValue: order.discount_value || 0,
      orderNote: order.order_note || '',
      invoiceNumber: order.invoice_number || '',
      notes: order.notes, productionNotes: order.production_notes,
      showTotalInClientPDF: order.show_total_in_client_pdf,
      orderType: order.order_type || 'istituzionale',
      kits: kitsWithArticles.map(k => ({
        ...k, quantity: k.quantity || null, omaggio: k.omaggio || 0,
        discountType: k.discount_type || 'percentuale', discountValue: k.discount_value || 0,
      })),
      payments,
    }
  })
  const parseDate = str => {
    if (!str) return 0
    const [d, m, y] = str.split('/')
    return new Date(y, m - 1, d).getTime()
  }
  full.sort((a, b) => parseDate(b.date) - parseDate(a.date))
  return full
}

export function assembleShipments(rows) {
  return (rows || []).map(sh => {
    const { sample_items, ...rest } = sh
    return { ...rest, items: [...(sample_items || [])].sort((a, b) => (a.position || 0) - (b.position || 0)) }
  })
}
