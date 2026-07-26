# Segurança

- Tokens Mercado Pago e segredo de webhook são exclusivos do backend e ficam fora do Git.
- JWT protege rotas de cliente e administrador; mudança administrativa de status exige administrador.
- CORS usa origens explícitas e Helmet aplica cabeçalhos de proteção.
- Criação de pedido usa `X-Idempotency-Key`, transação e bloqueio de variação.
- Webhook moderno valida assinatura; todos os formatos consultam o pagamento oficial antes de alterar pedido.
- Eventos, pedido e estoque são bloqueados transacionalmente para evitar duplicidade.
- Upload permitido é somente de imagem de produto; MIME, extensão e magic bytes são validados.

Não há upload, armazenamento ou leitura de comprovante de pagamento. Não exponha Access Token, Webhook Secret, senha de banco ou JWT em logs, documentação ou frontend.
