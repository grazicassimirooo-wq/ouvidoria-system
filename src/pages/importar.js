// ================================================================
// PÁGINA: Importar — upload de planilha XLSX para o Firestore
// ================================================================

import { renderNavbar } from '../components/navbar.js'
import { importCasosLote, uploadPlanilha } from '../firebase/service.js'
import { parsePlanilha, showToast, fmtDate, statusBadgeClass } from '../utils/helpers.js'
import { state } from '../main.js'

export async function render(app) {
  app.innerHTML = ''
  renderNavbar(app)

  const main = document.createElement('div')
  main.style.cssText = 'max-width:1100px;margin:0 auto;padding:24px 28px 60px;'
  app.appendChild(main)

  main.innerHTML = `
    <div class="fade-up-1" style="margin-bottom:28px;">
      <h2 style="font-family:var(--font-display);font-weight:800;font-size:26px;color:var(--ink);margin-bottom:4px;">
        📥 Importar Planilha
      </h2>
      <p style="font-size:14px;color:var(--muted);">Suba a planilha de alimentação (.xlsx) para importar os casos para o banco de dados.</p>
    </div>

    <!-- Instruções -->
    <div class="glass fade-up-2" style="
      border-radius:var(--radius-md);padding:20px 24px;
      margin-bottom:24px;
      display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;
    ">
      ${['1. Baixe o modelo de planilha', '2. Preencha a aba "Casos"', '3. Faça upload aqui', '4. Confirme a importação'].map((t,i) => `
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="
            width:32px;height:32px;border-radius:50%;
            background:linear-gradient(135deg,var(--yellow),var(--yellow-deep));
            display:flex;align-items:center;justify-content:center;
            font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink);
            flex-shrink:0;box-shadow:0 2px 8px rgba(230,168,0,0.3);
          ">${i+1}</div>
          <span style="font-size:13.5px;font-weight:600;color:var(--ink-soft);">${t}</span>
        </div>
      `).join('')}
    </div>

    <!-- Drop Zone -->
    <div id="drop-zone" class="glass fade-up-3" style="
      border-radius:var(--radius-lg);
      border:2.5px dashed rgba(11,42,85,0.18);
      padding:56px 32px;
      text-align:center;
      cursor:pointer;
      transition:all .25s ease;
      margin-bottom:24px;
    ">
      <div style="font-size:52px;margin-bottom:16px;">📊</div>
      <h3 style="font-family:var(--font-display);font-weight:800;font-size:20px;color:var(--ink);margin-bottom:8px;">
        Arraste a planilha aqui
      </h3>
      <p style="font-size:14px;color:var(--muted);margin-bottom:20px;">
        ou clique para selecionar o arquivo .xlsx
      </p>
      <button class="btn btn-primary" id="btn-select-file">Selecionar Arquivo</button>
      <input type="file" id="file-input" accept=".xlsx,.xls" style="display:none;">
      <div id="file-name" style="margin-top:16px;font-size:13px;color:var(--muted);"></div>
    </div>

    <!-- Preview -->
    <div id="preview-section" style="display:none;">
      <div style="
        display:flex;align-items:center;justify-content:space-between;
        flex-wrap:wrap;gap:14px;margin-bottom:16px;
      ">
        <div>
          <h3 style="font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--ink);margin-bottom:2px;">
            Prévia dos dados
          </h3>
          <p id="preview-count" style="font-size:13px;color:var(--muted);"></p>
        </div>
        <div style="display:flex;gap:10px;">
          <button id="btn-cancelar-import" class="btn btn-secondary">Cancelar</button>
          <button id="btn-confirmar-import" class="btn btn-primary">
            <span id="import-btn-txt">✅ Confirmar Importação</span>
            <div class="spinner" id="import-spin" style="display:none;width:16px;height:16px;border-width:2px;"></div>
          </button>
        </div>
      </div>

      <div class="glass" style="border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-md);">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ID Caso</th>
                <th>Recebimento</th>
                <th>Resposta</th>
                <th>Analista</th>
                <th>Ofensor</th>
                <th>Status</th>
                <th>CSAT</th>
                <th>FCR</th>
              </tr>
            </thead>
            <tbody id="preview-tbody"></tbody>
          </table>
        </div>
      </div>

      <!-- Alertas de validação -->
      <div id="import-warnings" style="margin-top:14px;"></div>
    </div>

    <!-- Resultado -->
    <div id="import-result" style="display:none;"></div>
  `

  let parsedCasos = []

  const dropZone  = document.getElementById('drop-zone')
  const fileInput = document.getElementById('file-input')

  document.getElementById('btn-select-file').addEventListener('click', () => fileInput.click())

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.style.borderColor = 'var(--yellow-deep)'
    dropZone.style.background  = 'rgba(245,197,24,0.06)'
  })
  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'rgba(11,42,85,0.18)'
    dropZone.style.background  = ''
  })
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.style.borderColor = 'rgba(11,42,85,0.18)'
    dropZone.style.background  = ''
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  })
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) processFile(fileInput.files[0])
  })

  async function processFile(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showToast('Selecione um arquivo .xlsx ou .xls', 'error')
      return
    }
    document.getElementById('file-name').textContent = `📎 ${file.name} (${(file.size/1024).toFixed(1)} KB)`
    showToast('Lendo planilha...', 'info')

    try {
      parsedCasos = await parsePlanilha(file)
      renderPreview(parsedCasos)
    } catch(err) {
      showToast('Erro ao ler planilha: ' + err.message, 'error')
    }
  }

  function renderPreview(casos) {
    document.getElementById('preview-section').style.display = 'block'
    document.getElementById('preview-count').textContent = `${casos.length} caso${casos.length!==1?'s':''} encontrado${casos.length!==1?'s':''} na planilha`
    document.getElementById('import-result').style.display = 'none'

    const tbody = document.getElementById('preview-tbody')
    tbody.innerHTML = casos.slice(0, 50).map((c, i) => `
      <tr>
        <td style="color:var(--muted);font-size:12px;">${i+1}</td>
        <td class="col-left" style="font-weight:700;font-size:13px;">${c.idCaso || '—'}</td>
        <td>${c.dataRecebimento ? new Date(c.dataRecebimento).toLocaleDateString('pt-BR') : '—'}</td>
        <td>${c.dataResposta ? new Date(c.dataResposta).toLocaleDateString('pt-BR') : '—'}</td>
        <td><span class="badge badge-sand">${c.analista||'—'}</span></td>
        <td style="font-size:12px;">${c.ofensorPrincipal||'—'}</td>
        <td><span class="badge ${statusBadgeClass(c.statusResolucao)}">${c.statusResolucao||'—'}</span></td>
        <td>${c.notaCSAT||'—'}</td>
        <td><span class="badge ${c.acordoFCR==='Sim'?'badge-green':'badge-sand'}">${c.acordoFCR||'Não'}</span></td>
      </tr>
    `).join('')

    if (casos.length > 50) {
      tbody.innerHTML += `<tr><td colspan="9" style="padding:12px;color:var(--muted);font-size:13px;">
        ... e mais ${casos.length-50} casos (não exibidos na prévia)
      </td></tr>`
    }

    // Validações
    const warnings = []
    const semAnalista = casos.filter(c => !c.analista)
    const semData     = casos.filter(c => !c.dataRecebimento)
    if (semAnalista.length) warnings.push(`⚠️ ${semAnalista.length} caso(s) sem analista`)
    if (semData.length)     warnings.push(`⚠️ ${semData.length} caso(s) sem data de recebimento`)

    const warnEl = document.getElementById('import-warnings')
    if (warnings.length) {
      warnEl.innerHTML = warnings.map(w => `
        <div style="background:var(--sand-light);border-radius:8px;padding:10px 14px;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--ink-soft);">${w}</div>
      `).join('')
    } else {
      warnEl.innerHTML = `<div style="background:var(--green-light);border-radius:8px;padding:10px 14px;font-size:13px;font-weight:600;color:#14532D;">✅ Dados validados — pronto para importar</div>`
    }
  }

  document.getElementById('btn-cancelar-import').addEventListener('click', () => {
    document.getElementById('preview-section').style.display = 'none'
    document.getElementById('file-name').textContent = ''
    fileInput.value = ''
    parsedCasos = []
  })

  document.getElementById('btn-confirmar-import').addEventListener('click', async () => {
    if (!parsedCasos.length) return
    const btn    = document.getElementById('btn-confirmar-import')
    const txt    = document.getElementById('import-btn-txt')
    const spin   = document.getElementById('import-spin')
    btn.disabled = true
    txt.textContent = 'Importando...'
    spin.style.display = 'inline-block'

    try {
      await importCasosLote(parsedCasos)
      showToast(`${parsedCasos.length} casos importados com sucesso! 🎉`, 'success')

      const result = document.getElementById('import-result')
      result.style.display = 'block'
      result.innerHTML = `
        <div style="
          background:var(--green-light);
          border:1px solid #BBF7D0;
          border-radius:var(--radius-md);
          padding:24px;text-align:center;
        ">
          <div style="font-size:48px;margin-bottom:8px;">🎉</div>
          <h3 style="font-family:var(--font-display);font-weight:800;font-size:20px;color:#14532D;margin-bottom:6px;">
            ${parsedCasos.length} casos importados!
          </h3>
          <p style="font-size:14px;color:#166534;margin-bottom:16px;">Todos os registros foram salvos no Firestore.</p>
          <a href="/dashboard" onclick="event.preventDefault();window.__navigate('/dashboard')" class="btn btn-primary">
            Ver Dashboard →
          </a>
        </div>
      `
      window.__navigate = (p) => { import('../main.js').then(m => m.navigate(p)) }
      document.getElementById('preview-section').style.display = 'none'
    } catch(err) {
      showToast('Erro na importação: ' + err.message, 'error')
    } finally {
      btn.disabled = false
      txt.textContent = '✅ Confirmar Importação'
      spin.style.display = 'none'
    }
  })
}
