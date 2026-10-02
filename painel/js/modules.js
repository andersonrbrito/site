/**
 * Registro de módulos do painel. Para adicionar um: crie js/views/<id>.js, uma linha aqui e, se tiver dados,
 * uma migration em supabase/migrations com RLS usando app_private.can('<permission>').
 * enabled:false mantém o módulo planejado fora da navegação até ter função real.
 */
export const MODULES = [
  { id: "dashboard", label: "Painel", route: "", permission: "tarefas", enabled: true, primary: true, ownerOnly: false },
  { id: "hoje", label: "Hoje", route: "hoje", permission: "tarefas", enabled: true, primary: true },
  { id: "tarefas", label: "Tarefas", route: "tarefas", permission: "tarefas", enabled: true, primary: true },
  { id: "projetos", label: "Projetos", route: "projetos", permission: "projetos", enabled: true },
  { id: "inbox", label: "Inbox", route: "inbox", permission: "tarefas", enabled: true, primary: true },
  { id: "agenda", label: "Agenda", route: "agenda", permission: "agenda", enabled: true },
  { id: "historico", label: "Histórico", route: "historico", permission: "historico", enabled: true, ownerOnly: true },
  { id: "config", label: "Configurações", route: "config", permission: "config", enabled: true, ownerOnly: true },
  { id: "financeiro", label: "Financeiro", route: "financeiro", permission: "financeiro", enabled: false },
  { id: "clientes", label: "Clientes", route: "clientes", permission: "clientes", enabled: false },
  { id: "casa", label: "Casa / Mudança", route: "casa", permission: "casa", enabled: false },
  { id: "carro", label: "Carro", route: "carro", permission: "carro", enabled: false },
  { id: "viagens", label: "Viagens", route: "viagens", permission: "viagens", enabled: false },
  { id: "conteudo", label: "Ideias de conteúdo", route: "conteudo", permission: "conteudo", enabled: false },
];
export const visibleModules = (member) => MODULES.filter((m) => m.enabled && (m.ownerOnly ? member.role === "owner" : member.role === "owner" || member.modules.includes(m.permission)));
