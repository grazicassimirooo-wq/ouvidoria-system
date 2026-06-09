# 📊 Ouvidoria Manager — Sistema Completo
PagSeguro / PagBank — Consumidor.gov

Sistema de gestão de casos de ouvidoria com Firebase Auth + Firestore + deploy no Vercel.

---

## 🗂 Estrutura do Projeto

```
ouvidoria-system/
├── index.html               ← Entry point do SPA
├── package.json
├── vite.config.js
├── vercel.json              ← Config de deploy e SPA routing
└── src/
    ├── main.js              ← Router SPA + auth guard
    ├── styles/global.css    ← Todos os estilos (paleta praia)
    ├── firebase/
    │   ├── config.js        ← ⚠️ VOCÊ PREENCHE AS CHAVES AQUI
    │   └── service.js       ← Auth, Firestore, Storage
    ├── utils/helpers.js     ← KPIs, export, toast, formatação
    ├── components/
    │   └── navbar.js        ← Header com navegação
    └── pages/
        ├── login.js         ← Tela de login
        ├── dashboard.js     ← Dashboard (visual da referência)
        ├── casos.js         ← CRUD de casos
        ├── importar.js      ← Upload de planilha XLSX
        └── admin.js         ← Gestão de usuários
```

---

## ⚙️ PASSO 1 — Criar projeto Firebase

1. Acesse https://console.firebase.google.com
2. Clique em **"Adicionar projeto"** → nome: `ouvidoria-manager`
3. Desative o Google Analytics (opcional) → Criar projeto

### Ativar Authentication
- Menu lateral → **Authentication** → **Começar**
- Aba **"Sign-in method"** → Ativar **E-mail/senha**

### Criar Firestore Database
- Menu lateral → **Firestore Database** → **Criar banco de dados**
- Escolha: **"Iniciar no modo de produção"**
- Região: **`southamerica-east1`** (São Paulo) → Ativar

### Regras de segurança do Firestore
Vá em **Firestore → Regras** e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuários: lê o próprio, admin lê todos
    match /users/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid
        || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if request.auth != null && request.auth.uid == uid;
    }

    // Casos: todos autenticados leem/escrevem
    match /casos/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Ativar Storage
- Menu lateral → **Storage** → **Começar**
- Região: `southamerica-east1`
- Regras → substitua por:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /planilhas/{file} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🔑 PASSO 2 — Configurar as chaves no projeto

1. Firebase Console → **Configurações do projeto** (engrenagem) → **Geral**
2. Desça até **"Seus apps"** → Clique em **"</>" (Web)**
3. Nome do app: `ouvidoria-web` → Registrar app
4. Copie o objeto `firebaseConfig`
5. Cole em **`src/firebase/config.js`**:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "ouvidoria-manager.firebaseapp.com",
  projectId:         "ouvidoria-manager",
  storageBucket:     "ouvidoria-manager.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
}
```

---

## 👑 PASSO 3 — Criar o primeiro usuário Admin

Como não existe nenhum usuário ainda, crie manualmente no Firebase:

1. Firebase Console → **Authentication** → **Usuários** → **Adicionar usuário**
   - E-mail: `admin@ouvidoria.com.br`
   - Senha: (defina uma senha forte)
   - Copie o **UID** gerado

2. Firebase Console → **Firestore** → **Iniciar coleção**: `users`
   - Document ID: cole o **UID copiado**
   - Campos:
     ```
     name:      "Admin" (string)
     email:     "admin@ouvidoria.com.br" (string)
     role:      "admin" (string)
     createdAt: (timestamp — clique em timestamp e selecione agora)
     ```

✅ Pronto! Você já pode logar e criar os outros usuários pela interface de Admin.

---

## 🚀 PASSO 4 — Deploy no Vercel

### Opção A — Via GitHub (recomendado)

```bash
# 1. Crie um repositório no GitHub e faça push
git init
git add .
git commit -m "feat: ouvidoria manager"
git remote add origin https://github.com/SEU_USUARIO/ouvidoria-system.git
git push -u origin main
```

2. Acesse https://vercel.com → **"New Project"**
3. Importe o repositório do GitHub
4. **Build Settings** (Vercel detecta automaticamente via `vite`):
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Clique em **Deploy**

### Opção B — Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel          # segue o wizard
vercel --prod   # deploy de produção
```

### Variáveis de ambiente (opcional — mais seguro)
Em vez de colocar as chaves no `config.js`, use variáveis no Vercel:

- Vercel → Settings → Environment Variables → adicione:
  ```
  VITE_FIREBASE_API_KEY        = AIzaSy...
  VITE_FIREBASE_AUTH_DOMAIN    = ...
  VITE_FIREBASE_PROJECT_ID     = ...
  VITE_FIREBASE_STORAGE_BUCKET = ...
  VITE_FIREBASE_SENDER_ID      = ...
  VITE_FIREBASE_APP_ID         = ...
  ```
- Depois atualize `config.js` para usar `import.meta.env.VITE_*`

---

## 🖥️ PASSO 5 — Rodar localmente

```bash
npm install
npm run dev
# → http://localhost:5173
```

---

## 🔄 Fluxo completo do sistema

```
Login
  ↓
Dashboard (dados em tempo real do Firestore)
  ↓ ↑
Casos (CRUD: criar/editar/excluir)
  ↓
Importar (upload .xlsx → Firestore)
  ↓
Exportar (Firestore → .xlsx download)
  ↓
Admin (apenas admin: criar/gerenciar usuários)
```

## 👤 Perfis de acesso

| Ação                    | Admin | Analista |
|------------------------|-------|----------|
| Ver dashboard           | ✅    | ✅       |
| Criar caso              | ✅    | ✅       |
| Editar próprio caso     | ✅    | ✅       |
| Editar caso alheio      | ✅    | ❌       |
| Excluir caso            | ✅    | ❌       |
| Importar planilha       | ✅    | ✅       |
| Exportar dados          | ✅    | ✅       |
| Gerenciar usuários      | ✅    | ❌       |

---

## 📦 Tecnologias

- **Vite** — build tool
- **Firebase 10** — Auth, Firestore, Storage
- **Chart.js 4** — gráficos (donut, bar, line)
- **SheetJS (xlsx)** — import/export de planilhas
- **Vercel** — hospedagem

---

## 💡 Próximos passos sugeridos

- [ ] Adicionar mais analistas via tela de Admin
- [ ] Conectar o dashboard HTML original ao Firestore (substitui `const data = {...}` por fetch)
- [ ] Notificações por e-mail quando SLA está próximo de vencer
- [ ] Relatório mensal em PDF gerado automaticamente
