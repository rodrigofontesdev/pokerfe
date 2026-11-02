# Data Model: Pokerfé — MVP de planning poker

**Feature**: `001-pokerfe-mvp` | **Data**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

Os dados de cada sala vivem no SQLite do Durable Object `Room` daquela sala (research R-01).
Campos e tabelas marcados com **(documento)** constam no documento de produto; os demais são
**Proposta** e só valem depois da aprovação do plano.

## Tabela `room` (uma linha)

| Campo | Tipo SQLite | Regra |
| --- | --- | --- |
| `name` | TEXT NOT NULL | (documento) 1 a 250 caracteres após remover espaços nas pontas (FR-001, FR-008) |
| `deck_type` | TEXT NOT NULL | (documento) `points` ou `time` (FR-001, FR-013) |
| `created_at` | INTEGER NOT NULL | (documento) epoch em ms |
| `last_activity_at` | INTEGER NOT NULL | (documento) epoch em ms; atualizado na criação, em cada voto e em cada nova rodada (FR-023) |
| `facilitator_token_hash` | TEXT NOT NULL | (documento) SHA-256 em hexadecimal do token (R-06, Proposta quanto ao algoritmo) |
| `current_round` | INTEGER NOT NULL | (documento) número da rodada atual, começa em 1 |

A existência da linha `room` indica que a sala existe. Sem ela, qualquer acesso responde "sala
não encontrada ou expirada" (FR-007).

## Tabela `participants`

| Campo | Tipo SQLite | Regra |
| --- | --- | --- |
| `session_id` | TEXT PRIMARY KEY | (documento) gerado no navegador (R-06); segredo, nunca enviado a outros participantes |
| `participant_id` | TEXT NOT NULL UNIQUE | Proposta: ID público aleatório (128 bits, base62) gerado pelo servidor no primeiro `join`; é o único identificador exibido aos demais e usado em `set_observer` |
| `display_name` | TEXT NOT NULL | (documento) 1 a 45 caracteres após remover espaços nas pontas (FR-004, FR-008) |
| `avatar_id` | TEXT NULL | (documento) ID da lista fixa de avatares ou NULL (FR-005) |
| `is_facilitator` | INTEGER NOT NULL DEFAULT 0 | Proposta: 1 para quem entrou com o token válido; o facilitador não vota (FR-011) |
| `is_observer` | INTEGER NOT NULL DEFAULT 0 | (documento) alterado só pelo facilitador; nunca 1 para o facilitador (FR-010) |
| `connected` | INTEGER NOT NULL DEFAULT 0 | (documento) 1 enquanto houver ao menos uma conexão aberta com esse `session_id` |
| `last_seen_at` | INTEGER NOT NULL | (documento) epoch em ms da última mensagem ou conexão |

## Tabela `rounds`

| Campo | Tipo SQLite | Regra |
| --- | --- | --- |
| `number` | INTEGER PRIMARY KEY | (documento) sequencial a partir de 1 |
| `title` | TEXT NULL | (documento) 0 a 250 caracteres; vazio é gravado como NULL (FR-008, FR-017) |
| `status` | TEXT NOT NULL | (documento) `voting`, `revealed` ou `archived` |
| `median` | REAL NULL | (documento) calculada na revelação (FR-014) |
| `mode` | TEXT NULL | (documento, tipo Proposta) array JSON com uma ou mais modas; `[]` quando "Sem moda" |
| `revealed_at` | INTEGER NULL | (documento) epoch em ms |

## Tabela `votes`

| Campo | Tipo SQLite | Regra |
| --- | --- | --- |
| `round_number` | INTEGER NOT NULL | (documento) referencia `rounds.number` |
| `session_id` | TEXT NOT NULL | (documento) referencia `participants.session_id` |
| `card` | TEXT NOT NULL | (documento) valor exatamente igual a uma carta do baralho da sala (FR-013) |

Chave primária: (`round_number`, `session_id`) — um voto por participante por rodada; trocar o
voto substitui a linha (FR-015). Proposta.

## Transições de estado da rodada

```text
voting ──(reveal: facilitador, ≥1 votante conectado, todos os votantes conectados votaram)──▶ revealed
revealed ──(new_round: facilitador)──▶ archived   e cria rodada N+1 em voting
```

- Em `voting`: votantes podem votar e trocar o voto; o facilitador pode alterar título e
  observadores.
- Em `revealed`: votos bloqueados (FR-015); os votos registrados de votantes desconectados
  também entram no resultado (FR-020).
- Em `archived`: rodada só aparece no histórico (FR-018, FR-019).
- Ao marcar alguém como observador em `voting`, o voto dessa pessoa na rodada atual é apagado
  (FR-010).

## Regras de cálculo (módulo de domínio)

- Valor numérico da carta: o número do rótulo, sem o sufixo `h` no baralho de tempo.
- Mediana: valores ordenados; com quantidade par, média dos dois centrais (FR-014).
- Moda: valores com a maior contagem quando essa contagem é maior que 1; se nenhum valor se
  repete, nenhuma moda ("Sem moda"); empate exibe todas (FR-014).
- Distribuição: contagem de votos por carta (spec, Clarifications).

## Durable Object `CreationLimiter` (somente se D-01 = opção A)

Uma instância por IP, com um contador e o início da janela; um Alarm apaga o registro ao fim da
janela de 1 hora. Nenhum outro dado é guardado. **Status: Pendente (D-01).**
