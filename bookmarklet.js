(function(){
  if(window.sq){
     window.sq.closed && window.document.dispatchEvent(new Event('squirt.again'));
  } else {
    window.sq = {};
    s = document.createElement('script');
    sq.host = '//squirt-it.imfast.io/';
    s.src = sq.host + 'squirt.js';
    document.body.appendChild(s);
  }
})();
