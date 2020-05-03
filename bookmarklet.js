(function(){
  if(window.sq){
     window.sq.closed && window.document.dispatchEvent(new Event('squirt.again'));
  } else {
    window.sq = { host: '//squirt-it.imfast.io/' };
    s = document.createElement('script');
    s.src = sq.host + 'squirt.js';
    document.body.appendChild(s);
  }
})();
