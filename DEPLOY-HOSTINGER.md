# Deploy Hostinger — Chatubas Cortes

## Mapa dos endereços

| O quê | URL exemplo | Pasta gerada |
|--------|-------------|--------------|
| Site | `https://seudominio.com` | `dist/site/` |
| Painel | `https://painel.seudominio.com` | `dist/painel/` |
| API | `https://api.seudominio.com` | pasta `backend/` no Node/VPS |

## 1. Configure as URLs

Edite `deploy.config.json` na raiz:

```json
{
  "apiUrl": "https://api.seudominio.com",
  "siteUrl": "https://seudominio.com",
  "painelUrl": "https://painel.seudominio.com"
}
```

## 2. Gere os arquivos de upload

```bash
npm run prepare:hostinger
```

Isso cria `dist/site/` e `dist/painel/` com `config.js` e `.htaccess` prontos.

## 3. Site (domínio)

1. hPanel → Gerenciador de arquivos → `public_html`
2. Envie **todo** o conteúdo de `dist/site/`

## 4. Painel (subdomínio)

1. hPanel → Domínios → Subdomínios → criar `painel`
2. Envie **todo** o conteúdo de `dist/painel/` para a pasta do subdomínio
3. Abrir `https://painel.seudominio.com` → tela de login

## 5. Banco MySQL

1. hPanel → Bancos de dados MySQL → criar banco + usuário
2. phpMyAdmin → selecionar o banco → SQL
3. Colar e executar `backend/database/schema.sql`

## 6. API (Node)

Precisa de **VPS** ou **Node.js Hosting** na Hostinger (hospedagem só PHP não roda a API).

1. Envie a pasta `backend/`
2. Crie `.env`:

```env
PORT=3000
CORS_ORIGIN=https://seudominio.com,https://www.seudominio.com,https://painel.seudominio.com
AUTH_SECRET=um-segredo-forte-aleatorio
DB_HOST=localhost
DB_USER=seu_usuario_hostinger
DB_PASSWORD=sua_senha
DB_NAME=seu_banco_hostinger
```

3. Instale e suba:

```bash
cd backend
npm ci --omit=dev
node server.js
# recomendado: pm2 start server.js --name chatubas-api
```

4. Aponte o subdomínio `api` para esse processo (proxy HTTPS).

## Checklist

- [ ] `deploy.config.json` com URLs reais
- [ ] `npm run prepare:hostinger`
- [ ] Upload `dist/site` → domínio
- [ ] Upload `dist/painel` → subdomínio painel
- [ ] Schema SQL no MySQL
- [ ] API no ar + CORS com site e painel
- [ ] Testar agendamento no site
- [ ] Testar login em `painel.seudominio.com`
