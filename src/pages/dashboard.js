// ================================================================
// PÁGINA: Dashboard — responsivo desktop + mobile
// ================================================================

import { renderNavbar } from '../components/navbar.js'
import { onCasos } from '../firebase/service.js'
import { state } from '../main.js'
import {
  calcKPIs, calcPorAnalista, calcPorOfensor, calcPorStatus,
  calcEvolucaoSemanal, showToast
} from '../utils/helpers.js'

let charts = {}
let unsubDash = null

export async function render(app) {
  app.innerHTML = ''
  renderNavbar(app)

  const main = document.createElement('div')
  main.style.cssText = 'max-width:1500px;margin:0 auto;padding:16px 16px 60px;position:relative;'
  app.appendChild(main)

  main.innerHTML = `
  <style>
    /* ── MOBILE FIRST ── */
    .dash-header {
      display:flex;flex-direction:column;gap:12px;margin-bottom:18px;
    }
    .dash-header-brands {
      display:flex;align-items:center;gap:8px;flex-wrap:wrap;
    }
    .dash-filters-unused { display:none; }
    .dash-filters .field-full { grid-column:1/-1; }
    .kpi-grid {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;margin-bottom:16px;
    }
    .kpi-grid .kpi-full { grid-column:1/-1; }
    .section-row {
      display:flex;flex-direction:column;gap:14px;margin-bottom:16px;
    }
    .strategic-grid {
      display:flex;flex-direction:column;gap:12px;
    }
    .treemap-box { height:200px; }
    .ops-grid {
      display:flex;flex-direction:column;gap:14px;
    }
    .chart-height { height:200px; }

    /* ── DESKTOP ── */
    @media(min-width:900px){
      .dash-header {
        flex-direction:row;align-items:center;justify-content:space-between;
      }
      .dash-filters {
        position:absolute;top:100px;right:0;width:230px;
        display:flex;flex-direction:column;gap:10px;
        grid-template-columns:unset;
        margin-bottom:0;
        z-index:10;
      }
      .dash-filters .field-full { grid-column:unset; }
      .kpi-grid {
        grid-template-columns:repeat(5,1fr);
        margin-right:250px;
      }
      .kpi-grid .kpi-full { grid-column:unset; }
      .section-row { flex-direction:row; }
      .section-row .col-table  { flex:1.05; }
      .section-row .col-strat  { flex:1; }
      .strategic-grid { flex-direction:row; }
      .treemap-box { height:260px; }
      .ops-grid { flex-direction:row; }
      .ops-grid .col-bar  { flex:1; }
      .ops-grid .col-line { flex:1.2; }
      .chart-height { height:240px; }
    }
  </style>

  <!-- SOL DECORATIVO (desktop only) -->
  <div style="
    position:absolute;right:260px;top:160px;
    width:70px;height:70px;border-radius:50%;
    background:radial-gradient(circle at 35% 35%,#FFEB99,#F5C518 55%,#E6A800);
    box-shadow:0 0 0 10px rgba(245,197,24,0.12);
    pointer-events:none;opacity:.7;
    animation:pulse 4s ease-in-out infinite;
    display:none;
  " id="sol-deco"></div>
  <style>
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
    @media(min-width:900px){ #sol-deco{display:block;} }
  </style>

  <!-- ===== HEADER ===== -->
  <div class="dash-header fade-up-1">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:46px;height:46px;border-radius:12px;background:white;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-sm);flex-shrink:0;">
        <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
          <rect x="5" y="20" width="6" height="12" rx="1" fill="#F5C518"/>
          <rect x="15" y="14" width="6" height="18" rx="1" fill="#F08A26"/>
          <rect x="25" y="8" width="6" height="24" rx="1" fill="#2EAA4E"/>
          <path d="M5 12 L12 8 L22 14 L31 4" stroke="#DC3F3F" stroke-width="2" fill="none" stroke-linecap="round"/>
        </svg>
      </div>
      <div>
        <h1 style="font-family:var(--font-display);font-weight:800;font-size:clamp(15px,2vw,24px);color:var(--ink);line-height:1.1;letter-spacing:-.02em;">
          DASHBOARD DE PERFORMANCE<br>
          <span style="color:var(--ink-soft);font-weight:700;font-size:.85em;">OUVIDORIA (Consumidor.gov)</span>
        </h1>
      </div>
    </div>
    <div class="dash-header-brands">
      <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.7);padding:5px 10px;border-radius:999px;font-weight:700;font-size:12px;">
        <div style="width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,#FFE066,#F5C518);"></div>PagSeguro
      </div>
      <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.7);padding:5px 10px;border-radius:999px;font-weight:700;font-size:12px;">
        <div style="width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,#FFE066,#F5C518);"></div>PagBank
      </div>
      <div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.7);padding:6px 10px;border-radius:10px;">
        <div style="width:26px;height:26px;border-radius:50%;background:#2EAA4E;display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 14 Q12 19 17 14" stroke="white" stroke-width="2.2" stroke-linecap="round" fill="none"/><circle cx="9" cy="10" r="1.2" fill="white"/><circle cx="15" cy="10" r="1.2" fill="white"/></svg>
        </div>
        <div>
          <div style="font-weight:800;color:var(--ink);font-size:13px;">consumidor<span style="color:#2EAA4E">.</span>gov<span style="color:#2EAA4E">.br</span></div>
          <div style="font-size:9px;color:var(--muted);font-style:italic;">É seu. É fácil. Participe.</div>
        </div>
      </div>
      <button id="btn-export-dash" class="btn btn-secondary btn-sm">📥 Exportar</button>
    </div>
  </div>

  <!-- ===== FILTROS RETRÁTIL ===== -->
  <div style="margin-bottom:16px;" class="fade-up-2">
    <button id="btn-toggle-filtros" style="
      display:flex;align-items:center;gap:8px;
      background:rgba(255,255,255,0.82);backdrop-filter:blur(12px);
      border:1.5px solid rgba(11,42,85,0.12);
      border-radius:10px;padding:10px 16px;
      font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink);
      cursor:pointer;width:100%;justify-content:space-between;
      box-shadow:var(--shadow-sm);transition:all .2s;
    ">
      <span style="display:flex;align-items:center;gap:8px;">
        <span>⚙️</span> Filtros
        <span id="filtros-badges" style="display:flex;gap:4px;"></span>
      </span>
      <span id="filtros-arrow" style="font-size:12px;transition:transform .25s;">▼</span>
    </button>

    <div id="filtros-panel" style="
      display:none;
      background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);
      border:1.5px solid rgba(255,255,255,0.9);
      border-radius:0 0 12px 12px;
      padding:16px;
      box-shadow:var(--shadow-md);
      margin-top:-2px;
    ">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field">
          <label style="font-size:12px;">De</label>
          <select id="df-mes-ini" style="font-size:13px;padding:8px 10px;">
            <option value="12">Dez</option><option value="11">Nov</option>
            <option value="10">Out</option><option value="1">Jan</option>
            <option value="2">Fev</option>
          </select>
        </div>
        <div class="field">
          <label style="font-size:12px;">Até</label>
          <select id="df-mes-fim" style="font-size:13px;padding:8px 10px;">
            <option value="2">Fev</option><option value="3">Mar</option>
            <option value="1">Jan</option><option value="12">Dez</option>
          </select>
        </div>
        <div class="field">
          <label style="font-size:12px;">Analista</label>
          <select id="df-analista" style="font-size:13px;padding:8px 10px;">
            <option value="all">Todas</option>
            <option>Koren</option><option>Gisele</option><option>Jussara</option>
          </select>
        </div>
        <div class="field">
          <label style="font-size:12px;">Ofensor Principal</label>
          <select id="df-ofensor" style="font-size:13px;padding:8px 10px;">
            <option value="all">Todos</option>
            <option>Bloqueio/encerramento</option><option>Golpe</option>
            <option>Invasão de conta</option><option>Emissão</option>
            <option>Consignado</option><option>Outros</option>
          </select>
        </div>
        <div style="grid-column:1/-1;display:flex;justify-content:flex-end;">
          <button id="btn-limpar-filtros-dash" class="btn btn-secondary btn-sm">
            🧹 Limpar filtros
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== KPIs ===== -->
  <section id="kpi-section" class="kpi-grid fade-up-2"></section>

  <!-- ===== TABELA + VISÃO ESTRATÉGICA ===== -->
  <div class="section-row">

    <!-- Tabela -->
    <div class="col-table glass" style="border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-md);">
      <div style="font-family:var(--font-display);font-weight:800;font-size:14px;color:var(--ink);margin-bottom:10px;">
        👥 Visão por Analista
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table" id="tabela-analistas" style="min-width:520px;">
          <thead>
            <tr>
              <th>Analista</th>
              <th>Atrib.</th>
              <th>Resp.</th>
              <th>Pend.</th>
              <th>Prazo</th>
              <th>Resol.</th>
              <th>Nota</th>
              <th>FCR</th>
            </tr>
          </thead>
          <tbody id="tbody-analistas">
            <tr><td colspan="8" style="padding:24px;"><div class="spinner" style="margin:0 auto;"></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Visão Estratégica -->
    <div class="col-strat glass" style="border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-md);">
      <div style="text-align:center;font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink);margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:8px;">
        VISÃO ESTRATÉGICA
        <div style="width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFE680,#F5C518);"></div>
      </div>

      <div class="strategic-grid">

        <!-- Treemap -->
        <div style="flex:1;background:rgba(255,255,255,0.6);border-radius:10px;padding:10px;position:relative;">
          <div style="position:absolute;top:8px;left:8px;width:22px;height:22px;border-radius:50%;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;z-index:2;">C</div>
          <div style="font-weight:700;font-size:12px;color:var(--ink);text-align:center;margin-bottom:6px;">Maiores Ofensores</div>
          <div id="treemap" class="treemap-box" style="
            display:grid;
            grid-template-columns:repeat(6,1fr);
            grid-template-rows:repeat(5,1fr);
            gap:3px;border-radius:6px;overflow:hidden;
          "></div>
        </div>

        <!-- Donut -->
        <div style="flex:1;background:rgba(255,255,255,0.6);border-radius:10px;padding:10px;position:relative;">
          <div style="position:absolute;top:8px;left:8px;width:22px;height:22px;border-radius:50%;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;z-index:2;">D</div>
          <div style="font-weight:700;font-size:12px;color:var(--ink);text-align:center;margin-bottom:6px;">Distribuição por Status</div>
          <div style="position:relative;height:160px;"><canvas id="donut-chart"></canvas></div>
          <div id="donut-legend" style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:var(--ink-soft);"></div>
          <div style="background:rgba(255,255,255,0.9);border-radius:8px;padding:8px;font-size:11.5px;color:var(--ink);margin-top:8px;line-height:1.4;">
            <strong style="display:block;margin-bottom:2px;font-size:12px;">💡 Insight:</strong>
            <span id="insight-text">Carregando...</span>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- ===== MONITORAMENTO OPERACIONAL ===== -->
  <div style="text-align:center;font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink);margin:4px 0 12px;letter-spacing:.04em;">
    MONITORAMENTO OPERACIONAL
  </div>

  <div class="ops-grid">

    <!-- Bar Chart -->
    <div class="col-bar glass" style="border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-md);position:relative;">
      <div style="position:absolute;top:12px;left:12px;width:24px;height:24px;border-radius:50%;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;">A</div>
      <h4 style="font-weight:700;font-size:13px;color:var(--ink);text-align:center;margin-bottom:8px;">Status dos Casos por Analista</h4>
      <div class="chart-height"><canvas id="bar-chart"></canvas></div>
      <div id="bar-legend" style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:11px;"></div>
    </div>

    <!-- Line Chart -->
    <div class="col-line glass" style="border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-md);position:relative;">
      <div style="position:absolute;top:12px;left:12px;width:24px;height:24px;border-radius:50%;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;">B</div>
      <h4 style="font-weight:700;font-size:13px;color:var(--ink);text-align:center;margin-bottom:8px;">Evolução do Prazo Médio de Resposta</h4>
      <div class="chart-height"><canvas id="line-chart"></canvas></div>
    </div>

  </div>
  `

  // Toggle filtros accordion
  const btnToggle = document.getElementById('btn-toggle-filtros')
  const panel     = document.getElementById('filtros-panel')
  const arrow     = document.getElementById('filtros-arrow')

  btnToggle.addEventListener('click', () => {
    const aberto = panel.style.display === 'block'
    panel.style.display = aberto ? 'none' : 'block'
    arrow.style.transform = aberto ? '' : 'rotate(180deg)'
    btnToggle.style.borderRadius = aberto ? '10px' : '10px 10px 0 0'
  })

  // Limpar filtros
  document.getElementById('btn-limpar-filtros-dash').addEventListener('click', () => {
    document.getElementById('df-analista').value = 'all'
    document.getElementById('df-ofensor').value  = 'all'
    document.getElementById('df-mes-ini').value  = '12'
    document.getElementById('df-mes-fim').value  = '2'
    document.getElementById('filtros-badges').innerHTML = ''
    if (window.__dashData) updateDashboard(window.__dashData)
  })

  // Filtros — atualiza badges ao mudar
  ;['df-mes-ini','df-mes-fim','df-analista','df-ofensor'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (window.__dashData) updateDashboard(window.__dashData)
      atualizarBadgesFiltros()
    })
  })

  document.getElementById('btn-export-dash')?.addEventListener('click', async () => {
    const { exportarPlanilha } = await import('../utils/helpers.js')
    exportarPlanilha(window.__dashData || [])
    showToast('Exportando planilha...', 'info')
  })

  // Listener em tempo real
  unsubDash = onCasos((casos) => {
    window.__dashData = casos
    state.unsubs.push(unsubDash)
    updateDashboard(casos)
  })
}

function atualizarBadgesFiltros() {
  const badges = document.getElementById('filtros-badges')
  if (!badges) return
  const analista = document.getElementById('df-analista')?.value
  const ofensor  = document.getElementById('df-ofensor')?.value
  const items = []
  if (analista && analista !== 'all') items.push(analista)
  if (ofensor  && ofensor  !== 'all') items.push(ofensor.split('/')[0])
  badges.innerHTML = items.map(i => `
    <span style="
      background:var(--yellow);color:var(--ink);
      border-radius:999px;padding:1px 8px;
      font-size:11px;font-weight:700;
    ">${i}</span>
  `).join('')
}

function getFilters() {
  return {
    analista: document.getElementById('df-analista')?.value || 'all',
    ofensor:  document.getElementById('df-ofensor')?.value  || 'all',
  }
}

function filterCasos(casos) {
  const f = getFilters()
  return casos.filter(c => {
    if (f.analista !== 'all' && c.analista !== f.analista) return false
    if (f.ofensor  !== 'all' && c.ofensorPrincipal !== f.ofensor) return false
    return true
  })
}

function updateDashboard(allCasos) {
  const casos = filterCasos(allCasos)
  renderKPIs(calcKPIs(casos))
  renderTabelaAnalistas(calcPorAnalista(casos))
  renderTreemap(calcPorOfensor(casos))
  renderDonut(calcPorStatus(casos))
  renderBarChart(calcPorAnalista(casos))
  renderLineChart(calcEvolucaoSemanal(casos))
  updateInsight(calcPorStatus(casos), calcKPIs(casos))
}

// ── KPIs ──
function renderKPIs(kpi) {
  const section = document.getElementById('kpi-section')
  if (!section) return

  const cards = [
    { title:'Volumetria Total',          value:`${kpi.total}`,                              sub:'Recebidos',          ok:true,                        full:true },
    { title:'Índice de Resolutividade',  value:`${(kpi.resolutividade*100).toFixed(1)}%`,   sub:'Meta: > 80%',        ok:kpi.resolutividade>=0.8 },
    { title:'Prazo Médio de Resposta',   value:`${kpi.prazoMedio.toFixed(1)} dias`,          sub:'Meta: < 7 dias',     ok:kpi.prazoMedio<7 },
    { title:'Nota CSAT',                 value:`${kpi.csat.toFixed(1)} / 5,0`,               sub:'Meta: > 4,0',        ok:kpi.csat>=4 },
    { title:'SLA Expirados',             value:`${kpi.expirados}`,                           sub:'Meta: 0',            ok:kpi.expirados===0 },
  ]

  section.innerHTML = cards.map((c,i) => `
    <div class="glass ${c.full?'kpi-full':''} fade-up-${i+1}" style="
      border-radius:var(--radius-md);overflow:hidden;
      box-shadow:var(--shadow-md);display:flex;flex-direction:column;
      transition:transform .2s,box-shadow .2s;
    "
    onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 12px 28px rgba(11,42,85,0.18)'"
    onmouseout="this.style.transform='';this.style.boxShadow=''"
    >
      <div style="background:linear-gradient(180deg,var(--yellow) 0%,var(--yellow-deep) 100%);color:var(--ink);padding:9px 12px;font-family:var(--font-display);font-weight:700;font-size:12.5px;text-align:center;">
        ${c.title}
      </div>
      <div style="padding:14px 12px;text-align:center;flex:1;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-family:var(--font-display);font-weight:800;font-size:clamp(20px,3vw,28px);color:var(--ink);line-height:1;">
          ${c.value}
        </div>
        ${c.sub ? `<div style="margin-top:6px;font-size:11px;font-weight:600;color:${c.ok?'var(--green)':'var(--muted)'};">${c.ok?'✅':''} ${c.sub}</div>` : ''}
      </div>
    </div>
  `).join('')
}

// ── Tabela Analistas ──
function renderTabelaAnalistas(data) {
  const tbody = document.getElementById('tbody-analistas')
  if (!tbody || !data.length) return

  const totals = data.reduce((acc,r) => {
    acc.atrib+=r.atribuidos; acc.resp+=r.respondidos; acc.pend+=r.pendentes; acc.fcr+=r.fcr
    return acc
  },{ atrib:0,resp:0,pend:0,fcr:0 })
  const medPrazo = data.reduce((a,r)=>a+r.prazoMedio,0)/data.length
  const medResol = data.reduce((a,r)=>a+r.resolutividade,0)/data.length
  const medNota  = data.reduce((a,r)=>a+r.notaMedia,0)/data.length

  tbody.innerHTML = data.map(r=>`
    <tr>
      <td class="col-left">${r.analista}</td>
      <td>${r.atribuidos}</td>
      <td>${r.respondidos}</td>
      <td>${r.pendentes}</td>
      <td>${r.prazoMedio.toFixed(1)}d</td>
      <td><span class="badge ${r.resolutividade>=0.8?'badge-green':'badge-yellow'}">${(r.resolutividade*100).toFixed(1)}%</span></td>
      <td>⭐${r.notaMedia.toFixed(1)}</td>
      <td>${r.fcr}</td>
    </tr>
  `).join('') + `
    <tr style="background:var(--sand-light);border-top:2px solid var(--yellow-deep);">
      <td class="col-left" style="font-weight:800;">Total</td>
      <td><strong>${totals.atrib}</strong></td>
      <td><strong>${totals.resp}</strong></td>
      <td><strong>${totals.pend}</strong></td>
      <td><strong>${medPrazo.toFixed(1)}d</strong></td>
      <td><strong>${(medResol*100).toFixed(1)}%</strong></td>
      <td><strong>⭐${medNota.toFixed(1)}</strong></td>
      <td><strong>${totals.fcr}</strong></td>
    </tr>
  `
}

// ── Treemap ──
const TREEMAP_COLORS = {
  'Bloqueio/encerramento':'#2EAA4E','Golpe':'#DC3F3F',
  'Invasão de conta':'#F5C518','Emissão':'#D3B98A',
  'Consignado':'#8FCFE0','Outros':'#A8D8E4',
}
function renderTreemap(data) {
  const el = document.getElementById('treemap')
  if (!el) return
  const layout = [
    {key:'Bloqueio/encerramento',col:'1/4',row:'1/4'},
    {key:'Golpe',               col:'4/5',row:'1/3'},
    {key:'Invasão de conta',    col:'5/7',row:'1/3'},
    {key:'Invasão de conta',    col:'1/4',row:'4/6'},
    {key:'Emissão',             col:'4/5',row:'3/5'},
    {key:'Outros',              col:'5/7',row:'3/4'},
    {key:'Consignado',          col:'4/7',row:'5/6'},
  ]
  el.innerHTML = layout.map(t=>{
    const item = data.find(d=>d.nome===t.key)||{volume:0}
    const color = TREEMAP_COLORS[t.key]||'#ccc'
    const light = ['Emissão','Invasão de conta','Outros','Consignado'].includes(t.key)
    return `<div style="
      grid-column:${t.col};grid-row:${t.row};
      background:${color};color:${light?'#0B2A55':'white'};
      padding:5px;font-weight:700;font-size:10.5px;
      display:flex;align-items:flex-start;overflow:hidden;
      cursor:default;line-height:1.2;
    " title="${t.key}: ${item.volume} casos">${t.key}</div>`
  }).join('')
}

// ── Donut ──
function renderDonut(data) {
  const ctx = document.getElementById('donut-chart')
  if (!ctx) return
  if (charts.donut) charts.donut.destroy()
  const STATUS_COLORS = {'Resolvido':'#2EAA4E','Improcedente':'#F5C518','Cancelada/Recusada':'#DC3F3F','Em Andamento':'#3B82F6'}
  const labels = data.map(d=>d.status)
  const values = data.map(d=>d.volume)
  const colors = data.map(d=>STATUS_COLORS[d.status]||'#ccc')
  charts.donut = new Chart(ctx,{
    type:'doughnut',
    data:{labels,datasets:[{data:values,backgroundColor:colors,borderWidth:3,borderColor:'#fff'}]},
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'60%',
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:c=>` ${c.label}: ${c.parsed}`}}
      }
    },
    plugins:[{
      id:'pct',
      afterDatasetsDraw(chart){
        const {ctx}=chart
        const total=values.reduce((a,b)=>a+b,0)
        chart.getDatasetMeta(0).data.forEach((arc,i)=>{
          const {x,y}=arc.tooltipPosition()
          ctx.fillStyle='#fff'
          ctx.font='700 11px Inter,sans-serif'
          ctx.textAlign='center';ctx.textBaseline='middle'
          const pct=total?Math.round(values[i]/total*100):0
          if(pct>5) ctx.fillText(pct+'%',x,y)
        })
      }
    }]
  })
  const legend=document.getElementById('donut-legend')
  if(legend) legend.innerHTML=data.map(d=>`
    <span style="display:flex;align-items:center;gap:3px;">
      <span style="width:9px;height:9px;border-radius:2px;background:${STATUS_COLORS[d.status]||'#ccc'};display:inline-block;"></span>
      ${d.status}
    </span>`).join('')
}

function updateInsight(statusData,kpis){
  const el=document.getElementById('insight-text')
  if(!el) return
  const resolvido=statusData.find(s=>s.status==='Resolvido')
  const pct=resolvido?Math.round(resolvido.pct*100):0
  el.textContent = pct>=80
    ? `${pct}% de resolução — acima da meta ✅. Prazo médio ${kpis.prazoMedio.toFixed(1)} dias.`
    : pct>=70
    ? `${pct}% de resolução. Analise os casos Improcedentes para elevar o índice.`
    : `Atenção: ${pct}% de resolução. Revisão de causa raiz recomendada.`
}

// ── Bar Chart ──
function renderBarChart(data){
  const ctx=document.getElementById('bar-chart')
  if(!ctx||typeof Chart==='undefined') return
  if(charts.bar) charts.bar.destroy()
  const labels=data.map(d=>d.analista)
  const resp=data.map(d=>d.atribuidos?Math.round(d.respondidos/d.atribuidos*100):0)
  const analise=data.map(d=>d.atribuidos?Math.round(d.pendentes/d.atribuidos*70):0)
  const critico=data.map((_,i)=>Math.max(0,100-resp[i]-analise[i]))
  charts.bar=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[
      {label:'Respondidos',data:resp,   backgroundColor:'#2EAA4E',borderRadius:3},
      {label:'Em Análise', data:analise,backgroundColor:'#F5C518',borderRadius:3},
      {label:'Críticos',   data:critico,backgroundColor:'#DC3F3F',borderRadius:3},
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,
      scales:{
        x:{stacked:true,grid:{display:false},ticks:{font:{size:11}}},
        y:{stacked:true,beginAtZero:true,max:100,ticks:{stepSize:25},grid:{color:'rgba(11,42,85,0.07)'}}
      },
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.parsed.y}%`}}
      }
    }
  })
  const legend=document.getElementById('bar-legend')
  if(legend) legend.innerHTML=[['#2EAA4E','Respondidos'],['#F5C518','Em Análise'],['#DC3F3F','Críticos']].map(([c,l])=>`
    <span style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--ink-soft);">
      <span style="width:9px;height:9px;border-radius:2px;background:${c};display:inline-block;"></span>${l}
    </span>`).join('')
}

// ── Line Chart ──
function renderLineChart(data){
  const ctx=document.getElementById('line-chart')
  if(!ctx||typeof Chart==='undefined') return
  if(charts.line) charts.line.destroy()
  if(!data.length) return
  const labels=data.map(d=>d.semana)
  const analistas=['Koren','Gisele','Jussara']
  const COLORS=['#2EAA4E','#F5C518','#DC3F3F']
  charts.line=new Chart(ctx,{
    type:'line',
    data:{
      labels,
      datasets:[
        ...analistas.map((a,i)=>({
          label:a,data:data.map(d=>d[a]??null),
          borderColor:COLORS[i],backgroundColor:COLORS[i],
          tension:0.35,borderWidth:2,pointRadius:3,spanGaps:true
        })),
        {label:'Target: 7',data:labels.map(()=>7),borderColor:'#B91C1C',borderWidth:2,pointRadius:0,tension:0,borderDash:[4,4]}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      scales:{
        x:{grid:{display:false},ticks:{font:{size:10},maxRotation:45}},
        y:{beginAtZero:true,max:12,ticks:{stepSize:2},grid:{color:'rgba(11,42,85,0.07)'}}
      },
      plugins:{
        legend:{position:'top',labels:{boxWidth:8,boxHeight:3,font:{size:10,weight:'600'}}},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.parsed.y?.toFixed(1)} dias`}}
      }
    }
  })
}