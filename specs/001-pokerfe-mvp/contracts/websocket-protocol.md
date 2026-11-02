# Contrato WebSocket: Pokerfé

**Feature**: `001-pokerfe-mvp` | **Data**: 2026-11-02 | **Spec**: [../spec.md](../spec.md)

Os nomes de mensagem `join`, `vote`, `set_observer`, `set_title`, `reveal`, `new_round`,
`room_state` e `error` constam no documento de produto (**Aprovado**). Campos, validações,
códigos de erro e códigos de fechamento foram **aprovados com o plano em 2026-11-02**. Cada mensagem
é validada com um schema Zod compartilhado em `src/shared/` (research R-07).

Todas as mensagens são texto JSON com o campo `type`. Mensagem que não for JSON válido, ou com
`type` desconhecido, recebe `error` com `code: "invalid_message"` e a conexão continua aberta.

## Cliente → servidor

### `join` (primeira mensagem obrigatória)

```json
{ "type": "join", "sessionId": "aB3...22", "displayName": "Ana", "avatarId": "raposa", "facilitatorToken": "Qm4...22" }
```

| Campo | Tipo | Obrigatório | Validação |
| --- | --- | --- | --- |
| `sessionId` | string | sim | 22 caracteres base62 |
| `displayName` | string | sim | após remover espaços nas pontas: 1 a 45 caracteres (FR-008) |
| `avatarId` | string ou null | sim | ID da lista de avatares ou `null` (FR-005) |
| `facilitatorToken` | string | não | se presente e o hash conferir, a conexão é de facilitador (FR-021) |

Comportamento:

- `sessionId` novo cria o participante como votante (ou facilitador, com token válido, que é quem
  criou a sala — FR-002) e gera o `participantId` público (data-model).
- `sessionId` já conhecido recupera o participante, o papel e o voto da rodada atual; nome e
  avatar são atualizados com os valores enviados (FR-022).
- Token inválido não gera erro de autorização: a conexão entra sem papel de facilitador.
- Qualquer outra mensagem antes de `join` recebe `error` `not_joined`.

### `vote`

```json
{ "type": "vote", "card": "5" }
```

Permitido para votante (não facilitador, não observador) com a rodada em `voting`. `card` deve
ser exatamente um rótulo do baralho da sala (FR-013). Substitui o voto anterior (FR-015). Renova o
prazo de 30 dias (FR-023). Erros: `forbidden`, `invalid_card`, `round_not_voting`.

### `set_observer` (facilitador)

```json
{ "type": "set_observer", "participantId": "Xy7...22", "observer": true }
```

Alterna votante ⇄ observador de outro participante (FR-010). Com `observer: true` e a rodada em
`voting`, o voto do alvo na rodada atual é apagado. Erros: `forbidden` (não é facilitador),
`invalid_target` (participante inexistente ou o próprio facilitador).

### `set_title` (facilitador)

```json
{ "type": "set_title", "title": "Login com Google" }
```

`title`: 0 a 250 caracteres após remover espaços nas pontas; vazio limpa o título (FR-008,
FR-017). Permitido com a rodada em `voting`. Erros: `forbidden`, `validation_error`,
`round_not_voting`.

### `reveal` (facilitador)

```json
{ "type": "reveal" }
```

Permitido quando a rodada está em `voting`, existe ao menos um votante conectado e todos os
votantes conectados votaram (FR-012). Calcula mediana, moda e distribuição com todos os votos
registrados na rodada, inclusive de votantes desconectados (FR-014, FR-020). Erros: `forbidden`,
`reveal_blocked`, `round_not_voting`.

### `new_round` (facilitador)

```json
{ "type": "new_round" }
```

Permitido com a rodada em `revealed`: arquiva a rodada, cria a seguinte em `voting` sem votos e
renova o prazo de 30 dias (FR-018, FR-023). Erros: `forbidden`, `round_not_revealed`.

## Servidor → cliente

### `room_state`

Enviado a cada conexão após `join` e a todas as conexões após qualquer mudança (FR-009). É
personalizado por conexão no campo `you`.

```json
{
  "type": "room_state",
  "room": { "name": "Sprint 42 - Checkout", "deckType": "points", "deck": ["0","0.5","1","2","3","5","8","13","20","40","100"] },
  "you": { "participantId": "Xy7...22", "isFacilitator": false, "isObserver": false, "myVote": "5" },
  "participants": [
    { "participantId": "Xy7...22", "displayName": "Ana", "avatarId": "raposa", "isFacilitator": false, "isObserver": false, "connected": true, "hasVoted": true }
  ],
  "round": {
    "number": 3, "title": "Login com Google", "status": "voting",
    "missingVotes": 2, "canReveal": false,
    "votes": null, "result": null
  },
  "history": [
    { "number": 2, "title": null, "median": 5, "modes": [5] }
  ]
}
```

Regras:

- `myVote` só traz o voto da própria conexão; antes da revelação nenhum outro valor é enviado
  (FR-009).
- A revelação é enviada a todas as conexões no mesmo broadcast (FR-016). Com `status: "revealed"`, `votes` lista `{ "participantId", "card" }` de todos os votos da rodada
  e `result` traz `{ "median": number|null, "modes": number[], "distribution": [{ "card", "count" }] }`
  (`modes: []` significa "Sem moda"; `distribution` só lista cartas com ao menos um voto, na ordem
  do baralho).
- `history` vem da rodada arquivada mais recente para a mais antiga, para todos os participantes
  (FR-019).
- Valores de `median` e `modes` são números; a interface formata em pt-BR (R-12).

### `error`

```json
{ "type": "error", "code": "reveal_blocked", "message": "Ainda faltam votos" }
```

Códigos: `invalid_message`, `not_joined`, `forbidden`, `invalid_card`, `invalid_target`,
`validation_error`, `round_not_voting`, `round_not_revealed`, `reveal_blocked`.

## Fechamento de conexão

| Código | Motivo |
| --- | --- |
| 4404 | a sala expirou e foi apagada enquanto havia conexões abertas (FR-023) |

Ao receber 4404, o cliente exibe "Sala não encontrada ou expirada" e não tenta reconectar
(FR-007). Para qualquer outro fechamento, o cliente reconecta conforme research R-09 e envia `join`
novamente com o mesmo `sessionId` (FR-022).
