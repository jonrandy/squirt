(function(){
  if(window.sq){
     window.sq.closed && window.document.dispatchEvent(new Event('squirt.again'));
  } else {
    window.sq = {};
    s = document.createElement('script');
    s.src = '//squirt-it.imfast.io/squirt.js';
    document.body.appendChild(s);
  }
})();
