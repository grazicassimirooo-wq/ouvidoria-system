// ================================================================
// PÁGINA: Casos — listagem, criação, edição, exclusão
// ================================================================

import { renderNavbar } from '../components/navbar.js'
import { onCasos, addCaso, updateCaso, deleteCaso } from '../firebase/service.js'
import { state } from '../main.js'
import {
  fmtDate, fmtDateInput, parseDate,
  ANALISTAS, OFENSORES, STATUS_LIST, FCR_LIST,
  statusBadgeClass, showToast, calcPrazo
} from '../utils/helpers.js'

let unsubCasos = null
let allCasos   = []
let editingId  = null

export async function render(app) {
  app.innerHTML = ''
  renderNavbar(app)

  const main = document.createElement('div')
  main.style.cssText = 'max-width:1500px;margin:0 auto;padding:24px 28px 60px;'
  app.appendChild(main)

  main.innerHTML = `
    <!-- Cabeçalho da página -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:24px;" class="fade-up-1">
      <div>
        <h2 style="font-family:var(--font-display);font-weight:800;font-size:26px;color:var(--ink);margin-bottom:4px;">
          📋 Casos
        </h2>
        <p style="font-size:14px;color:var(--muted);">Registre, edite e acompanhe os casos da Ouvidoria</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="btn-export" class="btn btn-secondary">
          📥 Exportar XLSX
        </button>
        <button id="btn-novo" class="btn btn-primary">
          + Novo Caso
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="glass fade-up-2" style="
      border-radius:var(--radius-md);padding:16px 20px;
      display:flex;flex-wrap:wrap;gap:14px;
      margin-bottom:20px;align-items:flex-end;
    ">
      <div class="field" style="flex:1;min-width:140px;">
        <label>Analista</label>
        <select id="f-analista">
          <option value="all">Todas</option>
          ${ANALISTAS.map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="flex:1;min-width:160px;">
        <label>Status</label>
        <select id="f-status">
          <option value="all">Todos</option>
          ${STATUS_LIST.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="flex:1;min-width:160px;">
        <label>Ofensor</label>
        <select id="f-ofensor">
          <option value="all">Todos</option>
          ${OFENSORES.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="flex:2;min-width:180px;">
        <label>Buscar (ID ou Analista)</label>
        <input type="text" id="f-busca" placeholder="ex: CG-2025-001">
      </div>
      <button id="btn-limpar-filtros" class="btn btn-secondary btn-sm">Limpar</button>
    </div>

    <!-- Contagem -->
    <div id="casos-count" style="font-size:13px;color:var(--muted);margin-bottom:10px;"></div>

    <!-- Tabela -->
    <div class="glass fade-up-3" style="border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-md);">
      <div class="table-wrap">
        <table class="data-table" id="tabela-casos">
          <thead>
            <tr>
              <th>ID Caso</th>
              <th>Recebimento</th>
              <th>Resposta</th>
              <th>Analista</th>
              <th>Ofensor</th>
              <th>Status</th>
              <th>CSAT</th>
              <th>FCR</th>
              <th>Prazo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="tbody-casos">
            <tr><td colspan="10" style="padding:40px;color:var(--muted);">
              <div class="spinner" style="margin:0 auto;"></div>
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Caso -->
    <div id="modal-caso" class="modal-overlay" style="display:none;">
      <div class="modal" style="max-width:640px;">
        <div class="modal-header">
          <span class="modal-title" id="modal-title">Novo Caso</span>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <form id="form-caso" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="field">
            <label>ID do Caso *</label>
            <input type="text" id="f-id" placeholder="ex: CG-2025-001" required>
          </div>
          <div class="field">
            <label>Analista *</label>
            <select id="f-analista-form" required>
              <option value="">Selecione</option>
              ${ANALISTAS.map(a => `<option value="${a}">${a}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Data Recebimento *</label>
            <input type="date" id="f-data-rec" required>
          </div>
          <div class="field">
            <label>Data Resposta</label>
            <input type="date" id="f-data-resp" placeholder="Deixe vazio se pendente">
          </div>
          <div class="field" style="grid-column:1/-1;">
            <label>Ofensor Principal *</label>
            <select id="f-ofensor-form" required>
              <option value="">Selecione</option>
              ${OFENSORES.map(o => `<option value="${o}">${o}</option>`).join('')}
              <option value="__outro__">✏️ Outro (especificar)</option>
            </select>
          </div>
          <div class="field" id="campo-outro-wrap" style="grid-column:1/-1;display:none;">
            <label>Especifique o assunto *</label>
            <input type="text" id="f-ofensor-outro" placeholder="Descreva o assunto do caso..." maxlength="80">
            <span style="font-size:11px;color:var(--muted);margin-top:3px;">Este assunto aparecerá no dashboard como novo ofensor.</span>
          </div>
          <div class="field">
            <label>Status Resolução *</label>
            <select id="f-status-form" required>
              <option value="">Selecione</option>
              ${STATUS_LIST.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Nota CSAT (1–5)</label>
            <input type="number" id="f-nota" min="1" max="5" step="0.1" placeholder="ex: 4.2">
          </div>
          <div class="field">
            <label>Acordo FCR</label>
            <select id="f-fcr">
              ${FCR_LIST.map(f => `<option value="${f}">${f}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="grid-column:1/-1;margin-top:8px;">
            <div id="form-error" style="display:none;background:var(--red-light);color:#7F1D1D;border-radius:8px;padding:10px 14px;font-size:13px;font-weight:600;margin-bottom:8px;"></div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
              <button type="button" id="btn-cancelar-form" class="btn btn-secondary">Cancelar</button>
              <button type="submit" id="btn-salvar-form" class="btn btn-primary">
                <span id="btn-salvar-txt">Salvar Caso</span>
                <div class="spinner" id="btn-salvar-spin" style="display:none;width:16px;height:16px;border-width:2px;"></div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Confirmar exclusão -->
    <div id="modal-delete" class="modal-overlay" style="display:none;">
      <div class="modal" style="max-width:400px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">🗑️</div>
        <h3 style="font-family:var(--font-display);font-weight:800;font-size:20px;color:var(--ink);margin-bottom:8px;">Excluir caso?</h3>
        <p style="font-size:14px;color:var(--muted);margin-bottom:24px;">Essa ação não pode ser desfeita.</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="btn-cancel-delete" class="btn btn-secondary">Cancelar</button>
          <button id="btn-confirm-delete" class="btn btn-danger">Excluir</button>
        </div>
      </div>
    </div>
  `

  bindEvents()
  startListener()
}

function bindEvents() {
  // Filtros
  ['f-analista','f-status','f-ofensor','f-busca'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderTable)
    document.getElementById(id)?.addEventListener('change', renderTable)
  })
  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('f-analista').value = 'all'
    document.getElementById('f-status').value   = 'all'
    document.getElementById('f-ofensor').value  = 'all'
    document.getElementById('f-busca').value    = ''
    renderTable()
  })

  // Novo caso
  document.getElementById('btn-novo').addEventListener('click', () => openModal())
  document.getElementById('modal-close-btn').addEventListener('click', closeModal)
  document.getElementById('btn-cancelar-form').addEventListener('click', closeModal)
  document.getElementById('modal-caso').addEventListener('click', (e) => {
    if (e.target.id === 'modal-caso') closeModal()
  })

  // Toggle campo "Outro"
  document.getElementById('f-ofensor-form').addEventListener('change', function() {
    const wrap = document.getElementById('campo-outro-wrap')
    const input = document.getElementById('f-ofensor-outro')
    if (this.value === '__outro__') {
      wrap.style.display = 'block'
      input.required = true
      input.focus()
    } else {
      wrap.style.display = 'none'
      input.required = false
      input.value = ''
    }
  })

  // Salvar
  document.getElementById('form-caso').addEventListener('submit', handleSave)

  // Export
  document.getElementById('btn-export').addEventListener('click', () => {
    const { exportarPlanilha } = import('../utils/helpers.js').then(m => {
      m.exportarPlanilha(allCasos)
    })
  })
  document.getElementById('btn-export').addEventListener('click', async () => {
    const { exportarPlanilha } = await import('../utils/helpers.js')
    exportarPlanilha(allCasos)
    showToast('Exportando planilha...', 'info')
  })

  // Delete modal
  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    document.getElementById('modal-delete').style.display = 'none'
  })
}

function startListener() {
  if (unsubCasos) unsubCasos()
  unsubCasos = onCasos((casos) => {
    allCasos = casos
    state.unsubs.push(unsubCasos)
    renderTable()
  })
}

function getFilters() {
  return {
    analista: document.getElementById('f-analista')?.value || 'all',
    status:   document.getElementById('f-status')?.value   || 'all',
    ofensor:  document.getElementById('f-ofensor')?.value  || 'all',
    busca:    (document.getElementById('f-busca')?.value   || '').toLowerCase()
  }
}

function renderTable() {
  const f = getFilters()

  // Atualiza select de ofensores com valores customizados presentes nos casos
  const selectOfensor = document.getElementById('f-ofensor')
  if (selectOfensor) {
    const ofensoresUnicos = [...new Set(allCasos.map(c => c.ofensorPrincipal).filter(Boolean))]
    const valorAtual = selectOfensor.value
    selectOfensor.innerHTML = `<option value="all">Todos</option>` +
      ofensoresUnicos.map(o => `<option value="${o}" ${valorAtual===o?'selected':''}>${o}</option>`).join('')
  }
  const filtered = allCasos.filter(c => {
    if (f.analista !== 'all' && c.analista !== f.analista) return false
    if (f.status   !== 'all' && c.statusResolucao !== f.status) return false
    if (f.ofensor  !== 'all' && c.ofensorPrincipal !== f.ofensor) return false
    if (f.busca && !`${c.idCaso} ${c.analista}`.toLowerCase().includes(f.busca)) return false
    return true
  })

  const count = document.getElementById('casos-count')
  if (count) count.textContent = `${filtered.length} caso${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`

  const tbody = document.getElementById('tbody-casos')
  if (!tbody) return

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="padding:40px;color:var(--muted);font-size:14px;">
      Nenhum caso encontrado para os filtros selecionados.
    </td></tr>`
    return
  }

  tbody.innerHTML = filtered.map(c => {
    const prazo = calcPrazo(c.dataRecebimento, c.dataResposta)
    const prazoTxt = prazo !== null ? `${prazo}d` : '—'
    const prazoColor = prazo !== null && prazo > 10 ? 'color:var(--red);font-weight:700' : ''
    const isAdmin = state.profile?.role === 'admin'
    const isOwner = c.analista === (state.profile?.name || state.user?.displayName)

    return `<tr>
      <td class="col-left" style="font-family:var(--font-display);font-weight:700;font-size:13px;">${c.idCaso || '—'}</td>
      <td>${fmtDate(c.dataRecebimento)}</td>
      <td>${fmtDate(c.dataResposta)}</td>
      <td><span class="badge badge-sand">${c.analista || '—'}</span></td>
      <td style="font-size:12.5px;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.ofensorPrincipal || '—'}</td>
      <td><span class="badge ${statusBadgeClass(c.statusResolucao)}">${c.statusResolucao || '—'}</span></td>
      <td>${c.notaCSAT ? `⭐ ${Number(c.notaCSAT).toFixed(1)}` : '—'}</td>
      <td><span class="badge ${c.acordoFCR === 'Sim' ? 'badge-green' : 'badge-sand'}">${c.acordoFCR || 'Não'}</span></td>
      <td style="${prazoColor}">${prazoTxt}</td>
      <td>
        <div style="display:flex;gap:6px;justify-content:center;">
          ${(isAdmin || isOwner) ? `<button class="btn btn-secondary btn-sm" onclick="window.__editCaso('${c.id}')">✏️</button>` : ''}
          ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="window.__deleteCaso('${c.id}')">🗑️</button>` : ''}
        </div>
      </td>
    </tr>`
  }).join('')

  // Expõe globalmente
  window.__editCaso   = openModalEdit
  window.__deleteCaso = openModalDelete
}

function openModal(data = null) {
  editingId = data?.id || null
  const title = document.getElementById('modal-title')
  title.textContent = editingId ? '✏️ Editar Caso' : '➕ Novo Caso'

  document.getElementById('f-id').value           = data?.idCaso || ''
  document.getElementById('f-analista-form').value = data?.analista || ''
  document.getElementById('f-data-rec').value      = fmtDateInput(data?.dataRecebimento) || ''
  document.getElementById('f-data-resp').value     = fmtDateInput(data?.dataResposta) || ''
  const isOutro = data?.ofensorPrincipal && !OFENSORES.includes(data.ofensorPrincipal)
  document.getElementById('f-ofensor-form').value  = isOutro ? '__outro__' : (data?.ofensorPrincipal || '')
  const campoOutroWrap = document.getElementById('campo-outro-wrap')
  const campoOutroInput = document.getElementById('f-ofensor-outro')
  if (isOutro) {
    campoOutroWrap.style.display = 'block'
    campoOutroInput.value = data.ofensorPrincipal
    campoOutroInput.required = true
  } else {
    campoOutroWrap.style.display = 'none'
    campoOutroInput.value = ''
    campoOutroInput.required = false
  }
  document.getElementById('f-status-form').value   = data?.statusResolucao || ''
  document.getElementById('f-nota').value           = data?.notaCSAT || ''
  document.getElementById('f-fcr').value            = data?.acordoFCR || 'Não'

  document.getElementById('form-error').style.display = 'none'
  document.getElementById('modal-caso').style.display = 'flex'
}

function openModalEdit(id) {
  const caso = allCasos.find(c => c.id === id)
  if (caso) openModal(caso)
}

function openModalDelete(id) {
  const modal = document.getElementById('modal-delete')
  modal.style.display = 'flex'
  document.getElementById('btn-confirm-delete').onclick = async () => {
    modal.style.display = 'none'
    try {
      await deleteCaso(id)
      showToast('Caso excluído.', 'success')
    } catch(e) {
      showToast('Erro ao excluir: ' + e.message, 'error')
    }
  }
}

function closeModal() {
  document.getElementById('modal-caso').style.display = 'none'
  editingId = null
}

async function handleSave(e) {
  e.preventDefault()
  const errEl   = document.getElementById('form-error')
  const btn     = document.getElementById('btn-salvar-form')
  const btnTxt  = document.getElementById('btn-salvar-txt')
  const btnSpin = document.getElementById('btn-salvar-spin')
  errEl.style.display = 'none'

  const selectOfensor = document.getElementById('f-ofensor-form').value
  const ofensorFinal = selectOfensor === '__outro__'
    ? document.getElementById('f-ofensor-outro').value.trim()
    : selectOfensor

  const dataRec  = parseDate(document.getElementById('f-data-rec').value)
  const dataResp = document.getElementById('f-data-resp').value
    ? parseDate(document.getElementById('f-data-resp').value)
    : null

  const payload = {
    idCaso:           document.getElementById('f-id').value.trim(),
    analista:         document.getElementById('f-analista-form').value,
    dataRecebimento:  dataRec,
    dataResposta:     dataResp,
    ofensorPrincipal: ofensorFinal,
    statusResolucao:  document.getElementById('f-status-form').value,
    notaCSAT:         document.getElementById('f-nota').value
                        ? Number(document.getElementById('f-nota').value)
                        : null,
    acordoFCR:        document.getElementById('f-fcr').value,
    criadoPor:        state.user?.uid
  }

  if (!payload.idCaso || !payload.analista || !payload.dataRecebimento || !payload.ofensorPrincipal || !payload.statusResolucao) {
    errEl.textContent = 'Preencha todos os campos obrigatórios (*).'
    errEl.style.display = 'block'
    return
  }

  btn.disabled = true
  btnTxt.textContent = 'Salvando...'
  btnSpin.style.display = 'inline-block'

  try {
    if (editingId) {
      await updateCaso(editingId, payload)
      showToast('Caso atualizado! ✅', 'success')
    } else {
      await addCaso(payload)
      showToast('Caso registrado! ✅', 'success')
    }
    closeModal()
  } catch(err) {
    errEl.textContent = 'Erro ao salvar: ' + err.message
    errEl.style.display = 'block'
  } finally {
    btn.disabled = false
    btnTxt.textContent = 'Salvar Caso'
    btnSpin.style.display = 'none'
  }
}