# Raiz CRM

CRM de vendas em português para uma equipe pequena, com painel financeiro, pipeline e prospecção local no Riacho Fundo II.

O CRM começa sem valores de venda preenchidos. Use **Definir valor** em uma oportunidade ou em um alvo local para inserir a estimativa manualmente; novas oportunidades aparecem na aba **Salvamentos**. As tabelas de negócios incluem atalhos de telefone e WhatsApp, prioridade e data de próximo contato. Remover um item de **Salvamentos** não exclui sua oportunidade; é possível salvá-la de novo pelo pipeline.

## Executar

```bash
pnpm install
pnpm dev
```

Sem configuração do Supabase, o app abre em modo demonstração e guarda alterações no armazenamento local do navegador. Isso serve para experimentar a interface; cada navegador terá seus próprios dados.

## Conectar a equipe

1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor. Se o projeto Supabase já estiver conectado, execute novamente para adicionar os campos de prioridade, próximo contato e estado de salvamento.
3. Convide cada integrante por Authentication > Users. O app não cria contas por cadastro público; o login envia link para e-mails já convidados.
4. Copie `.env.example` para `.env.local` e informe a URL e a chave pública (anon/publishable) do projeto.
5. Configure o endereço local/de produção na lista de URLs permitidas em Authentication > URL Configuration. Para produção, adicione também o domínio da Vercel.
6. Reinicie `pnpm dev`.

Deploy na Vercel: importe este projeto, adicione as mesmas variáveis de ambiente e faça o deploy. O schema aplica RLS para que somente usuários autenticados acessem os dados compartilhados da equipe.

## Publicar pelo GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica o app após cada envio para `main`:

1. Crie um repositório GitHub. Para GitHub Pages gratuito, deixe o repositório público; repositórios privados podem depender do plano da conta.
2. Em **Settings > Pages**, selecione **GitHub Actions** como fonte de publicação.
3. Em **Settings > Secrets and variables > Actions**, crie a variável `NEXT_PUBLIC_SUPABASE_URL` e o segredo `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sem essas configurações o CRM abre em modo demonstração e os dados ficam no navegador de cada pessoa.
4. Envie o código para a branch `main`. Acompanhe a publicação na aba **Actions**; o workflow mostrará o endereço do site ao terminar.
5. No Supabase, permita a URL publicada em **Authentication > URL Configuration** e aplique o schema em `supabase/schema.sql`.

O GitHub Pages hospeda uma exportação estática do Next.js. O login e os dados compartilhados continuam sendo atendidos pelo Supabase.

## Dados locais

Os contatos iniciais são registros de diretórios públicos com telefone e endereço publicados. A data de conferência registrada é 23/10/2026; os números precisam ser confirmados antes do contato pois podem mudar. Para editar ou incluir alvos, use a aba **Prospecção local**.
