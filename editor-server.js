const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('./'));

// Caminhos
const DATA_PATH = path.join(__dirname, 'data.json');
const INDEX_PATH = path.join(__dirname, 'index.html');
const MARKETING_PATH = path.join(__dirname, 'marketing.html');

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function readData() {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler data.json:', error);
    throw error;
  }
}

async function saveData(data) {
  try {
    await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Erro ao salvar data.json:', error);
    throw error;
  }
}

// ============================================
// ROTAS
// ============================================

// GET: Servir editor.html
app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor.html'));
});

// GET: Obter todos os dados
app.get('/api/data', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar dados' });
  }
});

// POST: Salvar dados atualizados
app.post('/api/save', async (req, res) => {
  try {
    const newData = req.body;
    await saveData(newData);
    res.json({ success: true, message: 'Dados salvos com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar dados' });
  }
});

// GET: Preview HTML em tempo real
app.get('/api/preview', async (req, res) => {
  try {
    const data = await readData();
    const html = generatePreviewHTML(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar preview' });
  }
});

// POST: Adicionar vídeo ao portfolio
app.post('/api/portfolio/add', async (req, res) => {
  try {
    const data = await readData();
    const newVideo = req.body;

    // Gerar ID único
    const maxId = Math.max(...data.portfolio.videos.map(v => v.id), 0);
    newVideo.id = maxId + 1;

    data.portfolio.videos.push(newVideo);
    await saveData(data);

    res.json({ success: true, video: newVideo });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar vídeo' });
  }
});

// POST: Atualizar vídeo
app.post('/api/portfolio/update/:id', async (req, res) => {
  try {
    const data = await readData();
    const videoId = parseInt(req.params.id);
    const videoIndex = data.portfolio.videos.findIndex(v => v.id === videoId);

    if (videoIndex === -1) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    data.portfolio.videos[videoIndex] = { ...data.portfolio.videos[videoIndex], ...req.body };
    await saveData(data);

    res.json({ success: true, video: data.portfolio.videos[videoIndex] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar vídeo' });
  }
});

// DELETE: Deletar vídeo
app.delete('/api/portfolio/:id', async (req, res) => {
  try {
    const data = await readData();
    const videoId = parseInt(req.params.id);

    data.portfolio.videos = data.portfolio.videos.filter(v => v.id !== videoId);
    await saveData(data);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar vídeo' });
  }
});

// ============================================
// GERADOR DE HTML PARA PREVIEW
// ============================================

function generatePreviewHTML(data) {
  const personal = data.personal;
  const hero = data.hero;
  const about = data.about;
  const stats = data.stats;
  const social = data.social;
  const portfolio = data.portfolio;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.seo.title}</title>
  <meta name="description" content="${data.seo.description}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0e27;
      color: #e0e0e0;
      line-height: 1.6;
    }

    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }

    header {
      background: #1a1f3a;
      padding: 20px 0;
      border-bottom: 1px solid #2d3561;
      margin-bottom: 40px;
    }

    h1 {
      font-size: 36px;
      color: #4da3ff;
      margin: 20px 0;
    }

    h2 {
      font-size: 24px;
      color: #4da3ff;
      margin: 30px 0 20px 0;
      border-bottom: 2px solid #2d3561;
      padding-bottom: 10px;
    }

    p { margin: 10px 0; color: #b0b0b0; }

    .hero {
      background: #1a1f3a;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      border: 1px solid #2d3561;
    }

    .hero .eyebrow { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
    .hero .role { font-size: 18px; color: #4da3ff; margin: 15px 0; }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin: 30px 0;
    }

    .stat {
      background: #1a1f3a;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #2d3561;
      text-align: center;
    }

    .stat .value { font-size: 28px; color: #4da3ff; font-weight: bold; }
    .stat .label { font-size: 12px; color: #888; text-transform: uppercase; margin-top: 10px; }

    .about {
      background: #1a1f3a;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #2d3561;
      margin-bottom: 30px;
    }

    .social-links {
      display: flex;
      gap: 15px;
      margin: 20px 0;
    }

    .social-links a {
      display: inline-block;
      padding: 10px 15px;
      background: #2d3561;
      color: #4da3ff;
      border-radius: 4px;
      text-decoration: none;
      font-size: 12px;
      transition: all 0.3s ease;
    }

    .social-links a:hover {
      background: #4da3ff;
      color: #0a0e27;
    }

    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .video-card {
      background: #1a1f3a;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #2d3561;
      transition: all 0.3s ease;
    }

    .video-card:hover { border-color: #4da3ff; }

    .video-card .thumb {
      width: 100%;
      height: 150px;
      background: #0a0e27;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #888;
      font-size: 12px;
    }

    .video-card .info { padding: 15px; }
    .video-card .title { color: #4da3ff; font-weight: bold; margin-bottom: 5px; }
    .video-card .client { color: #888; font-size: 12px; }
    .video-card .category {
      display: inline-block;
      background: #2d3561;
      color: #888;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 10px;
      margin-top: 10px;
    }

    footer {
      background: #1a1f3a;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #2d3561;
      margin-top: 40px;
    }

    @media (max-width: 768px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
      h1 { font-size: 24px; }
      h2 { font-size: 18px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>${personal.firstName} ${personal.lastName}</h1>
      <p style="color: #888;">Status: <strong>${personal.status}</strong></p>
    </div>
  </header>

  <div class="container">
    <!-- HERO -->
    <section class="hero">
      <p class="eyebrow">${hero.eyebrow}</p>
      <p class="role">${hero.role}</p>
      <div class="social-links">
        <a href="${social.instagram}" target="_blank">Instagram</a>
        <a href="${social.whatsapp}" target="_blank">WhatsApp</a>
        <a href="${social.linkedin}" target="_blank">LinkedIn</a>
        <a href="${social.vimeo}" target="_blank">Vimeo</a>
      </div>
    </section>

    <!-- ABOUT -->
    <section class="about">
      <h2>${about.heading}</h2>
      <p>${about.bio1}</p>
      <p>${about.bio2}</p>
    </section>

    <!-- STATS -->
    <section>
      <h2>Estatísticas</h2>
      <div class="stats">
        ${stats.map(s => `
          <div class="stat">
            <div class="value">${s.value}</div>
            <div class="label">${s.label}</div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- PORTFOLIO -->
    <section>
      <h2>${portfolio.title}</h2>
      <p>${portfolio.subtitle}</p>
      <div class="video-grid">
        ${portfolio.videos.map(v => `
          <div class="video-card">
            <div class="thumb">Thumbnail: ${v.thumbnail}</div>
            <div class="info">
              <div class="title">${v.title}</div>
              <div class="client">${v.client}</div>
              <div class="category">${v.category}</div>
              <p style="font-size: 12px; margin-top: 10px; color: #888;">${v.duration}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- FOOTER -->
    <footer>
      <p>📧 ${personal.email}</p>
      <p>📞 ${personal.phone}</p>
      <p style="color: #888; margin-top: 20px; font-size: 12px;">Localização: ${data.address.city}, ${data.address.state} • ${data.address.country}</p>
    </footer>
  </div>
</body>
</html>
  `;
}

// ============================================
// INICIALIZAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║  🎬 ANDERSON BRITO - EDITOR PROFISSIONAL v2.0      ║
║  Servidor rodando em: http://localhost:3001/editor ║
║                                                    ║
║  📝 Para editar seu site, abra:                   ║
║     http://localhost:3001/editor                  ║
║                                                    ║
║  👁️ Preview ao vivo:                              ║
║     http://localhost:3001/api/preview              ║
╚════════════════════════════════════════════════════╝
  `);
});
