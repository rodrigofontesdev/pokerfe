---

description: "Task list for Pokerfé MVP implementation"
---

# Tasks: Pokerfé — MVP de planning poker

**Input**: Design documents from `/specs/001-pokerfe-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: incluídos. A constitution (princípio V) exige testes unitários das regras com Vitest e
teste de ponta a ponta do fluxo principal com Playwright.

**Organization**: tarefas agrupadas por história. Os rótulos `[US1]`…`[US11]` correspondem às
histórias US01…US11 da spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história a que a tarefa pertence
- Caminhos relativos à raiz do repositório (estrutura em plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicializar o projeto com a stack aprovada (research R-02, R-03, R-07, R-08).

- [X] T001 Criar `package.json` (`"type": "module"`, `"private": true`, `"engines": { "node": ">=26" }`) com os scripts `dev`, `build`, `typecheck`, `test`, `test:e2e`, `test:smoke` e `deploy` descritos em plan.md "Scripts npm", e `.nvmrc` com `26`
- [X] T002 Instalar com npm as dependências aprovadas em plan.md "Primary Dependencies" (React 19, Vite estável mais recente, `@vitejs/plugin-react`, `@cloudflare/vite-plugin` 1.x, `wrangler` 4, `@tanstack/react-router` 1.x, `tailwindcss` 4 + `@tailwindcss/vite`, `@base-ui/react` 1.x, `zod` 4) e de desenvolvimento (`typescript`, `@cloudflare/workers-types`, `vitest`, `@cloudflare/vitest-plugin`, `@playwright/test`), gerando `package-lock.json`; NÃO usar `@cloudflare/vitest-pool-workers` (descontinuado) nem `@base-ui-components/react` (renomeado)
- [X] T003 [P] Criar `tsconfig.json` em modo `strict` cobrindo `src/` e `tests/`, com os tipos de `@cloudflare/workers-types` disponíveis para `src/worker/` e `src/room/`
- [X] T004 [P] Criar `vite.config.ts` com os plugins `@vitejs/plugin-react`, `@tailwindcss/vite` e `@cloudflare/vite-plugin`
- [X] T005 [P] Criar `wrangler.jsonc` com `name: "pokerfe"`, `main: "src/worker/index.ts"`, `compatibility_date` do dia da criação, `assets.not_found_handling: "single-page-application"`, binding de Durable Object `ROOM` para a classe `Room` e migração `new_sqlite_classes: ["Room"]`
- [X] T006 [P] Criar `vitest.config.ts` com dois projetos: `unit` (ambiente Node, `tests/unit/**`) e `integration` (`@cloudflare/vitest-plugin` lendo `wrangler.jsonc`, `tests/integration/**`)
- [X] T007 [P] Criar `playwright.config.ts` com um projeto `e2e` (`testDir: "tests/e2e"`, `webServer` iniciando `npm run dev`) e um projeto `smoke` (`testDir: "tests/smoke"`, `baseURL` lido de `SMOKE_BASE_URL`, sem `webServer` quando a variável estiver definida), e fazer `test:e2e` e `test:smoke` rodarem cada um só o seu projeto
- [X] T008 [P] Criar `index.html`, `src/client/main.tsx` (renderiza um componente raiz vazio) e `src/client/styles.css` com `@import "tailwindcss";`
- [X] T009 [P] Criar `.gitignore` com `node_modules/`, `dist/`, `.wrangler/`, `test-results/`, `playwright-report/` e `.specify/feature.json`
- [X] T010 Criar `.github/workflows/deploy.yml`: em `pull_request` e `push` na `main`, rodar `npm ci`, `npm run typecheck`, `npm test`, instalar navegadores do Playwright e `npm run test:e2e`; somente em `push` na `main` e após os testes, rodar `npm run build` e `cloudflare/wrangler-action@v4` com `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}` e `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}` (D-03); Node via `.nvmrc`; o passo de smoke test pós-deploy é adicionado em T083

**Checkpoint**: `npm run dev`, `npm run typecheck`, `npm test` e `npm run build` executam sem erro com o app vazio.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: contratos compartilhados, Durable Object base, Worker e cliente base usados por todas as histórias.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

- [X] T011 [P] Criar `src/shared/limits.ts` com `ROOM_NAME_MAX = 250`, `DISPLAY_NAME_MAX = 45`, `ROUND_TITLE_MAX = 250` (FR-008) e `ROOM_TTL_MS = 30 dias` (FR-023)
- [X] T012 [P] Criar `src/shared/decks.ts` com os baralhos exatos do FR-013 — `points`: `0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100`; `time`: `0.5h, 1h, 2h, 3h, 5h, 8h, 12h, 16h, 24h, 40h` — e a função que converte um rótulo em número (sem o sufixo `h`)
- [X] T013 [P] Criar `src/shared/ids.ts` com geração de IDs de 128 bits via `crypto.getRandomValues` codificados em base62 com 22 caracteres e validação do formato (research R-06)
- [X] T014 Criar `src/shared/protocol.ts` com schemas Zod e tipos inferidos para: corpo e resposta de `POST /api/rooms`, formato de erro HTTP, mensagens cliente→servidor (`join`, `vote`, `set_observer`, `set_title`, `reveal`, `new_round`) e servidor→cliente (`room_state`, `error`), exatamente como em `contracts/http-api.md` e `contracts/websocket-protocol.md`, aplicando trim e os limites de T011 (depende de T011, T012, T013)
- [X] T015 [P] Criar `src/domain/types.ts` com os tipos de domínio (sala, participante, rodada, voto, estado da rodada `voting`/`revealed`/`archived`) conforme `data-model.md`, sem imports de `cloudflare:*`, DOM ou rede (constitution IV)
- [X] T016 [P] Testes unitários em `tests/unit/shared/` para IDs (formato, unicidade em 1.000 gerações), baralhos (valores exatos e conversão) e schemas (limites 250/45/250 aceitos e 251/46/251 rejeitados, nome vazio após trim rejeitado)
- [ ] T017 Criar `src/room/schema.ts` com o DDL SQLite das tabelas `room`, `participants`, `rounds` e `votes` exatamente como em `data-model.md` (incluindo `participant_id TEXT NOT NULL UNIQUE`, `is_facilitator`, `is_observer`, chave primária (`round_number`, `session_id`) em `votes`) e aplicá-lo no construtor do Durable Object
- [X] T018 Criar `src/room/Room.ts`: classe `Room` (Durable Object) que aceita WebSocket com `this.ctx.acceptWebSocket()` (hibernação, R-04), guarda `sessionId` com `serializeAttachment`, valida cada mensagem com os schemas de T014 (`invalid_message` sem fechar a conexão), responde `not_joined` a mensagens antes de `join`, fecha com 4404 quando não existe linha `room` (sem gravar nada) e expõe um helper de broadcast que monta `room_state` personalizado por conexão (depende de T014, T015, T017)
- [ ] T019 Criar `src/worker/index.ts`: roteia `GET /api/rooms/:roomId/ws` para o Durable Object via `ROOM.idFromName(roomId)` (400 `invalid_room_id`, 426 `upgrade_required`), responde 404 `not_found` para outros caminhos `/api/*` e 405 `method_not_allowed` onde o contrato indicar; demais caminhos ficam com os static assets (depende de T014, T018)
- [ ] T020 [P] Criar `src/client/router.tsx` com TanStack Router e rotas definidas em código para `/` e `/r/$roomId`, e ligá-lo em `src/client/main.tsx`
- [ ] T021 [P] Criar `src/client/storage/local.ts`: `sessionId` gerado uma vez por navegador, nome e `avatarId` lembrados (FR-006) e token de facilitador por `roomId`, todos em `localStorage` com leitura e escrita protegidas por try/catch (R-06)
- [ ] T022 Criar `src/client/realtime/connection.ts` e um hook React: abre `/api/rooms/:roomId/ws`, envia `join` ao abrir, valida mensagens recebidas com os schemas de T014, expõe o último `room_state` e o último `error`, e sinaliza "sala não encontrada" ao receber fechamento 4404 sem reconectar (depende de T014, T021)
- [ ] T023 [P] Criar helpers de teste em `tests/integration/helpers.ts` para criar sala via `SELF.fetch` e abrir conexões WebSocket de teste contra o Worker

**Checkpoint**: conexão WebSocket com sala inexistente fecha com 4404; mensagens inválidas recebem `error`.

---

## Phase 3: User Story 1 - US01 Criar sala (Priority: P1) 🎯 MVP

**Goal**: o PO cria a sala com nome, baralho, nome e avatar e chega à sala como facilitador, com link para copiar.

**Independent Test**: criar uma sala na tela inicial e ver a sala aberta como facilitador com o botão "Copiar link"; com nome em branco, nenhuma sala é criada.

### Tests for User Story 1

- [ ] T024 [P] [US1] Teste de integração em `tests/integration/create-room.test.ts`: 201 com `roomId` e `facilitatorToken` de 22 caracteres base62; 400 para corpo inválido, `name` vazio após trim, `name` com 251 caracteres e `deckType` fora de `points`/`time`; 405 para outro método; o armazenamento guarda só o hash SHA-256 do token; Alarm agendado para criação + 30 dias — [FR-001, FR-003, FR-008, FR-021, FR-023]
- [ ] T025 [P] [US1] Teste de integração em `tests/integration/join-facilitator.test.ts`: `join` com token válido cria participante com `isFacilitator: true` e `participantId` público; token inválido entra sem papel de facilitador e sem erro — [FR-002, FR-021]
- [ ] T026 [P] [US1] Teste e2e em `tests/e2e/create-room.spec.ts` cobrindo os cenários 1 e 2 da US01 — [FR-001, FR-003]

### Implementation for User Story 1

- [ ] T027 [US1] Criar o catálogo de avatares: **antes de implementar, perguntar ao responsável pelo produto quais animais compõem a lista final** (spec, Assumptions); adicionar os SVGs em `src/client/assets/avatars/` e exportar a lista de `avatarId` em `src/shared/avatars.ts`, usada pelo schema de `join` e pela interface — [FR-005]
- [ ] T028 [US1] Implementar em `src/domain/room.ts` a criação do estado inicial da sala (rodada 1 em `voting`) e em `src/domain/participants.ts` o registro de participante em `join` (novo `sessionId` cria votante, ou facilitador com token válido; `sessionId` conhecido recupera papel e atualiza nome e avatar), com testes em `tests/unit/domain/` — [FR-002, FR-004, FR-022]
- [ ] T029 [US1] Implementar `POST /api/rooms` em `src/worker/index.ts` e a inicialização da sala em `src/room/Room.ts`: valida o corpo com Zod (`name` "após remover espaços nas pontas: 1 a 250 caracteres", `deckType` `"points"` ou `"time"`), gera `roomId` e token (T013), grava `facilitator_token_hash` = SHA-256 hexadecimal, `created_at`, `last_activity_at`, `current_round = 1` e agenda `setAlarm(agora + 30 dias)` — [FR-001, FR-003, FR-021, FR-023]
- [ ] T030 [US1] Implementar o handler `join` em `src/room/Room.ts` usando T028: valida `displayName` "após remover espaços nas pontas: 1 a 45 caracteres" e `avatarId` da lista de avatares ou `null`, compara o hash do `facilitatorToken`, gera `participant_id` no primeiro `join` e envia `room_state` a todos — [FR-002, FR-004, FR-005, FR-008, FR-021, FR-027]
- [ ] T031 [P] [US1] Criar `src/client/components/Avatar.tsx` (SVG do `avatarId` ou, sem avatar, a primeira letra do nome como placeholder — FR-005) e `src/client/components/AvatarPicker.tsx` com Base UI e Tailwind, seleção opcional e navegável por teclado — [FR-005]
- [ ] T032 [US1] Criar a tela `src/client/routes/Home.tsx`: nome da sala (obrigatório, até 250), baralho (story points ou tempo), nome do facilitador (obrigatório, até 45, pré-preenchido via T021) e avatar opcional; valida no cliente antes de chamar `POST /api/rooms` para que nenhuma sala seja criada com campo obrigatório vazio; salva o token por `roomId` e navega para `/r/$roomId` — [FR-001, FR-006, FR-008]
- [ ] T033 [US1] Criar a tela `src/client/routes/Room.tsx` com cabeçalho (nome da sala) e botão "Copiar link" usando `navigator.clipboard`, exibindo o nome e o avatar (ou o placeholder) do próprio participante a partir de `you` (cenário 1 da US01), entrando automaticamente com o nome, o avatar e o token salvos quando o usuário acabou de criar a sala — [FR-003]

**Checkpoint**: US01 funciona e é testável isoladamente.

---

## Phase 4: User Story 3 - US03 Ver presença e status de voto (Priority: P1)

**Goal**: todos veem quem está na sala, papéis e quem já votou, sem o valor do voto.

**Independent Test**: com dois participantes, um vota e o outro vê "votou" sem o valor.

### Tests for User Story 3

- [ ] T034 [P] [US3] Testes unitários em `tests/unit/domain/presence.test.ts` para a visão de participantes (`hasVoted` sem valor, papéis, `connected`) — [FR-009]
- [ ] T035 [P] [US3] Teste de integração em `tests/integration/presence.test.ts`: `connected` vira `false` quando a última conexão de um `sessionId` fecha e `true` ao voltar; papéis e `participantId` corretos para todas as conexões — [FR-009, FR-020]

### Implementation for User Story 3

- [ ] T036 [US3] Implementar em `src/domain/presence.ts` a montagem de `participants` e `you` do `room_state` e, em `src/room/Room.ts`, a atualização de `connected` e `last_seen_at` em `join` e `webSocketClose`, considerando várias conexões do mesmo `sessionId` — [FR-009, FR-020]
- [ ] T037 [US3] Criar `src/client/components/ParticipantList.tsx` (avatar ou placeholder, nome, papel facilitador/votante/observador, indicador de "votou", estado desconectado) com Tailwind, legível com mais de 10 participantes (FR-024) — [FR-009, FR-024]

**Checkpoint**: presença em tempo real visível para todos.

---

## Phase 5: User Story 2 - US02 Entrar na sala pelo link (Priority: P1)

**Goal**: participantes entram pelo link com nome e avatar opcional, sem cadastro.

**Independent Test**: abrir o link em outro navegador, informar nome e ver o participante na lista de todos; link inválido mostra a mensagem de sala não encontrada.

### Tests for User Story 2

- [ ] T038 [P] [US2] Teste de integração em `tests/integration/join-participant.test.ts`: participante novo entra como votante e aparece no `room_state` de todas as conexões; `join` repetido com o mesmo `sessionId` mantém `participantId` e atualiza nome e avatar; `displayName` com 46 caracteres recebe `validation_error`; `sessionId` nunca aparece no `room_state` de outra conexão — [FR-004, FR-008, FR-009]
- [ ] T039 [P] [US2] Teste e2e em `tests/e2e/join-room.spec.ts` cobrindo os cenários 1 a 4 da US02 — [FR-004, FR-005, FR-006, FR-007]

### Implementation for User Story 2

- [ ] T040 [US2] Criar `src/client/components/JoinForm.tsx` (nome obrigatório até 45 e avatar opcional, pré-preenchidos com os valores lembrados e editáveis — FR-006) e exibi-lo em `src/client/routes/Room.tsx` quando o navegador ainda não entrou na sala — [FR-004, FR-006]
- [ ] T041 [US2] Criar `src/client/components/RoomNotFound.tsx` com o texto "Sala não encontrada ou expirada" e uma ação que leva para `/`, exibido em `src/client/routes/Room.tsx` quando a conexão fecha com 4404 ou o `roomId` é inválido (FR-007) — [FR-007]

**Checkpoint**: US01 e US02 funcionam juntas e isoladamente.

---

## Phase 6: User Story 5 - US05 Votar e trocar o voto (Priority: P1)

**Goal**: votantes escolhem e trocam a carta até a revelação; o facilitador não vota.

**Independent Test**: escolher uma carta, trocar por outra e conferir o último voto.

### Tests for User Story 5

- [ ] T042 [P] [US5] Testes unitários em `tests/unit/domain/voting.test.ts`: voto aceito só de votante, só em `voting`, só com rótulo do baralho da sala; troca substitui; facilitador e observador recebem recusa — [FR-011, FR-013, FR-015]
- [ ] T043 [P] [US5] Teste de integração em `tests/integration/vote.test.ts`: `invalid_card`, `forbidden`, `round_not_voting`; voto válido atualiza `last_activity_at` e reagenda o Alarm para agora + 30 dias (FR-023); após um voto, o votante aparece com `hasVoted: true` para todas as conexões e nenhum `room_state` traz o valor do voto de outra pessoa antes da revelação, só `you.myVote` (completa o cenário 1 da US03) — [FR-009, FR-013, FR-015, FR-023]
- [ ] T044 [P] [US5] Teste e2e em `tests/e2e/vote.spec.ts` cobrindo os cenários 1 e 2 da US05 — [FR-011, FR-015]

### Implementation for User Story 5

- [ ] T045 [US5] Implementar `castVote` em `src/domain/voting.ts` e o handler `vote` em `src/room/Room.ts` (uma linha por (`round_number`, `session_id`), substituída na troca), renovando `last_activity_at` e o Alarm — [FR-011, FR-013, FR-015, FR-023]
- [ ] T046 [US5] Criar `src/client/components/CardDeck.tsx` com Base UI e Tailwind: cartas do baralho da sala, carta escolhida destacada, navegável por teclado e com contraste AA (SC-005), oculto para facilitador e desabilitado para observador — [FR-011, FR-013]

**Checkpoint**: votação funcional.

---

## Phase 7: User Story 4 - US04 Marcar observadores (Priority: P1)

**Goal**: o facilitador alterna participantes entre votante e observador.

**Independent Test**: marcar como observador um votante que já votou descarta o voto e o tira da contagem; desmarcar devolve as cartas.

### Tests for User Story 4

- [ ] T047 [P] [US4] Testes unitários em `tests/unit/domain/observers.test.ts`: facilitador alterna outro participante; não pode marcar a si mesmo; ao virar observador em `voting`, o voto da rodada atual é apagado; observador volta a votante — [FR-010]
- [ ] T048 [P] [US4] Teste de integração em `tests/integration/observers.test.ts`: `forbidden` para não facilitador, `invalid_target` para participante inexistente ou para o próprio facilitador — [FR-010, FR-021]
- [ ] T049 [P] [US4] Teste e2e em `tests/e2e/observers.spec.ts` cobrindo os cenários 1 a 5 da US04 — [FR-010]

### Implementation for User Story 4

- [ ] T050 [US4] Implementar `setObserver` em `src/domain/observers.ts` e o handler `set_observer` em `src/room/Room.ts`, endereçando o alvo por `participantId` — [FR-010, FR-021]
- [ ] T051 [US4] Adicionar em `src/client/components/ParticipantList.tsx` a ação "Marcar como observador"/"Marcar como votante" (Base UI), visível só para o facilitador e nunca na própria linha — [FR-010]

**Checkpoint**: observadores não bloqueiam a revelação.

---

## Phase 8: User Story 6 - US06 Revelar as cartas (Priority: P1)

**Goal**: o facilitador revela quando todos os votantes conectados votaram.

**Independent Test**: o botão só habilita com todos os votos; ao revelar, todos veem as cartas.

### Tests for User Story 6

- [ ] T052 [P] [US6] Testes unitários em `tests/unit/domain/reveal.test.ts`: `canReveal` falso sem votante conectado; falso com voto faltando; verdadeiro com todos os votantes conectados votando e observadores presentes; votante desconectado não é esperado e o voto que já registrou entra na revelação (FR-020); `missingVotes` correto — [FR-012, FR-020]
- [ ] T053 [P] [US6] Teste de integração em `tests/integration/reveal.test.ts`: `reveal_blocked`, `forbidden`, `round_not_voting`; revelação enviada a todas as conexões no mesmo broadcast com `votes`; votos bloqueados depois — [FR-012, FR-015, FR-016, FR-021]
- [ ] T054 [P] [US6] Teste e2e em `tests/e2e/reveal.spec.ts` cobrindo os cenários 1 a 5 da US06, exceto a exibição de mediana e moda do cenário 3, verificada no teste e2e da US07 — [FR-012, FR-016]

### Implementation for User Story 6

- [ ] T055 [US6] Implementar `canReveal`, `missingVotes` e a transição `voting → revealed` em `src/domain/reveal.ts`, e o handler `reveal` em `src/room/Room.ts` — [FR-012, FR-016, FR-020]
- [ ] T056 [US6] Criar `src/client/components/FacilitatorPanel.tsx` com o botão "Revelar cartas" (habilitado conforme `round.canReveal`, mostrando `missingVotes`) e exibir as cartas reveladas de cada participante em `src/client/routes/Room.tsx` — [FR-012, FR-016]

**Checkpoint**: rodada completa até a revelação.

---

## Phase 9: User Story 7 - US07 Ver mediana, moda e distribuição (Priority: P1)

**Goal**: o resultado revelado mostra mediana, moda e distribuição, sem média simples.

**Independent Test**: revelar 3, 5, 5, 8 e ver mediana 5 e moda 5.

### Tests for User Story 7

- [ ] T057 [P] [US7] Testes unitários em `tests/unit/domain/stats.test.ts` com os exemplos da US07: 3, 5, 5, 8 → mediana 5, modas [5]; 3, 3, 8, 8 → mediana 5,5, modas [3, 8]; 2, 3, 5 → mediana 3, modas [] ("Sem moda"); baralho de tempo convertendo `0.5h` em 0,5; distribuição só com cartas que receberam voto, na ordem do baralho — [FR-014]
- [ ] T058 [P] [US7] Testes unitários em `tests/unit/client/format.test.ts`: mediana 5.5 exibida como "5,5", sufixo `h` no baralho de tempo, `[]` exibido como "Sem moda" — [FR-014]
- [ ] T059 [P] [US7] Teste e2e em `tests/e2e/result.spec.ts`: revelar os votos 3, 5, 5 e 8 e verificar que todos os participantes veem mediana 5, moda 5 e a distribuição, sem média simples (completa o cenário 3 da US06) — [FR-014, FR-016]

### Implementation for User Story 7

- [ ] T060 [US7] Implementar `computeResult` em `src/domain/stats.ts` (mediana, modas, distribuição) e usá-lo na revelação (T055), gravando `median` e `mode` (array JSON) em `rounds` — [FR-014]
- [ ] T061 [US7] Criar `src/client/format.ts` (formatação pt-BR) e `src/client/components/ResultPanel.tsx` com mediana, moda e distribuição, sem média — [FR-014]

**Checkpoint**: resultado exibido corretamente.

---

## Phase 10: User Story 8 - US08 Dar título à rodada (Priority: P1)

**Goal**: o facilitador nomeia a rodada; a estimativa fica associada ao título.

**Independent Test**: definir "Login com Google", revelar e ver o resultado associado ao título.

### Tests for User Story 8

- [ ] T062 [P] [US8] Teste de integração em `tests/integration/title.test.ts`: título de até 250 caracteres aceito e 251 recusado com `validation_error`; vazio limpa o título (gravado como NULL); `forbidden` para não facilitador; `round_not_voting` após a revelação — [FR-008, FR-017, FR-021]

### Implementation for User Story 8

- [ ] T063 [US8] Implementar `setTitle` em `src/domain/rounds.ts` e o handler `set_title` em `src/room/Room.ts` (`title` "0 a 250 caracteres após remover espaços nas pontas") — [FR-008, FR-017]
- [ ] T064 [US8] Adicionar o campo de título da rodada ao `src/client/components/FacilitatorPanel.tsx` e exibir o título atual para todos em `src/client/routes/Room.tsx` — [FR-017]

**Checkpoint**: rodadas tituladas.

---

## Phase 11: User Story 9 - US09 Nova rodada e histórico (Priority: P1)

**Goal**: o facilitador arquiva a rodada revelada e inicia outra; todos veem o histórico.

**Independent Test**: revelar, iniciar nova rodada e ver o item no histórico com título ou "Rodada N".

### Tests for User Story 9

- [ ] T065 [P] [US9] Testes unitários em `tests/unit/domain/rounds.test.ts`: `new_round` só em `revealed`; arquiva a rodada; cria N+1 em `voting` sem votos; histórico da mais recente para a mais antiga — [FR-018, FR-019]
- [ ] T066 [P] [US9] Teste de integração em `tests/integration/new-round.test.ts`: `round_not_revealed`, `forbidden`; `new_round` renova `last_activity_at` e o Alarm; `history` presente no `room_state` de todos os participantes (FR-019) — [FR-018, FR-019, FR-021, FR-023]
- [ ] T067 [P] [US9] Teste e2e em `tests/e2e/history.spec.ts` cobrindo os cenários 1 a 3 da US09 — [FR-018, FR-019]

### Implementation for User Story 9

- [ ] T068 [US9] Implementar `newRound` em `src/domain/rounds.ts`, o handler `new_round` em `src/room/Room.ts` e a montagem de `history` no `room_state` — [FR-018, FR-019, FR-023]
- [ ] T069 [US9] Adicionar o botão "Nova rodada" (habilitado só com a rodada revelada) ao `src/client/components/FacilitatorPanel.tsx` e criar `src/client/components/HistoryList.tsx` (título ou "Rodada N", mediana e moda) visível para todos — [FR-018, FR-019]

**Checkpoint**: planning completa com várias rodadas (escopo das 9 histórias P1).

---

## Phase 12: User Story 10 - US10 Reconectar sem perder o voto (Priority: P2)

**Goal**: quem cai e volta no mesmo navegador recupera nome, avatar e voto, sem limite de tempo.

**Independent Test**: votar, derrubar a rede, religar e ver o mesmo voto em até 5 s.

### Tests for User Story 10

- [ ] T070 [P] [US10] Testes unitários em `tests/unit/client/reconnect.test.ts` com timers falsos: tentativas em 0,5 s, 1 s, 2 s e depois a cada 2 s; nenhuma tentativa após fechamento 4404 — [FR-022]
- [ ] T071 [P] [US10] Teste de integração em `tests/integration/reconnect.test.ts`: novo `join` com o mesmo `sessionId` recupera papel e voto da rodada em votação; após revelação ocorrida durante a queda, recebe a rodada revelada — [FR-020, FR-022]
- [ ] T072 [P] [US10] Teste e2e em `tests/e2e/reconnect.spec.ts` usando `context.setOffline()` do Playwright para os cenários 1 a 3 da US10, verificando a reconexão em até 5 s (SC-002) — [FR-022]

### Implementation for User Story 10

- [ ] T073 [US10] Adicionar a reconexão automática a `src/client/realtime/connection.ts` (research R-09), reenviando `join` com o mesmo `sessionId`, e um indicador de estado da conexão em `src/client/routes/Room.tsx` — [FR-022]

**Checkpoint**: quedas não atrapalham a rodada.

---

## Phase 13: User Story 11 - US11 Reabrir a sala em até 30 dias (Priority: P2)

**Goal**: a sala fica disponível por 30 dias após a última atividade e depois é apagada.

**Independent Test**: reabrir uma sala ativa e ver o histórico; após o Alarm, ver "Sala não encontrada ou expirada".

### Tests for User Story 11

- [ ] T074 [P] [US11] Teste de integração em `tests/integration/expiration.test.ts` com `runDurableObjectAlarm`: após o Alarm, o armazenamento fica vazio, conexões abertas recebem fechamento 4404 e nova conexão também recebe 4404; `join` sem voto nem nova rodada NÃO altera `last_activity_at` nem o Alarm (FR-023) — [FR-007, FR-023]
- [ ] T075 [P] [US11] Teste e2e em `tests/e2e/reopen.spec.ts`: recarregar o link de uma sala com rodadas arquivadas mostra o histórico completo — [FR-019, FR-023]

### Implementation for User Story 11

- [ ] T076 [US11] Implementar `alarm()` em `src/room/Room.ts`: fecha todas as conexões com 4404 e apaga o armazenamento com `deleteAll()` (research R-05) — [FR-023]

**Checkpoint**: todas as histórias funcionando.

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: critérios de sucesso transversais e documentação.

- [ ] T077 [P] Configurar projetos do Playwright em `playwright.config.ts` para Chromium, Firefox e WebKit com viewport de desktop de 1024 × 768 px (largura mínima suportada), e rodar a suíte e2e em todos (SC-004)
- [ ] T078 [P] Revisão de acessibilidade em `src/client/components/`: navegação por teclado nas cartas e ações do facilitador e contraste AA; registrar o resultado em `tests/e2e/accessibility.spec.ts` com verificações de foco e teclado (SC-005)
- [ ] T079 Teste e2e de carga de referência em `tests/e2e/ten-participants.spec.ts`: 10 participantes simultâneos concluem votar, revelar e nova rodada sem erro, medindo que um voto aparece para os demais em menos de 500 ms (SC-001, SC-003)
- [ ] T080 [P] Criar `README.md` com objetivo, stack, comandos do `quickstart.md`, secrets do deploy (D-03) e links para `specs/001-pokerfe-mvp/`
- [ ] T081 [P] Revisar todos os textos visíveis da interface em `src/client/` para garantir que estão somente em pt-BR, inclusive mensagens de erro exibidas a partir dos `code` dos contratos — [FR-026]
- [ ] T082 [P] Criar o smoke test em `tests/smoke/deploy.smoke.spec.ts` com as 4 verificações de research R-03: `GET /` responde 200 e exibe a tela inicial; `POST /api/rooms` com `name` "[smoke] verificação de deploy" e `deckType` "points" responde 201 com `roomId` e `facilitatorToken` de 22 caracteres base62; conexão WebSocket nessa sala com `join` de facilitador recebe `room_state` com o nome da sala; conexão com `roomId` válido e inexistente é fechada com 4404; a suíte inteira roda em menos de 1 minuto — [FR-001, FR-003, FR-007, FR-009]
- [ ] T083 Adicionar ao `.github/workflows/deploy.yml` um passo após o deploy que roda `npm run test:smoke` com `SMOKE_BASE_URL` igual à saída `deployment-url` do `cloudflare/wrangler-action@v4`; falha no smoke test marca o workflow como falho (constitution V); sem reversão automática
- [ ] T084 Executar o roteiro de `specs/001-pokerfe-mvp/quickstart.md` contra o deploy em `*.workers.dev` (D-02) e registrar a URL de produção no `README.md`

---

## Phase 15: Developer Tooling (Priority: base — executar após a Phase 1 e antes da Phase 2)

**Purpose**: lint, formatação, hook de pré-commit e aliases de importação (decisões D-04, D-05 e D-06; research R-14), instalados antes do código das demais fases para que ele nasça formatado e com aliases.

- [X] T085 Instalar com npm, como dependências de desenvolvimento, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-config-prettier`, `prettier`, `husky` e `lint-staged` nas versões estáveis mais recentes compatíveis entre si, e fixar `typescript` em `~6.0.3` porque o `typescript-eslint` declara suporte a `<6.1.0` (research R-14, opção A); atualizar `package-lock.json`; NÃO usar `--legacy-peer-deps`
- [X] T086 [P] Criar `eslint.config.js` (flat config) com `@eslint/js` recommended e `typescript-eslint` recommended para `**/*.{ts,tsx,js}`, `eslint-plugin-react-hooks` recommended somente em `src/client/**/*.{ts,tsx}` e `eslint-config-prettier` por último; ignorar `dist/`, `.wrangler/`, `test-results/`, `playwright-report/` e `node_modules/`; sem regras adicionais além dessas
- [X] T087 [P] Criar `.prettierrc.json` contendo `{}` (padrões do Prettier, sem opções customizadas) e `.prettierignore` com `dist/`, `.wrangler/`, `test-results/`, `playwright-report/`, `package-lock.json`, `specs/`, `.specify/` e `.claude/`
- [X] T088 Adicionar a `package.json` os scripts `lint` (`eslint .`), `format` (`prettier --write .`) e `format:check` (`prettier --check .`), conforme plan.md "Scripts npm"
- [X] T089 Configurar o Husky 9: script `prepare` com `husky` em `package.json`, hook `.husky/pre-commit` executando `npx lint-staged`, e chave `lint-staged` em `package.json` com `eslint --fix` e `prettier --write` para `*.{ts,tsx,js}` e `prettier --write` para `*.{json,jsonc,css,html,md,yml,yaml}`; o hook NÃO executa testes nem `typecheck` (D-05); `npm ci` precisa continuar funcionando no CI
- [X] T090 [P] Criar `aliases.ts` na raiz exportando o mapa `@domain`, `@shared`, `@room`, `@worker` e `@client` → `src/<pasta>`, e usá-lo em `resolve.alias` de `vite.config.ts` (T004) e nos projetos `unit` e `integration` de `vitest.config.ts` (T006); declarar os mesmos cinco aliases em `compilerOptions.paths` de `tsconfig.json` (T003, padrão `@domain/*` → `src/domain/*`); sem dependências novas (por exemplo, sem `vite-tsconfig-paths`)
- [X] T091 Criar `tests/unit/tooling/aliases.test.ts` que lê `tsconfig.json` e `aliases.ts` e verifica que os cinco aliases existem, apontam para pastas existentes de `src/` e são idênticos nos dois lugares (depende de T090)
- [X] T092 Executar `npm run format` uma vez nos arquivos criados em T001–T009 e T085–T091 (commit separado `style: formata o código existente`) e confirmar `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` e `npm run build` com código de saída 0 (depende de T085–T091)

**Checkpoint**: um commit com erro de lint é corrigido ou bloqueado pelo hook; `npm run lint` e `npm run format:check` passam; os aliases resolvem em TypeScript, Vite e Vitest.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências. T010 (CI/deploy) depende de T001–T009 e, para o job de deploy funcionar, dos secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` cadastrados pelo responsável pelo produto.
- **Developer Tooling (Phase 15)**: depende de T001–T009 (Phase 1) e deve ser concluída antes da Phase 2, para que o código das demais fases nasça com aliases e formatação. Não depende de T010 (CI). T085 antecede T086–T089; T090 antecede T091; T092 é a última.
- **Foundational (Phase 2)**: depende do Setup e da Phase 15; bloqueia todas as histórias.
- **US01 (Phase 3)**: depende da Phase 2. T027 (avatares) exige resposta do responsável pelo produto antes de começar.
- **Ordem de execução das histórias** (dependências reais entre os cenários de aceite): US01 → US03 → US02 → US05 → US04 → US06 → US07 → US08 → US09 → US10 → US11.
  - US03 (Phase 4) depende de US01: monta presença e lista de participantes; o cenário "vejo que ele votou" é concluído na US05 (T043).
  - US02 (Phase 5) depende de US03: o cenário 1 exige a lista de participantes.
  - US05 (Phase 6) depende de US02: o e2e de voto precisa de um segundo participante entrando pelo link.
  - US04 (Phase 7) depende de US05: o voto descartado ao virar observador exige voto registrado; "deixa de ser esperado para a revelação" é verificado na US06.
  - US06 (Phase 8) depende de US04: os cenários 2 e 4 usam observadores; a exibição de mediana e moda do cenário 3 é verificada na US07 (T059).
  - US07 depende de US06 (o cálculo é chamado na revelação).
  - US08 depende de US06 (o título fica associado ao revelar).
  - US09 depende de US07 e US08 (o histórico exibe título, mediana e moda).
- **US10 (Phase 12)**: depende de US07 (após reconectar, o participante vê o resultado revelado).
- **US11 (Phase 13)**: depende de US09 (histórico) e de US02 (tela de sala não encontrada).
- **Polish (Phase 14)**: depende das histórias concluídas; T082 depende de T029 e T030 (criar sala e `join`); T083 depende de T010 e T082; T084 depende de T083 e dos secrets.

### Within Each User Story

- Testes escritos antes e falhando antes da implementação.
- Domínio (`src/domain/`) antes do Durable Object; Durable Object antes da interface.

### Parallel Opportunities

- Setup: T003–T009 em paralelo.
- Developer Tooling: T086, T087 e T090 em paralelo após T085 (T090 não depende de T085).
- Foundational: T011, T012, T013, T015, T016, T020, T021, T023 em paralelo.
- Testes [P] de cada história em paralelo.
- As histórias seguem a ordem acima; o paralelismo está dentro de cada história (testes [P]) e entre Setup/Foundational.

## Parallel Example: User Story 5

```bash
Task: "Testes unitários em tests/unit/domain/voting.test.ts"
Task: "Teste de integração em tests/integration/vote.test.ts"
Task: "Teste e2e em tests/e2e/vote.spec.ts"
```

## Implementation Strategy

### MVP First

1. Phase 1 e Phase 2.
2. US01 → validar isoladamente (sala criada, link copiável).
3. US03, US02, US05, US04, US06, US07 → primeira planning possível.
4. US08, US09 → planning completa (Sprint 2 do documento).
5. US10, US11 e Polish → go-live (Sprint 3 do documento).

## Notes

- `[P]` = arquivos diferentes, sem dependência de tarefa incompleta.
- Commit após cada tarefa ou grupo lógico.
- Nenhuma tarefa pode introduzir regra, texto obrigatório ou dependência fora das specs (constitution I).
