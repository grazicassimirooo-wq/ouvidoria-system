// ================================================================
// MAIN — SPA Router + Auth Guard
// ================================================================

import './styles/global.css'
import { onAuth } from './firebase/service.js'
import { getUserProfile } from './firebase/service.js'

// Carrega SheetJS via CDN (necessário para import/export XLSX)
const xlsxScript = document.createElement('script')
xlsxScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
document.head.appendChild(xlsxScript)

// Carrega Chart.js
const chartScript = document.createElement('script')
chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
document.head.appendChild(chartScript)

// ── Estado global
export const state = {
  user: null,
  profile: null,
  currentPage: null,
  casos: [],
  unsubs: []   // listeners para limpar no unmount
}

// ── Router
const routes = {
  '/login':      () => import('./pages/login.js'),
  '/dashboard':  () => import('./pages/dashboard.js'),
  '/casos':      () => import('./pages/casos.js'),
  '/admin':      () => import('./pages/admin.js'),
  '/importar':   () => import('./pages/importar.js'),
}

export async function navigate(path) {
  // Limpa listeners anteriores
  state.unsubs.forEach(u => u && u())
  state.unsubs = []

  const app = document.getElementById('app')
  app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh"><div class="spinner"></div></div>'

  const loader = routes[path]
  if (!loader) return navigate('/login')

  const mod = await loader()
  await mod.render(app)
  state.currentPage = path
  window.history.pushState({}, '', path)
}

// ── Intercepta navegação nativa (botão voltar)
window.addEventListener('popstate', () => {
  navigate(window.location.pathname)
})

// ── Guard de auth
onAuth(async (user) => {
  state.user = user

  if (user) {
    state.profile = await getUserProfile(user.uid)
    const path = window.location.pathname
    if (path === '/login' || path === '/') return navigate('/dashboard')
    return navigate(path)
  } else {
    state.user = null
    state.profile = null
    navigate('/login')
  }
})
