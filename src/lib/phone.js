// Numero in formato internazionale senza '+': '333 123 4567' → '393331234567'.
// Un cellulare italiano scritto senza prefisso prende il +39.
export function intlPhone(raw) {
  let phone = (raw || '').replace(/[^\d+]/g, '')
  if (phone.startsWith('+')) phone = phone.slice(1)
  else if (phone.startsWith('00')) phone = phone.slice(2)
  else if (/^3\d{8,9}$/.test(phone)) phone = '39' + phone
  return phone.replace(/\D/g, '')
}
