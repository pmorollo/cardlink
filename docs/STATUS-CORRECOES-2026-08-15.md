# CardLink — Status das Correções

Data: 15/08/2026

Este documento registra o primeiro lote de correções estruturais aplicado ao CardLink antes da fase de testes operacionais pessoais.

## Arquitetura de acesso definida

### Administrador
- Existe uma única conta administrativa.
- Não possui cartão CardLink.
- Não possui assinatura.
- Não é contabilizada como cliente ou venda.
- Acessa apenas funções administrativas e de segurança da própria conta.

### Cliente comercial
- Não existe cadastro gratuito público.
- A conta nasce após confirmação de pagamento pela Cakto.
- `purchase_approved` cria/ativa a assinatura e, para novo cliente, cria conta em `pending_activation`.
- O cliente recebe link por e-mail e define sua senha antes do primeiro acesso.
- `subscription_renewed` mantém a assinatura ativa.
- `subscription_created` isoladamente não libera acesso, mesmo que venha acompanhado de um status genérico de aprovação.
- Cancelamento, reembolso ou chargeback suspendem imediatamente o acesso de cliente e o cartão público, preservando os dados.
- Se um cliente cancelar antes de concluir a ativação e comprar novamente, um novo link de ativação é emitido.

### Contas internas de teste
- Podem existir contas comuns marcadas como `internal_test`.
- Têm os mesmos recursos de um assinante ativo.
- Não dependem da Cakto.
- Não são contabilizadas como vendas ou assinaturas comerciais.
- Webhooks da Cakto não convertem automaticamente essas contas em clientes comerciais.

Comando para criar uma conta interna de teste:

```bash
npm run test-user:create -- email@exemplo.com SenhaCom8+ "Nome do usuário"
```

Para o piloto interno previsto, criar duas contas: uma para o proprietário e outra para a equipe/família responsável pelo segundo teste.

## Administração

Comando para criar/configurar a conta administrativa única:

```bash
npm run admin:set -- admin@exemplo.com SenhaCom8+ "Administrador"
```

O comando rejeita promoção de cliente comercial, conta de teste ou usuário que já possua cartão.

## Segurança já corrigida

- Removida promoção automática a administrador por endereço de e-mail.
- Removidos logs que exibiam o `CAKTO_SECRET`.
- Removido log do payload integral do webhook.
- `/api/diag` removido.
- `CAKTO_SECRET` atual foi preservado; rotação fica para a homologação/abertura comercial.
- Teste PostgreSQL destrutivo exige `TEST_PG_URL` explícita.
- Upload exige extensão e MIME compatíveis.
- Autorização de cliente é revalidada no backend; token antigo não mantém acesso após cancelamento.

## Pagamentos e painel administrativo

- Cakto é a fonte de verdade para assinaturas comerciais.
- Assinatura Cakto comercial não pode ser ativada/desativada manualmente pelo painel.
- Venda aprovada é registrada no painel administrativo.
- Conta interna de teste é identificada separadamente e excluída das métricas comerciais.
- O administrador pode receber notificação de nova assinatura aprovada sem depender do e-mail de venda da Cakto.

## Produto

- CardLink é tratado como presença profissional modular, não apenas cartão digital.
- Landing page é vitrine, página de venda e portal de entrada para assinantes existentes.
- Painel é a área privada de gestão do cliente.
- CardLink público é o produto compartilhável.
- A seção de serviços evoluiu para `Tabela / Cardápio`, aceitando arte pronta ou lista estruturada.

## Validação local deste estágio

- 16 testes identificados.
- 15 aprovados.
- 0 falhas.
- 1 teste PostgreSQL ignorado porque `TEST_PG_URL` não foi configurada, por segurança.

## Ainda não realizado

- Não houve deploy destas correções na Railway.
- Não houve rotação do `CAKTO_SECRET`.
- Ainda falta homologação real com compra PIX pela Cakto.
- Ainda faltam novas rodadas graduais de auditoria e correções, incluindo os demais pontos de segurança/qualidade já identificados.

## Verificação de e-mail — 15/08/2026

### Regra oficial
- Nenhuma conta de cliente pode usar um e-mail que não tenha sido comprovado.
- A primeira ativação enviada após pagamento Cakto (ou criação de teste interno) também é a prova de posse do e-mail.
- A ativação grava `email_verified_at` e só então libera login de cliente.
- Contas internas de teste seguem a mesma verificação; o bypass é apenas da cobrança, nunca da segurança.

### Troca de e-mail
- Alterar o e-mail exige a senha atual.
- O novo endereço fica em `pending_email` e não substitui o e-mail atual imediatamente.
- O CardLink envia um link de confirmação ao novo endereço, válido por 60 minutos.
- O endereço antigo recebe aviso da solicitação e continua válido até a confirmação.
- Após confirmação, o novo e-mail vira o login oficial e o endereço antigo recebe aviso da conclusão.
- Tokens de verificação são armazenados apenas como hash SHA-256.

### Campos adicionados
- `email_verified_at`
- `pending_email`
- `email_verification_token_hash`
- `email_verification_expires`

### Testes
- Conta ativa sem e-mail confirmado: login bloqueado.
- Troca de e-mail sem senha: bloqueada.
- Novo e-mail antes da confirmação: não funciona como login.
- E-mail antigo antes da confirmação: continua funcionando.
- Novo e-mail após confirmação: funciona como login.
- Conta interna de teste: também exige ativação/confirmacão.

## Landing page — hierarquia de entrada e compra

- Compra mantida em dois pontos: `Assinar CardLink` no topo para visitantes já decididos e `Quero meu CardLink` no CTA final.
- Hero não vende diretamente: conduz para `Ver demonstração` e `Conhecer recursos`.
- `Entrar na conta` foi separado visualmente da ação comercial e permanece no topo como portal do assinante.
- Cartões de preço no corpo da landing ficaram apenas informativos; não iniciam checkout ao clicar.
- Seção de preços foi movida para perto do final, depois do conteúdo explicativo e FAQ, imediatamente antes do CTA final.
- Manual interno atualizado para o fluxo vigente: assinatura Cakto -> e-mail de ativação -> definição de senha -> login.

## Preparação para testes operacionais — Semana 1
- Criada caixa de mensagens Administrador → Usuário no painel.
- Mensagem administrativa fica armazenada por usuário, com controle de leitura e isolamento entre contas.
- QR de balcão abre a página pública completa do estabelecimento/profissional; o WhatsApp permanece disponível dentro do cartão.
- QR scan passou a ser métrica separada de contatos; leitura do QR não cria contato anônimo.
- Criado `docs/PLANO-TESTE-SEMANA-1.md`.
- Smoke tests locais: 20 aprovados, 0 falhas. PostgreSQL destrutivo continua condicionado a TEST_PG_URL específica.


## Melhorias previstas registradas — 16/08/2026

- Onboarding pós-pagamento com retorno automático da Cakto para o CardLink, sem cadastro prévio.
- Retorno deverá aguardar confirmação real do backend via webhook; a URL de retorno não poderá, sozinha, liberar conta ou senha.
- Após confirmação segura, estudar criação de senha na própria página de retorno para reduzir atrito.
- E-mail de ativação/boas-vindas permanece como backup e mecanismo de segurança/recuperação.
- Antes de implementar, verificar na documentação oficial da Cakto quais identificadores e parâmetros de retorno podem ser usados para vincular com segurança navegador e compra confirmada.
- Durante a Semana 1, medir clareza, tempo e atrito do fluxo atual por e-mail; implementar a melhoria após os testes, salvo necessidade operacional identificada antes.
- Mantidas como melhorias posteriores: IA 2.0, QR configurável por objetivo e apresentação visual mais refinada do vídeo da landing.
