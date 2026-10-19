-- Anderson OS · migration 0005 · armazenamento privado das mídias do Postador
-- Só roda onde existe o schema storage (Supabase). Arquivos ficam em postador-media/<post_id>/<arquivo>.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('postador-media', 'postador-media', false, 536870912,
            array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime'])
    on conflict (id) do nothing;

    execute $p$create policy postador_media_sel on storage.objects for select to authenticated
      using (bucket_id = 'postador-media' and app_private.can('postador'))$p$;
    execute $p$create policy postador_media_ins on storage.objects for insert to authenticated
      with check (bucket_id = 'postador-media' and app_private.can('postador'))$p$;
    execute $p$create policy postador_media_upd on storage.objects for update to authenticated
      using (bucket_id = 'postador-media' and app_private.can('postador'))$p$;
  end if;
end $$;
