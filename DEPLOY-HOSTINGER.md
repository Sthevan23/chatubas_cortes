# Deploy Hostinger — Chatubas Cortes (PHP)

Hospedagem compartilhada Hostinger: **site + API PHP + painel**. Não precisa de VPS/Node.

## Mapa

| O quê | URL | Upload |
|--------|-----|--------|
| Site + API + painel | `https://chatubascortes.seuproximosite.com.br` | branch **`hostinger`** → `public_html` |
| Painel (URL) | `.../painel` | pasta `painel/` no mesmo deploy |

A API fica em **`/api`** (ex.: `https://sthevandev.com.br/api/health`).

## 1. URLs

Edite `deploy.config.json`:

```json
{
  "apiUrl": "https://sthevandev.com.br/api",
  "siteUrl": "https://sthevandev.com.br",
  "painelUrl": "https://painel.sthevandev.com.br"
}
```

## 2. Auto deploy (GitHub → Hostinger)

1. Push na **`main`** dispara o workflow **Hostinger auto deploy**.
2. Ele publica o site pronto no branch **`hostinger`** (só arquivos web, `index.html` na raiz).
3. No **hPanel → Git**, conecte o repo e escolha branch **`hostinger`** (não use `main`, senão dá **403**).
4. A cada push em `main`, a Hostinger puxa o branch `hostinger` de novo.

Build local (opcional):

```bash
npm run prepare:hostinger
```

Isso cria `dist/site/` (com `api/`, `painel/`) e `js/config.js` prontos.

## 3. MySQL

1. hPanel → Bancos de dados MySQL → criar banco + usuário  
2. phpMyAdmin → executar `backend/database/schema.sql`

## 4. Upload do site (com API)

1. hPanel → Gerenciador de arquivos → `public_html`  
2. Envie **todo** o conteúdo de `dist/site/` (inclui pasta `api/`)

## 5. Configurar API PHP

1. Em `public_html/api/`, copie `config.example.php` → `config.php`  
2. Preencha `db_*` com os dados do hPanel  
3. Defina `auth_secret` (string longa aleatória)  
4. Ajuste `cors_origins` se usar outro domínio  
5. Teste no navegador: `https://seudominio.com/api/health` → `{"status":"ok",...}`

## 6. Painel (subdomínio)

1. hPanel → Subdomínios → criar `painel`  
2. Envie **todo** `dist/painel/` para a pasta do subdomínio  
3. Acesse `https://painel.seudominio.com` → login

## Checklist

- [ ] `deploy.config.json` com URLs reais  
- [ ] `npm run prepare:hostinger`  
- [ ] Schema SQL no MySQL  
- [ ] Upload `dist/site` → `public_html`  
- [ ] `api/config.php` configurado  
- [ ] Upload `dist/painel` → subdomínio  
- [ ] Testar agendamento no site  
- [ ] Testar login no painel  

## API Node (opcional)

A pasta `backend/` (Node) continua no repo para desenvolvimento local. Em produção na Hostinger compartilhada, use a API PHP em `php/api/`.
