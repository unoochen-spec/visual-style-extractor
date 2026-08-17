(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VibeLoading=api;})(globalThis,function(){
  function createLoadingTracker({now=Date.now,stepCount=4}={}){
    const startedAt=now();let step=0;
    return{
      advance(){step=Math.min(step+1,Math.max(0,stepCount-1));return step;},
      snapshot(){return{step,elapsedSeconds:Math.floor(Math.max(0,now()-startedAt)/1000)};}
    };
  }
  return{createLoadingTracker};
});
