# CardLink — Melhorias Previstas

**Atualizado em:** 26/08/2026

Este documento reúne melhorias aprovadas conceitualmente, mas que não devem desviar a Semana 1 do objetivo principal: testar o produto em uso real.

## Prioridade após/durante os testes

### 0. Reposicionamento comercial: site profissional

**Decisão de 25/08/2026:** o CardLink será apresentado como **site profissional para divulgar pequenos negócios e serviços**, e não como cartão digital, cartão de visita ou solução híbrida.

Promessa central:

> **Seu negócio na internet em poucos minutos.**

Ajustes previstos, sempre em etapas curtas:

1. Revisar toda a linguagem visível da landing page.
2. Trocar definições comerciais de “cartão digital” por “site profissional”.
3. Revisar rótulos do painel como “Meu cartão”, mantendo nomes técnicos internos quando a troca não trouxer benefício ao usuário.
4. Atualizar demonstrações, manual, vídeo e materiais comerciais.
5. Confirmar que link e QR Code aparecem como meios de divulgação do site.
6. Testar a nova comunicação com exemplos de lojas, negócios locais, profissionais liberais e prestadores de serviços.
7. Não alterar nesta etapa a operação já validada, a estrutura do banco, Cakto, Resend, Railway, URLs públicas ou QR Code.

**Critério de conclusão:** um visitante deve compreender imediatamente que está contratando um site para divulgar seu negócio, sem interpretar o produto como cartão corporativo para funcionários.


#### 0.1. Clareza do menu de configuração e visibilidade das seções

Ao mapear e revisar os textos do painel, cada campo deverá comunicar três informações:

1. **O que deve ser preenchido.**
2. **Onde o conteúdo aparecerá no site público.**
3. **Em que condição a seção ficará visível.**

Diretrizes aprovadas:

- Substituir rótulos centrados na conta, como **“Nome do usuário”**, por rótulos centrados no resultado público.
- Para o título principal, usar **“Nome do negócio ou profissional”**, preservando tanto estabelecimentos quanto profissionais que trabalham com o próprio nome.
- Exibir abaixo desse campo a orientação: **“Este será o nome principal em destaque no topo do seu site.”**
- Revisar os demais grupos para que seus nomes correspondam às seções públicas, como **Apresentação do negócio**, **Sobre o negócio**, **Serviços / Produtos**, **Tabela / Cardápio**, **Galeria de fotos**, **Avaliações de clientes**, **Contato e WhatsApp**, **Redes sociais** e **Aparência do site**.
- Incluir ajuda curta nos campos relevantes, por exemplo: **“Este texto aparecerá na seção ‘Sobre o negócio’ do seu site.”**
- Alterar inicialmente apenas rótulos e textos de orientação. Manter os nomes técnicos e campos do banco quando isso evitar migração e não prejudicar a experiência.

Regra de visibilidade pública:

- Uma seção opcional só deverá aparecer quando possuir conteúdo válido cadastrado.
- Se **Serviços / Produtos** ou **Tabela / Cardápio** estiverem sem itens e sem imagem válida, a seção inteira não deverá aparecer.
- Itens vazios ou incompletos não deverão gerar blocos públicos.
- Ao salvar o primeiro conteúdo válido, a seção deverá aparecer automaticamente.
- Ao remover todo o conteúdo, a seção deverá desaparecer novamente.
- A mesma regra deverá ser verificada em galeria, avaliações, redes sociais, endereço e demais contatos opcionais.
- O painel deverá informar: **“Esta seção só aparecerá no seu site quando houver algum conteúdo cadastrado. Você poderá alterar ou remover as informações quando quiser.”**

Antes de implementar, mapear cada campo atual do painel para sua seção pública e apresentar a relação para aprovação. Depois da implementação, testar criação, alteração e remoção do conteúdo, confirmando o aparecimento e o desaparecimento automático de cada seção.


### 1. Onboarding pós-pagamento Cakto
- Não exigir cadastro prévio.
- Após o checkout, redirecionar para uma página de retorno do CardLink.
- Mostrar “Confirmando seu pagamento…” enquanto o backend aguarda/consulta o estado criado pelo webhook.
- Nunca liberar conta apenas porque o navegador voltou da Cakto.
- Liberar criação de senha somente após confirmação segura de `purchase_approved` vinculada à compra correta.
- Enviar e-mail de boas-vindas/ativação como backup para quem fechar a página ou trocar de dispositivo.
- Confirmar previamente na documentação oficial da Cakto quais identificadores de retorno/transação estão disponíveis para o vínculo seguro.

### 2. IA 2.0
- Montagem guiada do site do negócio.
- Revisão do site pronto.
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

### 5. Compartilhamento do link público
- Manter **Copiar link**, que já foi validado e está funcionando corretamente.
- Acrescentar **Compartilhar link** como ação principal no celular, abrindo o menu nativo para WhatsApp, mensagens, e-mail e outros aplicativos.
- Em navegadores sem compartilhamento nativo, usar **Copiar link** como alternativa segura.
- Implementar em uma correção curta após concluir a validação do novo destino do QR Code.

### 6. Domínio comercial `digitalnexoapp.com`

Objetivo: introduzir um endereço comercial próprio sem interromper o CardLink, a Cakto, o Resend ou o endereço técnico atual.

#### Fase A — Preparação e segurança
1. Concluir as correções e os testes operacionais em andamento.
2. Registrar ou exportar os DNS atuais da HostGator antes de qualquer alteração.
3. Manter `https://cardlink-production-abd2.up.railway.app/` ativo durante todo o processo como endereço técnico e alternativa de retorno.
4. Não alterar `CAKTO_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, webhook ou remetente nesta fase.

**Parar e revisar** se houver registro DNS existente com o mesmo nome ou qualquer dúvida sobre o domínio selecionado.

#### Fase B — Redirecionamento inicial sem mudança interna
1. Criar na HostGator um redirecionamento **302 temporário** de `digitalnexoapp.com` para o endereço `abd2`.
2. Habilitar o comportamento esperado com e sem `www`, sem usar iframe ou redirecionamento mascarado.
3. Testar em janela anônima e em celular.
4. Confirmar landing page, login, página pública e retorno ao painel.

Nesta fase:
- o navegador poderá passar a mostrar o endereço `abd2` após o redirecionamento;
- o webhook da Cakto continuará no endereço `abd2`;
- o Resend e os links enviados por e-mail continuarão inalterados;
- QR Codes e links públicos atuais continuarão válidos.

**Critério para avançar:** redirecionamento estável e nenhum impacto nos fluxos atuais. Se houver falha, remover somente o redirecionamento 302 e continuar usando `abd2`.

#### Fase C — Domínio direto após os testes
1. Adicionar `cardlink.digitalnexoapp.com` como domínio personalizado no serviço `cardlink` da Railway, sem remover `abd2`.
2. Copiar os registros `CNAME` e `TXT` fornecidos pela Railway.
3. Adicionar esses registros exatamente na zona DNS da HostGator e aguardar a verificação e o HTTPS.
4. Acrescentar `https://cardlink.digitalnexoapp.com` a `CORS_ORIGIN`, preservando as origens já existentes.
5. Definir `PUBLIC_APP_URL=https://cardlink.digitalnexoapp.com` somente depois de o domínio e o certificado estarem validados.
6. Fazer redeploy controlado e parar para verificação.

**Não alterar ainda:** URL do webhook da Cakto, `CAKTO_SECRET`, `RESEND_API_KEY` ou domínio remetente do Resend.

#### Fase D — Homologação do domínio direto
Testar, nesta ordem e com pausa entre os blocos:
1. Landing page, login, logout e recuperação de senha.
2. E-mail de ativação e abertura do link pelo novo domínio.
3. Página pública, fotos, uploads, copiar/compartilhar link e fixação na tela inicial.
4. QR Code, mensagem por e-mail, mensagem por WhatsApp e Administrador → Usuário.
5. Um pagamento controlado na Cakto, confirmando webhook, criação/ativação da conta e registro administrativo.

O webhook da Cakto poderá permanecer tecnicamente em `abd2`. Só avaliar sua troca para o domínio próprio depois de toda a homologação, mantendo o mesmo segredo e testando um evento assinado. A verificação de `digitalnexoapp.com` como domínio remetente no Resend será uma melhoria separada e opcional.

#### Fase E — Definição comercial
1. Após aprovação completa, decidir se `digitalnexoapp.com` redirecionará para `cardlink.digitalnexoapp.com` com código 301 permanente.
2. Atualizar materiais comerciais e novos QR Codes gradualmente.
3. Manter `abd2` funcional como endereço técnico enquanto for útil e não houver motivo operacional para removê-lo.

## Regra de execução
Durante a Semana 1, melhorias não críticas devem ser anotadas e agrupadas. Alterar imediatamente apenas o que envolver segurança, perda de dados, bloqueio de acesso ou impossibilidade de concluir o roteiro de testes.
