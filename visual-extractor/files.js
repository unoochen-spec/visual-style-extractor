(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VibeFiles=api;})(globalThis,function(){
  const MAX_FILE_BYTES=10*1024*1024;
  const TYPES=['image/jpeg','image/png'];
  function validateImage(file){if(!file||!TYPES.includes(file.type))return{ok:false,code:'TYPE'};if(file.size>MAX_FILE_BYTES)return{ok:false,code:'SIZE'};return{ok:true};}
  return{MAX_FILE_BYTES,validateImage};
});
