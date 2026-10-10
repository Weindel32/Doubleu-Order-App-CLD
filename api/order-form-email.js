// Invia al cliente il modulo taglie con una email impaginata DOUBLEU, via
// Resend, dal dominio verificato doubleutennis.com.
//
// Solo per utenti di Order App (sessione obbligatoria): il modulo si legge
// con la sessione di chi invia, quindi passano le stesse regole di accesso
// dell'app. Le risposte del cliente arrivano a chi ha inviato (reply-to),
// che riceve a parte una copia interna, senza link al modulo, se lo chiede.
//
// Configurazione su Vercel:
//   RESEND_API_KEY      obbligatoria
//   ORDER_FORM_FROM     facoltativa, default "DOUBLEU <ordini@doubleutennis.com>"
//   ORDER_FORM_REPLY_TO facoltativa: casella di lavoro per risposte del cliente
//                       e "copia a me"; senza, si usa l'email del login.

import { createClient } from '@supabase/supabase-js'
import { requireUser } from './_auth.js'
import { APP_URL } from './_todoist.js'

const SUPABASE_URL = 'https://bixayovstdptbgauvsgm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_pKpjPbw4a0HSEIWbf2ZXvA_svT70I3v'
const DEFAULT_FROM = 'DOUBLEU <ordini@doubleutennis.com>'

const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const fmtDate = (iso) => new Date(iso).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long' })

// Email in tabelle e stili in linea: e' quello che Gmail, Outlook e Mail
// rendono in modo affidabile. Stessa palette della pagina del modulo.
// copyFor: { to, at } per la copia interna a DOUBLEU. Stesso testo e stessi
// articoli del cliente, ma con un riquadro "Copia" in testa e senza pulsante
// ne' link al modulo: aprirlo da li' vorrebbe dire compilarlo al posto del
// cliente. Al loro posto, il pulsante per l'app.
export function buildEmail({ firstName, clientName, orderId, lines, url, expiresAt, copyFor = null }) {
  const greeting = firstName ? `Ciao ${esc(firstName)},` : 'Buongiorno,'
  const rows = lines.map(l => `
    <tr>
      <td style="padding:10px 0;border-top:1px solid #e4dccd;font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#111d38;">
        ${esc(l.description || l.category || 'Articolo')}
        ${l.color ? `<span style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#b4532c;">&nbsp;${esc(l.color)}</span>` : ''}
      </td>
    </tr>`).join('')
  const expiry = expiresAt
    ? `<p style="margin:0 0 6px;font-size:13px;color:#5f6a80;">Il modulo è compilabile fino al <b style="color:#111d38;">${esc(fmtDate(expiresAt))}</b>.</p>`
    : ''

  const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Modulo taglie DOUBLEU</title></head>
<body style="margin:0;padding:0;background:#f6f2ea;">
  <div style="display:none;max-height:0;overflow:hidden;">Indicate le taglie del vostro ordine DOUBLEU, anche dal telefono.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ea;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:8px;color:#111d38;">DOUBLEU</div>
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#8c6d3a;text-transform:uppercase;margin-top:6px;">Modulo taglie</div>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e4dccd;border-radius:12px;padding:28px 26px;font-family:Helvetica,Arial,sans-serif;color:#111d38;">
          ${copyFor ? `<div style="background:#f6f2ea;border:1px dashed #b8965a;border-radius:8px;padding:12px 14px;margin:0 0 22px;font-size:13px;color:#5f6a80;line-height:1.5;">
            <b style="color:#8c6d3a;letter-spacing:1px;text-transform:uppercase;font-size:11px;">Copia per DOUBLEU</b><br>
            Inviata a <b style="color:#111d38;">${esc(copyFor.to)}</b> il ${esc(copyFor.at)}. Qui sotto il testo ricevuto dal cliente, senza il link al modulo.
          </div>` : ''}
          <p style="margin:0 0 14px;font-size:15px;">${greeting}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#2b3550;">
            per completare l'ordine${clientName ? ` di <b>${esc(clientName)}</b>` : ''} ci servono le taglie dei capi.
            Le potete inserire direttamente dal modulo: si compila anche dal telefono e si salva da solo,
            così potete raccogliere le taglie con calma e inviarle quando siete pronti.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="padding-bottom:6px;font-size:10px;letter-spacing:2px;color:#8c6d3a;text-transform:uppercase;">Articoli · ordine ${esc(orderId)}</td></tr>
            ${rows}
          </table>
          ${copyFor ? `
          <p style="margin:0 0 18px;font-size:13px;color:#9aa3b5;font-style:italic;text-align:center;">[ qui il cliente trova il pulsante «Compila le taglie» ]</p>
          ${expiry}
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:18px auto 0;">
            <tr><td align="center" style="border-radius:8px;border:1px solid #111d38;">
              <a href="${esc(APP_URL)}" style="display:inline-block;padding:12px 26px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:#111d38;text-decoration:none;">Apri Order App</a>
            </td></tr>
          </table>` : `
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 22px;">
            <tr><td align="center" bgcolor="#111d38" style="border-radius:8px;">
              <a href="${esc(url)}" style="display:inline-block;padding:16px 34px;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:#ffffff;text-decoration:none;">Compila le taglie</a>
            </td></tr>
          </table>
          ${expiry}
          <p style="margin:0;font-size:12px;color:#9aa3b5;line-height:1.6;">Se il pulsante non funziona, copiate questo indirizzo nel browser:<br><a href="${esc(url)}" style="color:#8c6d3a;word-break:break-all;">${esc(url)}</a></p>`}
        </td></tr>
        <tr><td align="center" style="padding:22px 10px 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#5f6a80;line-height:1.6;">
          Per qualsiasi dubbio rispondete pure a questa email.<br>
          <span style="color:#8c6d3a;letter-spacing:2px;">DOUBLEU</span> · Made in Italy
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const text = [
    ...(copyFor ? [`[COPIA PER DOUBLEU — inviata a ${copyFor.to} il ${copyFor.at}, senza link al modulo]`, ''] : []),
    firstName ? `Ciao ${firstName},` : 'Buongiorno,',
    '',
    `per completare l'ordine${clientName ? ` di ${clientName}` : ''} ci servono le taglie dei capi.`,
    'Le potete inserire dal modulo, anche dal telefono: si salva da solo e lo inviate quando siete pronti.',
    '',
    `Articoli (ordine ${orderId}):`,
    ...lines.map(l => `· ${l.description || l.category || 'Articolo'}${l.color ? ' ' + l.color : ''}`),
    '',
    copyFor ? `Order App: ${APP_URL}` : `Compila le taglie: ${url}`,
    expiresAt ? `Compilabile fino al ${fmtDate(expiresAt)}.` : '',
    '',
    'Per qualsiasi dubbio rispondete pure a questa email.',
    'DOUBLEU',
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n')

  return { html, text }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo non consentito' })
  }
  const user = await requireUser(req, res)
  if (!user) return

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('order-form-email: RESEND_API_KEY mancante')
    return res.status(500).json({ error: 'Invio email non configurato: manca RESEND_API_KEY su Vercel' })
  }

  const { token, to, firstName, url, copyToMe } = req.body || {}
  const recipient = String(to || '').trim()
  if (!EMAIL_RE.test(recipient)) return res.status(400).json({ error: 'Indirizzo email non valido' })
  if (typeof token !== 'string' || !/^[A-Za-z0-9]{20,64}$/.test(token)) return res.status(400).json({ error: 'Token non valido' })
  // Il link deve essere quello di questo modulo: niente indirizzi arbitrari
  // dentro una mail che parte dal dominio DOUBLEU.
  if (typeof url !== 'string' || !/^https:\/\/[a-z0-9.-]+\/(taglie|m)\/[A-Za-z0-9]{20,64}$/i.test(url) || !url.endsWith(`/${token}`)) {
    return res.status(400).json({ error: 'Link del modulo non valido' })
  }

  try {
    const jwt = (req.headers.authorization || '').slice(7)
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: form, error } = await supabase
      .from('order_forms').select('order_id, client_name, lines, status, expires_at').eq('token', token).maybeSingle()
    if (error) throw new Error(`Supabase: ${error.message}`)
    if (!form || form.status === 'revocato') return res.status(404).json({ error: 'Modulo non trovato o revocato' })

    const emailData = {
      firstName: (s => s.charAt(0).toUpperCase() + s.slice(1))(String(firstName || '').trim().slice(0, 40)),
      clientName: form.client_name, orderId: form.order_id, lines: form.lines || [], url,
      expiresAt: form.expires_at,
    }
    const { html, text } = buildEmail(emailData)

    const replyTo = (process.env.ORDER_FORM_REPLY_TO || '').trim() || user.email
    const payload = {
      from: process.env.ORDER_FORM_FROM || DEFAULT_FROM,
      to: [recipient],
      subject: `DOUBLEU · Taglie per il vostro ordine ${form.order_id}`,
      html, text,
      ...(replyTo ? { reply_to: [replyTo] } : {}),
      tags: [{ name: 'tipo', value: 'modulo_taglie' }],
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      console.error('order-form-email: Resend', r.status, data)
      return res.status(502).json({ error: 'Resend ha rifiutato l\'invio', detail: String(data.message || r.status).slice(0, 300) })
    }
    // Copia interna, separata e senza link al modulo (vedi buildEmail).
    // Best-effort: se non parte, l'email al cliente e' comunque andata.
    let copy = 'no'
    if (copyToMe && replyTo) {
      const at = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      const c = buildEmail({ ...emailData, copyFor: { to: recipient, at } })
      const rc = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: payload.from, to: [replyTo],
          subject: `Copia · ${payload.subject} · inviata a ${recipient}`,
          html: c.html, text: c.text,
          tags: [{ name: 'tipo', value: 'modulo_taglie_copia' }],
        }),
      }).catch(e => { console.error('order-form-email: copia', e); return null })
      copy = rc && rc.ok ? 'sent' : 'error'
      if (rc && !rc.ok) console.error('order-form-email: copia Resend', rc.status, await rc.text().catch(() => ''))
    }
    return res.status(200).json({ id: data.id, copy })
  } catch (err) {
    console.error('order-form-email: errore imprevisto', err)
    return res.status(500).json({ error: 'Errore imprevisto nell\'invio', detail: String(err && err.message || err).slice(0, 300) })
  }
}
