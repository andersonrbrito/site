# 🎬 Editor Visual - Anderson Brito

## Como Usar

### 1️⃣ Instalação (primeira vez apenas)

Abra o Terminal/PowerShell e rode:

```bash
cd /Users/andersonbrito/Downloads/site
npm install
```

Isso vai baixar as dependências (Express, etc).

---

### 2️⃣ Iniciar o Editor

```bash
npm start
```

Você verá isso no terminal:

```
╔════════════════════════════════════════════════════╗
║  🎬 ANDERSON BRITO - EDITOR DE SITE                ║
║  Servidor rodando em: http://localhost:3000/editor ║
║                                                    ║
║  📝 Para editar seu site, abra:                   ║
║     http://localhost:3000/editor                  ║
╚════════════════════════════════════════════════════╝
```

---

### 3️⃣ Abrir o Editor

Cole isso no navegador:

```
http://localhost:3000/editor
```

---

### 4️⃣ Editar Conteúdo

**Painel Esquerdo (formulário com abas):**
- 📝 **Pessoal** - Seu nome, email, status
- 🏠 **Home** - Headline, role, botões
- 📖 **Sobre** - Sua bio e descrição
- 📊 **Stats** - Números e labels (projetos, ferramentas, etc)
- 🔗 **Redes Sociais** - Instagram, WhatsApp, LinkedIn, Vimeo

**Painel Direito (preview):**
- Mostra como ficaria seu site em tempo real
- Atualiza conforme você digita

---

### 5️⃣ Salvar as Mudanças

Clique em **💾 Salvar** e pronto!

O servidor vai:
1. Ler seus arquivos HTML
2. Substituir o conteúdo antigo pelo novo
3. Re-escrever os arquivos

Você verá uma mensagem: **✅ Alterações salvas com sucesso!**

---

### 6️⃣ Testar Localmente

Abra em outro navegador:

```
http://localhost:3000
```

Para ver seu site ao vivo com as mudanças.

---

### 7️⃣ Fazer Push no GitHub

Depois de salvar e testar, no Terminal:

```bash
git add .
git commit -m "Atualizações via editor: nome, bio, links, etc"
git push
```

Seu site GitHub Pages vai atualizar automaticamente! 🚀

---

## ⚙️ Parar o Editor

No Terminal, pressione: `Ctrl+C`

---

## 🆘 Troubleshooting

**"Erro: npm not found"**
- Instale Node.js: https://nodejs.org

**"Erro: Cannot find module 'express'"**
- Rode: `npm install`

**"Porta 3000 já está em uso"**
- Outro programa está usando a porta
- Feche o programa ou mude a porta em `editor-server.js` (linha 8)

**"Editor não carrega"**
- Verifique se `npm start` está rodando
- Tente: `http://localhost:3000/editor` (sem `www`)

---

## 📝 Próximas Features do Editor

Vamos adicionar em breve:
- ✅ Upload de fotos (logo, perfil, thumbnails)
- ✅ Gerenciador de portfolio (vídeos)
- ✅ SEO fields (título, descrição, keywords)
- ✅ Favicon upload
- ✅ Editor de nova página (fotografia)

---

## 🎯 Workflow Recomendado

1. Inicia editor: `npm start`
2. Abre: `http://localhost:3000/editor`
3. Edita conteúdo em uma ou mais abas
4. Vê preview em tempo real no painel direito
5. Clica **💾 Salvar**
6. Testa em `http://localhost:3000`
7. Se aprovado, faz push no GitHub

---

**Qualquer dúvida, é só chamar! 🚀**
