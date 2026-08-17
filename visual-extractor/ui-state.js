(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VibeUIState=api;})(globalThis,function(){
  function getWorkspaceState(input={}){
    if(input.isAnalyzing)return'analyzing';
    if(input.hasAnalysis)return'complete';
    if(input.hasError)return'error';
    if(input.hasFile)return'selected';
    return'empty';
  }

  function renderFeedSkeletons(count=6){
    const amount=Math.max(0,Math.floor(Number(count)||0));
    const cards=Array.from({length:amount},(_,index)=>`<article class="material-card material-skeleton skeleton-${index+1}" data-skeleton-card><div class="skeleton-image"></div><div class="material-info"><span class="skeleton-line skeleton-meta"></span><span class="skeleton-line skeleton-title"></span><div class="skeleton-tags"><span></span><span></span><span></span></div><span class="skeleton-line skeleton-credit"></span></div></article>`).join('');
    return`<div class="feed-skeletons" aria-hidden="true">${cards}</div>`;
  }

  function getRemainingLoadingMs({startedAt=0,now=Date.now(),minimumMs=600}={}){
    return Math.max(0,Number(minimumMs)-(Number(now)-Number(startedAt)));
  }

  return{getWorkspaceState,renderFeedSkeletons,getRemainingLoadingMs};
});
