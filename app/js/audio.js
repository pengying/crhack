/**
 * Audio playback
 */

(function(exports) {

  var AudioPlayer = function() {
    this.context = new webkitAudioContext();
    this.source = this.context.createBufferSource();
    this.analyser = this.context.createAnalyser();

    // Connect graph
    this.source.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  };

  AudioPlayer.prototype.loadUrl = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    var that = this;
    xhr.addEventListener('load', function() {
      var buffer = that.context.createBuffer(xhr.response, false);
      that.source.buffer = buffer;
      that.source.looping = false;

      that.freqs = new Uint8Array(that.analyser.frequencyBinCount);
      if (callback) {
        callback();
      }
    });
    xhr.send();
  };

  AudioPlayer.prototype.loadAudioBuffer = function(audioBuffer, callback) {
    this.source.buffer = audioBuffer;
    this.source.looping = false;

    this.freqs = new Uint8Array(this.analyser.frequencyBinCount);
    if (callback) {
      callback();
    }
  };

  AudioPlayer.prototype.setVolume = function(volume) {
    this.source.gain.value = volume;
  };

  AudioPlayer.prototype.getVisualizationData = function() {
    this.analyser.getByteFrequencyData(this.freqs);
    return this.freqs || [];
  };

  AudioPlayer.prototype.play = function() {
    this.source.noteOn(0);
  };

  AudioPlayer.prototype.pause = function() {
    this.source.noteOff(0);
  };

  exports.player = new AudioPlayer();

})(window);
