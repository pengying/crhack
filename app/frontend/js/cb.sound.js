cb.Sound = Class.extend({
  init: function() {
    this.clips = {};
  },
  play: function(filename) {
    if (this.clips.hasOwnProperty(filename)) {
      delete this.clips[filename];
    }
    var audio = new Audio(filename);
    this.clips[filename] = audio;
    audio.play();
  }
});