// ================================================================
// UTILS — formatação, parser de planilha, exportação
// ================================================================

// ── Formatação de data (Timestamp Firestore → string)
export const fmtDate = (val) => {
  if (!val) return '—'
  const d = val?.toDate ? val.toDate() : new Date(val)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('pt-BR')
}

export const fmtDateInput = (val) => {
  if (!val) return ''
  const d = val?.toDate ? val.toDate() : new Date(val)
  if (isNaN(d)) return ''
  return d.toISOString().split('T')[0]
}

export const parseDate = (str) => str ? new Date(str) : null

export const semanaISO = (date) => {
  if (!date) return null
  const d = date?.toDate ? date.toDate() : new Date(date)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const diff = (d - jan4) / 86400000
  return Math.floor((diff + jan4.getDay() + 1) / 7) + 1
}

// ── Calcular prazo em dias
export const calcPrazo = (recebimento, resposta) => {
  if (!recebimento || !resposta) return null
  const a = recebimento?.toDate ? recebimento.toDate() : new Date(recebimento)
  const b = resposta?.toDate   ? resposta.toDate()    : new Date(resposta)
  return Math.round((b - a) / 86400000)
}

// ── Obter semana formatada
export const semanaLabel = (n) => `Semana ${n}`

// ── Listas de opções
export const ANALISTAS   = ['Giovana', 'Gisele', 'Jussara']
export const OFENSORES   = [
  'Bloqueio/encerramento',
  'Golpe',
  'Invasão de conta',
  'Emissão',
  'Consignado',
  'Outros'
]
export const STATUS_LIST = ['Resolvido', 'Improcedente', 'Cancelada/Recusada', 'Em Andamento']
export const FCR_LIST    = ['Sim', 'Não']
export const ROLES       = ['admin', 'analista']

// ── Badge de status
export const statusBadgeClass = (s) => {
  const map = {
    'Resolvido':          'badge-green',
    'Improcedente':       'badge-yellow',
    'Cancelada/Recusada': 'badge-red',
    'Em Andamento':       'badge-blue'
  }
  return map[s] || 'badge-sand'
}

// ──────────────────────────────────────────
// PARSER — Planilha XLSX → array de casos
// ──────────────────────────────────────────
export const parsePlanilha = async (file) => {
  // Usa SheetJS via CDN (importado no main.js)
  const XLSX = window.XLSX
  if (!XLSX) throw new Error('Biblioteca XLSX não carregada.')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data  = new Uint8Array(e.target.result)
        const wb    = XLSX.read(data, { type: 'array', cellDates: true })
        const ws    = wb.Sheets[wb.SheetNames.find(n => n === 'Casos') || wb.SheetNames[0]]
        const rows  = XLSX.utils.sheet_to_json(ws, { defval: '' })

        const casos = rows
          .filter(r => r['ID Caso'] || r['Analista'])
          .map(r => ({
            idCaso:           String(r['ID Caso'] || '').trim(),
            dataRecebimento:  parseExcelDate(r['Data Recebimento']),
            dataResposta:     parseExcelDate(r['Data Resposta']) || null,
            analista:         String(r['Analista'] || '').trim(),
            ofensorPrincipal: String(r['Ofensor Principal'] || '').trim(),
            statusResolucao:  String(r['Status Resolução'] || '').trim(),
            notaCSAT:         Number(r['Nota CSAT (1-5)']) || null,
            acordoFCR:        String(r['Acordo FCR'] || 'Não').trim(),
          }))
          .filter(c => c.analista && c.dataRecebimento)

        resolve(casos)
      } catch(err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function parseExcelDate(val) {
  if (!val) return null
  if (val instanceof Date && !isNaN(val)) return val
  if (typeof val === 'string' && val.trim()) {
    // Tenta dd/mm/yyyy
    const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (m) return new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`)
    return new Date(val)
  }
  if (typeof val === 'number') {
    // Serial Excel
    return new Date(Math.round((val - 25569) * 86400 * 1000))
  }
  return null
}

// ──────────────────────────────────────────
// CÁLCULOS DE KPI para o dashboard
// ──────────────────────────────────────────
export const calcKPIs = (casos) => {
  const total     = casos.length
  const resolvidos = casos.filter(c => c.statusResolucao === 'Resolvido').length
  const prazos    = casos
    .map(c => calcPrazo(c.dataRecebimento, c.dataResposta))
    .filter(p => p !== null && p >= 0)
  const notas     = casos.map(c => Number(c.notaCSAT)).filter(n => n > 0)
  const expirados = prazos.filter(p => p > 10).length

  return {
    total,
    resolutividade: total ? (resolvidos / total) : 0,
    prazoMedio:     prazos.length ? prazos.reduce((a,b) => a+b, 0) / prazos.length : 0,
    csat:           notas.length  ? notas.reduce((a,b) => a+b, 0)  / notas.length  : 0,
    expirados
  }
}

export const calcPorAnalista = (casos) => {
  const analistas = [...new Set(casos.map(c => c.analista))].sort()
  return analistas.map(nome => {
    const sub = casos.filter(c => c.analista === nome)
    const resp = sub.filter(c => c.dataResposta)
    const pend = sub.filter(c => !c.dataResposta)
    const prazos = resp.map(c => calcPrazo(c.dataRecebimento, c.dataResposta)).filter(p => p !== null && p >= 0)
    const notas  = sub.map(c => Number(c.notaCSAT)).filter(n => n > 0)
    const resolvidos = sub.filter(c => c.statusResolucao === 'Resolvido').length
    const fcr    = sub.filter(c => c.acordoFCR === 'Sim').length
    return {
      analista:       nome,
      atribuidos:     sub.length,
      respondidos:    resp.length,
      pendentes:      pend.length,
      prazoMedio:     prazos.length ? prazos.reduce((a,b)=>a+b,0)/prazos.length : 0,
      resolutividade: sub.length ? resolvidos/sub.length : 0,
      notaMedia:      notas.length ? notas.reduce((a,b)=>a+b,0)/notas.length : 0,
      fcr
    }
  })
}

export const calcPorOfensor = (casos) => {
  const total = casos.length
  const counts = {}
  casos.forEach(c => { counts[c.ofensorPrincipal] = (counts[c.ofensorPrincipal]||0) + 1 })
  return Object.entries(counts)
    .sort((a,b) => b[1]-a[1])
    .map(([nome, vol]) => ({ nome, volume: vol, pct: total ? vol/total : 0 }))
}

export const calcPorStatus = (casos) => {
  const total = casos.length
  const counts = {}
  casos.forEach(c => { counts[c.statusResolucao] = (counts[c.statusResolucao]||0) + 1 })
  return Object.entries(counts)
    .map(([status, vol]) => ({ status, volume: vol, pct: total ? vol/total : 0 }))
}

export const calcEvolucaoSemanal = (casos) => {
  const semanas = {}
  casos.forEach(c => {
    if (!c.dataResposta) return
    const s = semanaISO(c.dataRecebimento)
    if (!s) return
    if (!semanas[s]) semanas[s] = {}
    const a = c.analista
    if (!semanas[s][a]) semanas[s][a] = []
    const p = calcPrazo(c.dataRecebimento, c.dataResposta)
    if (p !== null && p >= 0) semanas[s][a].push(p)
  })
  return Object.entries(semanas)
    .sort((a,b) => Number(a[0])-Number(b[0]))
    .map(([sem, por_analista]) => {
      const entry = { semana: `Sem ${sem}` }
      Object.entries(por_analista).forEach(([a, prazos]) => {
        entry[a] = prazos.reduce((s,v)=>s+v,0)/prazos.length
      })
      return entry
    })
}

// ──────────────────────────────────────────
// EXPORT — gera planilha XLSX para download
// ──────────────────────────────────────────
export const exportarPlanilha = (casos) => {
  const XLSX = window.XLSX
  if (!XLSX) { alert('XLSX não carregado'); return }

  const rows = casos.map(c => ({
    'ID Caso':          c.idCaso,
    'Data Recebimento': fmtDate(c.dataRecebimento),
    'Data Resposta':    fmtDate(c.dataResposta),
    'Analista':         c.analista,
    'Ofensor Principal': c.ofensorPrincipal,
    'Status Resolução': c.statusResolucao,
    'Nota CSAT (1-5)':  c.notaCSAT || '',
    'Acordo FCR':       c.acordoFCR,
    'Prazo (dias)':     calcPrazo(c.dataRecebimento, c.dataResposta) ?? '',
    'SLA Expirado?':    (calcPrazo(c.dataRecebimento, c.dataResposta) ?? 0) > 10 ? 'Sim' : 'Não',
    'Semana ISO':       semanaISO(c.dataRecebimento) ?? ''
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Casos')
  XLSX.writeFile(wb, `ouvidoria_export_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ──────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────
export const showToast = (msg, type = 'success', duration = 3500) => {
  const container = document.getElementById('toast-container') ||
    (() => {
      const el = document.createElement('div')
      el.id = 'toast-container'
      document.body.appendChild(el)
      return el
    })()

  const t = document.createElement('div')
  const icons = { success: '✅', error: '❌', info: 'ℹ️' }
  t.className = `toast toast-${type}`
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span> ${msg}`
  container.appendChild(t)
  setTimeout(() => t.remove(), duration)
}
