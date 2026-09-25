# CardLink — Checklist de homologação externa

Preencha responsável, data, evidência e resultado para cada item.

## Infraestrutura

- [ ] Variáveis de produção configuradas sem valores de exemplo.
- [ ] PostgreSQL persistente conectado.
- [ ] Migrações aplicadas sem erro.
- [ ] Upload persistente no R2 validado após reinício.
- [ ] `/api/health/live` monitorado.
- [ ] `/api/health/ready` monitorado.
- [ ] Backup diário configurado.
- [ ] Restauração integral comprovada.

## Cakto

- [ ] Produto mensal e ID confirmados.
- [ ] Produto/oferta anual e ID confirmados.
- [ ] URL e segredo do webhook confirmados.
- [ ] Compra mensal aprovada.
- [ ] Compra anual aprovada.
- [ ] Renovação processada.
- [ ] Duplicata ignorada.
- [ ] Evento antigo ignorado.
- [ ] Cancelamento rebaixa para Free.
- [ ] Reembolso rebaixa para Free.
- [ ] Chargeback rebaixa para Free.
- [ ] Página permanece ativa após rebaixamento.

## E-mail

- [ ] Domínio remetente autorizado.
- [ ] SPF, DKIM e DMARC conferidos.
- [ ] Cadastro Free confirmado.
- [ ] Ativação de comprador recebida.
- [ ] Recuperação de senha recebida.
- [ ] Troca de e-mail confirmada.
- [ ] Aviso de contato recebido.

## Privacidade e jurídico

- [ ] Política de Privacidade revisada.
- [ ] Termos de Uso revisados.
- [ ] Responsáveis e canal LGPD definidos.
- [ ] Exclusão da conta testada.
- [ ] Exclusão/expiração dos arquivos remotos definida.
- [ ] Retenção dos backups documentada.

## Produto

- [ ] Cadastro, login e saída testados em celular real.
- [ ] Criação e edição da página testadas.
- [ ] Página pública e compartilhamento testados.
- [ ] Formulário de contato testado.
- [ ] QR Code impresso e lido em dois aparelhos.
- [ ] Safari, Chrome e Firefox testados.
- [ ] Custos e margem dos planos revisados.
- [ ] Canal e prazo de suporte definidos.
