# Implementation Plan: Pokerfé — MVP de planning poker

**Branch**: `001-pokerfe-mvp` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-pokerfe-mvp/spec.md`

**Note**: Plano **aprovado em 2026-11-02** pelo responsável pelo produto, com as substituições de
stack registradas em research.md (R-02, R-07, R-08). O único item ainda Proposta é "rotas definidas
em código" (R-08). As decisões D-01 a D-03 foram tomadas em 2026-11-02 (research.md R-10 e R-11).

## Summary

Aplicação web de planning poker sem login: o facilitador cria a sala, compartilha o link, os
votantes votam em tempo real e o facilitador revela o resultado (mediana, moda e distribuição) e
arquiva a rodada no histórico. Abordagem técnica: um único Worker da Cloudflare serve a SPA React e
a API; cada sala é um Durable Object com SQLite, WebSocket com hibernação e Alarm de expiração de
30 dias; as regras de negócio ficam em um módulo puro de TypeScript testado com Vitest.

## Technical Context

**Language/Version**: TypeScript em todo o projeto (Aprovado); Node.js LTS ativo (26) para
desenvolvimento, build e CI (Aprovado — research R-02).

**Primary Dependencies**: React 19; Vite na versão estável mais recente (8.x) com
`@vitejs/plugin-react` e `@cloudflare/vite-plugin` 1.x; Wrangler 4; TanStack Router 1.x;
Tailwind CSS 4 com `@tailwindcss/vite`; Base UI (`@base-ui/react`) 1.x; Zod 4;
`@cloudflare/workers-types` (Aprovado em 2026-11-02 — research R-02, R-07, R-08).

**Developer Tooling** (Aprovado em 2026-11-03 — D-04 a D-06, research R-14): ESLint com flat config, Prettier, Husky e lint-staged. Conjunto de pacotes e regras (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-config-prettier`) são **Proposta** a aprovar na revisão (R-14). O `typescript` fica fixado em `~6.0.3` (Aprovado em 2026-11-03, R-14), porque o `typescript-eslint` não suporta a 7.x.

**Storage**: SQLite do Durable Object de cada sala (Aprovado, R-01); ver
[data-model.md](./data-model.md).

**Testing**: Vitest e Playwright (Aprovado); smoke test pós-deploy com Playwright (Aprovado, R-03); `@cloudflare/vitest-plugin` para testes de Worker e
Durable Object (Aprovado, R-03).

**Target Platform**: Cloudflare Workers, plano gratuito (Aprovado); navegadores: 2 últimas versões
de Chrome, Edge, Firefox e Safari em desktop e notebook, com largura mínima de 1024 px; tablet e
celular fora do escopo (Aprovado, SC-004).

**Project Type**: aplicação web (SPA + Worker em um único pacote e um único deploy).

**Performance Goals**: voto visível aos demais em menos de 500 ms (SC-001); reconexão em até 5 s
após a rede voltar (SC-002).

**Constraints**: custo de infraestrutura R$ 0/mês (SC-006); sem login e só nome e avatar como
dados pessoais (constitution II); interface somente em pt-BR (FR-026); regras de negócio sem
dependência de APIs da Cloudflare (constitution IV).

**Scale/Scope**: cerca de 10 participantes por sala, sem limite fixo (FR-024); 2 telas (início e
sala); 11 histórias de usuário.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Resultado |
| --- | --- | --- |
| I. Rastreabilidade | Todo componente abaixo aponta para FR/US; propostas estão marcadas e as lacunas viraram D-01 a D-03 | Aprovado |
| II. Sem login, dados mínimos | Só nome e avatar (FR-027); token de facilitador guardado como hash; `sessionId` nunca exposto a terceiros (`participantId` público) | Aprovado |
| III. Custo zero na Cloudflare | Worker + Durable Objects + static assets no plano gratuito; nenhum serviço extra | Aprovado |
| IV. Regras em módulo puro | `src/domain/` sem imports de `cloudflare:*`, DOM ou rede; consumido por `src/room/` e `src/client/` | Aprovado |
| V. Testes como evidência | Vitest no domínio e no Durable Object; Playwright no fluxo principal | Aprovado |

Reavaliação pós-design (Phase 1): nenhum desvio encontrado; a seção Complexity Tracking não se
aplica.

## Project Structure

### Documentation (this feature)

```text
specs/001-pokerfe-mvp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-api.md
│   └── websocket-protocol.md
├── checklists/
│   └── requirements.md
└── tasks.md             # gerado por /speckit-tasks após aprovação deste plano
```

### Source Code (repository root)

Estrutura aprovada:

```text
src/
├── domain/              # regras puras: baralhos, votação, revelação, observadores, mediana, moda, rodadas, histórico
├── shared/              # schemas Zod do protocolo HTTP/WebSocket, limites de campos, baralhos, IDs
├── worker/
│   └── index.ts         # entrypoint do Worker: POST /api/rooms, upgrade /api/rooms/:id/ws, 404 de /api/*
├── room/
│   └── Room.ts          # Durable Object da sala: SQLite, hibernação de WebSocket, broadcast, Alarm
└── client/
    ├── main.tsx
    ├── router.tsx       # TanStack Router: rotas /, /r/$roomId e a tela de Créditos (definidas em código; caminho da tela: Proposta)
    ├── routes/          # telas Home e Room
    ├── components/      # Base UI + Tailwind: cartas, participantes, painel do facilitador, resultado, histórico
    ├── styles.css       # entrada do Tailwind CSS 4
    ├── format.ts        # formatação pt-BR de mediana e moda (research R-12)
    ├── realtime/        # conexão WebSocket, reconexão (R-09), estado local
    ├── storage/         # localStorage: sessionId, nome e avatar lembrados (FR-006), token por sala
    └── assets/avatars/  # PNGs de animais, 128 × 128 px (pack Wildlife do Flaticon; FR-005)

tests/
├── unit/                # Vitest, ambiente Node: src/domain e src/shared
├── integration/         # Vitest + @cloudflare/vitest-plugin: Worker e Durable Object
├── e2e/                 # Playwright: fluxos das histórias US01–US11 (ambiente local)
└── smoke/               # Playwright: sanidade do ambiente publicado após cada deploy (R-03)

index.html
aliases.ts               # mapa único dos aliases de importação (D-06), usado por vite.config.ts e vitest.config.ts
vite.config.ts
vitest.config.ts         # ou projetos separados para unit e integração
eslint.config.js         # D-04: flat config
.prettierrc.json         # D-04: padrões do Prettier, sem opções customizadas
.prettierignore
.husky/pre-commit        # D-04, D-05: executa lint-staged
playwright.config.ts
wrangler.jsonc
.github/workflows/deploy.yml  # D-03: testes + deploy com cloudflare/wrangler-action@v4
tsconfig.json
package.json
```

**Convenção de imports (D-06)**: importações entre pastas de `src/` usam os aliases `@domain/*`, `@shared/*`, `@room/*`, `@worker/*` e `@client/*`, que apontam para `src/<pasta>/*`; dentro da mesma pasta, usam-se caminhos relativos. Os aliases são declarados em `tsconfig.json` (`paths`), `vite.config.ts` e `vitest.config.ts` a partir de `aliases.ts`. Os nomes dos aliases são **Proposta** (a decisão aprovada é "um alias por pasta").

**Structure Decision**: pacote único, porque SPA e Worker têm um único deploy (R-01). O domínio
isolado em `src/domain/` cumpre a constitution IV e permite testes rápidos sem runtime da
Cloudflare.

### Scripts npm

| Script | Função |
| --- | --- |
| `dev` | servidor de desenvolvimento do Vite com o Worker local |
| `build` | build de produção da SPA e do Worker |
| `typecheck` | checagem de tipos sem emitir arquivos |
| `test` | Vitest (unitários e integração) |
| `test:e2e` | Playwright |
| `test:smoke` | Playwright em `tests/smoke/` contra a URL em `SMOKE_BASE_URL` (padrão: servidor local) |
| `deploy` | build e `wrangler deploy` |
| `lint` | ESLint em todo o projeto (D-04) |
| `format` | Prettier grava a formatação (D-04) |
| `format:check` | Prettier só verifica, sem gravar (D-04) |
| `prepare` | `husky` — instala o hook de pré-commit ao rodar `npm install` (D-04) |

## Decisões registradas

| ID | Decisão (2026-11-02) | Efeito no plano |
| --- | --- | --- |
| D-01 | Sem limite de criação de salas por IP no MVP | FR-025 removido; sem resposta 429 |
| D-02 | Sem domínio próprio | produção em `*.workers.dev`; nenhuma configuração de rota ou domínio |
| D-03 | Deploy automático autorizado | workflow GitHub Actions com `cloudflare/wrangler-action@v4`; o responsável cadastra os secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` |
| D-04 | (2026-11-03) Adotar ESLint, Prettier, Husky e lint-staged | scripts `lint`, `format`, `format:check`; hook de pré-commit; tasks T085–T092 (Phase 15) |
| D-05 | (2026-11-03) O hook de pré-commit executa somente lint e formatação | sem testes nem `typecheck` no hook |
| D-06 | (2026-11-03) Aliases de importação por pasta | `@domain`, `@shared`, `@room`, `@worker`, `@client` (nomes: Proposta) |
| D-07 | (2026-11-03) `typescript` fixado em `~6.0.3` | compatível com `typescript-eslint` (R-14, opção A) |
| D-08 | (2026-11-03) CI sem `lint` nem `format:check` | os comandos rodam no pré-commit via lint-staged |
| D-09 | (2026-11-04) Avatares em PNG (128 × 128 px) do pack Wildlife do Flaticon, 12 animais | substitui SVG; T027 e T031 ajustadas; R-13 atualizada |
| D-10 | (2026-11-04) Tela de Créditos com um link de atribuição por ícone | FR-028; T093 (issue #30) |

Pendência remanescente: o caminho da tela de Créditos e o local do link para ela (issue #30).

## Complexity Tracking

Não se aplica: a Constitution Check não tem violações.
