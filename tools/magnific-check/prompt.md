Verificação de créditos do Magnific para o painel do Anderson. SÓ LEITURA: nunca gere, edite, apague ou compre nada. Não gaste créditos.

Passos:
1. Chame account_balance do Magnific (plano e créditos).
2. Data de renovação: no Chrome do contato@ (use list_connected_browsers e select_browser com o deviceId c1f9843f-c5b7-429d-8f39-6d69856a4961; nunca o Browser 2/theilmar), abra uma guia nova em https://www.magnific.com e vá até a página de assinatura/plano da conta (billing/subscription). Leia com get_page_text (sem screenshot) o nome do plano e a próxima data de renovação/cobrança. Feche a guia ao terminar. Se não achar em 2 tentativas, deixe renovacao null e explique em obs.
3. Início do ciclo = data de renovação menos 1 mês (se não souber, use os últimos 30 dias).
4. Contagem no ciclo: chame creations_search (from=history, dateStart=início do ciclo, perPage=1, excludeToolNames=["upload"]) três vezes, com fileType=video, image e audio. Use pagination.total de cada uma. Não peça full.
5. Peso de cada tipo: chame simulate_cost (só simula, não gasta) para uma geração típica de cada: vídeo Kling 2.5 720p 10 s; imagem Nano Banana 2 1K; áudio TTS curto. Se falhar, use video=50, imagem=5, audio=3.
6. Estimativa: divida o "spent" real entre os tipos proporcional a contagem × peso.

Responda SOMENTE com um JSON numa linha, sem texto antes ou depois:
{"plano":"","unlimited":true,"disponivel":0,"total":0,"gasto":0,"renovacao":"AAAA-MM-DD ou null","ciclo_inicio":"AAAA-MM-DD","contagem":{"video":0,"imagem":0,"audio":0},"peso":{"video":0,"imagem":0,"audio":0},"estimado":{"video":0,"imagem":0,"audio":0},"obs":""}
