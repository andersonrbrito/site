# Changelog

## 0.3.0
- Painel migrado para o repositório do site (`painel/`), páginas estáticas em JavaScript puro, sem servidor; mesmo domínio.
- Mantidos: schema/RLS/histórico (migrations), design no padrão do site, paleta de comandos, Kanban com arrastar e soltar, desfazer, linha do tempo.
- Teste local com Supabase falso; testes de banco e unitários em `painel/dev`.
- Correção: formulários liam o FormData depois de desabilitar os campos.
