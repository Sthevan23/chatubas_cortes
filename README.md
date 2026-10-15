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

## Deploy Hostinger

Guia: [DEPLOY-HOSTINGER.md](DEPLOY-HOSTINGER.md)

```bash
# 1) confira deploy.config.json (já com sthevandev.com.br)
npm run prepare:hostinger
# 2) suba dist/site → public_html (inclui pasta api/)
# 3) configure public_html/api/config.php (MySQL)
# 4) suba dist/painel → subdomínio painel
```

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
