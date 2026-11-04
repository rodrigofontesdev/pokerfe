# Feature Specification: Pokerfé — MVP de planning poker

**Feature Branch**: `001-pokerfe-mvp`

**Created**: 2026-11-02

**Status**: Approved (2026-11-02)

**Input**: User description: "MVP do Pokerfé, aplicação web de planning poker sem login para um time
de PO/PM, engenheiros e QAs, conforme o documento de produto Pokerfé aprovado em 2026-11-02."

**Fonte**: documento de produto "Pokerfé: MVP de planning poker", publicado em
[Gist 635dca41](https://gist.github.com/rodrigofontesdev/635dca41cf757b6318f281c9b3e4d98c)
(arquivo `pokerfe-mvp.md`, SHA-256
`2ade266d81bd888ddbde6376915483070a77498e002bcf239d009455b9f7b915`, conferido em 2026-11-02).
Os identificadores US01–US11 abaixo são os mesmos do documento. Decisões tomadas depois desse
snapshot estão na seção Clarifications e prevalecem sobre ele (por exemplo, D-01).

## Clarifications

### Session 2026-11-02

- Q: Quais valores tem cada baralho? → A: Story points: 0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100.
  Tempo (horas): 0.5, 1, 2, 3, 5, 8, 12, 16, 24, 40 (os rótulos não levam o sufixo `h`; a interface o acrescenta na apresentação).
- Q: Há revelação automática? → A: Não. O facilitador revela, e o botão só fica liberado quando
  todos os votantes votaram.
- Q: O que o resultado exibe? → A: Mediana e moda; a média simples não é exibida.
- Q: Há limite de participantes por sala? → A: Não há limite fixo; a média esperada é de 10.
- Q: O facilitador vota ou pode virar observador? → A: Não vota, não entra na contagem da
  revelação e não pode se marcar como observador.
- Q: O facilitador pode devolver um observador à condição de votante, e o que acontece com o voto
  de quem vira observador? → A: Pode alternar entre observador e votante; o voto da rodada em
  andamento é descartado ao virar observador.
- Q: O que acontece com o botão de revelar se não houver ninguém para votar? → A: Fica bloqueado.
- Q: Existe prazo para reconectar? → A: Não. Quem cair e voltar no mesmo navegador recupera
  nome, avatar e voto e pode votar se a rodada ainda estiver em votação.
- Q: Como são os avatares? → A: Lista fixa de animais em SVG; a lista final é definida com o
  responsável pelo produto na implementação; sem avatar escolhido, usa-se a primeira letra do
  nome como placeholder.
- Q: Recuperar o papel de facilitador em outro navegador faz parte do MVP? → A: Não.
- Q: O que renova o prazo de 30 dias da sala? → A: Apenas um voto ou uma nova rodada.
- Q: Idioma e textos de interface? → A: Somente pt-BR; textos não definidos podem ser redigidos
  na implementação.
- Q: O voto guardado de um votante que desconectou antes da revelação entra no resultado? → A: Sim,
  entra nas cartas reveladas, na mediana, na moda e na distribuição.
- Q: O histórico fica visível para todos os participantes ou só para o facilitador? → A: Para todos.
- Q: Qual o tamanho máximo dos campos de texto? → A: Nome da sala 250 caracteres, nome de exibição
  45 caracteres, título da rodada 250 caracteres.
- Q: O que é a distribuição dos votos? → A: Quantos votos cada carta recebeu.
- Q: Como limitar a criação de salas por IP? → A: Sem limite no MVP (decisão D-01 = C); o FR-025
  foi removido.
- Q: Haverá domínio próprio? → A: Não; a aplicação usa o subdomínio `workers.dev` da conta
  Cloudflare (D-02).
- Q: O deploy automático via GitHub Actions está autorizado? → A: Sim (D-03).
- Q: Quais dispositivos a interface deve atender? → A: Apenas desktop e notebook, com largura
  mínima de 1024 px; tablet e celular ficam fora do escopo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - US01 Criar sala (Priority: P1)

Como PO, quero criar uma sala com nome, tipo de baralho e meu avatar, para iniciar a sessão de
estimativa.

**Why this priority**: sem sala não existe sessão; é o ponto de entrada de todo o fluxo.

**Independent Test**: criar uma sala na tela inicial e verificar que o criador chega à sala como
facilitador, com link único para copiar.

**Acceptance Scenarios**:

1. **Dado que** estou na tela inicial, informei o nome da sala "Sprint 42 - Checkout", escolhi o
   baralho "Story points" e informei meu nome e escolhi um avatar, **Quando** clico em "Criar
   sala", **Então** sou levado para a sala como facilitador, com meu nome e avatar, e vejo um
   link único com o botão "Copiar link".
2. **Dado que** deixei o nome da sala ou meu nome em branco, **Quando** clico em "Criar sala",
   **Então** vejo a mensagem indicando o campo obrigatório e nenhuma sala é criada.

---

### User Story 2 - US02 Entrar na sala pelo link (Priority: P1)

Como participante, quero entrar pelo link informando meu nome e escolhendo um avatar, para votar
sem cadastro.

**Why this priority**: sem a entrada dos votantes não há estimativa.

**Independent Test**: abrir o link de uma sala ativa em outro navegador, informar nome e avatar e
verificar que o participante aparece para todos.

**Acceptance Scenarios**:

1. **Dado que** recebi o link de uma sala ativa, **Quando** abro o link, informo o nome "Ana" e
   escolho um avatar, **Então** entro na sala e todos os participantes me veem na lista com meu
   avatar, em tempo real.
2. **Dado que** já entrei antes neste navegador, **Quando** abro o link de uma sala, **Então** meu
   nome e avatar já vêm preenchidos e posso alterá-los.
3. **Dado que** informei o nome "Ana" e não escolhi avatar, **Quando** entro na sala, **Então** sou
   exibida com a letra "A" no lugar do avatar.
4. **Dado que** abro um link de sala inexistente ou expirada, **Então** vejo "Sala não encontrada
   ou expirada" e um botão para criar nova sala.

---

### User Story 3 - US03 Ver presença e status de voto (Priority: P1)

Como participante, quero ver quem está na sala e quem já votou, para saber quando a rodada pode
ser revelada.

**Why this priority**: é o que permite ao time e ao facilitador saber quando revelar.

**Independent Test**: com dois participantes, um vota e o outro vê a indicação de voto sem o
valor.

**Acceptance Scenarios**:

1. **Dado que** estou na sala, **Quando** outro participante escolhe uma carta, **Então** vejo que
   ele votou, mas não qual carta escolheu.

---

### User Story 4 - US04 Marcar observadores (Priority: P1)

Como PO, quero marcar participantes como observadores, para que quem não estima não bloqueie a
revelação.

**Why this priority**: sem observadores, uma pessoa conectada que não vota trava a rodada.

**Independent Test**: o facilitador marca um votante como observador e o botão de revelar passa a
considerar apenas os votantes restantes.

**Acceptance Scenarios**:

1. **Dado que** "Carlos" está na sala como votante, **Quando** o PO marca "Carlos" como
   observador, **Então** "Carlos" aparece como observador para todos, as cartas ficam
   desabilitadas para ele e ele deixa de ser esperado para a revelação.
2. **Dado que** "Carlos" votou 5 na rodada em andamento, **Quando** o PO marca "Carlos" como
   observador, **Então** o voto de "Carlos" é descartado.
3. **Dado que** "Carlos" é observador, **Quando** o PO marca "Carlos" como votante, **Então** as
   cartas ficam habilitadas para ele e ele volta a ser esperado para a revelação.
4. **Dado que** sou um participante sem papel de facilitador, **Então** não vejo a opção de marcar
   observadores.
5. **Dado que** sou o facilitador da sala, **Então** a opção "Marcar como observador" não aparece
   para mim mesmo.

---

### User Story 5 - US05 Votar e trocar o voto (Priority: P1)

Como votante, quero escolher e trocar minha carta até a revelação, para registrar minha
estimativa.

**Why this priority**: é a ação central do planning poker.

**Independent Test**: um votante escolhe uma carta, troca por outra e o voto registrado é o último.

**Acceptance Scenarios**:

1. **Dado que** escolhi a carta 5, **Quando** escolho a carta 8 antes da revelação, **Então** meu
   voto passa a ser 8.
2. **Dado que** sou o facilitador da sala, **Então** não tenho cartas para escolher e não sou
   contado entre os votos necessários para revelar.

---

### User Story 6 - US06 Revelar as cartas (Priority: P1)

Como PO, quero revelar as cartas quando todos os votantes tiverem votado, para abrir a discussão.

**Why this priority**: a revelação fecha a rodada e mostra o resultado.

**Independent Test**: com todos os votantes votando, o facilitador revela e todos veem as cartas.

**Acceptance Scenarios**:

1. **Dado que** alguns votantes ainda não escolheram carta, **Então** o botão "Revelar cartas"
   fica desabilitado para o PO e vejo quantos votos faltam.
2. **Dado que** todos os participantes, exceto o facilitador, são observadores, **Então** o botão
   "Revelar cartas" fica desabilitado.
3. **Dado que** todos os votantes conectados escolheram uma carta, **Quando** o PO clica em
   "Revelar cartas", **Então** todas as cartas são reveladas para todos e a mediana e a moda são
   exibidas.
4. **Dado que** todos os votantes votaram e "Carlos" é observador, **Então** o botão "Revelar
   cartas" fica habilitado.
5. **Dado que** o último votante escolheu sua carta, **Então** as cartas continuam ocultas até o PO
   clicar em "Revelar cartas".

---

### User Story 7 - US07 Ver mediana, moda e distribuição (Priority: P1)

Como time, queremos ver mediana, moda e distribuição, para conversar sobre divergências.

**Why this priority**: é o resultado que orienta a conversa da planning.

**Independent Test**: revelar votos conhecidos e conferir mediana e moda exibidas.

**Acceptance Scenarios**:

1. **Dado que** os votos revelados foram 3, 5, 5 e 8, **Então** a mediana exibida é 5 e a moda é 5,
   e não é exibida média simples.
2. **Dado que** os votos revelados foram 3, 3, 8 e 8, **Então** a mediana exibida é 5,5 e as modas
   são 3 e 8.
3. **Dado que** os votos revelados foram 2, 3 e 5, **Então** a mediana exibida é 3 e a moda aparece
   como "Sem moda".

---

### User Story 8 - US08 Dar título à rodada (Priority: P1)

Como PO, quero dar um título à rodada, para associar a estimativa à feature.

**Why this priority**: sem título, o histórico não diz qual item foi estimado.

**Independent Test**: definir um título, revelar e verificar que o resultado fica associado a ele.

**Acceptance Scenarios**:

1. **Dado que** o PO preencheu o título "Login com Google", **Quando** as cartas são reveladas,
   **Então** a estimativa fica associada à feature "Login com Google".

---

### User Story 9 - US09 Nova rodada e histórico (Priority: P1)

Como PO, quero iniciar nova rodada e ver o histórico, para seguir a planning sem perder
resultados.

**Why this priority**: uma planning estima vários itens em sequência.

**Independent Test**: revelar uma rodada, iniciar outra e conferir o item no histórico.

**Acceptance Scenarios**:

1. **Dado que** a feature "Login com Google" foi estimada, **Quando** o PO clica em "Nova rodada",
   **Então** o histórico exibe "Login com Google", a mediana e a moda, e uma nova rodada começa
   com todas as cartas zeradas.
2. **Dado que** o PO não informou título para a rodada 3, **Quando** as cartas são reveladas e o PO
   clica em "Nova rodada", **Então** o histórico exibe "Rodada 3", a mediana e a moda.
3. **Dado que** as cartas ainda não foram reveladas, **Então** o botão "Nova rodada" fica
   desabilitado.

---

### User Story 10 - US10 Reconectar sem perder o voto (Priority: P2)

Como participante, quero reconectar sem perder meu voto, para não atrapalhar a rodada se a rede
cair.

**Why this priority**: robustez; o fluxo principal funciona sem ela, mas quedas são comuns.

**Independent Test**: votar, derrubar a conexão, reconectar no mesmo navegador e conferir o voto.

**Acceptance Scenarios**:

1. **Dado que** votei 5 e minha conexão caiu, **Quando** reconecto no mesmo navegador, sem limite
   de tempo, **Então** volto com o mesmo nome, avatar e voto 5.
2. **Dado que** minha conexão caiu, por qualquer motivo, **Quando** reconecto e a rodada ainda está
   em votação, **Então** posso escolher ou trocar minha carta normalmente.
3. **Dado que** minha conexão caiu e a rodada foi revelada nesse meio-tempo, **Quando** reconecto,
   **Então** vejo o resultado revelado e participo da próxima rodada.

---

### User Story 11 - US11 Reabrir a sala em até 30 dias (Priority: P2)

Como PO, quero reabrir a sala pelo mesmo link por 30 dias, para consultar o histórico depois.

**Why this priority**: consulta posterior; não bloqueia a planning em si.

**Independent Test**: reabrir uma sala com atividade recente e ver o histórico; abrir uma sala
expirada e ver a mensagem.

**Acceptance Scenarios**:

1. **Dado que** a última atividade da sala foi há 29 dias, **Quando** abro o link da sala, **Então**
   vejo o histórico completo de rodadas.
2. **Dado que** a sala está sem atividade há mais de 30 dias, **Quando** abro o link da sala,
   **Então** vejo "Sala não encontrada ou expirada".

---

### Edge Cases

- Todos os participantes, exceto o facilitador, são observadores: o botão de revelar fica
  bloqueado (FR-012).
- Um votante desconecta antes de votar: deixa de ser esperado para a revelação (FR-020).
- Um votante vota e desconecta antes da revelação: deixa de ser esperado, e o voto já registrado
  entra no resultado revelado (FR-020).
- Um votante vira observador depois de votar: o voto é descartado (FR-010).
- Número par de votos: a mediana é a média dos dois valores centrais, inclusive no baralho de
  tempo (FR-014).
- Nenhum valor se repete: a moda aparece como "Sem moda" (FR-014).
- O facilitador abre a sala em outro navegador ou em aba anônima: não recupera o papel; isso está
  fora do escopo do MVP (FR-021).
- Link de sala inexistente ou expirada: mensagem "Sala não encontrada ou expirada" (FR-006).

## Requirements *(mandatory)*

### Functional Requirements

**Sala e entrada**

- **FR-001**: O sistema DEVE permitir criar uma sala informando nome da sala (obrigatório), tipo
  de baralho (story points ou tempo), nome de exibição do criador (obrigatório) e avatar do
  criador (opcional). [US01]
- **FR-002**: Quem cria a sala DEVE se tornar o facilitador dela. [US01]
- **FR-003**: Cada sala DEVE ter um link único e difícil de adivinhar, exibido ao facilitador com
  a ação "Copiar link". [US01]
- **FR-004**: O sistema DEVE permitir entrar na sala pelo link informando nome de exibição
  (obrigatório) e avatar (opcional), sem cadastro nem login. [US02]
- **FR-005**: O avatar DEVE ser escolhido de uma lista fixa de animais em SVG; avatares podem se
  repetir entre participantes; sem avatar escolhido, a sala DEVE exibir a primeira letra do nome
  como placeholder. A lista final de animais é definida com o responsável pelo produto durante a
  implementação. [US01, US02]
- **FR-006**: O sistema DEVE lembrar nome e avatar no navegador e pré-preenchê-los nas próximas
  entradas, permitindo alterá-los antes de entrar. [US02]
- **FR-007**: Ao abrir um link de sala inexistente ou expirada, o sistema DEVE exibir "Sala não
  encontrada ou expirada" e uma ação para criar nova sala. [US02, US11]
- **FR-008**: O sistema DEVE limitar o nome da sala a 250 caracteres, o nome de exibição a 45
  caracteres e o título da rodada a 250 caracteres. [US01, US02, US08]

**Presença e papéis**

- **FR-009**: Todos os participantes DEVEM ver, em tempo real, a lista de participantes com nome,
  avatar (ou placeholder), papel (facilitador, votante ou observador) e se cada votante já votou,
  sem exibir o valor antes da revelação. [US03]
- **FR-010**: O facilitador DEVE poder alternar qualquer outro participante entre votante e
  observador a qualquer momento; não pode marcar a si mesmo. Ao virar observador, o voto da rodada
  em andamento DEVE ser descartado. Observadores não escolhem carta. [US04]
- **FR-011**: O facilitador NÃO vota: não tem cartas para escolher e não entra na contagem da
  revelação. [US04, US05]

**Votação e revelação**

- **FR-012**: Não há revelação automática. Apenas o facilitador revela, e a ação "Revelar cartas"
  DEVE ficar habilitada somente quando existir pelo menos um votante conectado e todos os votantes
  conectados tiverem votado. Enquanto bloqueada, a interface DEVE mostrar quantos votos faltam.
  [US06]
- **FR-013**: Os baralhos DEVEM ter exatamente estes valores: Story points 0, 0.5, 1, 2, 3, 5, 8,
  13, 20, 40, 100; Tempo (horas) 0.5, 1, 2, 3, 5, 8, 12, 16, 24, 40 (sem o sufixo `h` nos rótulos; a interface o acrescenta na apresentação). [US01, US05]
- **FR-014**: O resultado revelado DEVE exibir mediana e moda dos votos, sem média simples.
  Mediana com número par de votos é a média dos dois valores centrais. Em empate de moda, todas as
  modas são exibidas; se nenhum valor se repetir, exibe "Sem moda". A distribuição dos votos
  (quantos votos cada carta recebeu) também é exibida. [US07]
- **FR-015**: Votantes DEVEM poder escolher e trocar a carta até a revelação; após a revelação a
  rodada fica bloqueada para votos. [US05]
- **FR-016**: Ao revelar, todas as cartas votadas DEVEM ser exibidas a todos os participantes ao
  mesmo tempo. [US06]

**Rodadas e histórico**

- **FR-017**: O facilitador DEVE poder informar um título opcional para a rodada; ao revelar, a
  estimativa fica associada a esse título. [US08]
- **FR-018**: A ação "Nova rodada" DEVE ficar disponível somente após a revelação; ela arquiva a
  rodada revelada no histórico e abre uma nova rodada com todos os votos zerados. [US09]
- **FR-019**: O histórico DEVE listar as rodadas arquivadas da mais recente para a mais antiga,
  com título (ou "Rodada N" quando sem título), mediana e moda, e DEVE ser visível para todos os
  participantes. [US09]

**Conexão e persistência**

- **FR-020**: Um votante desconectado deixa de ser esperado para a revelação; o voto que ele já
  tinha registrado na rodada continua valendo e entra no resultado revelado. [US06, US10]
- **FR-021**: Ações de facilitador (título, observadores, revelar, nova rodada) DEVEM ser
  protegidas para que só o criador da sala, no mesmo navegador, consiga executá-las; o link
  compartilhado não concede esse papel. Recuperar o papel em outro navegador está fora do escopo.
  [US01, US04, US06, US08, US09]
- **FR-022**: Ao reconectar no mesmo navegador, sem limite de tempo, o participante DEVE recuperar
  nome, avatar e voto; se a rodada estiver em votação, pode votar ou trocar o voto; se tiver sido
  revelada, vê o resultado e participa da próxima rodada. [US10]
- **FR-023**: A sala DEVE permanecer disponível por 30 dias após a última atividade; apenas um voto
  ou uma nova rodada renovam o prazo, e só abrir a sala não renova. Após o prazo, os dados da sala
  DEVEM ser excluídos. [US11]
- **FR-024**: Não há limite fixo de participantes por sala. [Documento, regra 10]
- **FR-025**: *(Removido em 2026-11-02: sem limite de criação de salas no MVP, decisão D-01.)*

**Gerais**

- **FR-026**: A interface DEVE estar somente em pt-BR. [Documento, "Idioma"]
- **FR-027**: O sistema NÃO DEVE coletar dados pessoais além de nome de exibição e avatar.
  [Documento, "Requisitos não funcionais"]

### Key Entities *(include if feature involves data)*

- **Sala**: nome, tipo de baralho, momento de criação, momento da última atividade que renova o
  prazo, comprovação do papel de facilitador, número da rodada atual.
- **Participante**: identificador de sessão do navegador, nome de exibição, avatar (ou nenhum),
  papel (votante ou observador; o facilitador é um participante especial que não vota), estado de
  conexão.
- **Rodada**: número sequencial, título opcional, estado (votando, revelada, arquivada), mediana,
  moda e momento da revelação.
- **Voto**: rodada, participante e carta escolhida.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um voto fica visível para os demais participantes em menos de 500 ms.
- **SC-002**: Após uma queda de conexão, o participante é reconectado automaticamente em até 5 s
  quando a rede volta.
- **SC-003**: Uma sala com 10 participantes simultâneos conclui uma rodada completa (votar,
  revelar, nova rodada) sem erros nem atrasos acima do SC-001.
- **SC-004**: A ferramenta funciona nas 2 últimas versões de Chrome, Edge, Firefox e Safari em
  desktop e notebook, com layout funcional a partir de 1024 px de largura.
- **SC-005**: As cartas são navegáveis por teclado e têm contraste mínimo AA.
- **SC-006**: O custo de infraestrutura é de R$ 0/mês dentro do uso esperado do time.
- **SC-007**: 100% das plannings do time passam a rodar no Pokerfé.

## Assumptions

- A lista final de avatares de animais (quais animais e seus SVGs) é decidida com o responsável
  pelo produto no momento da implementação da tarefa correspondente; até lá, nenhuma lista é
  definitiva.
- O facilitador que perder o navegador perde o papel; o time pode criar uma nova sala. Esse risco
  foi aceito para o MVP.
- Login, contas, notificações e e-mail, integrações (Jira, Azure DevOps, Linear), baralhos
  personalizados, avatar personalizado ou foto, revelação automática, timer, chat, exportação do
  histórico, reestimar rodada revelada, limite de criação de salas por IP e layout para tablet e celular
  (larguras abaixo de 1024 px) estão fora do escopo.
- Textos de interface não definidos nesta spec podem ser redigidos em pt-BR durante a
  implementação, sem criar regras novas.
