# Contrato HTTP: Pokerfé

**Feature**: `001-pokerfe-mvp` | **Data**: 2026-11-02 | **Spec**: [../spec.md](../spec.md)

Os caminhos `POST /api/rooms` e `/api/rooms/:id/ws` constam no documento de produto (**Aprovado**).
Corpos, códigos de status e formato de erro foram **aprovados com o plano em 2026-11-02**. Os corpos
são validados com schemas Zod compartilhados em `src/shared/` (research R-07).

Formato de erro comum (JSON, `Content-Type: application/json; charset=utf-8`):

```json
{ "error": { "code": "invalid_request", "message": "Informe um nome para a sala" } }
```

`message` é texto pt-BR para exibição; o cliente decide pelo `code`.

## POST /api/rooms — criar sala

Sem autenticação e sem limite de criação no MVP (D-01). Requisitos: FR-001, FR-002, FR-003, FR-008,
FR-013, FR-023.

**Request body**

| Campo | Tipo | Obrigatório | Validação |
| --- | --- | --- | --- |
| `name` | string | sim | após remover espaços nas pontas: 1 a 250 caracteres |
| `deckType` | string | sim | `"points"` ou `"time"` |

O nome e o avatar do facilitador NÃO vão nesta requisição: são enviados na mensagem `join` do
WebSocket (ver [websocket-protocol.md](./websocket-protocol.md)). A interface valida o nome do
facilitador antes de chamar este endpoint, para que nenhuma sala seja criada com o nome em branco
(US01, cenário 2).

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 201 | `{ "roomId": "<22 caracteres base62>", "facilitatorToken": "<22 caracteres base62>" }` | sala criada; `last_activity_at` e Alarm de 30 dias gravados |
| 400 | erro `invalid_request` | corpo não é JSON, campo ausente ou fora da validação |
| 405 | erro `method_not_allowed` | método diferente de POST |

**Efeitos colaterais**: cria a linha `room` no Durable Object `Room` endereçado pelo `roomId`,
com `current_round = 1` e a rodada 1 em `voting`. O `facilitatorToken` só aparece nesta resposta;
o cliente o guarda em `localStorage` associado ao `roomId` (R-06).

**Exemplo**

```http
POST /api/rooms
Content-Type: application/json

{ "name": "Sprint 42 - Checkout", "deckType": "points" }
```

```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{ "roomId": "7Hq2xV9kLmP4sT1wZc8RbN", "facilitatorToken": "Qm4vT8zLp2XcR7sN1bK9dE" }
```

## GET /api/rooms/:roomId/ws — conexão em tempo real

Upgrade para WebSocket (`Upgrade: websocket`). Requisitos: FR-007, FR-009 a FR-023.

| Status | Quando |
| --- | --- |
| 101 | sala existe; conexão aceita com hibernação (R-04) |
| 400 | `roomId` fora do formato (22 caracteres base62) — erro `invalid_room_id` |
| 404 | sala não existe ou expirou — erro `room_not_found`; nada é gravado |
| 426 | requisição sem `Upgrade: websocket` — erro `upgrade_required` |

Depois do 101, o cliente DEVE enviar `join` como primeira mensagem.

## Demais rotas

Qualquer outro caminho sob `/api/` responde 404 com erro `not_found`. Caminhos fora de `/api/`
são servidos pelos static assets com fallback de SPA para `index.html` (R-01).
