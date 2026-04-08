# 🚀 Guia de Publicação — andersonbrito.com

## Plataforma recomendada: FRAMER

### Por que Framer?

| Funcionalidade              | Framer       | Wix (atual)  | Webflow       |
|-----------------------------|--------------|--------------|---------------|
| Editor visual (Figma-like)  | ✅ Excelente | ✅ Bom       | ✅ Avançado   |
| Trocar imagem/logo fácil    | ✅ 2 cliques | ✅ 2 cliques | ✅ 3 cliques  |
| Embed de vídeo (YT/Vimeo)   | ✅ Nativo    | ✅ Nativo    | ✅ Nativo     |
| CMS para portfolio          | ✅ Integrado | ⚠️ App externo| ✅ Integrado |
| Conectar domínio próprio    | ✅ Simples   | ✅ Já tem    | ✅ Simples    |
| Qualidade de design         | ⭐⭐⭐⭐⭐   | ⭐⭐⭐       | ⭐⭐⭐⭐⭐   |
| Facilidade para não-dev     | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐     | ⭐⭐⭐        |
| Preço (plano com domínio)   | ~$15/mês     | Já pago      | ~$16/mês      |

**Framer é o ponto certo entre design profissional e facilidade de uso.**

---

## Opção A — Framer (RECOMENDADO)

### 1. Criar conta
1. Acesse [framer.com](https://framer.com)
2. Sign up grátis (plano free dá subdomínio `*.framer.website`)
3. Para usar `andersonbrito.com` → Plano Mini (~$15/mês)

### 2. Criar o site
1. No dashboard, clique **New Project → Blank**
2. Use os arquivos HTML desta pasta como **referência visual**
3. No Framer, cada seção vira um **Frame** na canvas

**Estrutura de páginas no Framer:**
```
Pages:
├── / (index)        → Homepage principal
├── /marketing       → Portfolio Marketing DR
├── /pack-templates  → Landing page produto 1
└── /curso-edicao    → Landing page produto 2 (duplicar)
```

### 3. Adicionar vídeos ao portfolio (CMS)
1. No painel esquerdo: **CMS → Collections → New Collection**
2. Nomeie: `Portfolio`
3. Adicione campos:
   - `titulo` (Text)
   - `cliente` (Text)
   - `categoria` (Option: criativo | vsl | dr)
   - `thumbnail` (Image)
   - `videoUrl` (Text — URL do YouTube/Vimeo embed)
   - `duracao` (Text)
   - `descricao` (Text)
4. Adicione seus vídeos como itens do CMS
5. Na página `/marketing`, conecte uma grade ao CMS

**Resultado:** pra adicionar um novo vídeo, você só preenche um formulário. Sem código.

### 4. Trocar logo/imagem
- Clique na imagem/texto no canvas
- No painel direito, clique no ícone de imagem
- Arraste ou selecione o arquivo
- Pronto ✓

### 5. Embed de vídeo
- No canvas: Insert → Embed → Cole a URL do YouTube/Vimeo
- Ou use o CMS (recomendado para portfolio)

### 6. Botão Kiwify
- Adicione um botão
- No painel direito → Link → Cole o URL do checkout Kiwify
- Para abrir em nova aba: toggle "Open in new tab" ✓

### 7. Conectar andersonbrito.com

**No Framer:**
1. Settings → Custom Domain → `andersonbrito.com`
2. O Framer vai mostrar dois registros DNS

**No Wix (onde seu domínio está registrado):**
1. Acesse [wix.com/manage/domains](https://manage.wix.com/domains)
2. Clique em `andersonbrito.com` → Manage DNS
3. Delete o registro **A** apontado pro Wix
4. Delete o registro **CNAME** `www` apontado pro Wix
5. Adicione os registros que o Framer indicou:
   - Tipo A → valor que o Framer deu
   - CNAME `www` → valor que o Framer deu
6. Aguarde 15 minutos a 24h para propagar

**Obs:** o domínio continua registrado no Wix. Você só muda o DNS pra onde ele aponta.

---

## Opção B — Netlify (gratuito, mas edição via código)

Boa opção se quiser manter os arquivos HTML desta pasta:

1. Acesse [netlify.com](https://netlify.com)
2. Drag-and-drop da pasta `andersonbrito-v2/` no painel
3. Netlify gera link automático
4. Settings → Domain management → `andersonbrito.com`
5. Siga as instruções de DNS (mesmo processo do Wix acima)

**Edição:** para trocar imagem ou texto, edite o HTML localmente e re-suba.
→ Para edição sem código, use VS Code + Live Server + arrastar pro Netlify.

---

## Opção C — Wix Studio (se quiser ficar no Wix)

O Wix tem um editor avançado chamado **Wix Studio** que dá mais controle de design.

1. Em wix.com, vá em **Manage Sites → Edit with Wix Studio**
2. É como o Framer mas com menos qualidade de output
3. O domínio já está conectado — sem precisar mexer no DNS

**Desvantagem:** o design fica limitado aos componentes do Wix.

---

## Mapa de edição rápida

### Framer
| O que trocar          | Como                                              |
|-----------------------|---------------------------------------------------|
| Logo                  | Click logo → Upload image no painel direito       |
| Foto de perfil        | Click foto → Replace image                        |
| Adicionar vídeo       | CMS → Portfolio → New item → preencher campos     |
| Trocar link Kiwify    | Click botão → Link field → colar novo URL         |
| Editar texto          | Double click no texto → digitar                   |
| Mudar cor de destaque | Design tokens → editar a cor `--accent`           |

### Netlify/HTML
| O que trocar          | Como                                              |
|-----------------------|---------------------------------------------------|
| Logo                  | Substituir `assets/logo.svg`                      |
| Foto de perfil        | Substituir `assets/foto-perfil.jpg`               |
| Adicionar vídeo       | Editar array `VIDEOS` em `marketing.html`         |
| Trocar link Kiwify    | Ctrl+H → buscar `LINK_KIWIFY_AQUI`                |
| Editar texto          | Ctrl+F → buscar o texto → editar                  |

---

## Checklist antes de ir ao ar

- [ ] Logo substituído
- [ ] Foto de perfil adicionada
- [ ] Thumbnails dos vídeos em `assets/`
- [ ] Links de WhatsApp atualizados (`wa.me/55XXXXXXXXXXX`)
- [ ] Links do Instagram corretos
- [ ] Links Kiwify dos produtos inseridos
- [ ] Vídeos adicionados ao portfolio (array ou CMS)
- [ ] Testar no celular antes de publicar
- [ ] DNS propagado e domínio funcionando

---

Dúvidas? instagram.com/andersonbrito.mp4
