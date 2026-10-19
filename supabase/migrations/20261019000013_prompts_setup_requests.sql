-- Anderson OS · migration 0013 · Prompts, Meu setup, pedidos ao Claude (insights do Instagram) e relatório do Instagram

alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('insights','desempenho','instagram'));

-- Prompts: links de sites de prompts e prompts próprios
create table public.prompts (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'prompt' check (kind in ('link','prompt')),
  title       text not null check (length(trim(title)) > 0),
  url         text check (url is null or url ~* '^https?://'),
  body        text,
  tags        text not null default '',
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);

-- Meu setup: equipamentos atuais e sugestões de upgrade
create table public.setup_items (
  id          uuid primary key default gen_random_uuid(),
  section     text not null check (section in ('principal','pc','upgrade')),
  category    text not null,
  name        text not null check (length(trim(name)) > 0),
  note        text,
  url         text check (url is null or url ~* '^https?://'),
  price       text,
  position    int not null default 0,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);

-- Pedidos de tarefa pro Claude (a rotina de hora em hora atende)
create table public.claude_requests (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('ig_insights')),
  status      text not null default 'aberto' check (status in ('aberto','gerando','feito','cancelado')),
  result_note text,
  done_at     timestamptz,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);

do $$ declare t text; m text; begin
  foreach t in array array['prompts','setup_items','claude_requests'] loop
    m := case t when 'prompts' then 'prompts' when 'setup_items' then 'setup' else 'desempenho' end;
    execute format('create trigger trg_stamp before insert on public.%I for each row execute function app_private.stamp_origin()', t);
    execute format('create trigger trg_before_update before update on public.%I for each row execute function app_private.before_update()', t);
    execute format('create trigger trg_log after insert or update on public.%I for each row execute function app_private.log_change()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (app_private.can(%L))', t||'_sel', t, m);
    execute format('create policy %I on public.%I for insert to authenticated with check (app_private.can(%L))', t||'_ins', t, m);
    execute format('create policy %I on public.%I for update to authenticated using (app_private.can(%L)) with check (app_private.can(%L))', t||'_upd', t, m, m);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

insert into public.setup_items (section, category, name, position) values
  ('principal','Notebook','MacBook Air M4 · 16 GB RAM · 256 GB',1),
  ('principal','Armazenamento','SSD portátil SanDisk 1 TB',2),
  ('principal','Armazenamento','Pen drive USB 128 GB',3),
  ('principal','Celular','iPhone 15 Pro Max 512 GB',4),
  ('principal','Headset','Havit Gamenote Fuxi H4 (BT, 2.4 GHz, USB-C, branco)',5),
  ('pc','Placa-mãe','Aorus Gigabyte B450 Elite V2',1),
  ('pc','Processador','AMD Ryzen 5 1600AF (OC)',2),
  ('pc','Placa de vídeo','AMD RX 570 8 GB MSI (OC)',3),
  ('pc','Memória','Team Group T-Force Delta RGB 2x8 GB (16 GB) DDR4 2666 MHz',4),
  ('pc','Water cooler','Deepcool Gammaxx L120T',5),
  ('pc','Fonte','AeroCool KCAS 500W 80 Plus Bronze',6),
  ('pc','Gabinete','Pichau Gadit',7),
  ('pc','Armazenamento','SSD Crucial P1 M.2 NVMe 500 GB',8),
  ('pc','Armazenamento','SSD Lexar 250 GB',9),
  ('pc','Armazenamento','SSD Kingston 1 TB',10),
  ('pc','Armazenamento','HD Western Digital 500 GB',11),
  ('pc','Armazenamento','HD Western Digital 1 TB',12),
  ('pc','Monitor','AOC Agon AG323FCXE 31,5" VA curvo 165 Hz',13),
  ('pc','Teclado','Warrior Rainbow ABNT2 TC208',14),
  ('pc','Mouse','Corsair M55 RGB Pro',15),
  ('pc','Headset','Haiz M09 Super Bass 7.1',16),
  ('pc','Soundbar','Redragon GS550 Orpheus 2.1',17),
  ('pc','Webcam','Canon EOS 6D com 35mm f/2.0',18),
  ('pc','Controle','GameSir T4 Pro sem fio',19),
  ('pc','Controle','Logitech F710 sem fio',20);

insert into public.setup_items (section, category, name, note, url, price, position) values
  ('upgrade','MacBook (2027)','MacBook Pro 14" ou 16" M5 Max, 48 GB+ de RAM, 2 TB','Pra rodar várias IAs ao mesmo tempo, o que pesa é a memória unificada: 48 GB é o mínimo confortável e 64 GB+ se quiser modelos locais grandes. 2 TB resolve o armazenamento. Fique de olho em promoção: em jul/2026 o 16" M5 Max 48 GB/2 TB saiu por R$ 39.999 na Amazon (tabela R$ 53.999+). Se sair M6 Pro/Max em 2027, esperar pode valer.', 'https://www.apple.com/br/macbook-pro/', 'R$ 40 a 54 mil',1),
  ('upgrade','PC · placa de vídeo','GeForce RTX 5070 Ti 16 GB (ou RTX 5080)','GTA 6 de PC ainda não tem requisitos oficiais. As estimativas giram em torno de RTX 4070/3080 com 16 GB de VRAM pra jogar no alto. Uma 5070 Ti 16 GB dá folga pra 1440p no seu monitor de 165 Hz, com DLSS 4. A 5080 é pra ultra.', null, null,2),
  ('upgrade','PC · plataforma','Ryzen 7 9800X3D + placa-mãe B650/X870 (AM5) + 32 GB DDR5 6000','Seu Ryzen 5 1600AF e a B450 seguram a placa nova. O 9800X3D é o melhor processador pra jogo hoje, e o AM5 ainda recebe processadores novos. Com isso, troca placa-mãe, processador e memória de uma vez.', null, null,3),
  ('upgrade','PC · fonte','Fonte 850W 80 Plus Gold ATX 3.1 (conector 12V-2x6)','A KCAS 500W não aguenta uma RTX 50. Precisa de fonte Gold de 850W com o conector novo da NVIDIA.', null, null,4),
  ('upgrade','PC · armazenamento','SSD NVMe Gen4 2 TB pro sistema e os jogos','GTA 6 deve passar de 150 GB. Junte os SSDs SATA pequenos num só NVMe de 2 TB e deixe os HDs só pra backup.', null, null,5),
  ('upgrade','PC · gabinete e cooler','Gabinete com bom fluxo de ar e air cooler ou water de 240mm','Placas de vídeo novas são grandes (30 cm+). Confira o espaço no Pichau Gadit antes de comprar.', null, null,6);
