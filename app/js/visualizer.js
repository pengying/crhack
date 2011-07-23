(function(exports) {
  const ENABLE_DRAW_DANCE_DUDES = true;
  const ENABLE_DRAW_BEAT = false;
  const NUM_BINS = 19;

  // requestAnimationFrame shim with setTimeout fallback.
  window.requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame    ||
           window.oRequestAnimationFrame      ||
           window.msRequestAnimationFrame     ||
           function(/* function */ callback, /* DOMElement */ element){
             window.setTimeout(callback, 1000 / 60);
           };
    })();


  function Visualizer(audioPlayer) {
    this.audioPlayer = audioPlayer;
    this.visualizer = document.querySelector('#visualizer');
    this.visualizerWidth = this.visualizer.width;
    this.visualizerHeight = this.visualizer.height;
    this.detektor = null;
    this.beatCounter = 0;
    this.dancingImages = [];
  }

  Visualizer.prototype.addDancer = function(selector, id, imgSrc, imgWidth, imgHeight) {
    var coords = app.generateIdealCoordinate(imgWidth, imgHeight);

    $(selector).append([
        '<div data-profile-id="', id,'" style="left:', coords.left, 'px;',
        'top:', coords.top, 'px;"><img src="', imgSrc, '" style="width:',
        imgWidth, 'px;height:', imgHeight, 'px;" data-profile-id="', id,
        '" draggable></div>'].join(''));

    var img = document.querySelector(selector + ' :last-child img');
    this.dancingImages.push(img);

    $(img.parentElement).draggable();

    return this.dancingImages.length;
  };

  // Removes the first dancer with data-profile-id == id. The removed dancer is returned.
  Visualizer.prototype.removeDancer = function(id) {
    for (var i = 0, dancer; dancer = this.dancingImages[i]; ++i) {
      if (dancer.dataset.profileId == id) {
        this.dancingImages.splice(i, 1);
        $(dancer.parentElement).remove();
        return dancer;
      }
    }
  };

  Visualizer.prototype.startVisuals = function() {
    this.detektor = new BeatDetektor(40, 79);
    requestAnimFrame(this.draw.bind(this), this.visualizer);
  }

  Visualizer.prototype.draw = function() {

    var prevTime = this.detektor.last_timer;
    var freqs = this.audioPlayer.getVisualizationData();
    this.detektor.process(this.audioPlayer.context.currentTime, freqs);

    // Sample 19 points from the distribution
    var width = parseInt(freqs.length / NUM_BINS, 10);
    var drawContext = this.visualizer.getContext('2d');
    drawContext.clearRect(0, 0, this.visualizerWidth, this.visualizerHeight);

    // Draw the visualizer itself
    for (var i = 0; i < NUM_BINS + 1; ++i) {
      var value = freqs[i * width];
      var percent = value / 256;
      var height = NUM_BINS * percent;
      var offset = NUM_BINS - height;
      drawContext.fillStyle = 'rgb(255, 0, 0)';
      drawContext.fillStyle = 'hsl(' + (10 + (2 * i)) + ', 100%, 50%)';
      drawContext.fillRect(i * 15, offset * 10, 15, height * 10);
    }

    // Beat counting.
    var timeElapsed = this.detektor.last_timer - prevTime;
    var bps = this.detektor.win_bpm_int_lo / 60;
    this.beatCounter =
        (this.beatCounter + 2*Math.PI*bps*timeElapsed) % (4*Math.PI);

    // Draw beat in frequency visualizer.
    if (ENABLE_DRAW_BEAT) {
      var value = (-Math.cos(this.beatCounter / 2) / 2) + .5;
      var height = 0
      if (value > .5) {
        height = 190;
      }
      var offset = 190 - height;
      drawContext.fillStyle = 'rgb(255, 0, 0)';
      drawContext.fillStyle = 'hsl(' + (10 + (2*20)) + ', 100%, 50%)';
      drawContext.fillRect(20*10, offset, 10, height);
    }

    // Dance our images.
    if (ENABLE_DRAW_DANCE_DUDES) {
      for (var i = 0; i < this.dancingImages.length; ++i) {
        var beat = this.beatCounter + i*.18; // offset slightly
        var scaleT = (1 + Math.cos(beat)) / 2;
        var scaleY = 0.95 + scaleT*(1.06 - .95);
        var scaleX = 1. / scaleY; // preserve area

        // skew function has half the frequency of scaling
        var skewAngle = 0.1 * Math.cos(beat / 2);

        this.dancingImages[i].style.webkitTransform =
          'scale(' + scaleX + ',' + scaleY + ') skewX(' + skewAngle + 'rad)';
      }
    }

    requestAnimFrame(this.draw.bind(this), this.visualizer);
  };

exports.visualizer = new Visualizer(player);

})(window);
