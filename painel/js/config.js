// Valores PÚBLICOS por definição (a segurança dos dados está no RLS + login Google + allowlist do Supabase).
// NUNCA coloque aqui a service_role key nem qualquer segredo: este repositório é público.
export const CONFIG = {
  supabaseUrl: "",       // ex.: https://xxxx.supabase.co
  publishableKey: "",    // chave "publishable"/"anon" do Supabase
};
