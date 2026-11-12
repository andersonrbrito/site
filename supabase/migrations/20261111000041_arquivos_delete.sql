-- Libera espaço: o dono pode apagar arquivos do bucket (AprovaçõeS_ apaga a mídia de peças publicadas/reprovadas).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute $p$drop policy if exists aos_arq_del on storage.objects$p$;
    execute $p$create policy aos_arq_del on storage.objects for delete to authenticated using (bucket_id = 'anderson-os-arquivos' and app_private.is_owner())$p$;
  end if;
end $$;
