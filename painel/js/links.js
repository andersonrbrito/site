import { h } from "./util.js";

// Atalhos fixos do painel. Ícone = favicon do próprio site.
export const favicon = (url, size = 64) => { try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=${size}`; } catch { return ""; } };

export const SOCIALS = [
  ["X @andersbrito", "https://x.com/andersbrito"],
  ["Instagram @andersonbrito.mp4", "https://www.instagram.com/andersonbrito.mp4/"],
  ["LinkedIn", "https://www.linkedin.com/in/andbrito/"],
  ["Threads", "https://www.threads.com/@andersonbrito.mp4"],
  ["TikTok", "https://www.tiktok.com/@andersonrotiroti"],
  ["Vimeo", "https://vimeo.com/andersonilmar"],
];

export const AIS = [
  ["Canva", "https://www.canva.com/"], ["Magnific", "https://www.magnific.com/br/app"], ["Argos", "https://argos.doti.gg/home"],
  ["ChatGPT", "https://chatgpt.com/"], ["Claude", "https://claude.ai/"], ["Adobe Podcast", "https://podcast.adobe.com/pt"],
  ["Captions", "https://captions.ai/"], ["Suno", "https://suno.com/"], ["Sjinn", "https://sjinn.ai/?via=fortacademy"],
  ["Real Xablau", "https://app.realoficial.com.br/ai-studio/real-xablau"], ["Google AI Studio", "https://aistudio.google.com/generate-speech"],
  ["Flow", "https://labs.google/fx/pt/tools/flow"], ["Gemini", "https://gemini.google.com/"], ["Swishy", "https://www.swishy.ai/"],
  ["Opus Clip", "https://clip.opus.pro/dashboard"], ["Clipa", "https://clipa.app/"],
];

export const QUICK = [
  ["Console do X", "https://console.x.com/"],
  ["Google Cloud Console", "https://console.cloud.google.com/"],
  ["Google Admin", "https://admin.google.com/"],
  ["Biblioteca de anúncios da Meta", "https://pt-br.facebook.com/ads/library/?active_status=active&ad_type=political_and_issue_ads&country=BR&is_targeted_country=false&media_type=all&sort_data[mode]=total_impressions&sort_data[direction]=desc"],
];
export const META_SCHEDULER = ["Agendar posts na Meta", "https://business.facebook.com/latest/composer/?asset_id=514084061948661&business_id=1769209036448499&nav_ref=internal_nav&ref=biz_web_home_create_post&context_ref=HOME"];

// Ícone clicável (só o favicon, nome no title).
export const iconLink = ([name, url], cls = "ilink") =>
  h("a", { class: cls, href: url, target: "_blank", rel: "noopener", title: name, "aria-label": name },
    h("img", { src: favicon(url), alt: "", width: 18, height: 18, loading: "lazy" }));
