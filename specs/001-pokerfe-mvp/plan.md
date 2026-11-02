# Implementation Plan: Pokerfé — MVP de planning poker

**Branch**: `001-pokerfe-mvp` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-pokerfe-mvp/spec.md`

**Note**: Este plano separa o que está **Aprovado** (documento de produto, spec, constitution ou
decisão do responsável pelo produto) do que é **Proposta** (aguarda aprovação no portão de revisão
do plano). As decisões D-01 a D-03 foram tomadas em 2026-11-02 (research.md R-10 e R-11).

## Summary

Aplicação web de planning poker sem login: o facilitador cria a sala, compartilha o link, os
votantes votam em tempo real e o facilitador revela o resultado (mediana, moda e distribuição) e
arquiva a rodada no histórico. Abordagem técnica: um único Worker da Cloudflare serve a SPA React e
a API; cada sala é um Durable Object com SQLite, WebSocket com hibernação e Alarm de expiração de
30 dias; as regras de negócio ficam em um módulo puro de TypeScript testado com Vitest.

## Technical Context

**Language/Version**: TypeScript em todo o projeto (Aprovado); Node.js 22 ou superior para
desenvolvimento e build (Proposta, exigência do Wrangler 4 — research R-02).

**Primary Dependencies**: React 19 + Vite 8 (Aprovado: React + Vite); `@vitejs/plugin-react` 6,
`@cloudflare/vite-plugin` 1.x, Wrangler 4, `@cloudflare/workers-types` (Proposta, R-02).

**Storage**: SQLite do Durable Object de cada sala (Aprovado, R-01); ver
[data-model.md](./data-model.md).

**Testing**: Vitest e Playwright (Aprovado); `@cloudflare/vitest-plugin` para testes de Worker e
Durable Object (Proposta, R-03).

**Target Platform**: Cloudflare Workers, plano gratuito (Aprovado); navegadores: 2 últimas versões
de Chrome, Edge, Firefox e Safari, com layout funcional em celular (Aprovado, SC-004).

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

Estrutura **Proposta**:

```text
src/
├── domain/              # regras puras: baralhos, votação, revelação, observadores, mediana, moda, rodadas, histórico
├── shared/              # tipos e validadores do protocolo HTTP/WebSocket, limites de campos, IDs
├── worker/
│   └── index.ts         # entrypoint do Worker: POST /api/rooms, upgrade /api/rooms/:id/ws, 404 de /api/*
├── room/
│   └── Room.ts          # Durable Object da sala: SQLite, hibernação de WebSocket, broadcast, Alarm
└── client/
    ├── main.tsx
    ├── routes/          # Home (/) e Room (/r/:roomId)
    ├── components/      # cartas, lista de participantes, painel do facilitador, resultado, histórico
    ├── realtime/        # conexão WebSocket, reconexão (R-09), estado local
    ├── storage/         # localStorage: sessionId, nome e avatar lembrados (FR-006), token por sala
    └── assets/avatars/  # SVGs de animais (lista pendente com o responsável pelo produto)

tests/
├── unit/                # Vitest, ambiente Node: src/domain e src/shared
├── integration/         # Vitest + @cloudflare/vitest-plugin: Worker e Durable Object
└── e2e/                 # Playwright: fluxos das histórias US01–US11

index.html
vite.config.ts
vitest.config.ts         # ou projetos separados para unit e integração
playwright.config.ts
wrangler.jsonc
.github/workflows/deploy.yml  # D-03: testes + deploy com cloudflare/wrangler-action@v4
tsconfig.json
package.json
```

**Structure Decision**: pacote único, porque SPA e Worker têm um único deploy (R-01). O domínio
isolado em `src/domain/` cumpre a constitution IV e permite testes rápidos sem runtime da
Cloudflare.

### Scripts npm (Proposta)

| Script | Função |
| --- | --- |
| `dev` | servidor de desenvolvimento do Vite com o Worker local |
| `build` | build de produção da SPA e do Worker |
| `typecheck` | checagem de tipos sem emitir arquivos |
| `test` | Vitest (unitários e integração) |
| `test:e2e` | Playwright |
| `deploy` | build e `wrangler deploy` |

## Decisões registradas

| ID | Decisão (2026-11-02) | Efeito no plano |
| --- | --- | --- |
| D-01 | Sem limite de criação de salas por IP no MVP | FR-025 removido; sem resposta 429 |
| D-02 | Sem domínio próprio | produção em `*.workers.dev`; nenhuma configuração de rota ou domínio |
| D-03 | Deploy automático autorizado | workflow GitHub Actions com `cloudflare/wrangler-action@v4`; o responsável cadastra os secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` |

Pendência remanescente: a lista final de avatares de animais, decidida com o responsável pelo
produto durante a tarefa de avatares.

## Complexity Tracking

Não se aplica: a Constitution Check não tem violações.
