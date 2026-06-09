// ================================================================
// COMPONENTE: Navbar
// ================================================================

import { logout } from '../firebase/service.js'
import { state, navigate } from '../main.js'
import { showToast } from '../utils/helpers.js'

export function renderNavbar(container) {
  const profile = state.profile
  const isAdmin = profile?.role === 'admin'

  const nav = document.createElement('nav')
  nav.id = 'navbar'
  nav.style.cssText = `
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.82);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.9);
    box-shadow: 0 2px 16px rgba(11,42,85,0.08);
  `

  nav.innerHTML = `
    <div style="
      max-width: 1500px; margin: 0 auto;
      padding: 0 28px;
      height: 64px;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
    ">
      <!-- Logo/Brand -->
      <div style="display:flex;align-items:center;gap:12px;cursor:pointer;" id="nav-logo">
        <div style="
          width:38px; height:38px; border-radius:10px;
          background: linear-gradient(135deg, var(--yellow) 0%, var(--yellow-deep) 100%);
          display:flex; align-items:center; justify-content:center;
          box-shadow: 0 3px 10px rgba(230,168,0,0.35);
          font-size:18px;
        ">📊</div>
        <div>
          <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink);line-height:1.1">
            Ouvidoria Manager
          </div>
          <div style="font-size:11px;color:var(--muted);letter-spacing:.03em">PagSeguro / PagBank</div>
        </div>
      </div>

      <!-- Links -->
      <div style="display:flex;align-items:center;gap:6px;" id="nav-links">
        ${navLink('/dashboard', '📊', 'Dashboard')}
        ${navLink('/casos', '📋', 'Casos')}
        ${navLink('/importar', '📥', 'Importar')}
        ${isAdmin ? navLink('/admin', '⚙️', 'Admin') : ''}
      </div>

      <!-- User -->
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="text-align:right;display:none" id="nav-user-info" class="nav-user-desktop">
          <div style="font-size:13px;font-weight:700;color:var(--ink);">${profile?.name || state.user?.displayName || 'Usuário'}</div>
          <div style="font-size:11px;color:var(--muted);">${isAdmin ? '👑 Admin' : '👤 Analista'}</div>
        </div>
        <div style="
          width:36px;height:36px;border-radius:50%;
          background:linear-gradient(135deg,var(--yellow),var(--yellow-deep));
          display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:14px;color:var(--ink);
          box-shadow:var(--shadow-sm);flex-shrink:0;
        ">${(profile?.name || state.user?.displayName || 'U').charAt(0).toUpperCase()}</div>
        <button id="btn-logout" class="btn btn-secondary btn-sm" style="flex-shrink:0">
          Sair
        </button>
      </div>
    </div>
  `

  container.appendChild(nav)

  // Mostra info do user em telas maiores
  const userInfo = nav.querySelector('#nav-user-info')
  if (window.innerWidth > 640) userInfo.style.display = 'block'

  // Active state
  nav.querySelectorAll('.nav-link').forEach(a => {
    if (a.dataset.path === state.currentPage) {
      a.style.background = 'rgba(245,197,24,0.18)'
      a.style.color = 'var(--ink)'
    }
  })

  nav.querySelector('#nav-logo').addEventListener('click', () => navigate('/dashboard'))

  nav.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      navigate(a.dataset.path)
    })
  })

  nav.querySelector('#btn-logout').addEventListener('click', async () => {
    await logout()
    showToast('Sessão encerrada.', 'info')
    navigate('/login')
  })
}

function navLink(path, icon, label) {
  return `
    <a class="nav-link" data-path="${path}" href="${path}" style="
      display:inline-flex;align-items:center;gap:6px;
      padding:7px 14px;border-radius:8px;
      font-size:13.5px;font-weight:600;color:var(--ink-soft);
      text-decoration:none;
      transition:background .18s,color .18s;
      cursor:pointer;
    "
    onmouseover="this.style.background='rgba(245,197,24,0.12)';this.style.color='var(--ink)'"
    onmouseout="if(this.dataset.path!==window.location.pathname){this.style.background='';this.style.color='var(--ink-soft)'}"
    >${icon} ${label}</a>
  `
}
