-- Anderson OS · migration 0034 · o bucket anderson-os-arquivos passa a aceitar vídeo (AprovaçõeS_) e arquivos até 500 MB.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    update storage.buckets
       set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','video/quicktime','video/webm','audio/mpeg','audio/wav','text/plain'],
           file_size_limit = 524288000
     where id = 'anderson-os-arquivos';
  end if;
end $$;
