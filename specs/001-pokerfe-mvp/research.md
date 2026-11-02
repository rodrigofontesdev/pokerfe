# Research: Pokerfé — MVP de planning poker

**Feature**: `001-pokerfe-mvp` | **Data**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

Cada decisão tem um status:

- **Aprovada**: consta no documento de produto, na spec ou foi decidida pelo responsável pelo
  produto.
- **Proposta**: sugerida no planejamento. **O plano foi aprovado em 2026-11-02; toda Proposta não
  substituída nesse dia passou a valer como Aprovada.** Exceção: "rotas definidas em código" (R-08),
  incluída depois da aprovação e ainda Proposta.
- **Pendente**: precisa de decisão humana; tarefas que dependem dela ficam bloqueadas.

Versões consultadas no registro npm em 2026-11-02.

## R-01 Plataforma e deploy único

- **Decision**: Cloudflare Workers + Durable Objects no plano gratuito; o mesmo Worker serve a SPA
  como static assets e as rotas `/api/*`. Um Durable Object (classe `Room`) por sala, com
  armazenamento SQLite. **Status: Aprovada** (constitution III; documento, "Arquitetura").
- **Rationale**: o Durable Object concentra conexões, regras e dados de uma sala; não há
  sincronização entre instâncias.
- **Alternatives considered**: Vercel + Upstash + Pusher; Vercel com WebSocket nativo; Supabase
  (documento, "Opções avaliadas").

## R-02 Ferramentas de build e configuração

- **Decision**: Node.js na versão LTS ativa (26 em 2026-11-02; a 24 encerrou o suporte ativo em
  2026-10-20, segundo endoflife.date); Vite na versão estável mais recente (8.x em 2026-11-02) com
  `@vitejs/plugin-react` e `@cloudflare/vite-plugin` 1.x; Wrangler 4 com configuração em
  `wrangler.jsonc`. **Status: Aprovada (2026-11-02).**
- **Rationale**: React + Vite + TypeScript + npm estão aprovados. O `@cloudflare/vite-plugin` 1.67.0
  publicado lê `wrangler.jsonc`/`wrangler.json`/`wrangler.toml` (verificado no pacote publicado);
  o formato `cloudflare.config.ts` visto no repositório da Cloudflare ainda não foi publicado e
  NÃO deve ser usado. Wrangler 4.156.2 exige Node >= 22.
- **Alternatives considered**: Wrangler sozinho com build separado do Vite (dois pipelines).

## R-03 Testes

- **Decision**: Vitest para regras de negócio (ambiente Node, sem APIs da Cloudflare) e para
  testes de integração do Worker e do Durable Object com `@cloudflare/vitest-plugin`
  (helpers `runInDurableObject`, `runDurableObjectAlarm`); Playwright para ponta a ponta,
  incluindo a interface. **Status: Vitest e Playwright Aprovados; o uso do
  `@cloudflare/vitest-plugin` e a ausência de biblioteca de teste de componentes são Proposta.**
- **Rationale**: `@cloudflare/vitest-pool-workers` está descontinuado e foi renomeado para
  `@cloudflare/vitest-plugin` (aviso de depreciação no npm). O plugin 1.5.0 aceita Vitest
  `^4.1.0 || ^5.0.0`. Cobrir a interface com Playwright evita adicionar Testing Library e jsdom.
- **Alternatives considered**: Testing Library + jsdom para componentes (dependências a mais);
  Miniflare manual (mais código de teste).

## R-04 WebSocket com hibernação

- **Decision**: o Durable Object aceita conexões com `this.ctx.acceptWebSocket(server)` e trata
  `webSocketMessage`/`webSocketClose`; o `sessionId` da conexão é guardado com
  `serializeAttachment` (limite de 16.384 bytes). **Status: Aprovada** (documento: "WebSocket
  nativo, com hibernação").
- **Rationale**: a API de hibernação evita cobrança de duração com a sala ociosa (documento,
  "Folga de capacidade").
- **Alternatives considered**: `ws.accept()` sem hibernação (cobra duração enquanto conectado).

## R-05 Expiração em 30 dias

- **Decision**: ao criar a sala, a cada voto e a cada nova rodada, o Durable Object grava
  `last_activity_at` e agenda `setAlarm(agora + 30 dias)`; o handler `alarm()` apaga todo o
  armazenamento com `deleteAll()`. **Status: Aprovada** (documento, "Expiração"; spec FR-023).
- **Rationale**: dados removidos deixam de contar como armazenamento.

## R-06 Identificadores e segredos

- **Decision**:
  - ID da sala: 128 bits de `crypto.getRandomValues`, base62 com 22 caracteres; rota `/r/:roomId`.
    **Status: Aprovada** (documento, "URL única e segura").
  - Token de facilitador: 128 bits, devolvido só na criação da sala; o servidor guarda apenas o
    hash. **Status: Aprovada.** Hash SHA-256 via `crypto.subtle`, codificado em hexadecimal:
    **Status: Proposta.**
  - `sessionId` do participante: 128 bits gerados no navegador e guardados em `localStorage`.
    **Status: guardar no navegador é Aprovado; o formato e o armazenamento em `localStorage` são
    Proposta.**
  - Segredos (token, `sessionId`) nunca vão em URL: o token viaja só na mensagem `join`.
    **Status: Proposta.**

## R-07 Validação de entrada

- **Decision**: Zod 4 (4.6.7 em 2026-11-02) para os schemas do protocolo HTTP e WebSocket e dos
  formulários, definidos uma única vez em `src/shared/` e usados no Worker, no Durable Object e no
  cliente. **Status: Aprovada (2026-11-02, escolha do responsável pelo produto).**
- **Rationale**: uma única fonte de validação entre servidor e cliente, com tipos inferidos.
- **Alternatives considered**: validadores escritos à mão (proposta original, substituída); valibot.

## R-08 Roteamento e estilo da SPA

- **Decision**: TanStack Router (`@tanstack/react-router` 1.x) para as rotas `/` e `/r/$roomId`;
  Tailwind CSS 4 com `@tailwindcss/vite`; Base UI (`@base-ui/react` 1.x) como componentes
  acessíveis sem estilo, estilizados com Tailwind. **Status: Aprovada (2026-11-02, escolha do
  responsável pelo produto).** Rotas definidas em código, sem geração de arquivos pelo
  `@tanstack/router-plugin`: **Status: Proposta.**
- **Rationale**: Base UI fornece comportamento acessível (teclado, foco, ARIA) para diálogos, menus
  e botões, apoiando SC-005; Tailwind estiliza sem CSS por componente. O pacote antigo
  `@base-ui-components/react` foi renomeado para `@base-ui/react` (aviso no npm) e NÃO deve ser
  usado. Versões verificadas em 2026-11-02: TanStack Router 1.170.46, Tailwind 4.3.3, Base UI 1.9.0;
  todas aceitam React 19, e o plugin do Tailwind aceita Vite 8.
- **Alternatives considered**: History API sem biblioteca e CSS Modules (proposta original,
  substituída); roteamento por arquivos com `@tanstack/router-plugin`.

## R-09 Reconexão automática

- **Decision**: o cliente tenta reconectar após 0,5 s, 1 s, 2 s e depois a cada 2 s, enquanto a
  página estiver aberta. **Status: Proposta** (atende SC-002: reconectar em até 5 s após a rede
  voltar).

## R-10 Limite de criação de salas por IP

- **Decision**: sem limite de criação de salas no MVP; FR-025 removido da spec. **Status: Aprovada
  (D-01 = C, 2026-11-02).**
- **Constatação**: o binding nativo de rate limiting da Cloudflare só aceita janelas de 10 ou 60
  segundos, conta de forma aproximada e por localidade, e a documentação consultada não informa
  disponibilidade no plano gratuito. O valor do documento ("ex.: 20 por hora") não pode ser
  representado nesse binding.
- **Alternatives considered**:
  - A) Durable Object `CreationLimiter` por IP, janela de 1 hora, contador exato; o registro é
    apagado por Alarm ao fim da janela (nenhum IP persiste além de 1 hora).
  - B) Binding nativo com janela de 60 s (por exemplo, 5 criações por minuto), aproximado e sem
    garantia de disponibilidade no plano gratuito.
  - C) Sem limite no MVP (exige retirar FR-025 da spec).

## R-11 Domínio e deploy automático

- **Decision**: sem domínio próprio; a aplicação é publicada no subdomínio `*.workers.dev` da conta
  Cloudflare do responsável pelo produto. **Status: Aprovada (D-02, 2026-11-02).**
- **Decision**: deploy automático com GitHub Actions usando `cloudflare/wrangler-action@v4`, que lê
  os secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` (README da action). Os secrets são
  cadastrados pelo responsável pelo produto no repositório; o agente não manipula seus valores.
  **Status: workflow Aprovado (D-03, 2026-11-02); gatilho em push na `main` após testes
  aprovados é Proposta.**

## R-12 Formatação de números

- **Decision**: rótulos das cartas exatamente como na spec (FR-013, por exemplo `0.5` e `0.5h`);
  mediana exibida em formato pt-BR com vírgula decimal (spec US07: "5,5"), com o sufixo `h` no
  baralho de tempo. **Status: Aprovada** (spec FR-013 e US07); o sufixo `h` no resultado é
  **Proposta**.

## R-13 Avatares

- **Decision**: arquivos SVG em `src/client/assets/avatars/`, identificados por `avatarId` (o nome
  do arquivo sem extensão); o servidor aceita apenas IDs da lista ou ausência de avatar.
  **Status: formato SVG e placeholder Aprovados; organização dos arquivos é Proposta; a lista de
  animais é Pendente (definida com o responsável pelo produto na tarefa de avatares).**
