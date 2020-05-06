var sq = window.sq;
sq.version = '0.0.1';

(function(){

  var $ = document.querySelector.bind(document);

  on('mousemove', function(){
    $('.sq .sq-modal').style.cursor = 'auto';
  });

  const
    URL_FONTAWESOME_CSS = sq.host + 'font-awesome.css',
    URL_SQUIRT_CSS = sq.host + 'squirt.css',
    URL_READABILITY_JS = sq.host + 'readability.js',

    WAIT_SHORTWORD = 1.2,
    WAIT_COMMA = 2,
    WAIT_PERIOD = 3,
    WAIT_PARAGRAPH = 3.5,
    WAIT_LONGWORD = 1.5,
    WAIT_PERSON_TITLE = 1,
    WAIT_DEFAULT = 1,

    PERSON_TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.'],

    _M = (msg) => 'squirt.' + msg,

    MSG = {
      close: _M('close'),
      play: _M('play'),
      playToggle: _M('play.toggle'),
      rewind: _M('rewind'),
      pause: _M('pause'),
      pauseAfter: _M('pause.after'),
      again: _M('again'),
      wpm: _M('wpm'),
      wpmAfter: _M('wpm.after'),
      wpmAdjust: _M('wpm.adjust'),
      elsRender: _M('els.render'),
      readabilityReady: 'readability.ready',
    }
  ;


  (function makeSquirt(read, makeGUI) {

    on(MSG.again, startSquirt);
    injectStylesheet(URL_FONTAWESOME_CSS);
    injectStylesheet(URL_SQUIRT_CSS, function(){
      makeGUI();
      startSquirt();
    });

    function startSquirt(){
      showGUI();
      getText(read);
    }

    function getText(read){
      // text source: demo
      if(window.squirtText) return read(window.squirtText);

      // text source: selection
      var selection = window.getSelection();
      if(selection.type == 'Range') {
        var container = document.createElement("div");
        for (var i = 0, len = selection.rangeCount; i < len; ++i) {
          container.appendChild(selection.getRangeAt(i).cloneContents());
        }
        return read(container.textContent);
      }

      // text source: readability
      var handler;
      function readabilityReady(){
        handler && document.removeEventListener(MSG.readabilityReady, handler);
        read(readability.grabArticleText());
      }

      if(window.readability) return readabilityReady();

      makeEl('script', {
        src: URL_READABILITY_JS
      }, document.head);
      handler = on(MSG.readabilityReady, readabilityReady);
    }
  })(makeRead(makeTextToNodes(wordToNode)), makeGUI);

  function makeRead(textToNodes) {
    sq.paused = false;
    var nodeIdx,
        nodes,
        lastNode,
        nextNodeTimeoutId;

    function incrememntNodeIdx(increment){
      var ret = nodeIdx;
      nodeIdx += increment || 1;
      nodeIdx = Math.max(0, nodeIdx);
      prerender();
      return ret;
    }

    var intervalMs, _wpm;
    function wpm(wpm){
      _wpm = wpm;
      intervalMs = 60 * 1000 / wpm ;
    }

    (function readerEventHandlers(){
      on(MSG.close, function(){
        sq.closed = true;
        clearTimeout(nextNodeTimeoutId);
      });

      on(MSG.wpmAdjust, function(e){
        dispatch(MSG.wpm, {value: e.value + _wpm});
      });

      on(MSG.wpm, function(e){
        sq.wpm = Number(e.value);
        wpm(e.value);
        dispatch(MSG.wpmAfter);
      });

      on(MSG.pause, pause);
      on(MSG.play, play);

      on(MSG.playToggle, function(){
        dispatch(sq.paused ? MSG.play : MSG.pause);
      });

      on(MSG.rewind, function(e){
        // Rewind by `e.value` seconds. Then walk back to the
        // beginning of the sentence.
        !sq.paused && clearTimeout(nextNodeTimeoutId);
        incrememntNodeIdx(-Math.floor(e.seconds * 1000 / intervalMs));
        while(!nodes[nodeIdx].word.match(/\./) && nodeIdx < 0){
          incrememntNodeIdx(-1);
        }
        nextNode(true);
      });
    })();

    function pause(){
      sq.paused = true;
      dispatch(MSG.pauseAfter);
      clearTimeout(nextNodeTimeoutId);
    }

    function play(e){
      sq.paused = false;
      dispatch(MSG.pauseAfter);
      hide($('.sq .wpm-selector'))
      nextNode(e.jumped);
    }

    var toRender;
    function prerender(){
      toRender = nodes[nodeIdx];
      if(toRender == null) return;
      prerenderer.appendChild(toRender);
      nodes[nodeIdx].center();
    }

    function finalWord(){
      toggle($('.sq .reader'));
      showDoneMessgae(nodes.length, (nodes.length * intervalMs / 1000 / 60).toFixed(1));
      toggle(finalWordContainer);
      return;
    }

    var delay, jumped, nextIdx;
    function nextNode(jumped) {
      lastNode && lastNode.remove();

      nextIdx = incrememntNodeIdx();
      if(nextIdx >= nodes.length) return finalWord();

      lastNode = nodes[nextIdx];
      wordContainer.appendChild(lastNode);
      lastNode.instructions && invoke(lastNode.instructions);
      if(sq.paused) return;
      nextNodeTimeoutId = setTimeout(nextNode, intervalMs * getDelay(lastNode, jumped));
    }

    function getDelay(node, jumped){
      var word = node.word;
      if(jumped) return WAIT_PERIOD;

      if (~PERSON_TITLES.indexOf(word)) return WAIT_PERSON_TITLE;

      var lastChar = word[word.length - 1];
      if(lastChar.match('”|"')) lastChar = word[word.length - 2];
      if(lastChar == '\n') return WAIT_PARAGRAPH;
      if('.!?'.indexOf(lastChar) != -1) return WAIT_PERIOD;
      if(',;:–'.indexOf(lastChar) != -1) return WAIT_COMMA;
      if(word.length < 4) return WAIT_SHORTWORD;
      if(word.length > 11) return WAIT_LONGWORD;
      return WAIT_DEFAULT;
    }

    function showDoneMessgae(words, minutes){
      var html = "<div>You just read " + words + " words in " + minutes + " minutes!</div>";
      finalWordContainer.innerHTML = html;
    }

    function readabilityFail(){
        var modal = $('.sq .sq-modal');
        modal.innerHTML = '<div class="error">Oops! This page is too hard for Squirt to read. We\'ve been notified, and will do our best to resolve the issue shortly.</div>';
    }

    dispatch(MSG.wpm, {value: 400});

    var wordContainer,
        prerenderer,
        finalWordContainer;
    function initDomRefs(){
      wordContainer = $('.sq .word-container');
      invoke(wordContainer.querySelectorAll('.sq .word'), 'remove');
      prerenderer = $('.sq .word-prerenderer');
      finalWordContainer = $('.sq .final-word');
      show($('.sq .reader'));
      hide(finalWordContainer);
    }

    return function read(text) {
      initDomRefs();
      if(!text) return readabilityFail();

      nodes = textToNodes(text);
      nodeIdx = 0;

      prerender();
      dispatch(MSG.play);
    };
  }

  function makeTextToNodes(wordToNode) {
    return function textToNodes(text) {
      text = "3\n 2\n 1\n " + text.trim('\n').replace(/\s+\n/g,'\n');
      return text
             .replace(/[\,\.\!\:\;](?![\"\'\)\]\}])/g, "$& ")
             .split(/[\s]+/g)
             .filter(function(word){ return word.length; })
             .map(wordToNode);
    };
  }

  var instructionsRE = /#SQ(.*)SQ#/;
  function parseSQInstructionsForWord(word, node){
    var match = word.match(instructionsRE);
    if(match && match.length > 1){
      node.instructions = [];
      match[1].split('#')
      .filter(function(w){ return w.length; })
      .map(function(instruction){
        var val = Number(instruction.split('=')[1]);
        node.instructions.push(function(){
          dispatch(MSG.wpm, {value: val})
        });
      });
      return word.replace(instructionsRE, '');
    }
    return word;
  }

  // ORP: Optimal Recognition Point
  function getORPIndex(word){
    var length = word.length;
    var lastChar = word[word.length - 1];
    if(lastChar == '\n'){
      lastChar = word[word.length - 2];
      length--;
    }
    if(',.?!:;"'.indexOf(lastChar) != -1) length--;
    return length <= 1 ? 0 :
      (length == 2 ? 1 :
          (length == 3 ? 1 :
              Math.floor(length / 2) - 1));
  }

  function wordToNode(word) {
    var node = makeDiv({'class': 'word'});
    node.word = parseSQInstructionsForWord(word, node);

    var orpIdx = getORPIndex(node.word);

    node.word.split('').map(function charToNode(char, idx) {
      var span = makeEl('span', {}, node);
      span.textContent = char;
      if(idx == orpIdx) span.classList.add('orp');
    });

    node.center = (function(orpNode) {
      var val = orpNode.offsetLeft + (orpNode.offsetWidth / 2);
      node.style.left = "-" + val + "px";
    }).bind(null, node.children[orpIdx]);

    return node;
  }

  var disableKeyboardShortcuts;
  function showGUI(){
    blur();
    show($('.sq'));
    disableKeyboardShortcuts = on('keydown', handleKeypress);
  }

  function hideGUI(){
    unblur();
    hide($('.sq'));
    disableKeyboardShortcuts && disableKeyboardShortcuts();
  }

  var keyHandlers = {
      32: dispatch.bind(null, MSG.playToggle),
      27: dispatch.bind(null, MSG.close),
      38: dispatch.bind(null, MSG.wpmAdjust, {value: 10}),
      40: dispatch.bind(null, MSG.wpmAdjust, {value: -10}),
      37: dispatch.bind(null, MSG.rewind, {seconds: 10})
  };

  function handleKeypress(e){
    var handler = keyHandlers[e.keyCode];
    handler && (handler(), e.preventDefault())
    return false;
  }

  function blur(){
    map(document.body.children, function(node){
      if(!node.classList.contains('sq'))
        node.classList.add('sq-blur');
    });
  }

  function unblur(){
    map(document.body.children, function(node){
      node.classList.remove('sq-blur');
    });
  }

  function makeGUI(){
    var squirt = makeDiv({class: 'sq'}, document.body);
    hide(squirt);
    on(MSG.close, hideGUI);
    var obscure = makeDiv({class: 'sq-obscure'}, squirt);
    on(obscure, 'click', function(){
      dispatch(MSG.close);
    });

    var modal = makeDiv({'class': 'sq-modal'}, squirt);

    var controls = makeDiv({'class':'controls'}, modal);
    var reader = makeDiv({'class': 'reader'}, modal);
    var wordContainer = makeDiv({'class': 'word-container'}, reader);
    makeDiv({'class': 'focus-indicator-gap'}, wordContainer);
    makeDiv({'class': 'word-prerenderer'}, wordContainer);
    makeDiv({'class': 'final-word'}, modal);
    var keyboard = makeDiv({'class': 'keyboard-shortcuts'}, reader);
    keyboard.innerText = "Keys: Space, Esc, Up, Down";

    (function make(controls){

      // this code is suffering from delirium
      (function makeWPMSelect(){

        // create the ever-present left-hand side button
        var control = makeDiv({'class': 'sq wpm sq control'}, controls);
        var wpmLink = makeEl('a', {}, control);
        bind("{{wpm}} WPM", sq, wpmLink);
        on(MSG.wpmAfter, wpmLink.render);
        on(control, 'click', function(){
          toggle(wpmSelector) ?
            dispatch(MSG.pause) :
            dispatch(MSG.play);
        });

        // create the custom selector
        var wpmSelector = makeDiv({'class': 'sq wpm-selector'}, controls);
        hide(wpmSelector);
        var plus50OptData = {add: 50, sign: "+"};
        var datas = [];
        for(var wpm = 200; wpm < 1000; wpm += 100){
          var opt = makeDiv({'class': 'sq wpm-option'}, wpmSelector);
          var a = makeEl('a', {}, opt);
          a.data = { baseWPM: wpm };
          a.data.__proto__ = plus50OptData;
          datas.push(a.data);
          bind("{{wpm}}",  a.data, a);
          on(opt, 'click', function(e){
            dispatch(MSG.wpm, {value: e.target.firstChild.data.wpm});
            dispatch(MSG.play);
            hide(wpmSelector);
          });
        }

        // create the last option for the custom selector
        var plus50Opt = makeDiv({'class': 'sq wpm-option sq wpm-plus-50'}, wpmSelector);
        var a = makeEl('a', {}, plus50Opt);
        bind("{{sign}}50", plus50OptData, a);
        on(plus50Opt, 'click', function(){
          datas.map(function(data){
            data.wpm = data.baseWPM + data.add;
          });
          var toggle = plus50OptData.sign == '+';
          plus50OptData.sign = toggle ? '-' : '+';
          plus50OptData.add = toggle ? 0 : 50;
          dispatch(MSG.elsRender);
        });
        dispatch('click', {}, plus50Opt);
      })();

      (function makeRewind(){
        var container = makeEl('div', {'class': 'sq rewind sq control'}, controls);
        var a = makeEl('a', {}, container);
        a.href = '#';
        on(container, 'click', function(e){
          dispatch(MSG.rewind, {seconds: 10});
          e.preventDefault();
        });
        a.innerHTML = "<i class='fa fa-backward'></i> 10s";
      })();

      (function makePause(){
        var container = makeEl('div', {'class': 'sq pause control'}, controls);
        var a = makeEl('a', {'href': '#'}, container);
        var pauseIcon = "<i class='fa fa-pause'></i>";
        var playIcon = "<i class='fa fa-play'></i>";
        function updateIcon(){
          a.innerHTML = sq.paused ? playIcon : pauseIcon;
        }
        on(MSG.pauseAfter, updateIcon);
        on(container, 'click', function(clickEvt){
          dispatch(MSG.playToggle);
          clickEvt.preventDefault();
        });
        updateIcon();
      })();
    })(controls);
  }

  // utilites

  function map(listLike, f){
    listLike = Array.prototype.slice.call(listLike); // for safari
    return Array.prototype.map.call(listLike, f);
  }

  // invoke([f1, f2]); // calls f1() and f2()
  // invoke([o1, o2], 'func'); // calls o1.func(), o2.func()
  // args are applied to both invocation patterns
  function invoke(objs, funcName, args){
    args = args || [];
    var objsAreFuncs = false;
    switch(typeof funcName){
      case "object":
      args = funcName;
      break;
      case "undefined":
      objsAreFuncs = true;
    }
    return map(objs, function(o){
      return objsAreFuncs ? o.apply(null, args) : o[funcName].apply(o, args);
    });
  }

  function makeEl(type, attrs, parent) {
    var el = document.createElement(type);
    for(var k in attrs){
      if(!attrs.hasOwnProperty(k)) continue;
      el.setAttribute(k, attrs[k]);
    }
    parent && parent.appendChild(el);
    return el;
  }

  // data binding... *cough*
  function bind(expr, data, el){
    el.render = render.bind(null, expr, data, el);
    return on(MSG.elsRender, function(){
      el.render();
    });
  }

  function render(expr, data, el){
    var match, rendered = expr;
    expr.match(/{{[^}]+}}/g).map(function(match){
      var val = data[match.substr(2, match.length - 4)];
      rendered = rendered.replace(match, val == undefined ? '' : val);
    });
    el.textContent = rendered;
  }

  function makeDiv(attrs, parent){
    return makeEl('div', attrs, parent);
  }

  function injectStylesheet(url, onLoad){
    var el = makeEl('link', {
      rel: 'stylesheet',
      href: url,
      type: 'text/css'
    }, document.head);
    function loadHandler(){
      onLoad();
      el.removeEventListener('load', loadHandler)
    }
    onLoad && on(el, 'load', loadHandler);
  }


  function on(bus, evts, cb){
    if(cb === undefined){
      cb = evts;
      evts = bus;
      bus = document;
    }
    evts = typeof evts == 'string' ? [evts] : evts;
    var removers = evts.map(function(evt){
      bus.addEventListener(evt, cb);
      return function(){
        bus.removeEventListener(evt, cb);
      };
    });
    if(removers.length == 1) return removers[0];
    return removers;
  }

  function dispatch(evt, attrs, dispatcher){
    var evt = new Event(evt);
    for(var k in attrs){
      if(!attrs.hasOwnProperty(k)) continue
      evt[k] = attrs[k];
    }
    (dispatcher || document).dispatchEvent(evt);
  }

  function toggle(el){
    var s = window.getComputedStyle(el);
    return (el.style.display = s.display == 'none' ? 'block' : 'none') == 'block';
  }

  function show(el) {
    el.style.display = 'block';
  }

  function hide(el) {
    el.style.display = 'none';
  }

})();
