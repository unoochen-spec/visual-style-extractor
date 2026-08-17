(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VibeRecommendations=api;})(globalThis,function(){
  const base='?auto=format&fit=max&w=1200&q=82';
  const source='https://unsplash.com/s/photos/editorial-design?utm_source=vibe_dna&utm_medium=referral';
  const FALLBACK=[
    ['curated-01','https://images.unsplash.com/photo-1500530855697-b586d89ba3ee','OPEN HORIZON',2048,1365,['landscape','minimal','calm']],
    ['curated-02','https://images.unsplash.com/photo-1497366754035-f200968a6e72','CREATIVE WORKSPACE',2048,1366,['interior','workspace','modern']],
    ['curated-03','https://images.unsplash.com/photo-1518005020951-eccb494ad742','STRUCTURAL RHYTHM',1365,2048,['architecture','geometry','light']],
    ['curated-04','https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85','SOFT DOMESTIC',2048,1365,['interior','neutral','soft']],
    ['curated-05','https://images.unsplash.com/photo-1487958449943-2429e8be8625','MODERN FACADE',2048,1365,['architecture','white','grid']],
    ['curated-06','https://images.unsplash.com/photo-1523726491678-bf852e717f6a','DESIGN DESK',2048,1365,['design','editorial','tools']],
    ['curated-07','https://images.unsplash.com/photo-1511818966892-d7d671e672a2','CONCRETE STUDY',2048,1365,['brutalist','concrete','monochrome']],
    ['curated-08','https://images.unsplash.com/photo-1497366811353-6870744d04b2','OPEN STUDIO',2048,1365,['studio','space','clean']],
    ['curated-09','https://images.unsplash.com/photo-1503602642458-232111445657','OBJECT & SHADOW',1365,2048,['object','shadow','minimal']],
    ['curated-10','https://images.unsplash.com/photo-1524758631624-e2822e304c36','SYSTEM OFFICE',2048,1365,['office','system','color']],
    ['curated-11','https://images.unsplash.com/photo-1519947486511-46149fa0a254','PAPER DETAIL',2048,1365,['paper','texture','warm']],
    ['curated-12','https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e','QUIET INTERIOR',2048,1365,['interior','pastel','quiet']]
  ].map(([id,url,title,width,height,tags])=>({id,imageUrl:url+base,width,height,color:'#e5e5e5',title,author:'Unsplash / Curated',authorUrl:source,sourceUrl:source,tags}));

  function getFallbackMaterials(){return FALLBACK.map(card=>({...card,tags:card.tags.slice()}));}
  function mergeMaterials(current=[],incoming=[]){const ids=new Set();return [...current,...incoming].filter(card=>card&&card.id&&!ids.has(card.id)&&ids.add(card.id));}

  return{FALLBACK,getFallbackMaterials,mergeMaterials};
});
