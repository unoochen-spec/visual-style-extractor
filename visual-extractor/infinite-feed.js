(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VibeInfiniteFeed=api;})(globalThis,function(){
  function createInfiniteFeedState(initial={}){
    let page=Math.max(1,Number(initial.page)||1);
    let totalPages=Math.max(page,Number(initial.totalPages)||page);
    let status=page>=totalPages?'end':'idle';
    function snapshot(){return{status,page,totalPages,canLoad:status==='idle'&&page<totalPages};}
    return{
      snapshot,
      start(){if(!snapshot().canLoad)return false;status='loading';return true;},
      success(next={}){page=Math.max(page,Number(next.page)||page);totalPages=Math.max(page,Number(next.totalPages)||totalPages);status=page>=totalPages?'end':'idle';return snapshot();},
      fail(){if(status==='loading')status='error';return snapshot();},
      retry(){if(status!=='error')return false;status=page>=totalPages?'end':'idle';return status==='idle';},
      reset(next={}){page=Math.max(1,Number(next.page)||1);totalPages=Math.max(page,Number(next.totalPages)||page);status=page>=totalPages?'end':'idle';return snapshot();}
    };
  }
  return{createInfiniteFeedState};
});
