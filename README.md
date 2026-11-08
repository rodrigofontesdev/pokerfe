# Pokerfé

Planning poker para times: salas em tempo real, sem login e com dados mínimos (nome e avatar). O
facilitador cria a sala, compartilha o link, os votantes escolhem cartas em sigilo e o facilitador
revela o resultado (mediana, moda e distribuição).

**Produção**: <https://pokerfe.rodrigofontesdev.workers.dev>

## Stack

- React 19, TanStack Router, Tailwind CSS 4 e Base UI (SPA com Vite)
- Cloudflare Workers + Durable Objects (SQLite) + static assets, em `*.workers.dev`
- TypeScript e Zod (schemas compartilhados entre cliente e servidor)
- Vitest (unidade e integração, `@cloudflare/vitest-plugin`) e Playwright (ponta a ponta e smoke)

## Comandos

Requer Node.js 26 (ver `.nvmrc`) e npm.

| Objetivo                         | Comando                                             |
| -------------------------------- | --------------------------------------------------- |
| Instalar                         | `npm install`                                       |
| Rodar local                      | `npm run dev`                                       |
| Checar tipos                     | `npm run typecheck`                                 |
| Lint                             | `npm run lint`                                      |
| Formatação                       | `npm run format:check` (`npm run format` corrige)   |
| Testes unitários e de integração | `npm test`                                          |
| Testes de ponta a ponta          | `npx playwright install` e `npm run test:e2e`       |
| Smoke test                       | `SMOKE_BASE_URL=<url publicada> npm run test:smoke` |
| Build                            | `npm run build`                                     |
| Deploy manual                    | `npx wrangler login` e `npm run deploy`             |

## Deploy automático

O workflow `.github/workflows/deploy.yml` roda typecheck e testes em todo pull request e em todo
push na `main`. Em push na `main`, após os testes, faz o build, publica com
`cloudflare/wrangler-action@v4` e roda o smoke test contra a URL publicada; falha no smoke test
marca o workflow como falho (sem reversão automática).

Secrets do repositório (cadastrados pelo responsável pelo produto):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Especificações

Tudo sobre o MVP está em [`specs/001-pokerfe-mvp/`](specs/001-pokerfe-mvp/):

- [spec.md](specs/001-pokerfe-mvp/spec.md): requisitos e histórias de usuário
- [plan.md](specs/001-pokerfe-mvp/plan.md): plano técnico
- [research.md](specs/001-pokerfe-mvp/research.md): decisões técnicas
- [data-model.md](specs/001-pokerfe-mvp/data-model.md): modelo de dados
- [contracts/](specs/001-pokerfe-mvp/contracts/): contratos HTTP e WebSocket
- [quickstart.md](specs/001-pokerfe-mvp/quickstart.md): roteiro de validação
- [tasks.md](specs/001-pokerfe-mvp/tasks.md): tarefas

Princípios do projeto: [constitution](.specify/memory/constitution.md).
