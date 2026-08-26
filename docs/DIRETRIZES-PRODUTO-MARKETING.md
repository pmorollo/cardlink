# CardLink — Diretrizes Oficiais de Produto e Marketing

**Atualizado em:** 25/08/2026

Este documento registra decisões estruturais do CardLink que devem orientar desenvolvimento, vendas, comunicação e marketing.

## 1. O que o CardLink é

O CardLink é um **site profissional simples, rápido e acessível para divulgar pequenos negócios e serviços**. Ele não deve ser apresentado comercialmente como cartão de visita digital, mini-site híbrido ou produto que começa como cartão e depois se transforma em site.

Proposta central de posicionamento:

> **CardLink — Seu negócio na internet em poucos minutos.**

Definição comercial:

> Crie um site profissional para apresentar seu negócio, divulgar serviços, mostrar fotos, receber contatos e compartilhar tudo por link ou QR Code.

O produto atende à necessidade de colocar uma loja, negócio ou atividade profissional na web com rapidez, sem exigir conhecimento técnico nem a contratação inicial de um site convencional complexo. O link e o QR Code são meios de divulgação e acesso ao site; não constituem o produto principal.

### 1.1. Limites do posicionamento

- O foco é divulgar o negócio, o estabelecimento ou os serviços do assinante.
- O CardLink não será promovido como cartão individual para funcionários de empresas.
- A comunicação não deve misturar cartão pessoal, folder digital e site em uma mesma promessa.
- Termos técnicos ou históricos como `card` podem permanecer no código sem orientar a comunicação comercial.
- A marca **CardLink** permanece; muda a explicação do produto.

## 2. Diferenciais estratégicos

- Site profissional publicado em poucos minutos, sem conhecimento técnico.
- Página completa para apresentar o negócio, os serviços e as formas de contato.
- WhatsApp integrado para reduzir o caminho entre interesse e atendimento.
- Link compartilhável para redes sociais, mensagens, assinatura de e-mail e materiais promocionais.
- QR Code de balcão e materiais físicos como porta de entrada para o site profissional.
- Galeria/portfólio e depoimentos para demonstrar trabalho e gerar confiança.
- Captura e gestão de contatos recebidos pelo site.
- Assistente de conteúdo com IA.
- Conteúdo comercial flexível: tabela de preços, cardápio, relação de serviços, catálogo resumido ou lista estruturada de produtos/serviços.
- Atualização pelo próprio assinante, sem depender de profissional técnico para cada alteração.
- Alternativa inicial simples e acessível a um site convencional mais complexo.

## 3. Modelo de negócio

O CardLink é **um único SaaS centralizado**. O aplicativo não é copiado para cada cliente; são comercializadas assinaturas para uso da plataforma.

Não haverá plano gratuito sem utilidade nem conta gratuita usada apenas como etapa intermediária de venda.

Fluxo comercial definido:

1. Visitante conhece o produto pela landing page e demonstrações reais.
2. Escolhe a assinatura.
3. Realiza o pagamento pela Cakto.
4. A Cakto confirma o pagamento ao cliente e envia webhook ao CardLink.
5. O CardLink registra a assinatura e cria a conta em estado **aguardando ativação**.
6. O cliente recebe um link de ativação por e-mail, define sua senha e somente então entra no painel, cria sua página e publica.
7. Enquanto a assinatura estiver ativa, o CardLink público permanece disponível.
8. Em cancelamento/inadimplência, a página pública é suspensa sem apagar imediatamente os dados do cliente.

## 4. Papéis da plataforma

### Administrador

- Conta administrativa única da plataforma.
- Não possui site CardLink.
- Não possui assinatura.
- Não entra nas métricas de assinantes.
- Gerencia usuários, assinaturas, pagamentos, mensagens/suporte e indicadores do negócio.
- Se o proprietário da plataforma quiser publicar um site para um negócio próprio, deverá usar uma segunda conta comum de cliente.

### Cliente assinante

- Conta comum vinculada a uma assinatura válida.
- Cria, edita, publica e compartilha seu site CardLink.
- Não possui acesso administrativo.


## 4.1. Contas internas de teste

Durante a fase de homologação, o CardLink poderá manter **duas contas internas de teste** para uso real pela equipe (por exemplo, proprietário e familiar/equipe).

Essas contas:

- usam exatamente os mesmos recursos de um assinante ativo;
- não passam pela Cakto;
- são marcadas como `internal_test`;
- não são contabilizadas como vendas nem assinaturas comerciais;
- não podem ser convertidas automaticamente em conta comercial por webhook;
- servem para testar uso diário, isolamento entre usuários, site público, QR Code, WhatsApp, imagens, IA e suporte.

Antes da abertura comercial, uma conta separada deverá fazer uma **compra real pela Cakto** para homologar o fluxo completo de cobrança e ativação.

## 5. Pagamentos e painel administrativo

Pagamento aprovado na Cakto deve gerar o seguinte fluxo:

**Cakto → webhook CardLink → assinatura ativa → registro no painel administrativo.**

O painel administrativo deverá mostrar, no mínimo:

- cliente;
- e-mail;
- plano;
- valor;
- status;
- data do pagamento;
- situação da assinatura;
- histórico de eventos relevantes.

O CardLink pode enviar notificação própria ao administrador sobre nova assinatura, sem depender de e-mail da Cakto.

## 6. Suporte

- Landing page: e-mail e WhatsApp para visitantes e pessoas que não conseguem entrar na conta.
- Cliente logado: canal principal “Ajuda / Fale com o suporte” dentro do painel.
- Mensagens internas devem chegar ao painel administrativo com dados úteis do cliente (identificação, e-mail, conta/plano e data/hora).

## 7. Conteúdo comercial flexível

O antigo conceito rígido de “Produtos & Serviços” não deve limitar o assinante.

A seção passa a aceitar dois formatos:

1. **Arte pronta:** upload de imagem contendo tabela de preços, cardápio, lista de serviços ou catálogo resumido criado pelo próprio usuário.
2. **Lista estruturada:** cadastro opcional de produtos/serviços individuais com nome, preço, descrição, foto e ação por WhatsApp.

O assinante escolhe o formato mais apropriado ao seu negócio. Exemplos:

- restaurante → cardápio;
- salão/barbearia → tabela de preços;
- profissional liberal → relação de serviços;
- loja → catálogo resumido;
- prestador → lista estruturada com solicitação via WhatsApp.

## 8. Consequência para vendas e marketing

A comunicação deve vender um resultado objetivo: **colocar o negócio do cliente na internet em poucos minutos**.

A landing page deve:

- usar “site profissional” como categoria principal;
- mostrar lojas, negócios locais, autônomos e prestadores de serviços;
- demonstrar serviços, fotos, avaliações, contatos, WhatsApp, link e QR Code;
- apresentar link e QR Code como meios de divulgação do site;
- evitar “cartão digital”, “cartão de visita”, “mini-site que evolui” e outras definições híbridas;
- destacar simplicidade, rapidez, autonomia e preço acessível.

Estas diretrizes serão a base para o futuro **Plano de Vendas e Marketing do CardLink**.

## Identidade e e-mail do assinante

O e-mail é o identificador de acesso do assinante e deve ser comprovado. O primeiro link de ativação, enviado após pagamento aprovado ou convite de teste interno, confirma a posse do endereço. Trocas futuras de e-mail só entram em vigor após confirmação no novo endereço; o e-mail anterior permanece válido até esse momento e recebe alertas de segurança.


## 9. Melhorias previstas

As melhorias abaixo ficam registradas para avaliação **durante a Semana 1 de testes** e implementação prioritária **após a validação operacional**, salvo se os testes mostrarem necessidade de antecipação.

### 9.1. Onboarding pós-pagamento com retorno automático da Cakto

**Objetivo:** reduzir o atrito entre pagamento e primeiro acesso sem enfraquecer a segurança.

Fluxo desejado:

1. O visitante escolhe o plano na landing page e conclui o pagamento na Cakto.
2. A Cakto redireciona o navegador para uma página de retorno do CardLink, como `/obrigado` ou `/ativar`.
3. Essa página mostra inicialmente **“Confirmando seu pagamento…”**.
4. O pagamento só é considerado válido quando o backend do CardLink recebe e valida o evento financeiro apropriado da Cakto, especialmente `purchase_approved`.
5. O redirecionamento do navegador, isoladamente, **não prova pagamento** e nunca deve liberar acesso por e-mail ou parâmetros de URL.
6. Após a confirmação segura do webhook e a vinculação da sessão de retorno à compra correta, a página poderá oferecer **“Crie sua senha para começar”**.
7. Em paralelo, o CardLink envia um e-mail de boas-vindas/backup com link seguro de ativação, para o caso de o cliente fechar a aba, trocar de dispositivo ou não concluir o primeiro acesso.

**Correção de segurança obrigatória:** a futura implementação deve verificar quais identificadores de transação/retorno a Cakto fornece oficialmente e criar um vínculo de uso único entre a compra confirmada pelo backend e a sessão de ativação. Não confiar em e-mail, preço, plano ou status recebidos apenas pela URL de retorno.

### 9.2. Confirmação do e-mail no onboarding simplificado

O fluxo mais rápido não elimina a regra de identidade já adotada pelo CardLink:

- o pagamento comprova a compra;
- a conta nasce a partir do webhook validado;
- o endereço eletrônico precisa permanecer associado a uma prova segura de posse;
- o e-mail de ativação continua existindo como mecanismo de segurança e recuperação, mesmo se o cliente puder concluir a criação de senha imediatamente após um retorno autenticado da Cakto;
- qualquer troca futura de e-mail continua exigindo confirmação no novo endereço.

Durante os testes, observar se a ativação atual exclusivamente por e-mail causa abandono, demora, confusão ou necessidade de voltar manualmente à landing page. Esses dados devem orientar a prioridade desta melhoria.

### 9.3. IA 2.0 — produtividade do assinante

Manter a IA atual durante os testes e medir utilidade real antes de ampliar. Melhorias candidatas:

- entrevista guiada para montar a apresentação do negócio;
- análise do site pronto com sugestões de melhoria;
- geração de textos de divulgação para WhatsApp e redes sociais;
- sugestão de respostas a contatos recebidos;
- interpretação assistida de tabela/cardápio, sem inventar preços;
- estudo futuro de assistente público do negócio, com respostas limitadas aos dados fornecidos pelo proprietário.

### 9.4. QR Code 2.0

Após validar o QR atual, estudar ações configuráveis por segmento, como:

- `Informações` / `Orçamento`;
- `Agendar` / `Ver valores`;
- `Fazer pedido` / `Reservar mesa`.

O QR atual deve permanecer simples na primeira fase: abrir a página profissional completa do estabelecimento/profissional. A métrica de leitura continua separada de contato efetivamente identificado, e o WhatsApp permanece como ação disponível dentro do site.

### 9.5. Apresentação do vídeo na landing page

Aprimoramento visual previsto para uma segunda rodada, sem prioridade sobre os testes funcionais. Avaliar moldura estilo navegador/notebook/monitor, poster de capa e tratamento visual que evite tela preta quando o vídeo estiver parado.

### 9.6. Critério para implementar melhorias previstas

Durante a Semana 1, registrar cada sugestão como **Erro / Incômodo / Ideia de melhoria**. Alterações não críticas devem ser agrupadas e avaliadas ao final do período. Implementar antes do fim da semana somente correções de segurança, perda de dados, bloqueio de acesso ou falha que impeça o teste real do produto.
