# Quickstart de validação: Pokerfé — MVP

**Feature**: `001-pokerfe-mvp` | **Data**: 2026-11-02

Guia para provar que o MVP funciona de ponta a ponta. Os nomes dos scripts npm abaixo são
**Proposta** do plano (ver [plan.md](./plan.md), "Scripts npm") e passam a valer quando a tarefa de
fundação do projeto os criar.

## Pré-requisitos

- Node.js 22 ou superior e npm (research R-02).
- Navegadores do Playwright instalados (`npx playwright install`).
- Para deploy: conta Cloudflare do responsável pelo produto e Wrangler autenticado (`npx wrangler
  login`); decisões D-02 e D-03 (domínio e deploy automático) definidas.

## Comandos

| Objetivo | Comando | Resultado esperado |
| --- | --- | --- |
| Instalar | `npm install` | dependências instaladas sem erro |
| Rodar local | `npm run dev` | Vite + Worker + Durable Objects locais respondendo na URL exibida |
| Checar tipos | `npm run typecheck` | zero erros de TypeScript |
| Testes unitários e de integração | `npm test` | todos os testes do Vitest aprovados |
| Testes de ponta a ponta | `npm run test:e2e` | todos os testes do Playwright aprovados |
| Build | `npm run build` | artefatos da SPA e do Worker gerados sem erro |
| Deploy | `npm run deploy` | Worker publicado; URL de produção acessível |

## Cenários de validação manual

Use dois ou mais navegadores (ou um normal e um anônimo) para simular participantes.

1. **Criar sala (US01)**: na tela inicial, preencher nome da sala, baralho, nome e avatar; ao
   criar, a sala abre com o papel de facilitador e o botão "Copiar link". Com nome em branco,
   nenhuma sala é criada.
2. **Entrar (US02)**: abrir o link em outro navegador, informar só o nome; o participante aparece
   para todos com a primeira letra no lugar do avatar.
3. **Votar e presença (US03, US05)**: votar; os demais veem "votou" sem o valor; trocar a carta
   antes da revelação.
4. **Observador (US04)**: o facilitador marca um votante que já votou como observador; o voto é
   descartado e ele deixa de ser esperado; desmarcar devolve as cartas.
5. **Revelar (US06, US07)**: o botão só habilita quando todos os votantes conectados votaram;
   ao revelar, todos veem cartas, mediana, moda e distribuição (conferir os exemplos da US07).
6. **Título e histórico (US08, US09)**: com e sem título, revelar e iniciar nova rodada; o
   histórico mostra título ou "Rodada N", mediana e moda, mais recente primeiro, para todos.
7. **Reconexão (US10)**: votar, desligar a rede do navegador, religar; em até 5 s o participante
   volta com o mesmo voto.
8. **Expiração (US11)**: coberta por teste de integração que executa o Alarm
   (`runDurableObjectAlarm`); depois dele, o link mostra "Sala não encontrada ou expirada".
9. **Carga de referência (SC-003)**: 10 participantes simultâneos concluem uma rodada completa.

Detalhes de contrato: [contracts/http-api.md](./contracts/http-api.md) e
[contracts/websocket-protocol.md](./contracts/websocket-protocol.md). Dados:
[data-model.md](./data-model.md).
