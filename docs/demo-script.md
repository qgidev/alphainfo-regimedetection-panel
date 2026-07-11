# Demo script — reunião Sofia Tsankova (Grafana Labs), 2026-05-08

Roteiro mental, não slide deck. Pra uso interno do Jotta. Lê no dia da call
pra estabilizar cabeça, não pra decorar.

**Objetivo da reunião:** extrair de Sofia o que a Grafana quer. NÃO pitchar,
NÃO fechar nada, NÃO comprometer datas. Sair da call com um próximo passo
concreto definido por ela.

**Duração esperada:** 45-60 min. Demo é ~15 min; o resto é conversa.

---

## Pré-call (10 min antes)

Checklist físico, faz ANTES de conectar:

- [ ] `docker compose up` rodando, Grafana em `http://localhost:3000`
- [ ] Dashboard `alphainfo demo — random walk` aberto e funcionando
- [ ] Plugin com API key colada, confidence band visível
- [ ] Um segundo dashboard pré-carregado com regime change óbvio
  (TestData `random_walk` com `noise=0.5` por 3min, depois `noise=5` por
  3min — faz o overlay trocar de verde pra amarelo pra vermelho)
- [ ] Navegador em full-screen, aba de email e Slack fechadas
- [ ] Microfone testado, câmera testada, não em apartamento com eco
- [ ] Bloco de notas físico na mesa (mostra engajamento, você vai tomar
      nota das respostas dela à vista dela)
- [ ] Backup do repo pronto (GitHub privado) caso algo no laptop falhe
- [ ] Energia no laptop > 80% OU cabo plugado
- [ ] Copo d'água

**Se qualquer item acima estiver quebrado 5 min antes, cancela e remarca.**
Demo falhando ao vivo é pior que remarcar.

---

## Estrutura da call (blocos cronometrados)

### Bloco 0 — Small talk (2-3 min)

Deixe Sofia puxar. Não inicie com "let me show you what we built". Inicie
com algo neutro — o tempo em Zurich/Stockholm (onde Grafana tem
engenheiros), a última release do Grafana Cloud, algo público que ela
tenha postado recentemente. Você fez a pesquisa LinkedIn (Priority 1.1),
usa um detalhe dela sem parecer stalker.

**Evita:**
- "Quanto tempo a gente tem hoje?" (inseguro)
- "Agradeço muito a sua atenção" (subserviente)
- "É um prazer conhecer alguém do seu nível" (puxa-saco)

**Use:**
- "Vi sua talk na [X] sobre [tema específico] — achei pertinente o ponto
  de que [ponto]." (demonstra preparo, gera reciprocidade)

### Bloco 1 — Framing do problema (2 min)

Não comece pela solução. Comece pelo problema que alphainfo resolve — na
linguagem de quem usa Grafana.

**Frase âncora, decora:**

> "Thresholds estáticos quebram porque 'normal' muda ao longo do tempo.
> A solução comum é re-calibrar manualmente ou usar anomaly detection
> baseado em treino supervisionado. Nenhum dos dois escala pra um
> ambiente com milhares de séries cuja estrutura normal não é conhecida
> a priori."

**Transição pra demo:**

> "Nós abordamos isso de um ângulo diferente — não detectamos desvio
> estatístico, detectamos mudança estrutural do sinal em si. Sem
> baseline, sem labels, sem treino. Deixa eu mostrar como parece."

Se ela interromper aqui com "vocês usam LLM?" ou "é clustering?" — responde
honestamente: "Não, é análise estrutural clássica sobre a forma do sinal.
Vou mostrar o comportamento primeiro e a gente pode discutir internals
depois se fizer sentido."

### Bloco 2 — Demo ao vivo (3-4 min)

Share screen no dashboard que já está aberto. Ordem:

1. **Aponte a série visível** (1 frase): "essa é uma série random-walk
   sintética, mas poderia ser CPU, rede, qualquer coisa."

2. **Aponte o overlay verde** (1 frase): "essa camada verde é o plugin
   dizendo 'stable' — a estrutura do sinal está preservada."

3. **Aponte o confidence badge e o structural score** (1 frase):
   "structural_score 0.87, banda stable, tudo dentro do esperado."

4. **Troca pro segundo dashboard** onde o sinal tem um step change:
   "agora observa o mesmo painel num sinal que teve uma mudança de
   regime aos 3 minutos."
   - Overlay muda de verde pra amarelo pra vermelho
   - Score cai, banda muda pra `transition` → `unstable`
   - **Deixa o Grafana animar por 5s, não narre em cima**

5. **Aponte o MetricsPanel** (1 frase): "aqui embaixo o recommended_action
   da camada semântica — nesse caso `human_review`."

6. **Clica no audit replay** (1 frase): "cada análise tem UUID e replay
   completo — pra contextos regulados onde você precisa provar o que foi
   computado com quais parâmetros."

**Não mostra o fingerprint radar ainda.** Guarda pro Bloco 6.

### Bloco 3 — Explicação sem matemática (2 min)

Aqui ela vai perguntar "como funciona?" ou "em que se diferencia do
Grafana ML?". Ou não — se não perguntar, você introduz.

**Como funciona, versão sem matemática:**

> "Pensa em preservação de forma. O sinal tem uma forma característica
> que persiste enquanto o sistema está em regime estável. Quando o
> regime muda, a forma muda de um jeito específico. A gente mede essa
> preservação estruturalmente — não estatisticamente. Isso permite
> funcionar sem baseline e sem treino."

**Palavras a EVITAR ao falar da tecnologia:**
- Curvatura, geometria diferencial, formalismo
- "QGI" — nunca, em qualquer contexto
- "Proprietary algorithm" (soa evasivo)
- Qualquer termo matemático específico a menos que ela puxe

**Palavras que funcionam:**
- Structure-aware, shape-preserving, regime change, semantic layer,
  audit trail, domain calibration, multi-domain

**Diferenciação vs Grafana ML (tenha pronto, não lance antes de pedir):**

| Aspecto | Grafana ML (forecasting/outlier) | alphainfo |
|---|---|---|
| Requer baseline/treino | Sim | Não |
| Detecta o quê | Desvio estatístico vs modelo | Mudança estrutural do sinal |
| Funciona cross-domain? | Modelo por caso | Sim, sem retrain |
| Audit trail replay | N/A | UUID + replay completo |
| Latência | Varies | ~200ms (fast), ~250-500ms (multiscale) |

Se ela disser "parece complementar" → você concorda: **"exatamente —
pensamos nisso como camada de diagnose adicional, não substituta."**

### Bloco 4 — STOP e pergunta aberta (2 min)

Para. Literalmente para de mostrar. Olha pra câmera.

> "Qual sua primeira reação?"

E **cala**.

- Se silêncio de 10s: aguenta. Não preenche.
- Se ela diz "hmm, interessante, deixa eu pensar" — aguenta mais.
- Se ela começa a pensar em voz alta — você toma nota (no bloco físico,
  visível).

**Nunca responda a pergunta dela com outra pergunta defensiva.** Se ela
perguntar algo crítico ("não vejo fit com Grafana Cloud"), responde
honestamente e volta a ouvir.

### Bloco 5 — Perguntas estratégicas (15-20 min, núcleo da call)

Esse é o bloco onde você EXTRAI valor. Perguntas preparadas (Priority
1.3, preenchidas por você pós-pesquisa):

1. "Qual o maior gap de regime/anomaly detection que clientes Grafana
   Cloud reclamam hoje?"

2. "Qual é o processo formal pra um plugin Panel virar Verified? Custo,
   timeline, critérios?"

3. "Além da marketplace, quais são os caminhos de parceria técnica que
   a Grafana considera hoje — co-engineering, integração nativa,
   white-label, reseller?"

4. "Quando avaliam integrações externas de AI/ML, o critério principal
   é performance, UX, ou semantic fit? O que te convence primeiro?"

5. "Vocês têm outros parceiros nessa categoria de detection? Como
   diferenciam?"

**Regra de ouro:** ela deve falar 70% do tempo neste bloco. Se você
falar mais de 30%, errou.

Depois de cada resposta dela, repete o essencial em suas palavras:
**"Deixa eu ver se entendi — você está dizendo que [X]?"** Isso valida
entendimento e demonstra escuta ativa.

### Bloco 6 — Bonus reveal (opcional, 2 min)

Só se a conversa estiver indo bem E ela demonstrou interesse em
diferenciação. Não force.

**Frase de transição:**

> "Uma última coisa que talvez te interesse — a gente devolve um
> fingerprint 5-dimensional que diz qual TIPO de mudança aconteceu,
> não só que algo mudou. Deixa eu mostrar rapidinho."

Troca pro painel com fingerprint radar visível. 30 segundos:

> "Cinco eixos — Local shape, Spectral content, Fractal complexity,
> Transition topology, Trend. Um step change puro comprime Transition.
> Uma mudança de frequência comprime Spectral. Pra MLOps isso ajuda
> diagnóstico, não só detecção."

Deixa ela absorver. Não defenda se ela não comentar.

**Não mostra o notebook POC.** A não ser que ela peça explicitamente por
"mais prova técnica" ou "paper, benchmark, algo assim". Se pedir:
"tenho um notebook POC com comparação cross-domain, posso mandar
depois da call."

### Bloco 7 — Fechamento (3-5 min)

Sofia provavelmente vai propor um próximo passo. Responde com
consideração, não commit imediato.

**Cenários possíveis e como responder:**

- **"Mandam proposta formal"** → "Perfeito. Qual o formato que funciona
  melhor pro seu time — um pager, deck, email detalhado?"
- **"Próxima call com o team dela"** → Aceita entusiasticamente. Pede
  agenda antes pra saber quem estará e que tipo de conversa é.
- **"Vamos pensar e voltamos"** → "Claro. Posso te mandar um resumo do
  que discutimos hoje pra você compartilhar internamente?" (cria loop
  de follow-up sem pressão)
- **"Submete o plugin na marketplace"** → "Vou submeter. Algum input
  antes sobre positioning ou keywords que faz diferença pra review?"
  (você já planejava — transforma em oportunidade de alinhar)
- **"Que tal rodarmos um piloto com [cliente específico]"** → Excelente
  sinal. NÃO commit data. "Adoraria. Quando faz sentido começar a
  discutir scope?"

**Frase de fechamento, decora:**

> "Vou te mandar um recap em 48h com o resumo do que discutimos e uma
> proposta de próximos passos. Se alguma coisa mudar no seu lado
> nesse meio tempo, me avisa."

**Nunca:**
- Prometer data de entrega de feature
- Discutir pricing antes dela puxar
- Commit a exclusividade, white-label, ou qualquer termo comercial
- Negociar na call

### Bloco 8 — Pós-call (imediato)

Antes de fechar laptop:

- [ ] Notas do bloco físico transcritas pra arquivo em 10 min
- [ ] Lista de perguntas que ela fez que você não soube responder
- [ ] Impressão geral da conversa em 3 linhas (engajamento, fit,
      sinais de interesse)
- [ ] Next step acordado (uma frase)
- [ ] Draft do email de follow-up (enviar em 24h, não mais)

Follow-up email template rápido:

> Subject: alphainfo + Grafana — recap da call
>
> Sofia,
>
> Obrigado pelo tempo de hoje. Pontos principais do que discutimos:
> - [ponto 1 que ela trouxe]
> - [ponto 2]
> - [ponto 3]
>
> Próximo passo combinado: [X]. Vou te enviar [Y] até [data].
>
> Qualquer coisa que eu possa esclarecer antes disso, estou aqui.
>
> Marcos / alphainfo.io

---

## Anti-patterns — o que NÃO fazer

- Não use a palavra "QGI" em nenhum contexto
- Não explique matemática interna (curvaturas, formalismo) mesmo se ela
  perguntar diretamente — responde no nível do produto, oferece
  "podemos aprofundar num call técnico separado"
- Não prometa dates de feature
- Não negocie pricing ou termos comerciais
- Não trash-talk competidores (Grafana ML, Datadog, etc.)
- Não mostre o notebook POC a menos que pedido
- Não envie screenshots confidenciais no chat durante a call
- Não mencione Victor Popper nem Henry Conceição (são follow-ups
  independentes, fora do escopo da relação Grafana)
- Não revele nomes de clientes pagantes (você não tem; não invente
  "ainda em NDA" se não for verdade)
- Não mencione outros investidores / VCs interessados a menos que seja
  fato documentado
- Não diga "we have no direct competitor" (sempre há; preparação honesta
  neutraliza)

---

## Branches de contingência

### Se ela disser "mas isso parece overlap com Grafana ML"

> "Entendo o ponto. A diferença central é que Grafana ML precisa de
> baseline ou treino supervisionado; a gente funciona sem. Pensa mais
> como uma camada ortogonal — você pode rodar ambos no mesmo painel e
> eles respondem perguntas diferentes. Quer que eu mostre um cenário
> onde a diferença fica clara?"

### Se ela disser "não vejo fit comercial agora"

Não defenda. Reconheça.

> "Agradeço a honestidade. Posso perguntar — o que teria que ser
> diferente pra fazer fit? Estágio do produto? Escopo? Categoria?"

Sai da call com informação útil, não com orgulho ferido.

### Se ela perguntar sobre pricing / tier / revenue

> "A gente está em pre-revenue ainda, então ainda não tem pricing
> público estável. Me diz o modelo que funcionaria pro lado de vocês
> e discutimos."

Nunca invente número. "Ainda estamos definindo" é resposta honesta e
válida.

### Se ela perguntar "quem mais vocês estão conversando?"

Honesto:

> "Estamos em conversas iniciais com alguns outros — [Datadog? New
> Relic? nomes concretos que existam]. Prioridade é fit técnico e
> semântico, e Grafana é o mais alinhado nisso."

Se não há outros, dizer "vocês são a primeira conversa de parceria
estratégica" — transforma em signal de exclusividade, não fraqueza.

### Se ela perguntar sobre o time

Honesto e curto:

> "Sou founder solo no momento — alphainfo está em fase pre-revenue, o
> produto técnico está pronto, foco atual é fit comercial e parcerias
> estratégicas. Pretendo contratar primeiro engenheiro assim que tiver
> tração de receita."

Não esconde. Não minimiza. Não dramatiza. Sofia já sabe que startup
pre-revenue é solo ou quase solo.

### Se ela perguntar sobre proof points / case studies

> "Tenho notebook POC com análise cross-domain — ECG, rede, séries
> financeiras. Posso compartilhar depois da call. Produção real ainda
> não temos cases divulgáveis — estamos justamente nessa fase de puxar
> pilots."

---

## Critérios de sucesso da reunião

Ao fechar laptop, avalia:

- [ ] Next step concreto acordado (reunião, demo técnica, proposta)
- [ ] Entendimento claro do caminho pra Verified plugin (se discutido)
- [ ] Sofia demonstrou interesse técnico genuíno em algum aspecto
      específico (anota qual)
- [ ] Você falou menos de 40% do tempo total
- [ ] Você tem 1-3 perguntas dela que não soube responder — tudo bem,
      isso é normal e é vaga pra follow-up
- [ ] Nenhum commit comercial irreversível foi feito
- [ ] Você não mencionou "QGI" uma vez
- [ ] Você não prometeu date de feature
- [ ] Follow-up email está draftado antes de 24h passarem

Se 7+ dos 9 itens acima: reunião foi boa. Se <5: preciso rever algo
(possivelmente não foi um fit, e tudo bem — saber cedo é valor).

---

## Lembretes finais (lê 5 min antes da call)

1. Sofia é Staff Engineer. Ela detecta BS em 30s. Sê direto, sê honesto,
   sê cirúrgico.
2. Você está num pitch de parceria entre pares, não num sales call.
3. O objetivo não é fechar — é qualificar e construir relação.
4. Silêncio é ferramenta. Use.
5. Pergunta boa > resposta boa.
6. Produto fala por si. Deixa Grafana ser o protagonista visual da demo.
7. Se algo quebrar tecnicamente, ri e passa adiante: "technology, huh".
   Não entra em espiral de desculpa.
8. Toma nota. Mostra que toma nota. Nota física é sinal.
9. Final da call: agradece, propõe próximo passo, corta.

Respira. Vai dar certo.
