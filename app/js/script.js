(function(exports) {
var FILE_QUEUE = [];

//Lets define the possible avatars
//Well probably need to do some form of server verification
//TODO(pying):server verification
var Avatars = {
  'Monkey': 'img/monkey.gif',
  'Html5': 'img/html5.png'
};

const REMOVE_DELAY = 4000; // Remove chat bubble after 4s.
const MIN_CHROME_VERSION = 13;

var verOffset = navigator.userAgent.indexOf('Chrome');
var fullVersion = navigator.userAgent.substring(verOffset + 7).substring(0, 2);
if (verOffset == -1 || fullVersion < MIN_CHROME_VERSION) {
  $("#not-supported").removeClass("hidden");
  return;
}


var dndc = new DNDFileController('drop-file-area');
var dndlist = new DNDList('song-list');

var listArea = document.getElementById('song-list');

function DNDFileController(dropId) {
  var el_ = document.getElementById(dropId);
  
  this.dragenter = function(e) {
    e.stopPropagation();
    e.preventDefault();
    el_.classList.add('active');
  };

  this.dragover = function(e) {
    e.stopPropagation();
    e.preventDefault();
  };

  this.dragleave = function(e) {
    e.stopPropagation();
    e.preventDefault();
    el_.classList.remove('active');
  };

  this.drop = function(e) {
    e.stopPropagation();
    e.preventDefault();

    el_.classList.remove('active');

    readDraggedFiles(e.dataTransfer.files);

    return false;
  };

  el_.addEventListener("dragenter", this.dragenter, false);
  el_.addEventListener("dragover", this.dragover, false);
  el_.addEventListener("dragleave", this.dragleave, false);
  el_.addEventListener("drop", this.drop, false);
  
};

function readDraggedFiles(files) {
  for (var i = 0, file; file = files[i]; i++) {
    var audioType = /audio\/*/;
    if (!file.type.match(audioType)) {
      continue;
    }
    renderFileMeta(file);
    // saveSongList();
  }
}

function renderFileMeta(aFile) {
  var li = document.createElement('li');
  li.appendChild(document.createTextNode(aFile.name));
  li.dataset['songname'] = aFile.name;
  dndlist.addItem(li);
  listArea.appendChild(li);
  FILE_QUEUE.push(aFile);
}

// ready to be used if needed
function readFileContent(file) {
  var reader = new FileReader();

  reader.onerror = function(evt) {
     var msg = 'Error ' + evt.target.error.code;
     switch (evt.target.error.code) {
       case FileError.NOT_READABLE_ERR:
         msg += ': NOT_READABLE_ERR';
         break;
       case FileError.SECURITY_ERR:
         msg += ': SECURITY_ERR';
         break;
     };
     alert(msg);
  };

  reader.onload = (function(aFile) {
    return function(evt) {
      if (evt.target.readyState == FileReader.DONE) {
        // fileContentHandler(evt, aFile)
      }
    };
  })(file);

  reader.readAsDataURL(file);
}


function DNDList(listId) {
  var id_ = listId;
  var cols_ = document.querySelectorAll('#' + id_ + ' li');
  var dragSrcEl_ = null;

  this.handleDragStart = function(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);

    dragSrcEl_ = this;

    // this/e.target is the source node.
    this.classList.add('moving');
  };

  this.handleDragOver = function(e) {
    if (e.preventDefault) {
      e.preventDefault(); // Allows us to drop.
    }

    e.dataTransfer.dropEffect = 'move';

    return false;
  };

  this.handleDragEnter = function(e) {
    this.classList.add('over');
  };

  this.handleDragLeave = function(e) {
    // this/e.target is previous target element.
    this.classList.remove('over');
  };

  this.handleDrop = function(e) {
    // this/e.target is current target element.

    if (e.stopPropagation) {
      e.stopPropagation(); // stops the browser from redirecting.
    }

    // Don't do anything if we're dropping on the same column we're dragging.
    if (dragSrcEl_ != this) {
      dragSrcEl_.innerHTML = this.innerHTML;
      this.innerHTML = e.dataTransfer.getData('text/html');
      // saveSongList();
    }

    return false;
  };

  this.handleDragEnd = function(e) {
    // this/e.target is the source node.
    [].forEach.call(cols_, function (col) {
      col.classList.remove('over');
      col.classList.remove('moving');
    });
  };
  
  this.handleClick = function(e) {
    for (var i = 0; i < FILE_QUEUE.length; i++) {
      if (e.target.dataset['songname'] && e.target.dataset['songname'] == FILE_QUEUE[i].name) {
        alert('song: ' + FILE_QUEUE[i].name + ' clicked');
      }
    }
  };
  
  [].forEach.call(cols_, function(col) {
    col.setAttribute('draggable', 'true');  // Enable columns to be draggable.
    col.addEventListener('dragstart', this.handleDragStart, false);
    col.addEventListener('dragenter', this.handleDragEnter, false);
    col.addEventListener('dragover', this.handleDragOver, false);
    col.addEventListener('dragleave', this.handleDragLeave, false);
    col.addEventListener('drop', this.handleDrop, false);
    col.addEventListener('dragend', this.handleDragEnd, false);
  }.bind(this));
  
}

DNDList.prototype.addItem = function(el) {
  el.setAttribute('draggable', 'true');  // Enable columns to be draggable.
  el.addEventListener('dragstart', this.handleDragStart, false);
  el.addEventListener('dragenter', this.handleDragEnter, false);
  el.addEventListener('dragover', this.handleDragOver, false);
  el.addEventListener('dragleave', this.handleDragLeave, false);
  el.addEventListener('drop', this.handleDrop, false);
  el.addEventListener('dragend', this.handleDragEnd, false);
  el.addEventListener('click', this.handleClick, false);
}

document.getElementById('choose-file').addEventListener('change', function(e) {
  readDraggedFiles(e.target.files);
}, false);


// deprecated
function renderSongList() {
  var songs = localStorage['songs'];
  if (songs) {
    songs = JSON.parse(songs);
    for (var i = 0; i < songs.length; i++) {
      renderFileMeta({ name: songs[i] });
    }
  }
}

function saveSongList() {
  var songArray = [];
  var list = listArea.childNodes;
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].dataset && list[i].dataset['songname']) {
      songArray.push(list[i].dataset['songname']);
    }
  }
  var songString = JSON.stringify(songArray);
  localStorage['songs'] = songString;
}

// renderSongList();


/**
 * Generates a random number between from and to.
 */
function rnd(from, to) {
  //return Math.floor(Math.random()*(max + 1));
  return Math.floor(Math.random() * (to - from + 1) + from);
}

// Returns true if the poisition at left/top are under the dj booth area.
var underDJBooth = function(left, top) {
  var djBooth = document.querySelector('#dj-booth');
  var x1 = djBooth.offsetLeft;
  var x2 = x1 + djBooth.offsetWidth;
  var y1 = djBooth.offsetTop;
  var y2 = y1 + djBooth.offsetHeight;
  return (x1 <= left && left <= x2) && (y1 <= top  && top <= y2);
};

var generateIdealCoordinate = function(width, height) {
  var minTop = $('#container > header').height();
  var maxLeft = $('body').width();
  var maxTop = $(document).height() - $('#queue-window .panel-header').height();

  // Adjust position not to be under header, bottom panel, or dj booth.
  do {
    var left = rnd(width, maxLeft - width);
    var top = rnd(minTop, maxTop - height);
  } while(underDJBooth(left, top));

  return {left: left, top: top};
};

var loadAvatars = function(){
  var avDiv = document.querySelector('#avatar-images');
  for (var i in Avatars){
    var img = document.createElement('img');
    img.src = Avatars[i];
    img.lat = i;
    img.addEventListener('click', 
function(){
  iap.buy(i);
}, false);
    avDiv.appendChild(img);
  }
}

var onAuthorized = function(data) {
  //document.querySelector('#directory-upload').disabled = false;

  var loginButton = document.querySelector('#login');
  loginButton.classList.add('hidden');

  var img = document.createElement('img');
  img.classList.add('profile-img');
  img.src = data.image.url;
  img.alt = 'You';
  img.title = img.alt;
  img.addEventListener('click', function(){
    $("#avatar").removeClass("hidden")}, false);
  loginButton.parentElement.appendChild(img);
  


  // Add avatar to dance floor.
  visualizer.addDancer(
      '#dance-floor .dudes-container', data.id, data.image.url, 64, 64);

  // Send chatter info to chat iframe.
  document.querySelector('#chat-window iframe').contentWindow.postMessage(
      data, document.location.origin);

  history.replaceState(data, 'Home', '/');
  localStorage.profile = JSON.stringify(data);

}

exports.addEventListener('message', function(e) {
  if (e.origin == document.location.origin) {
    var data = e.data;

    var $chatBubble = $('<div class="chat-popup"><strong>' + data.displayName +
                        '</strong>: ' + data.msg + '</div>');

    $('#dance-floor .dudes-container div[data-profile-id="' +
      data.profileId + '"]').append($chatBubble);

    setTimeout(function($bubble) {
      $bubble.remove();
    }, REMOVE_DELAY, $chatBubble);
  }
}, false);
  
// Needs to be onload and not DOMContentLoaded b/c need to wait for chat iframe
// to fully load.
exports.addEventListener('load', function(e) {
  if (window.location.hash) {
    
  } else if (localStorage.profile) {
    onAuthorized(JSON.parse(localStorage.profile));
  }
  
  loadAvatars();
  
  document.querySelector('#volume-control').addEventListener('change', function(e) {
    visualizer.audioPlayer.setVolume(this.valueAsNumber);
  }, false);

  exports.streamer = new AudioStreamer(
      '#choose-file', '.booth-header [data-song-title]');
}, false);

function login() {
  var displayName = prompt('Enter a username');
  if (!displayName) {
    return;
  }
  onAuthorized({
    displayName: displayName,
    id: Date.now(),
    image: {
      url: '/img/dj-dude.png'
    }
  });
}

exports.app = {
  FILE_QUEUE: FILE_QUEUE,
  generateIdealCoordinate: generateIdealCoordinate,
  login: login
};

})(window);
