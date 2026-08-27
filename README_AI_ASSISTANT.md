# CardLink — Assistente de conteúdo

O Assistente de conteúdo é uma ferramenta textual exclusiva da área autenticada do assinante PRO. Não utiliza skills ou perfis de tom nesta versão.

## Funcionamento

1. O usuário descreve o texto que precisa ou cola um texto existente.
2. O backend envia a solicitação ao modelo configurado na NVIDIA.
3. A resposta aparece em uma área separada e somente para leitura.
4. O usuário pode copiar a resposta e colá-la manualmente em qualquer campo.
5. O Assistente nunca altera, substitui ou salva conteúdo do site.

## Controles

- Endpoint: `POST /api/ai/generate` com `{ "request": "..." }`.
- Limite de 2.500 caracteres por solicitação e resposta.
- Timeout configurável por `AI_TIMEOUT_MS` (15 segundos por padrão).
- Limite por usuário configurável por `AI_REQUESTS_PER_HOUR` (30 por hora por padrão).
- Sem modelo básico alternativo: indisponibilidade externa retorna erro claro e preserva a solicitação no painel.
- Nenhum preço, promoção, certificação, resultado, depoimento ou fato específico deve ser inventado.
- Registros operacionais contêm usuário, fonte e duração, nunca o texto digitado.
