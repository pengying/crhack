/* Author: Eric Bidelman (ericbidelman@chromium.org) */

window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
window.URL = window.URL || window.webkitURL;

const TXT = 0;
const BIN_STR = 1;
const ARRAY_BUFFER = 2;
const DATA_URL = 3;

const CHECK_FOR_SONGS_IN = 3000; // seconds

function AudioStreamer(selector, selector2) {
  var self_ = this;
  var fileInput_ = document.querySelector(selector);
  var boothHeader_ = document.querySelector(selector2)
  var sm_ = null;

  this.socket = null;

  var isMe_ = function(id) {
    return id == parseInt(self_.socket.socket.sessionid);
  }

  var readFile_ = function(type, file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
      callback(this.result);
    };
    reader.onerror = function(e) {
      console.log(e);
    };

    switch(type) {
      case TXT:
        reader.readAsText(file);
        break;
      case BIN_STR:
        reader.readAsBinaryString(file);
        break;
      case ARRAY_BUFFER:
        reader.readAsArrayBuffer(file);
        break;
      case DATA_URL:
        reader.readAsDataURL(file);
        break;
      default:
        reader.readAsArrayBuffer(file);
    }
  };

  var fetchSong_ = function(url, name) {
    sm_ = new SoundManager();
    sm_.load(url, function(audioBuffer, arrayBuffer) {
      //sm_.play(audioBuffer); // Start playing song.

      // http://en.wikipedia.org/wiki/ID3. TAG starts at byte -128 from EOF.
      var dv = new jDataView(arrayBuffer);
      if (dv.getString(3, dv.length - 128) == 'TAG') {
        var title = dv.getString(30, dv.tell()).trim();
        var artist = dv.getString(30, dv.tell()).trim();
        var album = dv.getString(30, dv.tell()).trim();
        var year = dv.getString(4, dv.tell()).trim();
        boothHeader_.textContent = [artist, '-', title,
                                    year ? '(' + year + ')' : ''].join(' ');
      } else {
        boothHeader_.textContent = name;
      }

      // Load audio into visualizer, hit play, and start the visuals.
      visualizer.audioPlayer.loadAudioBuffer(audioBuffer);
      visualizer.audioPlayer.play();
      visualizer.startVisuals();
    });
  }

  // Setup streaming socket if it doesn't exist.
  if (!this.socket) {
    this.socket = io.connect(document.location.origin + '/audio');

    this.socket.on('connect', function(e) {
      console.log('== STREAMING AUDIO CONNECTED');
    });

    this.socket.on('disconnect', function() {
      console.log('== STREAMING AUDIO DISCONNECTED');
    });

    this.socket.on('start', function(data) {
      // My turn. Send a song from my queue to the server.
      if (isMe_(data.djSocketId)) {
        //document.querySelector('#directory-upload').disabled = false;
        console.log('Checking for new song to upload...');
        self_.uploadNextSong(boothHeader_);
      }
    });

    this.socket.on('uploadcomplete', function(data) {
      this.json.emit('songready', data);
    });

    this.socket.on('startsong', function(data) {
      // Only play on my machine.
      if (isMe_(data.djSocketId)) {
        boothHeader_.textContent = 'Starting song...';
        fetchSong_(data.url, data.name);
      }
    });

    this.socket.on('songplaying', function(data) {
      if (isMe_(data.senderID)) {
        boothHeader_.textContent = 'Song already playing. Starting it...';
        fetchSong_(data.file.url, data.file.name);

        //socket_.json.emit('getcurrenttimestamp', {});

        /*setInterval(function() {
          socket_.json.emit('updatetimestamp', {
            seconds: visualizer.audioPlayer.context.currentTime
          });
        }, 1000);*/
      }
    });

    this.socket.on('getcurrenttimestamp', function(data) {
      /*var seconds = Math.round(data.seconds * Math.pow(10, 1)) / Math.pow(10, 1);
      if (!isMe_(data.djSocketId)) {
        console.log(data.seconds);
      }*/
console.log(data)
    });
  }

  /*fileInput_.addEventListener('change', function(e) {
    var file = this.files[0];
     if (!file) {
       alert('Nice try! Please select a file.');
       return;
     } else if (!file.type.match('audio.*')) {
       alert('You can only spin audio files.');
       return;
     }

      // Upload entire song.
      var formData = new FormData();
      formData.append('file', file);

      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/upload', true);
      //xhr.responseType = 'arraybuffer';
      xhr.onload = function(e) {
      };
      xhr.send(formData);

   }, false);*/

}

AudioStreamer.prototype = {
  uploadNextSong: function(el) {
    if (app.FILE_QUEUE.length) {
      var file = app.FILE_QUEUE.shift();

      el.textContent = 'Uploading your file...';

      // Upload entire song.
      var formData = new FormData();
      formData.append('file', file);

      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/upload', true);
      xhr.onload = function(e) {
        el.textContent = 'Uploading complete.';
      };
      xhr.send(formData);
    } else {
      var socket = this.socket;
      setTimeout(function() {
        el.textContent = 'No songs selected! Skipping you.';
        socket.json.emit('nextuser', {});
      }, CHECK_FOR_SONGS_IN);
    }
  }
};

function SoundManager(opt_loop) {
  var self_ = this;
  var context_ = null;
  var source_ = null;
  var jsNode_ =  null;

  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  if (window.AudioContext) {
    context_ = new window.AudioContext();
  }

  // data can be an ArrayBuffer or URL of a song file to load. The callback is
  // passed the audioBuffers
  this.load = function(data, opt_callback) {
    if (!context_) {
      return;
    }

    var callback = function(arrayBuffer) {
      /* crbug.com/89690 - decodeAudioData crashing tab.
      context_.decodeAudioData(arrayBuffer, function(audioBuffer) {
        opt_callback && opt_callback(audioBuffer, arrayBuffer);
      }, function(e) {
        console.log('Error decoding', e);
      });*/
      opt_callback && opt_callback(context_.createBuffer(arrayBuffer, false), arrayBuffer);
    }

    if (typeof data == 'string') {  // load from a URL.
      var xhr = new XMLHttpRequest();
      xhr.open('GET', data, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(e) {
        callback(this.response);
      };
      xhr.send();

    } else {
      callback(data);
    }
  };

  this.schedulePlayback = function(startTime, audioBuffer) {
    if (!context_) {
      return;
    }

console.log('start:' + startTime, 'duration:' + audioBuffer.duration);

    source_ = context_.createBufferSource();
    source_.buffer = audioBuffer;
    source_.looping = false;
    source_.noteOn(startTime);

    //source_ = context_.createBufferSource();
    //source_.buffer = audioBuffer;
    //source_.looping = loop_;

    /*jsNode_ = context_.createJavaScriptNode(1024, 2, 2);
    jsNode_.onaudioprocess = function(e) {
      window.currentTime.value = context_.currentTime;

      if (context_.currentTime >= source_.buffer.duration) {
        self_.stop();
      }
    };*/

    //source_.connect(jsNode_);
    source_.connect(context_.destination);
    //jsNode_.connect(context_.destination);
  };

  this.stop = function() {
    if (!source_) {// || !jsNode_) {
      return;
    }
    source_.noteOff(0);
    source_.disconnect(0);
console.log('Stopped!')
    //jsNode_.disconnect(0);
  };

  this.play = function(audioBuffer) {
    this.schedulePlayback(0, audioBuffer);
  };

}