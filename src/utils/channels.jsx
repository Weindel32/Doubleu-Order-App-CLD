// Canali di origine dei prospect: unica lista per desktop, mobile e Analytics.
// I canali 'ia…' = contatto arrivato da una ricerca su un assistente IA.
// Tenuti separati da 'web' per misurare quanto porta la presenza nelle risposte IA;
// il suffisso indica quale IA, se il contatto lo dice ('ia' = non specificata).
export const BASE_CHANNELS = ['linkedin','referral','fiera','outbound','web','instagram','facebook']
export const AI_CHANNELS   = ['ia','ia-chatgpt','ia-gemini','ia-perplexity','ia-claude','ia-copilot']
export const CHANNELS      = [...BASE_CHANNELS, ...AI_CHANNELS]

const AI_NAMES = {
  'ia': 'non specificata', 'ia-chatgpt': 'ChatGPT', 'ia-gemini': 'Gemini',
  'ia-perplexity': 'Perplexity', 'ia-claude': 'Claude', 'ia-copilot': 'Copilot',
}

export const isAiChannel = (c) => c === 'ia' || (typeof c === 'string' && c.startsWith('ia-'))

// Voce nel menu a tendina (dentro il gruppo "IA" basta il nome dello strumento)
export const aiOption = (c) => AI_NAMES[c] || c.replace(/^ia-/, '')
// Etichetta compatta per liste, schede e Analytics
export const channelLabel = (c) => {
  if (!c) return ''
  if (c === 'ia') return 'IA'
  if (isAiChannel(c)) return `IA · ${aiOption(c)}`
  return c
}

// <option> per i <select> del canale: canali classici + gruppo IA
export function ChannelOptions() {
  return (
    <>
      {BASE_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
      <optgroup label="IA (ricerca su assistente IA)">
        {AI_CHANNELS.map(c => <option key={c} value={c}>{aiOption(c)}</option>)}
      </optgroup>
    </>
  )
}
