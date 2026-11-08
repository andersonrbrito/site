// Catálogo do SkillS_: skills do Claude, plugins e repositórios do GitHub.
// uso: true = instalado e em uso no anderson_Os; false = recomendado (não instalado).
// nec: "essencial" | "util" | "opcional". Para incluir algo novo, adicione um item aqui.
export const CATS = [
  { id: "video", nome: "Edição de vídeo" },
  { id: "motion", nome: "Motion e vídeo em código" },
  { id: "conteudo", nome: "Conteúdo e redes" },
  { id: "design", nome: "Design e referência visual" },
  { id: "docs", nome: "Documentos e apresentações" },
  { id: "sistema", nome: "Claude e automação" },
  { id: "repos", nome: "Repositórios do GitHub" },
];

export const SKILLS = [
  // Edição de vídeo
  { cat: "video", nome: "editar-com-ia", tipo: "skill", uso: true, nec: "essencial", desc: "Seu método de editar vídeo com IA no Claude Code: corte, legenda, montagem a partir do bruto e manual de estética do perfil." },
  { cat: "video", nome: "video-use", tipo: "skill", uso: true, nec: "essencial", desc: "Edita qualquer vídeo conversando: transcreve, corta, gera animações de sobreposição e queima legenda.", url: "https://github.com/browser-use/video-use" },
  { cat: "video", nome: "edit-labs-ai", tipo: "plugin", uso: true, nec: "util", desc: "Do vídeo longo (podcast, live) aos verticais prontos: acha momentos, corta, enquadra rosto, motion, B-roll e legenda. Exige Higgsfield, então só no que não for proibido." },
  { cat: "video", nome: "corte-viral", tipo: "plugin", uso: true, nec: "util", desc: "Parte do edit-labs-ai: transforma vídeo longo em clipes 9:16 com corte preciso e locutor enquadrado (sem legenda)." },
  { cat: "video", nome: "watch", tipo: "plugin", uso: true, nec: "util", desc: "Assiste um vídeo (link ou arquivo): baixa, tira quadros e transcrição para o Claude responder sobre o conteúdo." },
  { cat: "video", nome: "remotion-captions", tipo: "skill", uso: true, nec: "util", desc: "Transcreve e anima legendas dentro de vídeos Remotion." },

  // Motion e vídeo em código
  { cat: "motion", nome: "lemo-opuscar", tipo: "skill", uso: true, nec: "util", desc: "Dirige curtas feitos inteiros em código em 51 estilos (óleo, aquarela, ukiyo-e, briefing de satélite…).", url: "https://github.com/lemomo-ai/lemo-opuscar" },
  { cat: "motion", nome: "remotion-best-practices", tipo: "skill", uso: true, nec: "util", desc: "Porta de entrada das skills Remotion: escolhe a skill certa para cada tarefa de vídeo em React." },
  { cat: "motion", nome: "remotion-create", tipo: "skill", uso: true, nec: "util", desc: "Cria um projeto de vídeo Remotion novo." },
  { cat: "motion", nome: "remotion-markup", tipo: "skill", uso: true, nec: "util", desc: "Boas práticas de conteúdo, animação e efeitos no Remotion." },
  { cat: "motion", nome: "remotion-render", tipo: "skill", uso: true, nec: "util", desc: "Exporta (renderiza) o vídeo Remotion." },
  { cat: "motion", nome: "remotion-studio", tipo: "skill", uso: true, nec: "opcional", desc: "Abre a prévia do vídeo Remotion no navegador." },
  { cat: "motion", nome: "remotion-multimedia", tipo: "skill", uso: true, nec: "opcional", desc: "Trabalha com áudio e vídeo dentro do Remotion (Mediabunny)." },
  { cat: "motion", nome: "remotion-maps", tipo: "skill", uso: true, nec: "opcional", desc: "Animações de mapa no Remotion." },
  { cat: "motion", nome: "remotion-interactivity", tipo: "skill", uso: true, nec: "opcional", desc: "Estrutura o vídeo Remotion para ficar interativo." },
  { cat: "motion", nome: "remotion-docs", tipo: "skill", uso: true, nec: "opcional", desc: "Busca na documentação do Remotion." },
  { cat: "motion", nome: "remotion-saas", tipo: "skill", uso: true, nec: "opcional", desc: "Monta um app (SaaS) em cima do Remotion." },
  { cat: "motion", nome: "remotion-upgrade", tipo: "skill", uso: true, nec: "opcional", desc: "Atualiza o Remotion e os pacotes ligados." },

  // Conteúdo e redes
  { cat: "conteudo", nome: "postador", tipo: "skill", uso: true, nec: "essencial", desc: "Casa do PostadoR_: método, pilares, formatos e proibições para gerar os rascunhos de X e LinkedIn." },
  { cat: "conteudo", nome: "analise-posts", tipo: "skill", uso: true, nec: "essencial", desc: "Analisa desempenho de posts (X, Instagram, LinkedIn) em 4 etapas: média, extremos, hipóteses e testes." },
  { cat: "conteudo", nome: "vidiq-youtube-data", tipo: "skill", uso: true, nec: "opcional", desc: "Conecta o vidIQ para pesquisar palavras-chave, títulos e tendências do YouTube." },
  { cat: "conteudo", nome: "marketing (plugin)", tipo: "plugin", uso: true, nec: "util", desc: "Campanhas, briefing de concorrentes, sequência de e-mail, revisão de marca, SEO e relatórios de desempenho." },

  // Design
  { cat: "design", nome: "design-md-template", tipo: "skill", uso: true, nec: "util", desc: "Modelo de manual de estética (design.md) para perfis e marcas que editam com IA." },
  { cat: "design", nome: "refero-styles", tipo: "skill", uso: true, nec: "util", desc: "Catálogo de estilos de sites reais (Refero) para inspirar UI, landing pages e thumbs." },
  { cat: "design", nome: "awesome-design-md", tipo: "skill", uso: true, nec: "opcional", desc: "Coleção de DESIGN.md de sites conhecidos para criar páginas ou artes no estilo deles." },
  { cat: "design", nome: "svg-diagram", tipo: "skill", uso: true, nec: "opcional", desc: "Desenha diagramas e fluxogramas em SVG com paleta e regras prontas." },
  { cat: "design", nome: "design (plugin)", tipo: "plugin", uso: true, nec: "opcional", desc: "Crítica de design, acessibilidade, handoff para dev, sistema de design e textos de interface." },

  // Documentos
  { cat: "docs", nome: "marp-slides", tipo: "skill", uso: true, nec: "opcional", desc: "Apresentações MARP com gráficos SVG, temas claro/escuro e animações." },
  { cat: "docs", nome: "pdf / docx / pptx / xlsx", tipo: "skill", uso: true, nec: "util", desc: "Skills da Anthropic para ler, criar e editar PDF, Word, PowerPoint e planilhas." },

  // Claude e automação
  { cat: "sistema", nome: "consolidate-memory", tipo: "skill", uso: true, nec: "util", desc: "Revisa a memória do Claude: junta duplicadas, corrige fatos velhos e enxuga o índice (economiza tokens)." },
  { cat: "sistema", nome: "schedule / loop", tipo: "skill", uso: true, nec: "util", desc: "Agenda rotinas recorrentes ou repete um comando de tempos em tempos." },
  { cat: "sistema", nome: "skill-creator", tipo: "skill", uso: false, nec: "util", desc: "Cria e melhora skills próprias e mede se funcionam. Bom para transformar os métodos dos perfis em skills." },
  { cat: "sistema", nome: "fewer-permission-prompts", tipo: "skill", uso: false, nec: "util", desc: "Lê seu histórico e libera comandos de leitura seguros, para as rotinas pararem menos pedindo permissão." },
  { cat: "sistema", nome: "deep-research", tipo: "skill", uso: false, nec: "opcional", desc: "Pesquisa em várias fontes e entrega um relatório completo. Útil para pautas do Fato Indigesto." },

  // Repositórios do GitHub
  { cat: "repos", nome: "awesome-opus5-5-videos", tipo: "repo", uso: true, nec: "util", desc: "Coleção de vídeos feitos com IA, cada um com o prompt que gerou.", url: "https://github.com/yihui-dev/awesome-opus5-5-videos" },
  { cat: "repos", nome: "awesome-claude-5-5-videos", tipo: "repo", uso: true, nec: "util", desc: "424 vídeos catalogados com a fonte, para achar referência de técnica.", url: "https://github.com/athemeroy/awesome-claude-5-5-videos" },
  { cat: "repos", nome: "opus-video-prompts", tipo: "repo", uso: true, nec: "util", desc: "Prompts de vídeo prontos para copiar.", url: "https://github.com/joeseesun/opus-video-prompts" },
  { cat: "repos", nome: "mg-styles-15", tipo: "repo", uso: true, nec: "util", desc: "15 estilos de motion com clipe, prompt e código.", url: "https://github.com/Vincentwei1021/mg-styles-15" },
  { cat: "repos", nome: "ClaudeAnimationBase", tipo: "repo", uso: true, nec: "opcional", desc: "Personagem animado pronto com 31 emoções.", url: "https://github.com/JohnHeibel/ClaudeAnimationBase" },
  { cat: "repos", nome: "pdoom-video", tipo: "repo", uso: true, nec: "opcional", desc: "Clipe em three.js com letra sincronizada à música.", url: "https://github.com/mexicat/pdoom-video" },
  { cat: "repos", nome: "PDoomVideo", tipo: "repo", uso: true, nec: "opcional", desc: "A mesma música do pdoom, em estilo pintado a pincel.", url: "https://github.com/JohnHeibel/PDoomVideo" },
  { cat: "repos", nome: "yt-dlp", tipo: "repo", uso: true, nec: "essencial", desc: "Baixador por trás do YT downloaD_ do painel.", url: "https://github.com/yt-dlp/yt-dlp" },
  { cat: "repos", nome: "clonar-voz-local", tipo: "repo", uso: false, nec: "opcional", desc: "Clona voz no próprio Mac com o OmniVoice, sem crédito. Licença não comercial: só para rascunho e teste.", url: "https://github.com/morgsdoti/clonar-voz-local" },
];
