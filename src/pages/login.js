// ================================================================
// PÁGINA: Login
// ================================================================

import { login } from '../firebase/service.js'
import { navigate } from '../main.js'
import { showToast } from '../utils/helpers.js'

export async function render(app) {
  app.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;align-items:center;justify-content:center;
      padding:24px;
    ">

      <!-- Decoração sol -->
      <div style="
        position:fixed;top:-60px;right:-60px;
        width:320px;height:320px;border-radius:50%;
        background:radial-gradient(circle at 40% 40%,#FFEB99,#F5C518 55%,#E6A800);
        opacity:.18;pointer-events:none;
      "></div>
      <div style="
        position:fixed;bottom:-80px;left:-80px;
        width:360px;height:360px;border-radius:50%;
        background:radial-gradient(circle,rgba(46,170,78,0.12),transparent 70%);
        pointer-events:none;
      "></div>

      <!-- Card de login -->
      <div class="glass fade-up" style="
        width:100%;max-width:440px;
        border-radius:var(--radius-xl);
        padding:48px 40px;
        box-shadow:var(--shadow-lg);
      ">

        <!-- Logo -->
        <div style="text-align:center;margin-bottom:36px;">
          <div style="
            width:64px;height:64px;border-radius:18px;
            background:linear-gradient(135deg,var(--yellow) 0%,var(--yellow-deep) 100%);
            display:inline-flex;align-items:center;justify-content:center;
            font-size:30px;box-shadow:0 6px 20px rgba(230,168,0,0.4);
            margin-bottom:16px;
          ">📊</div>
          <h1 style="
            font-family:var(--font-display);
            font-weight:800;font-size:24px;
            color:var(--ink);line-height:1.1;margin-bottom:6px;
          ">Ouvidoria Manager</h1>
          <p style="font-size:14px;color:var(--muted);">PagSeguro / PagBank — Consumidor.gov</p>
        </div>

        <!-- Form -->
        <form id="login-form" style="display:flex;flex-direction:column;gap:18px;">

          <div class="field">
            <label for="email">E-mail</label>
            <input
              type="email" id="email"
              placeholder="seu@email.com"
              autocomplete="email"
              required
            />
          </div>

          <div class="field" style="position:relative;">
            <label for="password">Senha</label>
            <input
              type="password" id="password"
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />
            <button type="button" id="toggle-pw" style="
              position:absolute;right:12px;bottom:11px;
              background:none;border:none;cursor:pointer;
              font-size:16px;color:var(--muted);
            ">👁</button>
          </div>

          <div id="login-error" style="
            display:none;
            background:var(--red-light);color:#7F1D1D;
            border-radius:8px;padding:10px 14px;
            font-size:13px;font-weight:600;
          "></div>

          <button type="submit" id="btn-login" class="btn btn-primary btn-lg" style="width:100%;margin-top:4px;">
            <span id="btn-text">Entrar</span>
            <div class="spinner" id="btn-spin" style="display:none;width:18px;height:18px;border-width:2px;"></div>
          </button>

        </form>

        <div style="
          margin-top:28px;padding-top:20px;
          border-top:1px solid var(--border);
          text-align:center;
          font-size:12.5px;color:var(--muted);
        ">
          Acesso restrito a analistas e administradores.<br>
          Entre em contato com o admin para criar sua conta.
        </div>

      </div>
    </div>
  `

  const form   = document.getElementById('login-form')
  const errEl  = document.getElementById('login-error')
  const btnTxt = document.getElementById('btn-text')
  const btnSpin = document.getElementById('btn-spin')
  const btn    = document.getElementById('btn-login')

  // Toggle senha
  document.getElementById('toggle-pw').addEventListener('click', () => {
    const pw = document.getElementById('password')
    pw.type = pw.type === 'password' ? 'text' : 'password'
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errEl.style.display = 'none'
    btn.disabled = true
    btnTxt.textContent = 'Entrando...'
    btnSpin.style.display = 'inline-block'

    const email    = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value

    try {
      await login(email, password)
      showToast('Bem-vinda! 👋', 'success')
      // navigate chamado pelo onAuth listener no main.js
    } catch(err) {
      const msg = translateFirebaseError(err.code)
      errEl.textContent = msg
      errEl.style.display = 'block'
      btn.disabled = false
      btnTxt.textContent = 'Entrar'
      btnSpin.style.display = 'none'
    }
  })
}

function translateFirebaseError(code) {
  const map = {
    'auth/user-not-found':    'Usuário não encontrado.',
    'auth/wrong-password':    'Senha incorreta.',
    'auth/invalid-email':     'E-mail inválido.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
    'auth/invalid-credential':'E-mail ou senha incorretos.',
  }
  return map[code] || 'Erro ao entrar. Verifique suas credenciais.'
}
