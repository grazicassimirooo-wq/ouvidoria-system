// ================================================================
// PÁGINA: Dashboard — idêntico ao visual de referência
// Dados em tempo real via Firestore onSnapshot
// ================================================================

import { renderNavbar } from '../components/navbar.js'
import { onCasos } from '../firebase/service.js'
import { state } from '../main.js'
import {
  calcKPIs, calcPorAnalista, calcPorOfensor, calcPorStatus,
  calcEvolucaoSemanal, exportarPlanilha, showToast, fmtDate
} from '../utils/helpers.js'

let charts = {}
let unsubDash = null

export async function render(app) {
  app.innerHTML = ''
  renderNavbar(app)

  const main = document.createElement('div')
  main.style.cssText = 'max-width:1500px;margin:0 auto;padding:24px 28px 60px;position:relative;'
  app.appendChild(main)

  // Decorações
  main.innerHTML = `
    <!-- Sol decorativo -->
    <div style="
      position:absolute;right:260px;top:160px;
      width:80px;height:80px;border-radius:50%;
      background:radial-gradient(circle at 35% 35%,#FFEB99,#F5C518 55%,#E6A800);
      box-shadow:0 0 0 10px rgba(245,197,24,0.14),0 0 0 20px rgba(245,197,24,0.07);
      pointer-events:none;opacity:.75;
      animation:pulse 4s ease-in-out infinite;
    "></div>
    <style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}</style>

    <!-- ===== HEADER DO DASH ===== -->
    <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:20px;margin-bottom:22px;" class="fade-up-1">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <div style="
          width:52px;height:52px;border-radius:14px;
          background:white;display:flex;align-items:center;justify-content:center;
          box-shadow:var(--shadow-sm);flex-shrink:0;
        ">
          <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
            <rect x="5"  y="20" width="6" height="12" rx="1" fill="#F5C518"/>
            <rect x="15" y="14" width="6" height="18" rx="1" fill="#F08A26"/>
            <rect x="25" y="8"  width="6" height="24" rx="1" fill="#2EAA4E"/>
            <path d="M5 12 L12 8 L22 14 L31 4" stroke="#DC3F3F" stroke-width="2" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <h1 style="
            font-family:var(--font-display);font-weight:800;
            font-size:clamp(18px,2.2vw,28px);color:var(--ink);line-height:1.1;
            letter-spacing:-.02em;
          ">DASHBOARD DE PERFORMANCE — OUVIDORIA <span style="color:var(--ink-soft);font-weight:700;">(Consumidor.gov)</span></h1>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:flex-end;">
        <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.6);padding:6px 12px;border-radius:999px;backdrop-filter:blur(6px);box-shadow:var(--shadow-sm);font-weight:700;font-size:13px;color:#111;">
          <div style="width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFE066,#F5C518);"></div>PagSeguro
        </div>
        <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.6);padding:6px 12px;border-radius:999px;backdrop-filter:blur(6px);box-shadow:var(--shadow-sm);font-weight:700;font-size:13px;color:#111;">
          <div style="width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFE066,#F5C518);"></div>PagBank
        </div>
        <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.7);padding:8px 14px;border-radius:12px;box-shadow:var(--shadow-sm);">
          <div style="width:30px;height:30px;border-radius:50%;background:#2EAA4E;display:flex;align-items:center;justify-content:center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 14 Q12 19 17 14" stroke="white" stroke-width="2.2" stroke-linecap="round" fill="none"/><circle cx="9" cy="10" r="1.2" fill="white"/><circle cx="15" cy="10" r="1.2" fill="white"/></svg>
          </div>
          <div>
            <div style="font-weight:800;color:var(--ink);font-size:15px;">consumidor<span style="color:#2EAA4E">.</span>gov<span style="color:#2EAA4E">.br</span></div>
            <div style="font-size:10px;color:var(--muted);font-style:italic;">É seu. É fácil. Participe.</div>
          </div>
        </div>
        <button id="btn-export-dash" class="btn btn-secondary btn-sm">📥 Exportar</button>
      </div>
    </div>

    <!-- ===== FILTROS ===== -->
    <div class="glass" style="
      position:absolute;top:100px;right:0;width:230px;
      border-radius:var(--radius-md);padding:14px;
      box-shadow:var(--shadow-md);z-index:10;
    ">
      <h3 style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
        Período <span style="color:var(--muted);">☰ ⛛</span>
      </h3>
      <div class="field" style="margin-bottom:10px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <select id="df-mes-ini" style="font-size:12px;padding:7px 8px;">
            <option value="12">Dez</option><option value="11">Nov</option>
            <option value="10">Out</option><option value="1">Jan</option>
            <option value="2">Fev</option>
          </select>
          <select id="df-mes-fim" style="font-size:12px;padding:7px 8px;">
            <option value="2">Fev</option><option value="3">Mar</option>
            <option value="1">Jan</option><option value="12">Dez</option>
          </select>
        </div>
      </div>
      <div class="field" style="margin-bottom:10px;">
        <label style="font-size:12px;">Analista</label>
        <select id="df-analista" style="font-size:12px;padding:7px 8px;">
          <option value="all">All</option>
          <option>Giovana</option><option>Gisele</option><option>Jussara</option>
        </select>
      </div>
      <div class="field">
        <label style="font-size:12px;">Ofensor Principal</label>
        <select id="df-ofensor" style="font-size:12px;padding:7px 8px;">
          <option value="all">All</option>
          <option>Bloqueio/encerramento</option><option>Golpe</option>
          <option>Invasão de conta</option><option>Emissão</option>
          <option>Consignado</option><option>Outros</option>
        </select>
      </div>
    </div>

    <!-- ===== KPIs ===== -->
    <section id="kpi-section" style="
      display:grid;grid-template-columns:repeat(5,1fr);gap:14px;
      margin-bottom:20px;margin-right:250px;
    "></section>

    <!-- ===== LINHA 2: TABELA + VISÃO ESTRATÉGICA ===== -->
    <div style="display:grid;grid-template-columns:1.05fr 1fr;gap:18px;margin-bottom:18px;">

      <!-- Tabela Analistas -->
      <div class="glass fade-up-3" style="border-radius:var(--radius-md);padding:18px;box-shadow:var(--shadow-md);">
        <div class="table-wrap">
          <table class="data-table" id="tabela-analistas">
            <thead>
              <tr>
                <th>Analista</th>
                <th>Atribuídos</th>
                <th>Respondidos</th>
                <th>Pendentes</th>
                <th>Prazo Médio</th>
                <th>Resolutividade</th>
                <th>Nota Média</th>
                <th>Acordos FCR</th>
              </tr>
            </thead>
            <tbody id="tbody-analistas">
              <tr><td colspan="8" style="padding:30px;"><div class="spinner" style="margin:0 auto;"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Visão Estratégica -->
      <div class="glass fade-up-4" style="border-radius:var(--radius-md);padding:18px;box-shadow:var(--shadow-md);">
        <div style="text-align:center;font-family:var(--font-display);font-weight:800;font-size:17px;color:var(--ink);margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:10px;">
          VISÃO ESTRATÉGICA
          <div style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFE680,#F5C518);box-shadow:0 0 0 4px rgba(245,197,24,0.2);"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">

          <!-- Treemap -->
          <div style="background:rgba(255,255,255,0.6);border-radius:10px;padding:12px;position:relative;">
            <div style="position:absolute;top:8px;left:8px;width:24px;height:24px;border-radius:50%;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;z-index:2;">C</div>
            <div style="font-weight:700;font-size:13px;color:var(--ink);text-align:center;margin-bottom:8px;">Maiores Ofensores</div>
            <div id="treemap" style="
              display:grid;
              grid-template-columns:repeat(6,1fr);
              grid-template-rows:repeat(5,1fr);
              gap:3px;height:220px;border-radius:8px;overflow:hidden;
            "></div>
          </div>

          <!-- Donut -->
          <div style="background:rgba(255,255,255,0.6);border-radius:10px;padding:12px;position:relative;">
            <div style="position:absolute;top:8px;left:8px;width:24px;height:24px;border-radius:50%;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;z-index:2;">D</div>
            <div style="font-weight:700;font-size:12.5px;color:var(--ink);text-align:center;margin-bottom:8px;">Distribuição por Status</div>
            <div style="position:relative;height:160px;"><canvas id="donut-chart"></canvas></div>
            <div style="
              background:rgba(255,255,255,0.9);border-radius:8px;padding:10px;
              font-size:11.5px;color:var(--ink);margin-top:8px;line-height:1.4;
            " id="insight-box">
              <strong style="display:block;margin-bottom:3px;font-size:12px;">Insight de Ouvidoria:</strong>
              <span id="insight-text">Carregando dados...</span>
            </div>
            <div id="donut-legend" style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:11px;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== MONITORAMENTO OPERACIONAL ===== -->
    <div style="text-align:center;font-family:var(--font-display);font-weight:800;font-size:17px;color:var(--ink);margin:4px 0 14px;letter-spacing:.04em;" class="fade-up-5">
      MONITORAMENTO OPERACIONAL
    </div>
    <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:18px;" class="fade-up-5">
      <div class="glass" style="border-radius:var(--radius-md);padding:18px;box-shadow:var(--shadow-md);position:relative;">
        <div style="position:absolute;top:14px;left:14px;width:26px;height:26px;border-radius:50%;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;">A</div>
        <h4 style="font-weight:700;font-size:14px;color:var(--ink);text-align:center;margin-bottom:8px;">Status dos Casos por Analista</h4>
        <div style="height:220px;position:relative;"><canvas id="bar-chart"></canvas></div>
        <div id="bar-legend" style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12px;"></div>
      </div>
      <div class="glass" style="border-radius:var(--radius-md);padding:18px;box-shadow:var(--shadow-md);position:relative;">
        <div style="position:absolute;top:14px;left:14px;width:26px;height:26px;border-radius:50%;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;">B</div>
        <h4 style="font-weight:700;font-size:14px;color:var(--ink);text-align:center;margin-bottom:8px;">Evolução do Prazo Médio de Resposta</h4>
        <div style="height:220px;position:relative;"><canvas id="line-chart"></canvas></div>
      </div>
    </div>
  `

  // Listeners dos filtros
  ;['df-mes-ini','df-mes-fim','df-analista','df-ofensor'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (window.__dashData) updateDashboard(window.__dashData)
    })
  })

  document.getElementById('btn-export-dash')?.addEventListener('click', async () => {
    const { exportarPlanilha } = await import('../utils/helpers.js')
    exportarPlanilha(window.__dashData || [])
    showToast('Exportando planilha...', 'info')
  })

  // Inicia listener em tempo real
  unsubDash = onCasos((casos) => {
    window.__dashData = casos
    state.unsubs.push(unsubDash)
    updateDashboard(casos)
  })
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

// ──────── KPIs ────────
function renderKPIs(kpi) {
  const section = document.getElementById('kpi-section')
  if (!section) return
  const cards = [
    { title: 'Volumetria Total',          value: `${kpi.total} Recebidos`,              sub: '▲ vs mês ant.',          subClass: 'up' },
    { title: 'Índice de Resolutividade',  value: `${(kpi.resolutividade*100).toFixed(1)}%`, sub: '(Meta: > 80%)',       subClass: kpi.resolutividade >= 0.8 ? 'up' : '' },
    { title: 'Prazo Médio de Resposta',   value: `${kpi.prazoMedio.toFixed(1)} Dias`,    sub: '(Meta: < 7 dias)',       subClass: kpi.prazoMedio < 7 ? 'up' : '' },
    { title: 'Nota de Satisfação (CSAT)', value: `${kpi.csat.toFixed(1)} / 5,0`,         sub: '(Meta: > 4,0)',          subClass: kpi.csat >= 4 ? 'up' : '' },
    { title: 'Casos Expirados (SLA)',     value: `${kpi.expirados}`,                    sub: '(Meta: 100% no prazo)',   subClass: kpi.expirados === 0 ? 'up' : '' },
  ]

  section.innerHTML = cards.map((c, i) => `
    <div class="glass fade-up-${i+1}" style="
      border-radius:var(--radius-md);overflow:hidden;
      box-shadow:var(--shadow-md);
      display:flex;flex-direction:column;
      transition:transform .25s,box-shadow .25s;
    "
    onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 12px 28px rgba(11,42,85,0.18)'"
    onmouseout="this.style.transform='';this.style.boxShadow=''"
    >
      <div style="
        background:linear-gradient(180deg,var(--yellow) 0%,var(--yellow-deep) 100%);
        color:var(--ink);padding:10px 14px;
        font-family:var(--font-display);font-weight:700;font-size:13.5px;
        text-align:center;
      ">${c.title}</div>
      <div style="padding:18px 14px 16px;text-align:center;flex:1;display:flex;flex-direction:column;justify-content:center;">
        <div style="
          font-family:var(--font-display);font-weight:800;
          font-size:clamp(22px,2.2vw,30px);color:var(--ink);
          line-height:1;letter-spacing:-.02em;
        ">${c.value}</div>
        <div style="margin-top:8px;font-size:12px;font-weight:600;
          color:${c.subClass === 'up' ? 'var(--green)' : 'var(--muted)'}"
        >${c.sub}</div>
      </div>
    </div>
  `).join('')
}

// ──────── Tabela Analistas ────────
function renderTabelaAnalistas(data) {
  const tbody = document.getElementById('tbody-analistas')
  if (!tbody || !data.length) return

  const totals = data.reduce((acc, r) => {
    acc.atrib += r.atribuidos; acc.resp += r.respondidos; acc.pend += r.pendentes
    acc.fcr   += r.fcr
    return acc
  }, { atrib:0, resp:0, pend:0, fcr:0 })
  const medPrazo = data.reduce((a,r) => a+r.prazoMedio,0)/data.length
  const medResol = data.reduce((a,r) => a+r.resolutividade,0)/data.length
  const medNota  = data.reduce((a,r) => a+r.notaMedia,0)/data.length

  tbody.innerHTML = data.map(r => `
    <tr>
      <td class="col-left">${r.analista}</td>
      <td>${r.atribuidos}</td>
      <td>${r.respondidos}</td>
      <td>${r.pendentes}</td>
      <td>${r.prazoMedio.toFixed(1)} dias</td>
      <td><span class="badge ${r.resolutividade>=0.8?'badge-green':'badge-yellow'}">${(r.resolutividade*100).toFixed(1)}%</span></td>
      <td>⭐ ${r.notaMedia.toFixed(1)}</td>
      <td>${r.fcr}</td>
    </tr>
  `).join('') + `
    <tr style="background:var(--sand-light);font-weight:800;border-top:2px solid var(--yellow-deep);">
      <td class="col-left" style="font-weight:800;">Total / Média</td>
      <td><strong>${totals.atrib}</strong></td>
      <td><strong>${totals.resp}</strong></td>
      <td><strong>${totals.pend}</strong></td>
      <td><strong>${medPrazo.toFixed(1)} dias</strong></td>
      <td><strong>${(medResol*100).toFixed(1)}%</strong></td>
      <td><strong>⭐ ${medNota.toFixed(1)}</strong></td>
      <td><strong>${totals.fcr}</strong></td>
    </tr>
  `
}

// ──────── Treemap ────────
const TREEMAP_COLORS = {
  'Bloqueio/encerramento': '#2EAA4E',
  'Golpe':                 '#DC3F3F',
  'Invasão de conta':      '#F5C518',
  'Emissão':               '#D3B98A',
  'Consignado':            '#8FCFE0',
  'Outros':                '#A8D8E4',
}
function renderTreemap(data) {
  const el = document.getElementById('treemap')
  if (!el) return
  const layout = [
    { key: 'Bloqueio/encerramento', col:'1/4', row:'1/4' },
    { key: 'Golpe',                 col:'4/5', row:'1/3' },
    { key: 'Invasão de conta',      col:'5/7', row:'1/3' },
    { key: 'Invasão de conta',      col:'1/4', row:'4/6' },
    { key: 'Emissão',               col:'4/5', row:'3/5' },
    { key: 'Outros',                col:'5/7', row:'3/4' },
    { key: 'Consignado',            col:'4/7', row:'5/6' },
  ]
  el.innerHTML = layout.map(t => {
    const item = data.find(d => d.nome === t.key) || { nome: t.key, volume: 0, pct: 0 }
    const color = TREEMAP_COLORS[t.key] || '#ccc'
    const textColor = ['Emissão','Invasão de conta','Outros','Consignado'].includes(t.key) ? '#0B2A55' : 'white'
    return `<div style="
      grid-column:${t.col};grid-row:${t.row};
      background:${color};color:${textColor};
      padding:8px;font-weight:700;font-size:12px;
      display:flex;align-items:flex-start;
      cursor:pointer;transition:filter .2s;
    "
    onmouseover="this.style.filter='brightness(1.08)'"
    onmouseout="this.style.filter=''"
    title="${item.nome}: ${item.volume} casos"
    >${t.key}</div>`
  }).join('')
}

// ──────── Donut ────────
function renderDonut(data) {
  const ctx = document.getElementById('donut-chart')
  if (!ctx) return
  if (charts.donut) charts.donut.destroy()

  const STATUS_COLORS = { 'Resolvido':'#2EAA4E','Improcedente':'#F5C518','Cancelada/Recusada':'#DC3F3F','Em Andamento':'#3B82F6' }
  const labels = data.map(d => d.status)
  const values = data.map(d => d.volume)
  const colors = data.map(d => STATUS_COLORS[d.status] || '#ccc')

  charts.donut = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 3, borderColor: '#fff' }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed}` } }
      }
    },
    plugins: [{
      id: 'pct',
      afterDatasetsDraw(chart) {
        const { ctx } = chart
        const total = values.reduce((a,b)=>a+b,0)
        chart.getDatasetMeta(0).data.forEach((arc, i) => {
          const { x, y } = arc.tooltipPosition()
          ctx.fillStyle = '#fff'
          ctx.font = '700 12px Inter,sans-serif'
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          const pct = total ? Math.round(values[i]/total*100) : 0
          if (pct > 4) ctx.fillText(pct+'%', x, y)
        })
      }
    }]
  })

  const legend = document.getElementById('donut-legend')
  if (legend) {
    legend.innerHTML = data.map(d => `
      <span style="display:flex;align-items:center;gap:4px;">
        <span style="width:10px;height:10px;border-radius:2px;background:${STATUS_COLORS[d.status]||'#ccc'};display:inline-block;"></span>
        ${d.status}
      </span>
    `).join('')
  }
}

function updateInsight(statusData, kpis) {
  const el = document.getElementById('insight-text')
  if (!el) return
  const resolvido = statusData.find(s => s.status === 'Resolvido')
  const pct = resolvido ? Math.round(resolvido.pct * 100) : 0
  let msg = ''
  if (pct >= 80) {
    msg = `${pct}% dos casos encerrados como Resolvido — acima da meta. Prazo médio de ${kpis.prazoMedio.toFixed(1)} dias está dentro do SLA.`
  } else if (pct >= 70) {
    msg = `${pct}% de resolução. Verifique os casos "Improcedente" para identificar padrões e elevar o índice.`
  } else {
    msg = `Atenção: apenas ${pct}% de resolução. Revisão de causa raiz recomendada para elevar acima de 80%.`
  }
  el.textContent = msg
}

// ──────── Bar Chart ────────
function renderBarChart(data) {
  const ctx = document.getElementById('bar-chart')
  if (!ctx || typeof Chart === 'undefined') return
  if (charts.bar) charts.bar.destroy()

  // Estima distribuição com base nos dados disponíveis
  const labels = data.map(d => d.analista)
  const resp   = data.map(d => d.atribuidos ? Math.round(d.respondidos/d.atribuidos*100) : 0)
  const analise= data.map(d => d.atribuidos ? Math.round(d.pendentes/d.atribuidos*70) : 0)
  const critico= data.map(d => 100 - resp[data.indexOf(d)] - analise[data.indexOf(d)])

  charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Respondidos', data:resp,    backgroundColor:'#2EAA4E', borderRadius:4 },
        { label:'Em Análise',  data:analise, backgroundColor:'#F5C518', borderRadius:4 },
        { label:'Críticos',    data:critico, backgroundColor:'#DC3F3F', borderRadius:4 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      scales: {
        x: { stacked:true, grid:{ display:false } },
        y: { stacked:true, beginAtZero:true, max:100, ticks:{ stepSize:25 }, grid:{ color:'rgba(11,42,85,0.07)' } }
      },
      plugins: {
        legend: { display:false },
        tooltip: { callbacks:{ label: c => ` ${c.dataset.label}: ${c.parsed.y}%` } }
      }
    }
  })

  const legend = document.getElementById('bar-legend')
  if (legend) {
    legend.innerHTML = [['#2EAA4E','Respondidos'],['#F5C518','Em Análise'],['#DC3F3F','Críticos']].map(([c,l]) => `
      <span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--ink-soft);">
        <span style="width:10px;height:10px;border-radius:2px;background:${c};display:inline-block;"></span>${l}
      </span>
    `).join('')
  }
}

// ──────── Line Chart ────────
function renderLineChart(data) {
  const ctx = document.getElementById('line-chart')
  if (!ctx || typeof Chart === 'undefined') return
  if (charts.line) charts.line.destroy()

  if (!data.length) return
  const labels   = data.map(d => d.semana)
  const analistas = ['Giovana','Gisele','Jussara']
  const COLORS    = ['#2EAA4E','#F5C518','#DC3F3F']

  charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        ...analistas.map((a,i) => ({
          label: a,
          data: data.map(d => d[a] ?? null),
          borderColor: COLORS[i], backgroundColor: COLORS[i],
          tension:0.35, borderWidth:2.5, pointRadius:3, spanGaps:true
        })),
        {
          label:'Target: 7',
          data: labels.map(()=>7),
          borderColor:'#B91C1C', borderWidth:2, pointRadius:0, tension:0,
          borderDash:[4,4]
        }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      scales: {
        x: { grid:{ display:false } },
        y: { beginAtZero:true, max:12, ticks:{ stepSize:2 }, grid:{ color:'rgba(11,42,85,0.07)' } }
      },
      plugins: {
        legend: {
          position:'top',
          labels:{ boxWidth:10, boxHeight:3, font:{ size:11, weight:'600' } }
        },
        tooltip: { callbacks:{ label: c => ` ${c.dataset.label}: ${c.parsed.y?.toFixed(1)} dias` } }
      }
    }
  })
}
