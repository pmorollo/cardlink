# CardLink — Modelo Free/Pro consolidado

> **SUPERSEDIDO em 13/10/2026.** O modelo vigente é a versão única gratuita com todos os recursos liberados; o plano Pro permanece apenas como selo visual (3 estrelinhas), sem gating funcional. Ver `docs/DECISAO-MODELO-UNICO-2026-10-13.md`. Este documento fica mantido como registro histórico.

**Data:** 18/09/2026

Este documento registra a regra funcional vigente após a unificação do modelo Free/Pro.

## Free

- Cadastro gratuito sem cartão.
- Criar e editar uma página CardLink.
- Página pública online.
- Link público compartilhável.
- WhatsApp, telefone, e-mail, endereço e redes sociais.
- Produtos/serviços.
- Até 4 fotos na galeria.
- Temas gratuitos.
- Visualizações da página.

## Pro

Inclui tudo do Free e libera:

- QR Code integrado e rastreamento de scans.
- Formulário público de mensagens/leads.
- Painel de contatos recebidos.
- Catálogo/cardápio PDF.
- Galeria ampliada até 10 fotos.
- Temas premium.
- Assistente de conteúdo e demais recursos identificados como Pro.

## Downgrade

Cancelamento, estorno ou chargeback do Pro rebaixa a conta para Free. A página pública e o link continuam online. Os recursos premium deixam de ser exibidos ou acessíveis enquanto a conta estiver no Free.

## Regra de backend

`hasActiveCustomerAccess(user)` aceita Free e Pro ativos. `isProCustomer(user)` é usado somente para recursos premium. Rotas públicas de página não devem exigir Pro; rotas de leads/contatos e recursos premium devem exigir Pro.
