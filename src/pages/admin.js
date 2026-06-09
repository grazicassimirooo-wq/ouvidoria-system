// ================================================================
// PÁGINA: Admin — gerenciar usuários (apenas admins)
// ================================================================

import { renderNavbar } from '../components/navbar.js'
import { getAllUsers, createUser, deleteUserFromFirestore, updateUserProfile } from '../firebase/service.js'
import { state, navigate } from '../main.js'
import { showToast, ROLES } from '../utils/helpers.js'

export async function render(app) {
  // Guard: somente admin
  if (state.profile?.role !== 'admin') {
    app.innerHTML = ''
    renderNavbar(app)
    const msg = document.createElement('div')
    msg.style.cssText = 'padding:80px 28px;text-align:center;'
    msg.innerHTML = `
      <div style="font-size:64px;margin-bottom:16px;">🔒</div>
      <h2 style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink);margin-bottom:8px;">Acesso restrito</h2>
      <p style="color:var(--muted);margin-bottom:24px;">Apenas administradores podem acessar esta área.</p>
      <button class="btn btn-primary" onclick="import('../main.js').then(m=>m.navigate('/dashboard'))">Voltar ao Dashboard</button>
    `
    app.appendChild(msg)
    return
  }

  app.innerHTML = ''
  renderNavbar(app)

  const main = document.createElement('div')
  main.style.cssText = 'max-width:1000px;margin:0 auto;padding:24px 28px 60px;'
  app.appendChild(main)

  main.innerHTML = `
    <div class="fade-up-1" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:28px;">
      <div>
        <h2 style="font-family:var(--font-display);font-weight:800;font-size:26px;color:var(--ink);margin-bottom:4px;">
          ⚙️ Administração
        </h2>
        <p style="font-size:14px;color:var(--muted);">Gerencie os usuários que têm acesso ao sistema</p>
      </div>
      <button id="btn-novo-user" class="btn btn-primary">+ Novo Usuário</button>
    </div>

    <!-- Cards de stats -->
    <div id="user-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px;" class="fade-up-2"></div>

    <!-- Tabela de usuários -->
    <div class="glass fade-up-3" style="border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-md);">
      <div style="
        background:linear-gradient(180deg,var(--yellow) 0%,var(--yellow-deep) 100%);
        padding:14px 20px;
        font-family:var(--font-display);font-weight:800;font-size:16px;color:var(--ink);
      ">👥 Usuários Cadastrados</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            <tr><td colspan="5" style="padding:40px;">
              <div class="spinner" style="margin:0 auto;"></div>
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Novo Usuário -->
    <div id="modal-user" class="modal-overlay" style="display:none;">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title" id="modal-user-title">Novo Usuário</span>
          <button class="modal-close" id="close-user-modal">✕</button>
        </div>
        <form id="form-user" style="display:flex;flex-direction:column;gap:16px;">
          <div class="field">
            <label>Nome completo *</label>
            <input type="text" id="u-name" placeholder="Nome da analista" required>
          </div>
          <div class="field">
            <label>E-mail *</label>
            <input type="email" id="u-email" placeholder="email@pagseguro.com" required>
          </div>
          <div class="field">
            <label>Senha temporária *</label>
            <input type="password" id="u-password" placeholder="Mínimo 6 caracteres" minlength="6" required>
          </div>
          <div class="field">
            <label>Perfil *</label>
            <select id="u-role" required>
              <option value="">Selecione o perfil</option>
              <option value="analista">👤 Analista</option>
              <option value="admin">👑 Administrador</option>
            </select>
          </div>
          <div id="user-form-error" style="display:none;background:var(--red-light);color:#7F1D1D;border-radius:8px;padding:10px 14px;font-size:13px;font-weight:600;"></div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button type="button" id="btn-cancel-user" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-save-user" class="btn btn-primary">
              <span id="save-user-txt">Criar Usuário</span>
              <div class="spinner" id="save-user-spin" style="display:none;width:16px;height:16px;border-width:2px;"></div>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Editar papel -->
    <div id="modal-edit-role" class="modal-overlay" style="display:none;">
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <span class="modal-title">Alterar Perfil</span>
          <button class="modal-close" id="close-role-modal">✕</button>
        </div>
        <div class="field" style="margin-bottom:20px;">
          <label>Novo perfil para <strong id="edit-role-name"></strong></label>
          <select id="edit-role-select">
            <option value="analista">👤 Analista</option>
            <option value="admin">👑 Administrador</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn btn-secondary" id="cancel-role">Cancelar</button>
          <button class="btn btn-primary" id="save-role">Salvar</button>
        </div>
      </div>
    </div>
  `

  loadUsers()
  bindAdminEvents()
}

let usersCache = []

async function loadUsers() {
  try {
    usersCache = await getAllUsers()

    // Stats
    const stats = document.getElementById('user-stats')
    const admins   = usersCache.filter(u => u.role === 'admin').length
    const analistas = usersCache.filter(u => u.role === 'analista').length
    stats.innerHTML = [
      { label: 'Total de Usuários', value: usersCache.length, icon: '👥' },
      { label: 'Administradores',   value: admins,            icon: '👑' },
      { label: 'Analistas',          value: analistas,         icon: '👤' },
    ].map(s => `
      <div class="glass" style="border-radius:var(--radius-md);padding:18px 20px;box-shadow:var(--shadow-sm);">
        <div style="font-size:24px;margin-bottom:8px;">${s.icon}</div>
        <div style="font-family:var(--font-display);font-weight:800;font-size:26px;color:var(--ink);line-height:1;">${s.value}</div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:4px;">${s.label}</div>
      </div>
    `).join('')

    // Tabela
    renderUsersTable()
  } catch(e) {
    showToast('Erro ao carregar usuários: ' + e.message, 'error')
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('users-tbody')
  if (!usersCache.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:30px;color:var(--muted);font-size:14px;">Nenhum usuário cadastrado.</td></tr>`
    return
  }
  tbody.innerHTML = usersCache.map(u => `
    <tr>
      <td class="col-left" style="font-weight:700;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="
            width:32px;height:32px;border-radius:50%;
            background:linear-gradient(135deg,var(--yellow),var(--yellow-deep));
            display:flex;align-items:center;justify-content:center;
            font-weight:800;font-size:13px;color:var(--ink);flex-shrink:0;
          ">${(u.name||'U').charAt(0).toUpperCase()}</div>
          ${u.name || '—'}
        </div>
      </td>
      <td style="font-size:13px;color:var(--muted);">${u.email || '—'}</td>
      <td>
        <span class="badge ${u.role === 'admin' ? 'badge-yellow' : 'badge-blue'}">
          ${u.role === 'admin' ? '👑 Admin' : '👤 Analista'}
        </span>
      </td>
      <td style="font-size:12px;color:var(--muted);">${u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('pt-BR') : '—'}</td>
      <td>
        <div style="display:flex;gap:6px;justify-content:center;">
          <button class="btn btn-secondary btn-sm" onclick="window.__editRole('${u.id}','${u.name}','${u.role}')">
            ✏️ Perfil
          </button>
          ${u.id !== state.user?.uid ? `
            <button class="btn btn-danger btn-sm" onclick="window.__deleteUser('${u.id}','${u.name}')">
              🗑️
            </button>
          ` : '<span style="font-size:11px;color:var(--muted);padding:0 6px;">Você</span>'}
        </div>
      </td>
    </tr>
  `).join('')

  window.__editRole = (id, name, role) => {
    document.getElementById('edit-role-name').textContent = name
    document.getElementById('edit-role-select').value = role
    document.getElementById('modal-edit-role').style.display = 'flex'
    document.getElementById('save-role').onclick = async () => {
      const newRole = document.getElementById('edit-role-select').value
      try {
        await updateUserProfile(id, { role: newRole })
        showToast('Perfil atualizado!', 'success')
        document.getElementById('modal-edit-role').style.display = 'none'
        loadUsers()
      } catch(e) { showToast('Erro: ' + e.message, 'error') }
    }
  }

  window.__deleteUser = async (id, name) => {
    if (!confirm(`Remover ${name} do sistema?`)) return
    try {
      await deleteUserFromFirestore(id)
      showToast(`${name} removido.`, 'success')
      loadUsers()
    } catch(e) { showToast('Erro: ' + e.message, 'error') }
  }
}

function bindAdminEvents() {
  document.getElementById('btn-novo-user').addEventListener('click', () => {
    document.getElementById('modal-user').style.display = 'flex'
    document.getElementById('user-form-error').style.display = 'none'
  })
  document.getElementById('close-user-modal').addEventListener('click', () => {
    document.getElementById('modal-user').style.display = 'none'
  })
  document.getElementById('btn-cancel-user').addEventListener('click', () => {
    document.getElementById('modal-user').style.display = 'none'
  })
  document.getElementById('close-role-modal').addEventListener('click', () => {
    document.getElementById('modal-edit-role').style.display = 'none'
  })
  document.getElementById('cancel-role').addEventListener('click', () => {
    document.getElementById('modal-edit-role').style.display = 'none'
  })

  document.getElementById('form-user').addEventListener('submit', async (e) => {
    e.preventDefault()
    const errEl   = document.getElementById('user-form-error')
    const btn     = document.getElementById('btn-save-user')
    const txt     = document.getElementById('save-user-txt')
    const spin    = document.getElementById('save-user-spin')
    errEl.style.display = 'none'

    const name     = document.getElementById('u-name').value.trim()
    const email    = document.getElementById('u-email').value.trim()
    const password = document.getElementById('u-password').value
    const role     = document.getElementById('u-role').value

    if (!name || !email || !password || !role) {
      errEl.textContent = 'Preencha todos os campos.'
      errEl.style.display = 'block'
      return
    }

    btn.disabled = true
    txt.textContent = 'Criando...'
    spin.style.display = 'inline-block'

    try {
      await createUser(email, password, name, role)
      showToast(`${name} criado com sucesso! 🎉`, 'success')
      document.getElementById('modal-user').style.display = 'none'
      document.getElementById('form-user').reset()
      loadUsers()
    } catch(err) {
      const msgs = {
        'auth/email-already-in-use': 'Este e-mail já está em uso.',
        'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres).',
        'auth/invalid-email': 'E-mail inválido.',
      }
      errEl.textContent = msgs[err.code] || 'Erro ao criar usuário: ' + err.message
      errEl.style.display = 'block'
    } finally {
      btn.disabled = false
      txt.textContent = 'Criar Usuário'
      spin.style.display = 'none'
    }
  })
}
