(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VibeI18n=api;})(globalThis,function(){
  const common={
    'nav.language':'EN / 中文','hero.kicker':'VISUAL INTELLIGENCE / 2026','upload.rules':'JPG, PNG / MAX. 10MB / SINGLE FILE'
  };
  const dictionaries={
    en:{...common,
      'nav.status':'SYSTEM: READY','hero.title':'VISUAL\nSTYLE\nEXTRACTOR','hero.description':'Upload an image to extract its palette, composition, texture, mood, and visual logic—then generate a production-ready AI prompt.',
      'upload.drop':'DROP A REFERENCE IMAGE / CLICK TO BROWSE','upload.action':'BEGIN EXTRACTION','upload.replace':'REPLACE IMAGE','privacy':'ORIGINAL IMAGE IS NEVER STORED',
      'report.title':'VISUAL ANALYSIS','report.parameters':'6 PARAMETERS','summary':'VIBE SUMMARY','palette':'COLOR PALETTE','composition':'COMPOSITION & LIGHT','texture':'TEXTURE & MATERIAL','tags':'STYLE TAGS','prompt':'AI PROMPT',
      'field.light':'LIGHT','field.tone':'TONE','field.framing':'FRAMING','field.composition':'COMPOSITION','field.depth':'DEPTH','translation.loading':'TRANSLATING RESULT…',
      'copy':'COPY','copyPrompt':'COPY COMPLETE PROMPT →','copied':'COPIED ✓','clear':'CLEAR','reupload':'RE-UPLOAD','export':'EXPORT REPORT',
      'samples':'STYLE REFERENCES','samples.related':'RELATED MATERIALS','samples.relatedSub':'REAL IMAGES MATCHED TO THE CURRENT VISUAL ANALYSIS','samples.sub':'CURATED REAL-IMAGE MATERIALS\nOPEN ANY CARD TO VIEW THE SOURCE','samples.loading':'SEARCHING RELATED MATERIALS…','samples.fallbackSub':'RELATED SEARCH UNAVAILABLE — SHOWING CURATED REAL MATERIALS','samples.loadMore':'LOAD MORE MATERIALS →','samples.photoBy':'PHOTO BY',
      'feed.loadingMore':'LOADING MORE MATERIALS…','feed.retry':'RETRY LOADING','feed.end':'END OF MATERIALS','feed.idle':'SCROLL TO LOAD MORE',
      'material.adding':'ADDING TO EXTRACTOR…','material.selectLabel':'Select material for visual extraction','error.MATERIAL_IMAGE_INVALID':'COULD NOT ADD THIS MATERIAL','error.MATERIAL_IMAGE_TOO_LARGE':'MATERIAL IMAGE EXCEEDS THE 10MB LIMIT',
      'loading.title':'ANALYZING VISUAL SYSTEM','loading.elapsed':'ELAPSED','loading.button':'ANALYZING…',
      'progress.1':'READING COLOR SYSTEM','progress.2':'MAPPING COMPOSITION','progress.3':'ANALYZING MATERIAL & LIGHT','progress.4':'GENERATING PROMPT',
      'error.TYPE':'ONLY JPG AND PNG FILES ARE SUPPORTED','error.SIZE':'FILE EXCEEDS THE 10MB LIMIT','error.OLLAMA_UNAVAILABLE':'OLLAMA IS NOT RUNNING. OPEN THE OLLAMA APP AND TRY AGAIN.','error.OLLAMA_MODEL_MISSING':'THE LOCAL GEMMA3:4B MODEL IS NOT INSTALLED. RUN: OLLAMA PULL GEMMA3:4B','error.OLLAMA_ANALYSIS_FAILED':'LOCAL ANALYSIS FAILED. PLEASE TRY AGAIN.','error.ANALYSIS_FAILED':'ANALYSIS FAILED. PLEASE TRY AGAIN.','error.INVALID_MODEL_OUTPUT':'THE LOCAL MODEL RETURNED AN INCOMPLETE RESULT. PLEASE RETRY.','error.UPSTREAM_TIMEOUT':'ANALYSIS TIMED OUT. PLEASE RETRY.','error.TRANSLATION_FAILED':'COULD NOT TRANSLATE THE RESULT. SWITCH LANGUAGE TO RETRY.','error.OLLAMA_TRANSLATION_FAILED':'COULD NOT TRANSLATE THE RESULT. SWITCH LANGUAGE TO RETRY.','notDetermined':'Not determined'
    },
    zh:{...common,
      'nav.status':'系统：就绪','hero.kicker':'视觉智能 / 2026','hero.title':'视觉\n风格\n提取器','hero.description':'上传图片，解析配色、构图、材质、情绪与视觉逻辑，并生成可直接使用的 AI 绘画提示词。',
      'upload.drop':'拖入参考图像 / 点击选择文件','upload.rules':'JPG、PNG / 最大 10MB / 单张图片','upload.action':'开始提取','upload.replace':'更换图片','privacy':'不会存储用户原图',
      'report.title':'视觉分析','report.parameters':'6 项参数','summary':'整体氛围','palette':'主配色方案','composition':'构图与光影','texture':'材质与质感','tags':'风格标签','prompt':'AI 绘图提示词',
      'field.light':'光线','field.tone':'色调','field.framing':'取景','field.composition':'构图','field.depth':'层次','translation.loading':'正在翻译分析结果…',
      'copy':'复制','copyPrompt':'复制完整提示词 →','copied':'已复制 ✓','clear':'清空','reupload':'重新上传','export':'导出结果',
      'samples':'风格素材参考','samples.related':'关联素材推荐','samples.relatedSub':'根据当前视觉分析匹配的真实图片素材','samples.sub':'精选真实图片素材\n打开卡片查看原始来源','samples.loading':'正在搜索相关素材…','samples.fallbackSub':'关联搜索暂不可用，展示精选真实素材','samples.loadMore':'加载更多素材 →','samples.photoBy':'摄影',
      'feed.loadingMore':'正在加载更多素材…','feed.retry':'重新加载','feed.end':'素材已全部加载','feed.idle':'继续下滑加载更多','material.adding':'正在添加到提取器…','material.selectLabel':'选择素材并填入视觉提取器','error.MATERIAL_IMAGE_INVALID':'无法添加此素材','error.MATERIAL_IMAGE_TOO_LARGE':'素材图片超过 10MB 限制',
      'loading.title':'正在分析视觉系统','loading.elapsed':'已用时','loading.button':'分析中…',
      'progress.1':'读取色彩系统','progress.2':'映射画面构图','progress.3':'分析材质与光线','progress.4':'生成绘画提示词',
      'error.TYPE':'仅支持 JPG 和 PNG 格式','error.SIZE':'图片超过 10MB 限制','error.OLLAMA_UNAVAILABLE':'OLLAMA 未启动，请打开 Ollama 后重试','error.OLLAMA_MODEL_MISSING':'本地 GEMMA3:4B 模型未下载，请运行：OLLAMA PULL GEMMA3:4B','error.OLLAMA_ANALYSIS_FAILED':'本地解析失败，请重试','error.ANALYSIS_FAILED':'解析失败，请重试','error.INVALID_MODEL_OUTPUT':'本地模型返回结果不完整，请重试','error.UPSTREAM_TIMEOUT':'解析超时，请重试','error.TRANSLATION_FAILED':'结果翻译失败，请切换语言后重试','error.OLLAMA_TRANSLATION_FAILED':'结果翻译失败，请切换语言后重试','notDetermined':'未识别'
    }
  };
  function createI18n({storage,initialLocale}={}){storage=storage||{getItem(){},setItem(){}};let locale=['en','zh'].includes(initialLocale)?initialLocale:storage.getItem('vibe-locale');if(!['en','zh'].includes(locale))locale='en';const listeners=[];return{get locale(){return locale},t:key=>dictionaries[locale][key]||key,setLocale(next){locale=next==='zh'?'zh':'en';storage.setItem('vibe-locale',locale);listeners.forEach(fn=>fn(locale));},subscribe(fn){listeners.push(fn)}};}
  return{createI18n,dictionaries};
});
