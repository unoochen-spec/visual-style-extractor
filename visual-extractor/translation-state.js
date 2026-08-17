(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VibeTranslationState=api;})(globalThis,function(){
  function createTranslationState(){
    let generation=0;
    const cache={en:null,zh:null};
    const pending={en:null,zh:null};
    const localeOf=value=>value==='zh'?'zh':'en';
    return{
      reset(){generation+=1;cache.en=null;cache.zh=null;pending.en=null;pending.zh=null;return generation;},
      store(locale,value,expectedGeneration=generation){if(expectedGeneration!==generation)return false;cache[localeOf(locale)]=value;return true;},
      get(locale){return cache[localeOf(locale)];},
      start(locale){const target=localeOf(locale);if(pending[target])return null;const token={locale:target,generation};pending[target]=token;return token;},
      finish(token,value){if(!token||pending[token.locale]!==token)return false;pending[token.locale]=null;if(token.generation!==generation)return false;cache[token.locale]=value;return true;},
      fail(token){if(!token||pending[token.locale]!==token)return false;pending[token.locale]=null;return true;},
      isPending(locale){return Boolean(pending[localeOf(locale)]);}
    };
  }
  return{createTranslationState};
});
