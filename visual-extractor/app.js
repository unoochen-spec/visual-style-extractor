(function(){
  const i18n=VibeI18n.createI18n({storage:localStorage});
  const translations=VibeTranslationState.createTranslationState();
  let selectedFile=null,objectUrl=null,analysis=null,analysisError=false,isAnalyzing=false,selectingMaterialId=null,feedGeneration=0;
  const feed={mode:'default',page:1,totalPages:1,items:VibeRecommendations.getFallbackMaterials(),loading:false};
  const pager=VibeInfiniteFeed.createInfiniteFeedState({page:1,totalPages:1});
  const $=selector=>document.querySelector(selector);
  const input=$('#file-input'),drop=$('#drop-zone'),preview=$('#preview'),copy=$('#drop-copy'),error=$('#error'),analyze=$('#analyze'),report=$('#report'),progress=$('#progress');

  function escapeHTML(value){return String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
  function workspaceState(){return VibeUIState.getWorkspaceState({hasFile:Boolean(selectedFile),isAnalyzing,hasAnalysis:Boolean(analysis),hasError:analysisError});}
  function syncWorkspace(){const state=workspaceState();$('.workspace').dataset.state=state;const showReport=state==='analyzing'||state==='complete';report.hidden=!showReport;report.setAttribute('aria-busy',String(state==='analyzing'));return state;}
  function applyLocale(){document.documentElement.lang=i18n.locale==='zh'?'zh-CN':'en';document.querySelectorAll('[data-i18n]').forEach(element=>{element.textContent=i18n.t(element.dataset.i18n);});renderSamples();if(analysis&&!isAnalyzing){const cached=translations.get(i18n.locale);if(cached){analysis=cached;setTranslationIndicator(false);renderAnalysis(analysis);}else{renderAnalysis(analysis);translateResult(i18n.locale);}}else if(!isAnalyzing)renderEmpty();else syncWorkspace();}
  function renderEmpty(){report.innerHTML='';syncWorkspace();}

  function setTranslationIndicator(active){report.classList.toggle('is-translating',active);if(active)report.dataset.translationLabel=i18n.t('translation.loading');else delete report.dataset.translationLabel;}
  async function translateResult(locale){
    const token=translations.start(locale);setTranslationIndicator(translations.isPending(locale));if(!token)return;
    const source=analysis;
    try{
      const response=await fetch('/api/translate-analysis',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({analysis:source,locale})});
      const value=await response.json();if(!response.ok)throw Object.assign(new Error(),{code:value.error});
      if(translations.finish(token,value)&&i18n.locale===locale){analysis=value;error.textContent='';setTranslationIndicator(false);renderAnalysis(value);}
    }catch(problem){translations.fail(token);if(i18n.locale===locale)error.textContent=i18n.t(`error.${problem.code||'TRANSLATION_FAILED'}`);}
    finally{if(i18n.locale===locale)setTranslationIndicator(translations.isPending(locale));}
  }

  function resetFeed(){feedGeneration+=1;feed.mode='default';feed.page=1;feed.totalPages=1;feed.items=VibeRecommendations.getFallbackMaterials();feed.loading=false;selectingMaterialId=null;pager.reset({page:1,totalPages:1});renderSamples();}
  function setFile(file){const validation=VibeFiles.validateImage(file);if(!validation.ok){error.textContent=i18n.t(`error.${validation.code}`);return;}error.textContent='';selectedFile=file;analysis=null;translations.reset();setTranslationIndicator(false);analysisError=false;isAnalyzing=false;resetFeed();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);$('#preview-image').src=objectUrl;$('#filename').textContent=file.name;$('#filesize').textContent=`${(file.size/1024/1024).toFixed(2)} MB / ${file.type.toUpperCase()}`;copy.hidden=true;preview.hidden=false;analyze.disabled=false;progress.hidden=true;renderEmpty();}
  function clearFile(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;selectedFile=null;analysis=null;translations.reset();setTranslationIndicator(false);analysisError=false;isAnalyzing=false;input.value='';copy.hidden=false;preview.hidden=true;analyze.disabled=true;progress.hidden=true;error.textContent='';resetFeed();renderEmpty();}
  function progressStart(){
    const tracker=VibeLoading.createLoadingTracker();let ticks=0;
    const operation=$('.operation'),buttonLabel=analyze.querySelector('span');
    operation.classList.add('is-analyzing');analyze.setAttribute('aria-busy','true');buttonLabel.textContent=i18n.t('loading.button');progress.hidden=true;syncWorkspace();
    function render(){const state=tracker.snapshot();report.innerHTML=`<div class="analysis-loader"><div class="loader-mark" aria-hidden="true"><span>✦</span></div><div class="loader-copy"><span class="meta">LOCAL VISION MODEL / GEMMA3:4B</span><strong>${i18n.t('loading.title')}</strong><p>${String(state.step+1).padStart(2,'0')} / ${i18n.t(`progress.${state.step+1}`)}</p></div><span class="loader-time">${i18n.t('loading.elapsed')}<b>${String(state.elapsedSeconds).padStart(2,'0')}S</b></span><div class="loader-rail">${[0,1,2,3].map(index=>`<i class="${index<state.step?'done':index===state.step?'active':''}"></i>`).join('')}</div></div>`;}
    render();const timer=setInterval(()=>{ticks+=1;if(ticks%3===0)tracker.advance();render();},1000);
    return{stop(){clearInterval(timer);operation.classList.remove('is-analyzing');analyze.removeAttribute('aria-busy');buttonLabel.textContent=i18n.t('upload.action');progress.hidden=true;syncWorkspace();}};
  }

  async function runAnalysis(){if(!selectedFile)return;const requestedLocale=i18n.locale;analyze.disabled=true;error.textContent='';analysisError=false;isAnalyzing=true;const progressController=progressStart();const body=new FormData();body.append('image',selectedFile);body.append('locale',requestedLocale);try{const response=await fetch('/api/analyze',{method:'POST',body});const value=await response.json();if(!response.ok)throw Object.assign(new Error(),{code:value.error});analysis=value;translations.store(requestedLocale,value);isAnalyzing=false;renderAnalysis(value);loadRelatedMaterials(1,false);if(i18n.locale!==requestedLocale)translateResult(i18n.locale);}catch(problem){analysis=null;analysisError=true;isAnalyzing=false;error.textContent=i18n.t(`error.${problem.code||'ANALYSIS_FAILED'}`);renderEmpty();}finally{progressController.stop();analyze.disabled=false;}}
  async function loadRelatedMaterials(page,append){
    if(!analysis||feed.loading)return;
    if(append&&!pager.start())return;
    const generation=feedGeneration,loadingStartedAt=Date.now();feed.loading=true;if(!append)feed.mode='loading';renderSamples();
    try{
      const response=await fetch('/api/materials',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({analysis,page})});
      const value=await response.json();if(!response.ok)throw new Error(value.error);if(generation!==feedGeneration)return;
      feed.items=append?VibeRecommendations.mergeMaterials(feed.items,value.items):value.items;
      feed.mode=feed.items.length?'related':'fallback';if(!feed.items.length)feed.items=VibeRecommendations.getFallbackMaterials();
      feed.page=value.page||page;feed.totalPages=value.totalPages||feed.page;
      if(append)pager.success({page:feed.page,totalPages:feed.totalPages});else pager.reset({page:feed.page,totalPages:feed.totalPages});
    }catch{
      if(generation!==feedGeneration)return;
      if(append){pager.fail();feed.mode='related';}else{feed.items=VibeRecommendations.getFallbackMaterials();feed.mode='fallback';feed.page=1;feed.totalPages=1;pager.reset({page:1,totalPages:1});}
    }finally{if(generation===feedGeneration&&append){const remaining=VibeUIState.getRemainingLoadingMs({startedAt:loadingStartedAt});if(remaining)await new Promise(resolve=>setTimeout(resolve,remaining));}if(generation===feedGeneration){feed.loading=false;renderSamples();}}
  }

  function button(label,action){return`<button class="small-button" data-action="${action}">${label}</button>`;}
  function renderAnalysis(value){const composition=value.composition;report.innerHTML=`<div class="report-head"><h2>${i18n.t('report.title')}</h2><span class="meta">✓ ${i18n.t('report.parameters')}</span></div><div class="module"><div class="module-head"><h3>${i18n.t('summary')}</h3></div><p class="summary"></p></div><div class="module"><div class="module-head"><h3>${i18n.t('palette')}</h3>${button(i18n.t('copy'),'colors')}</div><div class="palette-grid">${value.palette.map((item,index)=>`<div class="swatch ${index===0?'dark':''}" style="background:${item.hex}"><span>${item.hex}</span><b>${escapeHTML(item.role)}</b></div>`).join('')}</div></div><div class="module"><div class="module-head"><h3>${i18n.t('composition')}</h3></div><div class="rows">${[[i18n.t('field.light'),composition.lightType],[i18n.t('field.tone'),composition.tone],[i18n.t('field.framing'),composition.framing],[i18n.t('field.composition'),composition.composition],[i18n.t('field.depth'),composition.depth]].map(item=>`<div class="data-row"><span>${item[0]}</span><span>${escapeHTML(item[1])}</span></div>`).join('')}</div></div><div class="module"><div class="module-head"><h3>${i18n.t('texture')}</h3></div><div class="terms">${value.textures.map(item=>`<span class="term">${escapeHTML(item)}</span>`).join('')}</div></div><div class="module"><div class="module-head"><h3>${i18n.t('tags')}</h3>${button(i18n.t('copy'),'tags')}</div><div class="terms">${value.tags.map(item=>`<button class="term" data-copy-value="${escapeHTML(item)}">${escapeHTML(item)}</button>`).join('')}</div></div><div class="module prompt-module"><div class="module-head"><h3>${i18n.t('prompt')}</h3>${button(i18n.t('copyPrompt'),'prompt')}</div><p class="prompt-text"></p><div class="actions">${button(i18n.t('reupload'),'reupload')}${button(i18n.t('export'),'export')}${button(i18n.t('clear'),'clear')}</div></div>`;report.querySelector('.summary').textContent=value.summary;report.querySelector('.prompt-text').textContent=value.prompt;syncWorkspace();}
  async function copyText(value,target){try{await navigator.clipboard.writeText(value);}catch{const area=document.createElement('textarea');area.value=value;document.body.append(area);area.select();document.execCommand('copy');area.remove();}if(target){const old=target.textContent;target.textContent=i18n.t('copied');setTimeout(()=>target.textContent=old,1200);}}
  report.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;if(target.dataset.copyValue)return copyText(target.dataset.copyValue,target);const action=target.dataset.action;if(action==='colors')copyText(analysis.palette.map(item=>item.hex).join(', '),target);if(action==='tags')copyText(analysis.tags.join(' | '),target);if(action==='prompt')copyText(analysis.prompt,target);if(action==='export')copyText(VibeReport.formatReport(analysis,i18n.locale),target);if(action==='clear')clearFile();if(action==='reupload')input.click();});

  function renderSamples(){
    const related=analysis&&feed.mode!=='default',state=pager.snapshot();
    const title=$('#feed-title'),summary=$('#feed-summary'),status=$('#feed-status'),retry=$('#feed-retry'),footer=$('.feed-footer');
    title.textContent=related?i18n.t('samples.related'):i18n.t('samples');
    summary.textContent=feed.mode==='loading'?i18n.t('samples.loading'):feed.mode==='fallback'&&analysis?i18n.t('samples.fallbackSub'):related?i18n.t('samples.relatedSub'):i18n.t('samples.sub');
    $('#references').classList.toggle('is-related',related);$('#references').classList.toggle('is-loading',feed.loading);
    const cards=feed.items.map((material,index)=>{const adding=selectingMaterialId===material.id;return`<article class="material-card${adding?' is-adding':''}" data-material-id="${escapeHTML(material.id)}" aria-busy="${adding}"><button class="material-select" type="button" data-select-material="${escapeHTML(material.id)}" aria-label="${escapeHTML(i18n.t('material.selectLabel'))}: ${escapeHTML(material.title)}"></button><div class="material-image"><img src="${escapeHTML(material.imageUrl)}" width="${material.width}" height="${material.height}" alt="${escapeHTML(material.title)}" loading="lazy" style="background:${escapeHTML(material.color||'#e5e5e5')}"></div><div class="material-info"><span class="meta">REF_${String(index+1).padStart(3,'0')}</span><h3>${escapeHTML(material.title)}</h3><div class="material-tags">${(material.tags||[]).map(tag=>`<span>${escapeHTML(tag)}</span>`).join('')}</div><a class="material-credit" href="${escapeHTML(material.authorUrl||material.sourceUrl)}" target="_blank" rel="noopener noreferrer">${i18n.t('samples.photoBy')} ${escapeHTML(material.author)}</a></div>${adding?`<span class="material-adding">${i18n.t('material.adding')}</span>`:''}</article>`;}).join('');
    $('#sample-grid').innerHTML=cards+(state.status==='loading'?VibeUIState.renderFeedSkeletons(6):'');
    $('#references').setAttribute('aria-busy',String(state.status==='loading'));
    footer.hidden=!analysis||feed.mode==='fallback';retry.hidden=state.status!=='error';retry.textContent=i18n.t('feed.retry');
    status.textContent=feed.mode==='loading'?i18n.t('samples.loading'):state.status==='loading'?i18n.t('feed.loadingMore'):state.status==='error'?'':state.status==='end'?i18n.t('feed.end'):i18n.t('feed.idle');
  }

  async function selectMaterial(materialId){
    if(selectingMaterialId)return;const material=feed.items.find(item=>item.id===materialId);if(!material)return;
    selectingMaterialId=materialId;error.textContent='';renderSamples();
    try{
      const response=await fetch('/api/material-image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({imageUrl:material.imageUrl})});
      if(!response.ok){const value=await response.json();throw Object.assign(new Error(),{code:value.error});}
      const blob=await response.blob();const extension=blob.type==='image/png'?'png':'jpg';const safeId=String(material.id).replace(/[^a-z0-9_-]/gi,'').slice(0,40)||'material';
      setFile(new File([blob],`${safeId}.${extension}`,{type:blob.type}));requestAnimationFrame(()=>$('.workspace').scrollIntoView({behavior:'smooth',block:'start'}));
    }catch(problem){selectingMaterialId=null;error.textContent=i18n.t(`error.${problem.code||'MATERIAL_IMAGE_INVALID'}`);renderSamples();}
  }

  $('#sample-grid').addEventListener('click',event=>{const target=event.target.closest('[data-select-material]');if(target)selectMaterial(target.dataset.selectMaterial);});
  $('#feed-retry').addEventListener('click',()=>{if(pager.retry())loadRelatedMaterials(pager.snapshot().page+1,true);});
  const feedObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)&&analysis&&feed.mode==='related')loadRelatedMaterials(pager.snapshot().page+1,true);},{rootMargin:'800px 0px'});
  feedObserver.observe($('#feed-sentinel'));
  $('#language').addEventListener('click',()=>i18n.setLocale(i18n.locale==='en'?'zh':'en'));i18n.subscribe(applyLocale);copy.addEventListener('click',()=>input.click());drop.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();input.click();}});input.addEventListener('change',()=>input.files[0]&&setFile(input.files[0]));$('#replace').addEventListener('click',event=>{event.stopPropagation();input.click();});['dragenter','dragover'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('is-dragging');}));['dragleave','drop'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove('is-dragging');}));drop.addEventListener('drop',event=>event.dataTransfer.files[0]&&setFile(event.dataTransfer.files[0]));analyze.addEventListener('click',runAnalysis);applyLocale();
})();
