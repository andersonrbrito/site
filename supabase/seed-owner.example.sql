-- Rode UMA vez no SQL Editor, ANTES do primeiro login. Troque pelo e-mail da sua conta Google.
insert into public.allowed_emails (email, role) values ('seu-email@gmail.com', 'owner')
on conflict (email) do nothing;

-- Futuro (Vanessa, acesso parcial): módulos liberados por nome de permissão
-- insert into public.allowed_emails (email, role, modules) values ('email-dela@gmail.com', 'member', '{tarefas,agenda}');
-- Se o usuário já tiver feito login antes de ser listado, ajuste também public.app_members.
