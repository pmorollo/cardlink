# CardLink — Relatório de correção Item 1: unificação Free/Pro

**Data:** 18/09/2026

## Objetivo

Eliminar a inconsistência em que a landing oferecia um Plano Free com página pública, mas o backend exigia Plano Pro para abrir essa página.

## Regra consolidada

### Free
- cadastro sem cartão;
- criação e edição da página;
- página pública online;
- link compartilhável;
- WhatsApp, telefone, e-mail, endereço e redes sociais;
- produtos/serviços;
- galeria com até 4 fotos;
- temas gratuitos;
- contador de visualizações.

### Pro
Inclui tudo do Free e acrescenta:
- QR Code integrado e rastreamento de scans;
- formulário público de mensagens/leads;
- painel de contatos recebidos;
- catálogo/cardápio PDF;
- galeria ampliada;
- temas premium;
- assistente de conteúdo e demais recursos identificados como Pro.

## Alterações técnicas

1. `/api/public/:slug` passou a aceitar contas Free e Pro ativas.
2. `/site/:slug` passou a aceitar contas Free e Pro ativas.
3. O payload público agora informa capacidades em `features` e remove conteúdo premium da projeção Free.
4. O formulário `/api/public/:slug/contact` continua exclusivo do Pro e retorna `403 pro_required` para Free.
5. A consulta de contatos do proprietário passou a exigir `requirePro`.
6. O resumo do dashboard não expõe contatos nem scans de QR para Free.
7. A interface Free não mostra formulário de leads na página pública.
8. A interface Free não abre QR integrado nem painel de mensagens; direciona ao upgrade Pro.
9. Cancelamento, estorno ou chargeback do Pro rebaixa a conta para Free, preservando a página pública e o link.
10. Landing, comparação de planos, manual, Termos e documentação oficial foram atualizados para o mesmo modelo.

## Validação realizada

- Sintaxe verificada com `node --check` em todos os arquivos JavaScript de backend e frontend: **OK**.
- Verificação estática das 10 regras centrais Free/Pro: **10/10 OK**.
- A suíte `npm test` foi iniciada; os testes do serviço Cakto passaram (4/4) e o teste PostgreSQL foi ignorado por ausência de `TEST_PG_URL`.
- A execução integral dos testes de e-mail e smoke não pôde ser concluída neste ambiente porque a instalação `npm ci` foi interrompida e deixou dependências (`nodemailer` e `bcryptjs`) ausentes. Isso é uma limitação do ambiente de validação, não uma falha funcional detectada no patch.

## Arquivos sensíveis

O pacote de entrega gerado nesta correção exclui deliberadamente:
- `backend/.env`;
- `backend/db/data.json`;
- `node_modules`.

Esses arquivos não são necessários para revisar/aplicar o código e não devem circular em pacote de entrega.
