# CardLink — Programa de Testes Operacionais — Semana 1

## Ponto de situação — 21/08/2026

### Concluído e validado em produção
- Endereço oficial mantido em `https://cardlink-production-abd2.up.railway.app/`.
- PR nº 4 integrado e publicado; o atalho de tela inicial agora aponta para o cartão público.
- Conta interna de teste ativada, senha definida e primeiro acesso realizado.
- Logout e novo login pela landing page confirmados; o antigo link de ativação salvo no Safari foi identificado e descartado.
- Fluxo **Esqueceu a senha?** aprovado com recebimento do código, redefinição e novo acesso.
- Primeiro cartão criado e página pública validada em `/site/pedro-morollo-junior`.
- Foto do usuário e logotipo reenviados e carregando corretamente na página pública.
- Criado o volume persistente `cardlink-volume` no serviço `cardlink`, montado em `/app/backend/uploads`.
- Executado redeploy controlado após os uploads; foto e logotipo permaneceram disponíveis no novo container.
- Persistência de uploads considerada aprovada para o ambiente atual de uma réplica.
- Fluxo Visitante → Lojista validado: a mensagem enviada pela página pública apareceu no painel do CardLink e o aviso foi recebido no e-mail do proprietário.
- A ação de resposta pelo painel abriu o e-mail para responder diretamente ao endereço informado pelo visitante.
- QR Code de balcão testado com outro celular: abriu corretamente a página pública completa do cartão. Novo destino considerado aprovado.
- Conta administrativa de produção regularizada em 22/08/2026: a conta antiga foi vinculada a `pedro.morollo@gmail.com` e marcada como administradora, permanecendo separada da conta lojista de teste.
- Fluxo Administrador → Usuário validado em 22/08/2026: a mensagem enviada pelo administrador apareceu no painel de `pedro.morollo@yahoo.com`, foi aberta e marcada como lida, e o aviso também chegou ao e-mail Yahoo.

### Pendências imediatas do Dia 1
1. Até o encerramento da rodada, testar Visitante → Lojista preenchendo somente WhatsApp como meio de retorno; confirmar registro no painel e abertura da resposta para o número correto.

### Decisão validada durante o teste do QR
- O direcionamento original para WhatsApp funcionou conforme previsto.
- Por decisão de produto, o QR de balcão passa a abrir a página pública completa do estabelecimento/profissional.
- A alteração foi publicada e confirmada na prática com outro celular: o QR abriu corretamente a página pública completa.
- A contagem de escaneamentos permanece separada de visualizações e contatos.
- O botão de WhatsApp continua disponível dentro do cartão público.

### Melhoria futura de infraestrutura
- O volume do CardLink ainda não possui backup automático.
- A Railway informa que Backups/PITR exigem o plano Pro; não foi feito upgrade nem criada cobrança adicional.
- Reavaliar backup automático antes da abertura comercial ou adotar cópia externa controlada.

### Domínio comercial planejado — executar somente por fases
- Domínio disponível do proprietário: `digitalnexoapp.com`, atualmente na HostGator.
- Primeira etapa aprovada: redirecionamento 302 temporário para `abd2`, sem alterar Cakto, Resend ou configurações internas.
- Etapa posterior: avaliar `cardlink.digitalnexoapp.com` como domínio direto na Railway somente após concluir os testes atuais.
- O roteiro completo, critérios de parada, retorno e homologação estão registrados em `docs/MELHORIAS-PREVISTAS.md`.
- Não iniciar a mudança de domínio junto com outra correção, commit ou deploy; tratar cada fase como etapa curta independente.

## Ponto de retomada — 17/08/2026

### Concluído nesta sessão
- Backup integral do projeto preservado.
- Endereço oficial confirmado: `https://cardlink-production-abd2.up.railway.app/`.
- Correções da Semana 1 organizadas na branch `agent/semana1-conta-teste`.
- PR nº 2 aberto em modo rascunho, sem merge e sem deploy.
- Arquivo obrigatório `backend/middleware/roles.js` recuperado e registrado localmente no commit `297650e`.
- Etapa 2.1 concluída: servidor local iniciou, página inicial respondeu HTTP 200 e rota de API inexistente respondeu HTTP 404.
- Servidor de teste encerrado; produção e Railway não foram alteradas.

### Retomada de amanhã
Continuar gradualmente, parando após cada etapa:

1. **Etapa 2.2 — Login e isolamento entre usuários.**
2. **Etapa 2.3 — Cartões, contatos, uploads, IA e mensagens.**
3. **Etapa 2.4 — Criação local/controlada da conta interna PRO sem cobrança.**
4. **Etapa 2.5 — Envio e validação do e-mail de ativação.**
5. Atualizar o PR nº 2 somente após as verificações locais.
6. Revisar novamente antes de qualquer merge ou deploy na Railway.

### Dados já confirmados
- E-mail da futura conta interna de teste: `pedro.morollo@yahoo.com`.
- A conta deverá ser PRO, marcada como teste interno e excluída das métricas comerciais.
- Não criar a conta em produção antes de concluir as etapas 2.2 a 2.5 e validar o deploy correto.

### Observação técnica registrada
- `multer@1.4.5-lts.2` apresentou aviso de segurança/depreciação. Avaliar atualização controlada para Multer 2 em etapa própria, sem misturar com os testes do Dia 1.

## Objetivo
Validar o CardLink como usuário real durante sete dias, sem incluir novos usuários externos nesta primeira semana. Registrar qualquer comportamento confuso, erro, lentidão ou etapa desnecessária antes de ampliar os testes.

## Regra da semana
- Usar uma conta interna de teste com os mesmos recursos de um assinante ativo.
- Não usar pagamento real da Cakto nesta semana.
- Não alterar o produto durante o dia de teste, salvo erro crítico. Anotar primeiro; corrigir em lote depois.
- Testar principalmente pelo celular, repetindo os pontos importantes no computador.

## Dia 1 — Acesso, segurança e conta
1. Receber o e-mail de ativação da conta interna.
2. Abrir o link, definir a senha e confirmar o primeiro acesso.
3. Sair da conta e entrar novamente pela landing page usando **Entrar na conta**.
4. Testar **Esqueci minha senha** e redefinir a senha pelo código recebido por e-mail.
5. Entrar novamente com a senha nova.
6. No painel administrativo, enviar uma mensagem de teste ao usuário.
7. Entrar como usuário, confirmar que a mensagem apareceu e marcá-la como lida.

**Observar:** clareza do fluxo, e-mails recebidos, tempo entre as etapas, textos confusos e dificuldade para localizar o login.

## Dia 2 — Construção da página
1. Preencher nome, negócio, função e apresentação.
2. Inserir foto do usuário e logo/foto do negócio.
3. Inserir telefone, WhatsApp, e-mail e endereço.
4. Configurar redes sociais.
5. Escolher um tema.
6. Salvar e abrir a página pública.
7. Voltar ao painel e alterar pelo menos três informações; confirmar que a página pública foi atualizada.

**Observar:** facilidade de edição, qualidade da visualização, campos desnecessários ou ausentes e comportamento no celular.

## Dia 3 — Conteúdo comercial, tabela/cardápio e imagens
1. Preparar uma imagem simples de tabela de preços ou serviços.
2. Fazer upload em **Tabela / Cardápio**.
3. Alterar o título da seção.
4. Testar também a modalidade de lista de serviços, apenas para comparar.
5. Inserir fotos na galeria.
6. Inserir pelo menos dois depoimentos/avaliações.
7. Verificar toda a página pública no celular e no computador.

**Observar:** legibilidade da tabela, tamanho das imagens, velocidade, cortes e facilidade para substituir arquivos.

## Dia 4 — WhatsApp, QR Code e contatos
1. Abrir o QR Code de balcão no painel. **Validado.**
2. Escanear usando outro aparelho/câmera, se possível. **Validado com outro celular.**
3. Confirmar que o cartão público do estabelecimento/profissional abre. **Validado em 21/08/2026.**
4. Usar o botão de WhatsApp disponível dentro do cartão.
5. Confirmar que o painel registra **QR escaneado**, mas não cria um contato falso.
6. Abrir a página pública e usar **Salvar contato**; confirmar a criação do contato no telefone.
7. Copiar o link público do CardLink e adicioná-lo ao campo de site/perfil do WhatsApp Business, se estiver usando Business.
8. Confirmar que o QR direciona sempre para a página completa e que os meios de contato permanecem disponíveis nela.

**Observar:** quantidade de toques, clareza do destino do QR e se o visitante entende imediatamente o que fazer.

## Dia 5 — Página pública, mensagens e suporte
1. Abrir o CardLink em janela anônima ou outro navegador, simulando um visitante.
2. Enviar uma mensagem pelo formulário público. **Validado por e-mail em 21/08/2026.**
3. Confirmar que ela aparece em **Mensagens recebidas** no painel do usuário. **Validado.**
4. Testar os atalhos de resposta por WhatsApp/e-mail quando houver dados do visitante. **Resposta por e-mail validada. Resposta por WhatsApp ainda pendente.**
5. Como usuário, abrir **Central de Ajuda & Suporte** e enviar um chamado.
6. Como administrador, verificar se o chamado aparece no painel.
7. Como administrador, enviar uma nova mensagem interna ao usuário. **Validado em 22/08/2026.**
8. Como usuário, confirmar o recebimento no painel e no e-mail, se SMTP estiver ativo. **Validado; mensagem também marcada como lida.**

**Observar:** diferença clara entre mensagem de visitante, suporte do usuário e mensagem administrativa.

## Dia 6 — IA e produtividade
1. Usar **Gerar sugestões de conteúdo** para sua atividade real.
2. Testar **Melhorar descrição com IA**.
3. Testar **Melhorar mensagem com IA**.
4. Comparar o texto original com a sugestão antes de aplicar.
5. Confirmar que a IA não altera dados ou preços sem sua decisão.
6. Editar novamente a página após usar a IA e verificar o resultado público.

**Observar:** se a IA economiza tempo, se as sugestões parecem genéricas e quais tarefas você gostaria que ela executasse na versão 2.

## Dia 7 — Uso real, PWA e revisão geral
1. Fixar o CardLink na tela inicial do celular.
2. Abrir pelo ícone e usar a página como faria no dia a dia.
3. Voltar ao painel e alterar uma foto e um texto.
4. Sair da conta; confirmar que o cartão público continua funcionando.
5. Entrar novamente pela landing page.
6. Conferir métricas: visualizações, QR escaneados e mensagens recebidas.
7. Navegar por toda a landing page e anotar qualquer botão, texto ou seção que pareça desnecessário.
8. Fazer uma lista final em três grupos: **erro**, **incômodo**, **ideia de melhoria**.

## Registro de cada ocorrência
Para cada problema, anotar:
- Data e hora aproximada.
- Celular/computador e navegador utilizado.
- O que estava tentando fazer.
- O que aconteceu.
- O que esperava que acontecesse.
- Screenshot, quando útil.
- Classificação: Erro / Incômodo / Ideia.

## Melhorias previstas a observar durante os testes

Estas melhorias **não fazem parte do escopo obrigatório da Semana 1**, mas devem ser observadas para decidir prioridade após os testes:

- **Onboarding pós-Cakto:** medir se o fluxo atual `pagamento → e-mail de ativação → senha → login` é claro e rápido. Anotar qualquer sensação de quebra de fluxo ou demora. A melhoria prevista é retornar automaticamente da Cakto ao CardLink, confirmar o pagamento exclusivamente pelo backend/webhook e permitir a criação de senha em uma sessão de retorno segura, mantendo e-mail de backup.
- **IA 2.0:** anotar tarefas em que a IA realmente pouparia tempo, especialmente montagem/revisão do cartão, divulgação e respostas a contatos.
- **QR 2.0:** observar se a mensagem simples é suficiente ou se opções configuráveis por negócio fariam diferença.
- **Compartilhamento do cartão:** manter **Copiar link** e avaliar **Compartilhar link** como ação principal no celular, usando o menu nativo do aparelho e mantendo a cópia como alternativa.
- **Vídeo da landing:** avaliar apresentação visual e necessidade de moldura/poster mais refinados na segunda rodada.

## Critério para avançar à Semana 2
Avançar para o segundo usuário interno somente se:
- login, logout e recuperação de senha funcionarem;
- e-mail de ativação funcionar;
- cartão puder ser criado, editado e compartilhado;
- QR e WhatsApp funcionarem consistentemente;
- uploads estiverem estáveis;
- suporte e mensagens administrativas estiverem operacionais;
- não houver erro crítico ou risco de mistura de dados.
