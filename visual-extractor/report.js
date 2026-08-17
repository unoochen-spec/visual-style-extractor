(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VibeReport=api;})(globalThis,function(){
  function formatReport(a,locale='en'){const zh=locale==='zh';return`${zh?'整体氛围':'VIBE SUMMARY'}\n${a.summary}\n\n${zh?'主配色方案':'COLOR PALETTE'}\n${a.palette.map(x=>`${x.hex} — ${x.role}`).join('\n')}\n\n${zh?'构图与光影':'COMPOSITION & LIGHT'}\n${Object.values(a.composition).join(' / ')}\n\n${zh?'材质与质感':'TEXTURE & MATERIAL'}\n${a.textures.join(' / ')}\n\n${zh?'风格标签':'STYLE TAGS'}\n${a.tags.join(' / ')}\n\n${zh?'AI 绘图提示词':'AI PROMPT'}\n${a.prompt}`;}
  return{formatReport};
});
