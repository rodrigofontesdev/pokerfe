# Pokerfé Constitution

## Core Principles

### I. Rastreabilidade e nenhum requisito inventado

- Todo código, teste e issue DEVE apontar para pelo menos um requisito (FR-xxx), história (USxx)
  ou decisão registrada em `specs/` ou neste documento.
- Funcionalidades, regras de negócio, contratos e textos obrigatórios que não estejam nessas
  fontes NÃO DEVEM ser implementados.
- Quando uma lacuna impedir a implementação, o agente DEVE parar e registrar a dúvida para
  decisão humana, em vez de escolher por conta própria.
- Propostas técnicas e premissas DEVEM ser identificadas como tais e só viram requisito após
  aprovação explícita.

Origem: instruções do responsável pelo produto para o processo SDD (2026-11-02).

### II. Sem login e com dados pessoais mínimos

- O Pokerfé NÃO DEVE exigir cadastro, login ou conta.
- Os únicos dados de pessoa coletados são nome de exibição e avatar escolhido. E-mail ou outro
  dado pessoal NÃO DEVE ser coletado.
- O papel de facilitador é comprovado por um token secreto guardado no navegador de quem criou
  a sala; o servidor guarda apenas o hash do token.

Origem: documento de produto Pokerfé, seções "Escopo do MVP", "URL única e segura" e
"Requisitos não funcionais".

### III. Infraestrutura de custo zero na Cloudflare

- A aplicação DEVE rodar em Cloudflare Workers + Durable Objects no plano gratuito, com um
  Durable Object por sala, servindo também o frontend estático (um único deploy).
- Dependência de outro serviço pago ou de outro provedor de infraestrutura NÃO DEVE ser
  introduzida sem aprovação.

Origem: documento de produto Pokerfé, seção "Arquitetura e hospedagem zero custo"; decisão do
responsável pelo produto em 2026-11-02.

### IV. Regras de negócio em módulo puro e testável

- As regras de negócio (votação, revelação, observadores, mediana, moda, rodadas, histórico)
  DEVEM ficar em um módulo sem dependência de APIs da Cloudflare, do navegador ou de rede.
- O Durable Object e a interface DEVEM consumir esse módulo, sem reimplementar as regras.

Origem: documento de produto Pokerfé, tabela de riscos ("Dependência de um único fornecedor").

### V. Testes como evidência de pronto

- Regras de negócio DEVEM ter testes unitários com Vitest; o fluxo principal DEVE ter teste de
  ponta a ponta com Playwright.
- Cada deploy em produção DEVE ser seguido de um smoke test automatizado contra a URL publicada;
  falha no smoke test marca o deploy como falho.
- Uma tarefa só pode ser declarada concluída com os testes relevantes executados e aprovados;
  resultado de teste NÃO DEVE ser declarado sem execução real.

Origem: documento de produto Pokerfé, "Definition of Done" e "Stack aprovada"; smoke test
incluído por pedido do responsável pelo produto em 2026-11-02.

## Restrições técnicas aprovadas

- Linguagem: TypeScript em todo o projeto (frontend, Worker e Durable Object).
- Frontend: SPA em React + Vite, servida como assets estáticos pelo Worker; TanStack Router para
  rotas; Tailwind CSS e Base UI (`@base-ui/react`) para interface.
- Persistência: SQLite do próprio Durable Object; expiração por Alarm 30 dias após a última
  atividade que renova o prazo.
- Tempo real: WebSocket entre navegador e Durable Object da sala.
- Validação de dados: Zod, com schemas compartilhados entre cliente e servidor.
- Runtime de desenvolvimento e CI: Node.js na versão LTS ativa; gerenciador de pacotes: npm.
- Testes: Vitest (unitários e integração) e Playwright (ponta a ponta).
- Idioma da interface: somente pt-BR.

Origem: documento de produto Pokerfé e decisões do responsável pelo produto em 2026-11-02
(inclusive a escolha de TanStack Router, Tailwind CSS, Base UI, Zod e Node.js LTS).

## Fluxo de desenvolvimento e quality gates

- O fluxo segue o Spec Kit: specify → clarify → plan → tasks → analyze → implement, com
  aprovação humana da spec antes do plan e do plan antes das tasks.
- Definition of Done de cada entrega: critérios de aceite validados, testes unitários das regras
  e teste de ponta a ponta do fluxo principal aprovados, code review aprovado, deploy concluído com
  smoke test aprovado em produção,
  e teste com 10 ou mais participantes simultâneos quando a entrega afetar a sala em tempo real.
- Textos de interface não definidos nas specs podem ser redigidos durante a implementação, em
  pt-BR, sem criar novas regras de negócio.

Origem: documento de produto Pokerfé, "Definition of Ready/Done"; decisões de 2026-11-02.

## Governance

- Esta constitution prevalece sobre outras práticas do projeto. Specs, plans, tasks e issues
  DEVEM estar em conformidade com ela.
- Alterações exigem aprovação explícita do responsável pelo produto, registro do motivo e
  atualização dos artefatos afetados.
- Versionamento semântico: MAJOR para remoção ou redefinição de princípio; MINOR para princípio
  ou seção nova; PATCH para ajustes de redação.
- Toda revisão de código e de issue DEVE verificar conformidade com os princípios I a V.

**Version**: 1.1.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-02
