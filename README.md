# CardLink

Aplicação de cartão de visita digital com backend em Node/Express e frontend estático.

## Como executar localmente

1. Instale dependências:
   ```bash
   npm install
   cd backend
   npm install
   cd ..
   ```
2. Inicie o servidor:
   ```bash
   npm start
   ```
3. Abra no navegador:
   ```
   http://localhost:3000
   ```

## Como compartilhar o aplicativo

- O link principal é a página profissional: `http://localhost:3000/site/<slug>`.
- O cartão compacto continua disponível em `http://localhost:3000/#card/<slug>` para visualização complementar.
- Para outras pessoas acessarem, é necessário hospedar o app em um servidor público ou usar um túnel como `ngrok`.

## Melhorias incluídas

- `/` serve o frontend e `/api` serve a API backend.
- Compartilhamento e QR code direcionam para a página profissional completa.
- Ação principal pelo WhatsApp e opção secundária para salvar o contato no celular (`.vcf`).
- O login abre uma visão geral; o menu da conta reúne Configurações, Contatos, Minha conta e Sair.
- As configurações públicas são separadas dos dados de login e organizadas por Perfil, Contato, Serviços, Imagens, Avaliações, Redes e Aparência.
- A IA é exclusiva da área autenticada, com o nome Assistente de conteúdo, e pede confirmação antes de aplicar sugestões.
- Não existe atendente de IA na página pública; o atendimento do visitante acontece pelo WhatsApp.
- Seções sem conteúdo real ficam ocultas para visitantes, evitando produtos, imagens ou depoimentos demonstrativos.
- Copiar link para área de transferência com fallback.
- Suporte a `navigator.share` em dispositivos compatíveis.

## Deploy sugerido

1. Use um serviço como Heroku, Render, Railway, Vercel (com backend separado) ou DigitalOcean App Platform.
2. O backend já roda em Node com `npm start`.
3. O `Procfile` está pronto para Heroku e o `Dockerfile` permite deploy containerizado.
4. Garanta `CORS` habilitado para o domínio de produção e configure `JWT_SECRET` via variável de ambiente.

## Docker

1. Construa a imagem:
   ```bash
   docker build -t cardlink .
   ```
2. Rode o container:
   ```bash
   docker run -p 3000:3000 --env-file .env cardlink
   ```

## Observação

- O app ainda usa `backend/db/data.json` como banco de dados local. Para produção, migrar para um banco real.
- Os uploads de imagem são salvos em `backend/uploads`.
- Recomenda-se adicionar recuperação de senha, backup de dados e HTTPS para produção.
