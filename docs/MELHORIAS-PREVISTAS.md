# CardLink — Melhorias Previstas

**Atualizado em:** 16/08/2026

Este documento reúne melhorias aprovadas conceitualmente, mas que não devem desviar a Semana 1 do objetivo principal: testar o produto em uso real.

## Prioridade após/durante os testes

### 1. Onboarding pós-pagamento Cakto
- Não exigir cadastro prévio.
- Após o checkout, redirecionar para uma página de retorno do CardLink.
- Mostrar “Confirmando seu pagamento…” enquanto o backend aguarda/consulta o estado criado pelo webhook.
- Nunca liberar conta apenas porque o navegador voltou da Cakto.
- Liberar criação de senha somente após confirmação segura de `purchase_approved` vinculada à compra correta.
- Enviar e-mail de boas-vindas/ativação como backup para quem fechar a página ou trocar de dispositivo.
- Confirmar previamente na documentação oficial da Cakto quais identificadores de retorno/transação estão disponíveis para o vínculo seguro.

### 2. IA 2.0
- Montagem guiada do CardLink.
- Revisão do cartão pronto.
- Textos para divulgação.
- Sugestão de respostas.
- Leitura assistida de tabela/cardápio sem inventar preços.
- Estudo futuro de assistente público baseado apenas em dados fornecidos pelo assinante.

### 3. QR Code 2.0
- Manter na primeira fase o direcionamento para a página profissional completa; nela o visitante escolhe o WhatsApp ou outro meio de contato.
- Estudar depois duas ações configuráveis por segmento.
- Preservar métricas separadas de QR escaneado e contato identificado.

### 4. Vídeo da landing
- Segunda melhoria visual com moldura/poster e acabamento mais criativo.
- Sem prioridade sobre a validação funcional da Semana 1.

## Regra de execução
Durante a Semana 1, melhorias não críticas devem ser anotadas e agrupadas. Alterar imediatamente apenas o que envolver segurança, perda de dados, bloqueio de acesso ou impossibilidade de concluir o roteiro de testes.
