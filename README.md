# Chatubas Cortes

Monorepo: **frontend** (estático) + **API PHP** (Hostinger) + **backend** Node (dev local).

## Estrutura

```
barbearia/
  frontend/     # site + painel
  backend/
    database/   # schema SQL + queries
    src/        # Clean Architecture
  scripts/      # prepare:hostinger
  dist/         # gerado para upload (não versionar)
```

## Desenvolvimento local

```bash
npm install
npm run dev:api    # http://localhost:3000
npm run dev:web    # http://localhost:5173
```

## Deploy Hostinger (auto)

Guia: [DEPLOY-HOSTINGER.md](DEPLOY-HOSTINGER.md)

1. Confira `deploy.config.json` (domínio atual).
2. Push em **`main`** → GitHub Actions gera branch **`hostinger`**.
3. No hPanel Git, deploy do branch **`hostinger`**.
4. Uma vez: `api/config.php` no servidor (MySQL do hPanel).

| Serviço | URL |
|---------|-----|
| Site | https://sthevandev.com.br |
| Painel | https://painel.sthevandev.com.br |
| API (PHP) | https://sthevandev.com.br/api |

## API

| Método | Rota | Auth |
|--------|------|------|
| GET | `/health` | não |
| GET | `/agendamentos/ocupados` | não |
| POST | `/agendamentos` | não |
| POST | `/auth/login` | não |
| GET | `/agendamentos` | Bearer |
| GET | `/financeiro/resumo` | Bearer |

## Lembretes WhatsApp

Opcionais via Evolution (`EVOLUTION_*` no `.env`). Sem isso, use o botão **Lembrete** no painel.
