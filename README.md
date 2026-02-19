# Webinar IA para Moda — Deploy no Vercel

## Estrutura do projeto

```
vercel-webinar/
├── api/
│   └── subscribe.js      ← API serverless (chama o MailerLite)
├── public/
│   ├── index.html        ← Landing page
│   └── sucesso.html      ← Página de confirmação
└── vercel.json           ← Configuração do Vercel
```

---

## Deploy passo a passo

### 1. Instala o Vercel CLI (se ainda não tens)
```bash
npm install -g vercel
```

### 2. Faz login
```bash
vercel login
```

### 3. Na pasta do projeto, faz o deploy
```bash
cd vercel-webinar
vercel
```
Segue as perguntas:
- Set up and deploy? → **Y**
- Which scope? → a tua conta
- Link to existing project? → **N**
- Project name → `webinar-ia-moda` (ou o que quiseres)
- In which directory is your code? → **.**
- Override settings? → **N**

### 4. Adiciona a variável de ambiente (o token do MailerLite)

No dashboard do Vercel:
1. Vai ao teu projeto → **Settings → Environment Variables**
2. Adiciona:
   - **Name:** `MAILERLITE_TOKEN`
   - **Value:** `eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...` (o teu token completo)
   - **Environment:** Production + Preview + Development
3. Clica **Save**

### 5. Redeploy para aplicar a variável
```bash
vercel --prod
```

---

## Personalizar o link do WhatsApp

No ficheiro `public/sucesso.html`, procura:
```html
<a href="TEU_LINK_WHATSAPP"
```
E substitui `TEU_LINK_WHATSAPP` pelo link real do teu grupo.

---

## Testar localmente (opcional)

```bash
npm install -g vercel
vercel dev
```
Abre http://localhost:3000 — funciona igual à produção, com as variáveis de ambiente.

---

## Como funciona a integração

```
Browser  →  POST /api/subscribe  →  Vercel Function  →  MailerLite API
                (nome + email)        (server-side,          (adiciona ao grupo
                                       token seguro)          "Webinar #2")
```

Nenhum token é exposto ao browser. A API do Vercel corre no servidor.
