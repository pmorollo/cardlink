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

- O link público do cartão local é `http://localhost:3000/#card/<slug>`.
- Para outras pessoas acessarem, é necessário hospedar o app em um servidor público ou usar um túnel como `ngrok`.

## Melhorias incluídas

- `/` serve o frontend e `/api` serve a API backend.
- Tela pública de cartão com QR code e botões de compartilhamento.
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
