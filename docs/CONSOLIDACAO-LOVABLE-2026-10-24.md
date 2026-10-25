# Consolidação Link & Go → CardLink

Implementação em branch, ainda não implantada. Todos os recursos permanecem gratuitos; Selo PRO permanece visual. Nenhuma oferta Cakto alterada.

## Mudanças

- Layout independente de cor em frontend e API; trocar nome mantém slug/links/QR existentes.
- Editor com estado salvo/pendente, aviso antes de sair, prévia móvel em diálogo e exportação JSON do conteúdo.
- Até 20 documentos PDF nomeados e reordenáveis, com upload existente e validação de URL no servidor; migração 006 adiciona documents JSONB e whatsapp_message. Arquivo removido da lista não é apagado do armazenamento automaticamente.
- Mensagem WhatsApp personalizada; documentos aparecem na prévia e página pública.
- QR PNG 1024px pelo próprio servidor, com PUBLIC_APP_URL canônico; link /site/:slug/qr preservado.
- Próximos passos de preenchimento no dashboard.
- Cadastro rápido não atribui e-mail confirmado sem prova. A sessão inicial continua; confirmar posse usando código do fluxo Recuperar senha. A definição de senha sozinha não confirma e-mail.
- Runner de testes usa reporter TAP explícito para consolidar contagens corretamente no Node 24.

## Validação

57 testes aprovados e uma integração PostgreSQL ignorada, antes da última revisão da URL canônica; executar novamente na revisão final. Inclui edição/cor, documentos, isolamento, URL estável, QR e recuperação. IA, selo, pagamentos e permissões existentes continuam cobertos pelos testes anteriores; não houve transação paga.

## Publicação

Aplicar migração 006 pelo mecanismo existente de migrations no deploy. Confirmar backup PostgreSQL e uploads, PUBLIC_APP_URL, e-mail real de recuperação, validação em Android/iPhone, PDFs e QR em página anônima. Não remover Link & Go antes de verificar acervo/dados/Supabase Storage/dependências. Este commit não exporta o banco do Lovable.

## Evoluções que permanecem abertas

Funil por campanha, gestão/exportação de leads, políticas de retenção/órfãos, backup conjunto e restauração em PostgreSQL real, medições de custo/desempenho e homologação móvel. Não estão declarados concluídos por estes testes.
