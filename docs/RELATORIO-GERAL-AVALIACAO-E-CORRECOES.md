# CardLink — Relatório geral de avaliação e correções

**Data da revisão:** 25 de setembro de 2026  
**Escopo:** produto, segurança, pagamentos, privacidade, operação, experiência móvel, acessibilidade, SEO e qualidade técnica.

## 1. Resumo executivo

O CardLink é um micro-SaaS com proposta comercial clara: permite que pequenos negócios publiquem uma página profissional, recebam contatos, divulguem links e usem QR Code. O projeto já possuía uma base funcional relevante, com autenticação, planos Free/Pro, integração com a Cakto, painel administrativo, upload, histórico de contatos e proteção de rotas.

A revisão corrigiu os riscos técnicos que podiam ser resolvidos no código. A nota técnica estimada passou de **6,5/10 para 8,3/10**. O produto está apto para **homologação controlada**, mas a liberação para tráfego pago e venda em escala continua condicionada aos testes externos listados neste relatório.

## 2. Correções aplicadas

### Segurança e privacidade

- Inicialização de produção agora é bloqueada quando configurações críticas estão ausentes ou inseguras.
- Códigos de recuperação de senha passaram a ser armazenados apenas como hash, nunca em texto puro.
- Uploads agora conferem a assinatura real do arquivo, além do nome e tipo declarado.
- Upload possui limite dedicado contra abuso e mantém limite de tamanho e quantidade.
- Exclusão definitiva de conta foi adicionada à área “Minha conta”, exigindo senha e confirmação textual.
- Exclusão local remove usuário, página, contatos, chamados e mensagens relacionados.
- Política de origem continua restrita ao domínio oficial e origens explicitamente configuradas.
- Auditoria automática confirmou ausência de `.env`, banco local ou chave privada no pacote exportável.

### Pagamentos Cakto

- Eventos recebidos passaram a ser persistidos para auditoria.
- Foi adicionada idempotência: o mesmo evento não é processado duas vezes.
- Eventos antigos não sobrescrevem um estado financeiro mais recente.
- Falhas de processamento são registradas e podem ser repetidas com segurança.
- Eventos de produto divergente são recusados quando o catálogo está sincronizado.
- Compra sem e-mail não cria conta incompleta.
- Webhook ganhou limite dedicado de requisições e mantém comparação segura do segredo.
- Cancelamento, reembolso e chargeback continuam rebaixando o cliente para Free sem apagar sua página.

### Dados e operação

- Contadores de visualização e leitura de QR passaram a usar atualização atômica no PostgreSQL.
- Nova migração cria o histórico de webhooks e os campos de segurança necessários.
- Endpoints separados de disponibilidade e prontidão verificam servidor, banco e configuração de e-mail.
- Foi incluído identificador por requisição nos erros e logs estruturados.
- Este runbook de produção documenta backup, restauração, monitoramento e resposta a incidentes.

### Interface, celular e acessibilidade

- A página pública ganhou menu móvel funcional, operável por teclado e fechável com Escape.
- Campos do formulário de contato agora têm rótulos associados, nomes, preenchimento automático e indicação obrigatória.
- Estados de foco visíveis foram restaurados para links, botões e campos.
- O botão flutuante de WhatsApp deixa de cobrir a área de contato quando ela está visível.
- A confirmação de envio foi marcada para leitores de tela.
- A tela de conta agora oferece exclusão definitiva dos dados.

### SEO e compartilhamento

- CSP passou a permitir corretamente as fontes do Google já usadas pela interface.
- Foi criado `robots.txt`.
- Foi criada geração dinâmica de `sitemap.xml`, incluindo somente páginas ativas.
- Páginas públicas agora recebem título, descrição, URL canônica e metadados sociais próprios.
- Quando a página possui logo ou foto, ela é usada como imagem de compartilhamento.

### Qualidade

- Foram atualizados e ampliados os testes para recuperação de senha, uploads disfarçados e exclusão de conta.
- Resultado final: **44 testes, 43 aprovados, 0 falhas e 1 ignorado**.
- O teste ignorado é a integração com um PostgreSQL real, pois não havia `TEST_PG_URL` disponível no ambiente de revisão.
- Verificação de sintaxe e auditoria de segredos concluídas sem erros.

## 3. Pontos fortes preservados

- Senhas protegidas com bcrypt.
- Sessão em cookie HttpOnly e sem JWT persistido no armazenamento do navegador.
- Consultas parametrizadas no PostgreSQL.
- Verificação de propriedade dos dados nas rotas de cliente.
- Administrador definido no banco, sem credencial administrativa fixa no navegador.
- Separação entre conta administrativa e recursos de assinante.
- CORS restrito e cabeçalhos de segurança ativos.
- Migrações versionadas.
- Plano Free mantém a página disponível após cancelamento do Pro.
- Assistente de IA é auxiliar e não altera conteúdo sem ação explícita do usuário.

## 4. Pendências externas — não podem ser concluídas somente no código

### Bloqueadoras antes de vendas em produção

1. **Homologar a Cakto de ponta a ponta** com pagamentos reais/controlados: mensal, anual, renovação, cancelamento, reembolso, chargeback, evento repetido e evento fora de ordem.
2. **Confirmar IDs e URLs reais dos produtos/ofertas CardLink** no painel Cakto e revisar o segredo do webhook.
3. **Autorizar o domínio remetente de e-mail** no provedor e testar cadastro, ativação, troca de e-mail, recuperação de senha e aviso de novo contato.
4. **Configurar PostgreSQL de produção** e executar o teste de integração com `TEST_PG_URL` em uma base descartável.
5. **Configurar backup automático**, retenção, cópia fora do provedor e executar pelo menos uma restauração completa documentada.
6. **Configurar armazenamento persistente** para uploads. Não usar disco temporário da hospedagem em produção.

### Fortemente recomendadas antes de tráfego pago

7. Integrar monitoramento externo aos endpoints `/api/health/live` e `/api/health/ready`, com alertas de indisponibilidade.
8. Centralizar logs e alertas de erros, falhas de e-mail, falhas de webhook e aumento de respostas 429/500.
9. Realizar revisão jurídica da Política de Privacidade, Termos, base legal, retenção, operador/controlador e atendimento de direitos LGPD.
10. Verificar a exclusão de arquivos remotos no armazenamento ao excluir uma conta. O código elimina os registros; a política de ciclo de vida do armazenamento precisa ser configurada externamente.
11. Fazer testes em aparelhos físicos e navegadores Safari/Chrome/Firefox.
12. Validar custos e margem dos planos R$ 12,90/mês e R$ 99/ano considerando taxas, impostos, e-mail, banco, armazenamento, IA, suporte, reembolsos e chargebacks.

## 5. Riscos remanescentes

| Risco | Nível | Situação |
|---|---:|---|
| Pagamento real ainda não homologado | Alto | Depende da Cakto e de transações controladas |
| Backup/restauração não comprovados | Alto | Depende da infraestrutura de produção |
| E-mail de produção não autorizado | Alto | Depende do provedor e DNS |
| Exclusão física de arquivos remotos | Médio | Exige rotina/política no armazenamento |
| Limites de tentativa em memória do processo | Médio | Adequado para piloto; escala pede limitador compartilhado |
| Painel administrativo sem paginação | Médio | Funciona no início; revisar antes de centenas/milhares de clientes |
| Página pública depende de JavaScript para conteúdo principal | Médio | Metadados são servidos no HTML; renderização integral no servidor seria evolução futura |
| Ausência de testes em aparelhos físicos | Médio | Cobrir durante homologação |
| Ícones de instalação somente em SVG | Baixo | Adicionar PNGs se o produto virar PWA instalável prioritário |

## 6. Avaliação por área

| Área | Nota | Comentário |
|---|---:|---|
| Proposta de valor | 8,5 | Clara para profissionais e negócios locais |
| Produto/MVP | 8,0 | Fluxo principal completo e utilizável |
| Segurança da aplicação | 8,5 | Bloqueios críticos corrigidos; manter atualização de dependências |
| Pagamentos | 7,5 | Código robustecido; falta homologação externa real |
| Privacidade/LGPD | 7,5 | Exclusão disponível; falta validação jurídica e ciclo de vida remoto |
| Experiência e acessibilidade | 8,0 | Melhorias móveis e de teclado aplicadas |
| SEO/compartilhamento | 7,5 | Base técnica corrigida; SSR completo seria evolução |
| Operação/observabilidade | 7,0 | Health checks e runbook prontos; faltam serviços externos |
| Testes | 8,0 | Boa cobertura funcional; integração PostgreSQL real pendente |
| Prontidão comercial | 7,5 | Pronto para homologação/piloto, não para escala imediata |

## 7. Recomendação de lançamento

- **Agora:** homologação interna e piloto com poucos clientes acompanhados manualmente.
- **Depois das seis pendências bloqueadoras:** vendas controladas em pequena escala.
- **Depois de monitoramento, restauração comprovada e ciclo financeiro estável:** ampliar aquisição.
- **Tráfego pago:** somente após medir cadastro, ativação, publicação, contato recebido, upgrade, cancelamento e suporte no piloto.

## 8. Critério de aceite para produção

O produto pode ser considerado pronto para venda em produção quando todos os itens abaixo estiverem registrados como aprovados:

- [ ] Compra mensal ativa a conta correta.
- [ ] Compra anual ativa a conta correta.
- [ ] Repetição do mesmo webhook não duplica efeitos.
- [ ] Evento antigo não desfaz evento mais recente.
- [ ] Renovação preserva o acesso.
- [ ] Cancelamento, reembolso e chargeback rebaixam para Free corretamente.
- [ ] Todos os e-mails transacionais chegam e não caem em spam nos principais provedores.
- [ ] Backup automático está ativo e uma restauração foi concluída.
- [ ] Uploads permanecem disponíveis após reinício/redeploy.
- [ ] Monitoramento alerta uma indisponibilidade simulada.
- [ ] Exclusão de conta e dados foi verificada em produção controlada.
- [ ] Termos e Política de Privacidade foram validados juridicamente.

## 9. Conclusão

As falhas críticas encontradas no código foram corrigidas. O pacote entregue está mais seguro, auditável e operacionalmente preparado. O risco principal restante não é uma falha de programação: é a ausência de comprovação dos serviços externos e dos procedimentos de produção. A recomendação é seguir o runbook e concluir a homologação antes de investir em aquisição em escala.
