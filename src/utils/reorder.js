import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'

const emptySizes = () => ({
  adult: Object.fromEntries(ADULT_SIZES.map(sz => [sz, 0])),
  kids: Object.fromEntries(KIDS_SIZES.map(sz => [sz, 0])),
  uni: 0,
})

// Prepara un ordine passato per essere riproposto come nuovo ordine: stessi
// articoli, colori, personalizzazioni e prezzi (da riconfermare), ma
// quantità e taglie ripartono da zero — un riordino non è mai "uguale
// all'ultimo", è una richiesta nuova sullo stesso prodotto (es. i nuovi
// allievi arrivati a metà stagione non hanno le taglie dei primi iscritti).
export function buildReorderSeed(order) {
  return {
    ...order,
    sourceId: order.id,
    id: undefined,
    date: undefined,
    deliveryDate: null,
    actualDeliveryDate: null,
    status: 'PREVENTIVO',
    lost: false, lostReason: null, lostDate: null,
    cancelReason: null, cancelDate: null,
    convertedFromQuote: false,
    invoiceNumber: '',
    shipping: 0,
    orderNote: `Riordino di ${order.id}`,
    payments: [],
    kits: (order.kits || []).map(kit => ({
      ...kit,
      quantity: null,
      articles: (kit.articles || []).map(art => ({
        ...art,
        delivered: false,
        omaggio: 0,
        estimatedQty: null,
        sizes: emptySizes(),
      })),
    })),
  }
}
