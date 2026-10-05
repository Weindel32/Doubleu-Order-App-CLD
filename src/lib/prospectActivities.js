// Scritture del registro attività dei prospect, con i loro effetti:
// prossima azione del prospect ricalcolata e promemoria Todoist dei
// passi da fare aperti, aggiornati o chiusi.
//
// Prima si salva in Order App, poi si allinea Todoist. Se Todoist non
// risponde il salvataggio resta valido: l'errore torna come avviso, da
// mostrare senza bloccare.

import {
  addProspectActivity, updateProspectActivity, patchProspectActivity,
  deleteProspectActivity, refreshNextActionDate,
} from './dataService.js'
import { syncProspectStep } from './todoist.js'
import { todoistTitle, dayToTimestamp, actDay, isPlanned } from './activities.js'

const findAct = (prospect, id) => (prospect.prospect_activities || []).find(a => a.id === id) || null

async function runTodoist(ops, prospect, warnings) {
  for (const [action, act] of ops) {
    try {
      if (action === 'close') {
        if (act.todoist_task_id) await syncProspectStep('close', { taskId: act.todoist_task_id })
        continue
      }
      const data = await syncProspectStep('upsert', {
        taskId:       act.todoist_task_id,
        activityId:   act.id,
        prospectName: prospect.name,
        content:      todoistTitle(act, prospect.name),
        dueDate:      actDay(act),
      })
      if (data.taskId && String(data.taskId) !== String(act.todoist_task_id || '')) {
        await patchProspectActivity(act.id, { todoist_task_id: String(data.taskId) })
      }
    } catch (err) {
      console.error('Todoist: promemoria prospect non sincronizzato', err)
      warnings.push(`Promemoria Todoist non aggiornato (${err.message || 'errore'}).`)
    }
  }
}

// Salva un'attività (nuova o modificata) e, se indicati, il prossimo
// passo da creare e il passo aperto che questo sostituisce.
//
//   activity  { id?, type, date, content, direction, outcome, status, reward_* }
//             Un'attività da fare salvata con status 'fatta' è un passo
//             completato: il suo promemoria si chiude.
//   nextStep  { type, date, content } → nuova attività da fare
//   replaceId id di un'attività da fare che passa a 'sostituita'
export async function saveProspectActivity(prospect, { activity, nextStep, replaceId }) {
  const warnings = []
  const todoist  = []
  const now      = new Date().toISOString()

  const existing   = activity.id ? findAct(prospect, activity.id) : null
  const status     = activity.status || existing?.status || 'fatta'
  const completing = !!existing && isPlanned(existing) && status === 'fatta'

  const row = {
    ...activity,
    status,
    created_at: dayToTimestamp(activity.date),
    // Un passo da fare non ha ancora esito né verso: li riceve quando è fatto.
    ...(status === 'da_fare' ? { outcome: null, direction: null } : {}),
    ...(completing ? { completed_at: now } : {}),
  }

  let saved
  if (existing) {
    if (!await updateProspectActivity(existing.id, row)) return { ok: false, warnings }
    saved = { ...existing, ...row }
  } else {
    saved = await addProspectActivity(prospect.id, row)
    if (!saved) return { ok: false, warnings }
  }
  if (status === 'da_fare') todoist.push(['upsert', saved])
  if (completing) todoist.push(['close', existing])

  if (replaceId && replaceId !== saved.id) {
    const old = findAct(prospect, replaceId)
    if (old && isPlanned(old)) {
      if (await patchProspectActivity(old.id, { status: 'sostituita', completed_at: now })) todoist.push(['close', old])
      else warnings.push('Il passo precedente non è stato chiuso, chiudilo a mano.')
    }
  }

  if (nextStep && nextStep.date) {
    const step = await addProspectActivity(prospect.id, {
      type: nextStep.type, content: nextStep.content, status: 'da_fare',
      created_at: dayToTimestamp(nextStep.date),
    })
    if (step) todoist.push(['upsert', step])
    else warnings.push('Prossimo passo non salvato, riprova.')
  }

  if (!await refreshNextActionDate(prospect.id)) warnings.push('Prossima azione del prospect non aggiornata.')
  await runTodoist(todoist, prospect, warnings)
  return { ok: true, warnings }
}

export async function removeProspectActivity(prospect, act) {
  const warnings = []
  if (!await deleteProspectActivity(act.id)) return { ok: false, warnings }
  if (isPlanned(act)) {
    await refreshNextActionDate(prospect.id)
    await runTodoist([['close', act]], prospect, warnings)
  }
  return { ok: true, warnings }
}

// Un club ibernato passa a Prospect Finder, che da lì ne gestisce il
// ricontatto: i passi ancora aperti in Order App si chiudono, insieme
// ai loro promemoria, così non restano due fonti per lo stesso club.
export async function retireOpenSteps(prospect) {
  const warnings = []
  const open = (prospect.prospect_activities || []).filter(isPlanned)
  if (!open.length) return { ok: true, warnings }
  const now = new Date().toISOString()
  const closed = []
  for (const act of open) {
    if (await patchProspectActivity(act.id, { status: 'sostituita', completed_at: now })) closed.push(['close', act])
  }
  await refreshNextActionDate(prospect.id)
  await runTodoist(closed, prospect, warnings)
  return { ok: true, warnings }
}
