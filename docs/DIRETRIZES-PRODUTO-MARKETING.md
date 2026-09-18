# CardLink — Diretrizes Oficiais de Produto e Marketing

**Atualizado em:** 18/09/2026

Este documento registra decisões estruturais do CardLink que devem orientar desenvolvimento, vendas, comunicação e marketing.

## 1. O que o CardLink é

O CardLink é o **site profissional para colocar o seu negócio na internet em poucos minutos**. Ele não deve ser apresentado comercialmente como cartão de visita digital, mini-site híbrido ou produto que começa como cartão e depois se transforma em site.

Proposta central de posicionamento:

> **Tudo o que seu cliente precisa ver antes de chamar você.**

Definição comercial:

> Reúna serviços, fotos, avaliações, localização, Instagram, Facebook e WhatsApp em uma apresentação profissional. Compartilhe por um único link ou QR Code.

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
- Conteúdo comercial flexível: tabela de preços, cardápio, relação de serviços, catálogo resumido ou lista estruturada de produtos/serviços.
- Atualização pelo próprio assinante, sem depender de profissional técnico para cada alteração.
- Alternativa inicial simples e acessível a um site convencional mais complexo.

## 3. Modelo de negócio

O CardLink é **um único SaaS centralizado** com dois níveis de uso: **Free** e **Pro**. O aplicativo não é copiado para cada cliente.

### Plano Free — base funcional permanente

O usuário pode criar uma conta gratuitamente, sem cartão de crédito, e utilizar o núcleo do produto:

- criar e editar sua página profissional;
- manter a página pública online;
- compartilhar o link público;
- exibir WhatsApp, telefone, e-mail, endereço e redes sociais;
- publicar produtos/serviços e até 4 fotos na galeria;
- usar os temas gratuitos disponíveis.

O Free **não inclui** captura de leads pelo formulário CardLink, painel de mensagens recebidas, QR Code integrado/rastreado, catálogo PDF, galeria ampliada, temas premium nem outros recursos identificados como Pro.

### Plano Pro — R$ 12,90/mês ou plano anual vigente

O Pro inclui tudo do Free e libera, entre outros recursos premium:

- QR Code integrado com rastreamento;
- formulário público de mensagens/leads e painel de contatos;
- catálogo/cardápio em PDF;
- galeria ampliada;
- temas premium;
- assistente de conteúdo e demais funcionalidades identificadas como Pro.

Fluxo comercial definido:

1. Visitante pode criar conta Free diretamente na landing page.
2. O usuário cria, edita, publica e compartilha seu CardLink pelo link público.
3. Quando desejar recursos premium, escolhe o Pro e realiza o pagamento pela Cakto.
4. A Cakto confirma o pagamento e envia webhook ao CardLink.
5. O CardLink promove a conta existente para Pro ou cria a conta Pro quando a compra ocorrer antes do cadastro.
6. Enquanto o pagamento Pro estiver válido, os recursos premium ficam liberados.
7. Em cancelamento, estorno ou chargeback do Pro, a conta **volta para o Free**; a página pública e o link permanecem ativos, enquanto os recursos premium são desabilitados.

## 4. Papéis da plataforma

### Administrador

- Conta administrativa única da plataforma.
- Não possui site CardLink.
- Não possui assinatura.
- Não entra nas métricas de assinantes.
- Gerencia usuários, assinaturas, pagamentos, mensagens/suporte e indicadores do negócio.
- Se o proprietário da plataforma quiser publicar um site para um negócio próprio, deverá usar uma segunda conta comum de cliente.

### Cliente Free ou Pro

- Conta comum de usuário, sem acesso administrativo.
- No Free, cria, edita, publica e compartilha a página pelo link público.
- No Pro, mantém os recursos do Free e recebe as funcionalidades premium contratadas.
- Cancelar o Pro não apaga nem derruba a página: a conta retorna ao Free.


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

A comunicação deve vender um resultado objetivo: **organizar em uma apresentação profissional tudo o que o cliente precisa ver antes de entrar em contato**, reduzindo o caminho entre descoberta, avaliação e conversa pelo WhatsApp ou outro canal.

A landing page deve:

- usar “site profissional” como categoria principal;
- mostrar lojas, negócios locais, autônomos e prestadores de serviços;
- demonstrar serviços, fotos, avaliações, contatos, WhatsApp, link e QR Code;
- apresentar link e QR Code como meios de divulgação do site;
- evitar “cartão digital”, “cartão de visita”, “mini-site que evolui” e outras definições híbridas;
- destacar simplicidade, rapidez, autonomia e preço acessível.

### 8.1. Referência obrigatória do Plano Mestre

O **PLANO MESTRE DE OFERTAS E PUBLICIDADE** é um documento geral e transversal, não um plano específico do CardLink. Ele orienta a elaboração e a revisão dos documentos comerciais deste projeto. Na auditoria final antes da comercialização, oferta, posicionamento, percepção de valor, preço, diferenciais, criativos, funil e capacidade de conversão do CardLink deverão ser confrontados com as premissas do Plano Mestre.

O planejamento próprio do CardLink permanece como documento operacional do projeto; não é necessário criar um plano comercial paralelo apenas para repetir essas decisões.

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

### 9.5. Carrossel demonstrativo na landing page

Remover completamente o vídeo atual da landing page e substituí-lo por um carrossel leve com 4 ou 5 imagens demonstrativas.

Diretrizes:

- usar mockups ou telas que mostrem aplicações reais do CardLink;
- representar diferentes tipos de negócio e também profissionais que divulgam seus próprios serviços;
- demonstrar, ao longo das imagens, apresentação, serviços/produtos, galeria, avaliações, WhatsApp, link, QR Code e facilidade de edição;
- usar textos curtos, pois as imagens devem ser autoexplicativas;
- oferecer setas, indicadores e navegação por toque;
- permitir avanço automático lento, com pausa durante a interação;
- priorizar carregamento rápido, acessibilidade e funcionamento no celular;
- aprovar as imagens antes da implementação.

O carrossel deverá reforçar a definição **“CardLink — Seu negócio na internet em poucos minutos”** e não poderá voltar a apresentar o produto como cartão digital.

### 9.6. Critério para implementar melhorias previstas

Durante a Semana 1, registrar cada sugestão como **Erro / Incômodo / Ideia de melhoria**. Alterações não críticas devem ser agrupadas e avaliadas ao final do período. Implementar antes do fim da semana somente correções de segurança, perda de dados, bloqueio de acesso ou falha que impeça o teste real do produto.
