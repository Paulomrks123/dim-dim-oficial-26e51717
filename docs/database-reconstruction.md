# Reconstrução da estrutura financeira

A estrutura anterior ao histórico de migrações foi registrada em
`drizzle/migrations/0000_preserve_financial_schema_baseline.sql`.

Ela contém as três tabelas financeiras, valores padrão, doze restrições,
índices, cinco políticas de acesso por proprietário e as duas funções existentes,
incluindo suas permissões de execução. A aplicação no banco atual não altera
registros; a reconstrução cria tabelas vazias. Não é um backup dos dados.

## Pré-requisitos e limites

- Destino Lovable Cloud com autenticação gerenciada e os papéis `anon`,
  `authenticated` e `service_role` já disponíveis.
- Aplicar pelo fluxo de migrações gerenciado do Lovable; não editar o histórico
  ou seus arquivos de metadados manualmente.
- Não recria usuários, sessões, segredos, configurações de login ou agendamentos.
- Não inclui registros financeiros, PINs ou credenciais. Dados precisam de um
  procedimento de restauração separado.
- `IF NOT EXISTS` permite aplicar sobre a estrutura atual; não corrige uma tabela
  parcialmente criada ou divergente. Mudanças posteriores exigem nova migração.
- Não concede acesso anônimo às tabelas novas. No banco existente, permissões
  antigas permanecem inalteradas e as políticas continuam bloqueando anônimos.

## Conferência isolada

Com PostgreSQL local disponível, execute `bash scripts/test-db-baseline.sh`.
O teste cria um banco temporário sem conexão com a nuvem, simula apenas os
pré-requisitos gerenciados, aplica a estrutura duas vezes e verifica reconstrução,
isolamento de contas, bloqueio de PIN em texto puro e salvamento por revisão.
Os dados sintéticos e o banco temporário são descartados ao terminar.