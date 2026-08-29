# Subprojeto — IA reutilizável para aplicativos SaaS

## Status

Planejado para execução futura. Não faz parte do escopo necessário para concluir e comercializar o CardLink.

## Decisão no CardLink

O Assistente de conteúdo permanece oculto na versão comercial atual. Seu código não foi apagado, permitindo estudo, reaproveitamento ou substituição futura. A IA só retornará ao produto quando houver utilidade clara, funcionamento confiável e benefício percebido pelo cliente.

## Objetivo

Criar uma arquitetura e um método reutilizáveis para integrar inteligência artificial a diferentes aplicativos SaaS com segurança, utilidade real, custos controlados e independência de um único provedor.

O resultado esperado não é apenas um campo que melhora textos. O subprojeto deverá permitir identificar e implementar funções de IA que resolvam tarefas centrais de cada produto.

## Questões que o estudo deve responder

1. Qual problema real do usuário será resolvido pela IA?
2. A IA é indispensável, complementar ou apenas decorativa?
3. Quais dados e contexto do aplicativo ela precisa receber?
4. A função exige conversa, geração, classificação, análise, automação ou uso de ferramentas?
5. É necessário um agente com memória, regras ou skills específicas?
6. Qual provedor atende melhor ao caso: NVIDIA, Gemini, OpenAI, modelo local ou outro?
7. Como trocar de provedor sem reescrever o aplicativo?
8. Quanto custa cada tarefa e como limitar o consumo?
9. Como medir qualidade, disponibilidade, velocidade e retorno comercial?
10. Quais riscos existem para privacidade, segurança e respostas incorretas?

## Arquitetura mínima reutilizável

- Frontend sem acesso direto às chaves dos provedores.
- Backend intermediário responsável por autenticação, regras e chamadas de IA.
- Camada única de provedores, permitindo substituição e redundância.
- Prompts, instruções e skills versionados separadamente do código principal.
- Limites por usuário, plano e período.
- Logs sem registrar segredos ou dados pessoais desnecessários.
- Tratamento de timeout, indisponibilidade e respostas inválidas.
- Mensagem clara ao usuário quando a IA não estiver disponível.
- Métricas de uso, custo, latência, falhas e satisfação.
- Testes com respostas simuladas antes de conectar serviços pagos ou externos.

## Fases de execução

### Fase 1 — Pesquisa e seleção do caso de uso

- Estudar integrações reais de IA em SaaS.
- Catalogar funções por categoria: geração, análise, recomendação, atendimento, automação e agentes.
- Selecionar um problema pequeno, frequente e mensurável para o protótipo.
- Definir o que caracteriza sucesso antes de programar.

**Saída:** documento do caso de uso, público, benefício, riscos e métrica principal.

### Fase 2 — Laboratório independente

- Criar um projeto separado do CardLink.
- Implementar backend intermediário e um adaptador de provedor.
- Começar com um único provedor e respostas simuladas.
- Acrescentar um segundo provedor apenas depois de o fluxo básico funcionar.
- Testar autenticação, limites, erros, timeout e proteção das chaves.

**Saída:** protótipo funcional que não depende da estrutura de nenhum SaaS específico.

### Fase 3 — Skills e contexto

- Definir instruções especializadas para cada tarefa.
- Estabelecer entradas obrigatórias, formato da resposta e limites.
- Criar testes com exemplos bons, ruins e casos extremos.
- Verificar quando memória e ferramentas externas são realmente necessárias.

**Saída:** pacote versionado de instruções, testes e critérios de qualidade.

### Fase 4 — Produto reutilizável

- Transformar o laboratório em módulo ou serviço conectável a diferentes SaaS.
- Padronizar API, autenticação, configuração e documentação.
- Criar painel de métricas e controle de consumo.
- Definir política de privacidade, retenção e exclusão de dados.

**Saída:** módulo de IA reutilizável com documentação de integração.

### Fase 5 — Piloto em um produto

- Escolher um aplicativo em que a IA tenha impacto relevante.
- Liberar para poucos usuários.
- Comparar uso, resultado, custo e satisfação com o fluxo sem IA.
- Corrigir problemas antes da comercialização ampla.

**Saída:** decisão baseada em dados: incorporar, modificar ou abandonar a função.

## Critérios para considerar a integração pronta

- A função resolve uma tarefa relevante e frequente.
- O usuário entende o benefício sem treinamento complexo.
- As chaves ficam exclusivamente no backend.
- Falhas do provedor não interrompem o restante do aplicativo.
- Há limite de consumo e estimativa de custo por usuário.
- Existem testes automatizados e exemplos de avaliação.
- Os logs permitem diagnosticar falhas sem expor segredos.
- A troca de provedor ocorre pela camada de adaptação.
- A experiência continua útil quando a IA está indisponível.
- O ganho comercial ou operacional justifica a manutenção.

## Fora do escopo inicial

- Criar um agente genérico capaz de fazer qualquer tarefa.
- Usar vários provedores antes de validar o primeiro fluxo.
- Prometer IA na oferta comercial antes de medir sua confiabilidade.
- Integrar IA diretamente no frontend.
- Manter recursos de IA apenas como elemento visual de marketing.

## Prioridade

1. Finalizar e validar o CardLink sem dependência de IA.
2. Preparar a comercialização do produto.
3. Iniciar o laboratório de IA como projeto independente.
4. Reavaliar uma futura integração ao CardLink somente após o método estar validado.
