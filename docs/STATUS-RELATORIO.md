# CardLink — Relatório de Status do Projeto

**Data do relatório:** 15/08/2026
**Ambiente analisado:** Produção (Railway) + repositório local

---

## 1. Visão Geral

O CardLink é um cartão de visita digital que se transforma em um mini-site de vendas profissional, compartilhável por um único link. O produto passou por uma grande revisão recente, migrando para um **modelo de plano único pago (PRO)** com integração de pagamentos via **Cakto**.

- **Frente (frontend):** `frontend/` — SPA estática (HTML/CSS/JS puro)
- **Backend:** `backend/` — Node.js + Express, arquitetura com repositório tipado async
- **Banco:** PostgreSQL na produção (Railway), com fallback local JSON em dev
- **Hospedagem:** Railway — `https://cardlink-production-abd2.up.railway.app/`

---

## 2. Status de Produção (verificado ao vivo)

| Item | Status | Evidência |
|---|---|---|
| Página principal (`/`) | ☑ Online | HTTP 200, ~81 KB |
| Vídeo promocional (`promo.mp4`) | ☑ Online | HTTP 200, 3,3 MB |
| Mockup (`mockup.jpg`) | ☑ Online | HTTP 200, 716 KB |
| Frontend com últimas correções | ☑ Atualizado | `toggleAuthForm` corrigido, `handlePricingCta` presente |
| Endpoint `/api/diag` | ☑ Funciona | `node_env: production`, `postgres_ativo: true` |
| Webhook Cakto | ☑ Protegido | Rejeita requisição sem secret (401) |
| Banco PostgreSQL | ☑ Ativo | `postgres_ativo: true` |
| Links de checkout Cakto | ☑ Ativos | Mensal e Anual respondem HTTP 200 |

**Último commit em produção:** `46d1c9a` — fix `toggleAuthForm`, confirmado servido ao vivo.

---

## 3. Funcionalidades Implementadas

### Landing Page
- Hero com vídeo demonstrativo (video player HTML5 nativo)
- Mockup de celular + vídeo lado a lado
- Seção de preço com **cards Mensal (R$ 12,90/mês) e Anual (R$ 99,00/ano, 36% OFF)** clicáveis
- Como Funciona (3 passos), Quem Somos, FAQ (Perguntas Frequentes)
- CTA unificado no topo e no fim da página levando ao registro → checkout
- Manual do usuário (modal) acessível no footer/navbar
- Badge hero atualizado: "A partir de R$ 12,90/mês"

### Autenticação
- Registro com nome/e-mail/senha + aceite de termos
- Seleção de **plano Mensal vs Anual** no formulário de registro (botão dinâmico)
- Login com fallback automático se o e-mail já estiver cadastrado
- Recuperação de senha por código (fluxo em 2 etapas)
- Rate limiting de autenticação

### Plano / Pagamento
- Modelo de **plano único pago (PRO)** — conta nasce `free` até pagar
- **Webhook Cakto**: ativa PRO no `purchase_approved` / `subscription_created` / `subscription_renewed`; cancela no `subscription_canceled` / `refund` / `chargeback`
- Bloqueio de painel para não assinantes (tela de ativação com modal de pagamento)
- Modal de pagamento PRO (painel) com escolha **Mensal/Anual** e botão dinâmico
- Links reais da Cakto: monthly `kawb7xd_1032085` / anual `3fjp83k_1032077`
- `CAKTO_SECRET` configurado em produção (webhook autenticado)

### Painel de Criação (PRO)
- Editor de cartão por seções: Perfil, Contato, Serviços, Imagens, Avaliações, Redes, Aparência
- Foto pessoal e logo separados
- Tema do cartão, vitrine de produtos/serviços, galeria, depoimentos
- **Assistente de conteúdo com IA** (sugestões com confirmação antes de aplicar)
- QR Code de balcão, métricas, mensagens/contatos recebidos
- Admin: gerenciamento de usuários e chamados de suporte

### Infraestrutura
- Service worker com Network-First (código fresco) — cache atualizado
- PWA instalável (manifest.json)
- Uploads locais com opção Cloudflare R2

---

## 4. Pendências e Pontos de Atenção

### 🟠 Médias (recomendado resolver)
1. **`/api/diag` é temporário** — expõe metadados de ambiente. **Remover em produção** após validações (`server.js:90`).
2. **Logs de diagnóstico em produção** — `server.js:22-25` imprimem detalhes das variáveis. Limpar após estabilização.
3. **`landing.html` obsoleto** — existe um arquivo antigo ainda servido (HTTP 200) que pode confundir. Avaliar remover ou redirecionar para `/`.
4. **Dockerfile ausente** — mencionado no README mas não existe no repositório.
5. **Suite de testes fica pendurada** — o `npm test` trava no final (envio real de e-mail SMTP). Investigar timeout/`after()`.

### 🟡 Baixas / manutenção
6. **Controle de cache do frontend** — `app.js?v=30` não foi incrementado a cada commit recente; em caso de cache do navegador, revisar `?v=`.
7. **README desatualizado** — fala de plano "free com draft", mas o modelo atual é plano único PRO pago. Atualizar.
8. **`README_AI_SKILLS.md`** — verificar se está coerente com o fluxo atual.
9. **Uploads locais voláteis** — em deploy efêmero, fotos somem; para persistência real é recomendado configurar **R2** (chaves não encontradas no diag — verificar se há `R2_*` setadas).
10. **Dados atuais** — o usuário dono (`pedro.morollo@...`) foi verificado como conta `free` após não completar o pagamento de teste. Ao efetivar pagamento, o webhook ativa PRO automaticamente.

---

## 5. Configurações de Ambiente (Produção)

Confirmadas via `/api/diag` (somente presença, nada de conteúdo):

| Variável | Status |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Presente |
| `ADMIN_EMAILS` | `pedro.morollo@gmail.com` (recomenda-se adicionar `.yahoo.com` também, conforme config.js) |
| `DATABASE_URL` | Presente (PostgreSQL ativo) |
| `CAKTO_SECRET` | Presente (57 chars) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `PORT` | 3000 |

⚠️ **Atenção:** o diag reporta `admin_emails: "pedro.morollo@gmail.com"`, mas `config.js` tem fallback com as versões `.yahoo.com` e `.yahoo.com.br`. Verificar se o Railway variável `ADMIN_EMAILS` contém todos os e-mails do dono.

---

## 6. Planos e Próximos Passos Sugeridos

### Imediato (hoje)
- [ ] Confirmar pagamento real de teste (Cakto) para validar webhook de ativação PRO de ponta a ponta
- [ ] Validar com sucesso em produção os fluxos: registro → checkout mensal e anual

### Curto prazo (esta semana)
- [ ] Remover `/api/diag` e logs de diagnóstico temporários
- [ ] Atualizar README + `README_AI_SKILLS.md` para o modelo PRO
- [ ] Decidir destino de `landing.html` (remover ou redirecionar)
- [ ] Revisar `ADMIN_EMAILS` no Railway (garantir e-mails .yahoo.com inclusos)

### Médio prazo
- [ ] Configurar Cloudflare R2 para persistência de uploads
- [ ] Criar Dockerfile (mencionado no README)
- [ ] Corrigir suite de testes para não "pendurar" (mock de SMTP no final)
- [ ] Incrementar/automatizar versão de cache (`?v=N`) dos assets estáticos
- [ ] Configurar true SMTP de entrega do código de recuperação de senha (hoje depende de console em dev)

---

## 7. Registro de Mudanças Recentes (últimos commits)

| Commit | O que fez |
|---|---|
| `46d1c9a` | **FIX crítico:** `toggleAuthForm` usava variável inexistente `formType`, quebrando todos os botões de CTA (não levavam ao checkout) |
| `1114070` | Expor opções Mensal/Anual na landing, FAQ e modal de pagamento PRO |
| `9ce61a6` | Remover botão CTA duplicado e unificar rótulo final |
| `1f4baa4` | Integração real da Cakto (webhook com secret no corpo, eventos, links `pay.cakto.com.br`) |
| `fe0c6e2` | Pré-preencher e-mail ao alternar para formulário de recuperação |
| `71b1b58` | Fallback automático de login e aviso claro para e-mail já cadastrado |
| `a0b65a9` / `4c2bdd2` | Seleção de plano Mensal vs Anual com botão dinâmico (36% OFF) |
| `4874493` | Landing simplificada: CTA único → criação de conta → checkout Cakto |
| `f8da072` | Remoção do modo rascunho e bloqueio de painel para não assinantes |
| `d5229e2` | Manual do usuário no frontend/footer/navbar |
| `57f97c6` / `1a21237` | Embed do vídeo promocional real (com narração) + mockup refinado |

---

## 8. Testes

- Suite principal local: **passou** nos cenários críticos (SPA servida, não exposição de `.env`, CORS, admin por e-mail, recuperação de senha, webhook Cakto ativa/cancela PRO).
- **Observação:** o `npm test` ficou pendurado ao final por envio real de e-mail (SMTP). Ver item 5 das pendências.

---

*Relatório gerado automaticamente a partir do repositório e da inspeção ao vivo de produção.*