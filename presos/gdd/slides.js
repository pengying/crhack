/*
  Google I/O 2011 HTML slides template

  Created by Luke Mahé
         and Marcin Wichary

*/

var PERMANENT_URL_PREFIX = 'http://io-2011-slides.googlecode.com/svn/trunk/';

var curSlide;
var videoAd = "<object " +
    "classid=\"clsid:d27cdb6e-ae6d-11cf-96b8-444553540000\"" +
    "codebase=\"http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=10,0,0,0\"" +
    "width=\"800\" height=\"500\"" +
    "id=\"afg-adloader\"" + 
    "align=\"middle\">" + 
    "<param name=\"allowScriptAccess\" value=\"always\" />" + 
    "<param name=\"allowFullScreen\" value=\"false\" />" +
    "<param name=\"movie\" value=\"afg-adloader.swf\" />" +
    "<param name=\"quality\" value=\"high\" />" +
    "<param name=\"bgcolor\" value=\"#000000\" />" +
    "<embed src=\"afg-adloader.swf\"" +
        "quality=\"high\" bgcolor=\"#000000\"" +
        "width=\"800\" height=\"500\"" +
        "name=\"afg-adloader\"" +
        "align=\"middle\" allowScriptAccess=\"always\"" +
        "allowFullScreen=\"false\"" +
        "type=\"application/x-shockwave-flash\"" +

        "flashVars=\"publisherId=ca-video-pub-4968145218643279&descriptionUrl=http%3a%2f%2ftesturl.com/something.html?testing%3dtrue%26var1%3dnew&age=1001&gender=1&channels=abcd;xyz\"" +
        "pluginspage=\"http://www.adobe.com/go/getflashplayer\" />" +
  "</object>";
  
function handleBodyKeyDown(event) {
  switch (event.keyCode) {
    case 39: // right arrow
    case 40: // down arrow
    case 13: // Enter
    case 32: // space
    case 34: // PgDn
      nextSlide();
      event.preventDefault();
      break;

    case 37: // left arrow
    case 38: // top arrow
    case 8: // Backspace
    case 33: // PgUp
      prevSlide();
      event.preventDefault();
      break;

  }
}

function getCurSlideFromHash() {
  var slideNo = parseInt(location.hash.substr(1));

  if (slideNo) {
    curSlide = slideNo - 1;
  } else {
    curSlide = 0;
  }
}

function updateHash() {
  location.replace('#' + (curSlide + 1));
}

function triggerEnterEvent(slide, slideNo) {
  if (!slide) {
    return;
  }

  var onEnter = slide.getAttribute('onslideenter');
  if (onEnter) {
    new Function(onEnter).call(slide);
  }

  var evt = document.createEvent('Event');
  evt.initEvent('slideenter', true, true);
  evt.slideNumber = slideNo + 1; // Make it readable

  slide.dispatchEvent(evt);
};

function triggerLeaveEvent(slide, slideNo) {
  if (!slide) {
    return;
  }

  var onLeave = slide.getAttribute('onslideleave');
  if (onLeave) {
    new Function(onLeave).call(slide);
  }

  var evt = document.createEvent('Event');
  evt.initEvent('slideleave', true, true);
  evt.slideNumber = slideNo + 1; // Make it readable
  slideEls[slideNo].dispatchEvent(evt);
};

function updateSlideClass(el, className) {
  if (el) {    
    if (className) {
      el.classList.add(className);
    } else {
      el.classList.remove('far-past');
      el.classList.remove('past');
      el.classList.remove('current');
      el.classList.remove('next');
      el.classList.remove('far-next');      
    }
  }
}

function updateSlideClasses() {
  for (var i = 0, el; el = slideEls[i]; i++) {
    updateSlideClass(el);
  }

  if(curSlide >1)
    updateSlideClass(slideEls[curSlide - 2], 'far-past');
  
  if(curSlide >0) {
    updateSlideClass(slideEls[curSlide - 1], 'past');
    triggerLeaveEvent(slideEls[curSlide - 1], curSlide - 1);
  }

  updateSlideClass(slideEls[curSlide], 'current');

  triggerEnterEvent(slideEls[curSlide], curSlide);

  updateSlideClass(slideEls[curSlide + 1], 'next');
  updateSlideClass(slideEls[curSlide + 2], 'far-next');

  
  window.setTimeout(function() {
    // Hide after the slide
    if(curSlide >1)
    disableFramesForSlide(slideEls[curSlide - 2]);
  }, 301);

  if(curSlide >0) 
  enableFramesForSlide(slideEls[curSlide - 1]);
  enableFramesForSlide(slideEls[curSlide + 2]);

  updateHash();
}

function buildNextItem() {
  
  
  var toBuild  = slideEls[curSlide].querySelectorAll('.to-build');

  if (!toBuild.length) {
    return false;
  }

  if (slideEls[curSlide].childNodes.length > 0 && slideEls[curSlide].children[0].id == 'video' ){
    slideEls[curSlide].children[0].innerHTML = videoAd;
  }
  
  toBuild[0].classList.remove('to-build', '');

  return true;
}

function buildNextHiddenItem() {
  var toBuild  = slideEls[curSlide].querySelectorAll('.to-hiddenbuild');
  var toShown = slideEls[curSlide].querySelectorAll('.to-shown');
  
  if (!toBuild.length) {
    return false;
  }

  if(toShown.length){
    toShown[0].classList.remove('to-shown', '');
    toShown[0].classList.add('to-hidden', '');
    toShown[0].style.visibility = "0"
    toShown[0].style.display = "none";
  }
  
  toBuild[0].classList.remove('to-hiddenbuild', '');
  toBuild[0].classList.add('to-shown', '');

  return true;
}

function prevSlide() {
  if (curSlide > 0) {
    curSlide--;

    updateSlideClasses();
  }
}

function nextSlide() {
  if (buildNextItem()) {
    return;
  }

  if (buildNextHiddenItem()){
    return;
  }
  
  if (curSlide < slideEls.length - 1) {
    curSlide++;

    updateSlideClasses();
  }
}

function addPrettify() {
  var els = document.querySelectorAll('pre');
  for (var i = 0, el; el = els[i]; i++) {
    if (!el.classList.contains('noprettyprint')) {
      el.classList.add('prettyprint');
    }
  }
  
  var el = document.createElement('script');
  el.type = 'text/javascript';
  el.src = /* PERMANENT_URL_PREFIX + */ 'prettify.js';
  el.onload = function() {
    prettyPrint();
  }
  document.body.appendChild(el);
}

function addFontStyle() {
  var el = document.createElement('link');
  el.rel = 'stylesheet';
  el.type = 'text/css';
  el.href = 'http://fonts.googleapis.com/css?family=Open+Sans:regular,semibold,italic,italicsemibold|Droid+Sans+Mono';

  document.body.appendChild(el);
}

function addGeneralStyle() {
  var el = document.createElement('link');
  el.rel = 'stylesheet';
  el.type = 'text/css';
  el.href = /*PERMANENT_URL_PREFIX + */ 'styles.css';

  document.body.appendChild(el);
}

function disableFramesForSlide(slide) {
  if (!slide) {
    return;
  }

  var frames = slide.getElementsByTagName('iframe');
  for (var i = 0, frame; frame = frames[i]; i++) {
    disableFrame(frame);
  }

}

function enableFramesForSlide(slide) {
  if (!slide) {
    return;
  }

  var frames = slide.getElementsByTagName('iframe');
  for (var i = 0, frame; frame = frames[i]; i++) {
    enableFrame(frame);
  }
}

function disableFrame(frame) {
  frame.src = 'about:blank';
}

function enableFrame(frame) {
  var src = frame._src;

  if (frame.src != src && src != 'about:blank') {
    frame.src = src;
  }
}

function setupFrames() {
  var frames = document.querySelectorAll('iframe');
  for (var i = 0, frame; frame = frames[i]; i++) {
    frame._src = frame.src;
    disableFrame(frame);
  }
}

function makeBuildLists() {
  for (var i = curSlide, slide; slide = slideEls[i]; i++) {
    var items = slide.querySelectorAll('.build > *');
    for (var j = 0, item; item = items[j]; j++) {
      if (item.classList) {
        item.classList.add('to-build');
      }
    }
  }
}

function makeBuildHiddenLists() {
  for (var i = curSlide, slide; slide = slideEls[i]; i++) {
    var items = slide.querySelectorAll('.hiddenbuild > *');
    for (var j = 0, item; item = items[j]; j++) {
      if (item.classList) {
        item.classList.add('to-hiddenbuild');
      }
    }
  }
}

function handleDomLoaded() {
  slideEls = document.querySelectorAll('section.slides > article');

  setupFrames();
  makeBuildLists();
  makeBuildHiddenLists();

  addFontStyle();
  addGeneralStyle();
  addPrettify();

  document.body.classList.add('loaded');

  updateSlideClasses();

  enableFramesForSlide(slideEls[curSlide + 2]);
  enableFramesForSlide(slideEls[curSlide]);
  enableFramesForSlide(slideEls[curSlide + 1]);

  document.body.addEventListener('keydown', handleBodyKeyDown, false);
}

function initialize() {
  getCurSlideFromHash();

  document.addEventListener('DOMContentLoaded', handleDomLoaded, false);
}

initialize();
