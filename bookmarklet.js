(function(){
  if(window.sq){
     window.sq.closed && window.document.dispatchEvent(new Event('squirt.again'));
  } else {
    window.sq = {};
    s = document.createElement('script');
    s.host = '//squirt-it.imfast.io/';
    s.src = s.host + 'squirt.js';
    document.body.appendChild(s);
  }
})();
