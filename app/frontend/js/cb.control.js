/**
 * Copyright 2010 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var cb = cb || {};

cb.ColorSelector = Class.extend({
  init: function(container) {
    // Using this canvas to draw HSV control.
    this.canvas = $('<canvas />');
    this.canvas.css('width', '150px')
               .css('height', '150px');
    container.append(this.canvas);
    container.append($('<br>'));

    // Control geometry.
    this.CenterX = 75;
    this.CenterY = 75;
    this.HueRadius1 = 55;
    this.HueRadius2 = 70;
    this.QuadSize = Math.sqrt(2.0) * this.HueRadius1;
    this.QuadSteps = 12;
    this.HueSteps = 32;
    this.HueStripWidth = 60.0 / this.HueSteps;

    // Control states.
    this.hue = 85.0;
    this.darkness = 0.5;
    this.lightness = 0.5;
    this.mode = null;  // either 'h' for hue or 'v' for black/white.

    // Bind event handlers so we can control the color.
    var myself = this;
    this.canvas.bind('mousedown', function(evt) { myself.onMouseDown(evt); });
    $(window).bind('mousemove', function(evt) { myself.onMouseMove(evt); });
    $(window).bind('mouseup', function(evt) { myself.onMouseUp(evt); });

    // Initialize the canvas.
    this.paintHueCircle();
    this.paintBWQuad();
  },
  paintHueCircle: function() {
    var context = this.canvas.get(0).getContext('2d');
    // TODO: I couldn't figure out why, but we need to scale 2.0 in X direction
    // to draw correctly...
    context.setTransform(2.0, 0.0, 0.0, 1.0, 0.0, 0.0);
    context.translate(this.CenterX, this.CenterY);

    var myself = this;
    var draw_arc = function(d) {
      // Paint a strip of degree x plus-minus 0.5.
      var rad1 = (d - myself.HueStripWidth / 2.0) * Math.PI / 180.0;
      var rad2 = (d + myself.HueStripWidth / 2.0) * Math.PI / 180.0;
      var s1 = Math.sin(rad1);
      var s2 = Math.sin(rad2);
      var c1 = Math.cos(rad1);
      var c2 = Math.cos(rad2);
      context.beginPath();
      context.moveTo(c1 * myself.HueRadius1, s1 * myself.HueRadius1);
      context.lineTo(c1 * myself.HueRadius2, s1 * myself.HueRadius2);
      context.lineTo(c2 * myself.HueRadius2, s2 * myself.HueRadius2);
      context.lineTo(c2 * myself.HueRadius1, s2 * myself.HueRadius1);
      context.closePath();
      context.fill();
    };
    var line = function(d, r, g, b) {
      context.fillStyle = cb.util.normalizedColor(r, b, g);
      draw_arc(d);
    };
    for (var i = 0; i < this.HueSteps; i++) {
      var x = 1.0 * i / this.HueSteps;
      var w = this.HueStripWidth;
      line(          i * w, 1.0,   x, 0.0);
      line(120 - w - i * w,   x, 1.0, 0.0);
      line(120     + i * w, 0.0, 1.0,   x);
      line(240 - w - i * w, 0.0,   x, 1.0);
      line(240     + i * w,   x, 0.0, 1.0);
      line(360 - w - i * w, 1.0, 0.0,   x);
    }

    // Draw cursor.
    context.fillStyle = '#ccc';
    draw_arc(-this.hue);
  },
  paintBWQuad: function() {
    var context = this.canvas.get(0).getContext('2d');
    context.setTransform(2.0, 0.0, 0.0, 1.0, 0.0, 0.0);
    context.translate(this.CenterX, this.CenterY);
    context.rotate(Math.PI * 0.75 - this.hue * Math.PI / 180.0);
    context.translate(-this.QuadSize / 2.0, -this.QuadSize / 2.0);
    var scale = this.QuadSize / this.QuadSteps;
    context.scale(scale, scale);

    var rgb = cb.util.hueToRGB(this.hue);
    for (var i = 0; i < this.QuadSteps; i++) {
      for (var j = 0; j < this.QuadSteps; j++) {
        var ii = 1.0 * i / this.QuadSteps;
        var jj = 1.0 * j / this.QuadSteps;
        var black = Math.max(ii - jj * 0.5, 0.0);
        var white = Math.max(jj - ii * 0.5, 0.0);
        var color = 1.0 - black - white;
        context.fillStyle = cb.util.normalizedColor(
            rgb[0] * color + white,
            rgb[1] * color + white,
            rgb[2] * color + white);
        context.beginPath();
        context.moveTo(i, j);
        context.lineTo(i + 1, j);
        context.lineTo(i + 1, j + 1);
        context.lineTo(i, j + 1);
        context.closePath();
        context.fill();
      }
    }

    // Draw cursor.
    var rgb = cb.util.hueToRGB(this.hue + 180);
    context.strokeStyle = cb.util.normalizedColor(rgb[0], rgb[1], rgb[2]);
    context.lineWidth = 0.2;
    context.beginPath();
    context.arc(this.darkness * this.QuadSteps,
                this.lightness * this.QuadSteps,
                0.4, 0, Math.PI * 2.0, false);
    context.stroke()
    context.lineWidth = 1;
  },
  updateControl: function(evt, mode) {
    var context = this.canvas.get(0).getContext('2d');
    var x = evt.pageX - this.canvas.offset().left - this.CenterX;
    var y = evt.pageY - this.canvas.offset().top - this.CenterY;

    if (!mode) {
      mode = x * x + y * y >= this.HueRadius1 * this.HueRadius1 ? 'h' : 'v';
    }

    if (mode == 'h') {
      // Recalculate hue.
      this.hue = Math.atan2(y, x) / Math.PI * 180;
      this.hue = (360 - this.hue) % 360;
    } else {
      // Recalculate saturation-value.
      var rad = Math.PI * 0.75 - this.hue * Math.PI / 180.0;
      var s = Math.sin(-rad);
      var c = Math.cos(-rad);
      this.darkness = (c * x - s * y) / this.QuadSize + 0.5;
      this.lightness = (s * x + c * y) / this.QuadSize + 0.5;
      this.darkness = Math.max(Math.min(1.0, this.darkness), 0.0);
      this.lightness = Math.max(Math.min(1.0, this.lightness), 0.0);
    }

    // Redraw the control.
    context.setTransform(2.0, 0.0, 0.0, 1.0, 0.0, 0.0);
    context.clearRect(0, 0, this.canvas.width(), this.canvas.height());

    this.paintHueCircle();
    this.paintBWQuad();
    return mode;
  },
  onMouseDown: function(evt) {
    this.mode = this.updateControl(evt);
  },
  onMouseMove: function(evt) {
    if (this.mode) {
      this.updateControl(evt, this.mode);
    }
  },
  onMouseUp: function(evt) {
    this.mode = null;
  },
  currentColor: function() {
    // Convert hue, darknes, and lightness into RGB.
    var rgb = cb.util.hueToRGB(this.hue);
    var black = Math.max(this.darkness - this.lightness * 0.5, 0.0);
    var white = Math.max(this.lightness - this.darkness * 0.5, 0.0);
    var color = 1.0 - black - white;
    return cb.util.normalizedColor(
        rgb[0] * color + white,
        rgb[1] * color + white,
        rgb[2] * color + white);
  }
});

cb.BrushSizeSelector = Class.extend({
  init: function(container) {
    this.text = $('<div />');
    container.append(this.text);
    container.append($('<br>'));

    this.canvas = $('<canvas />');
    this.canvas.css('width', '150px')
               .css('height', '50px');
    container.append(this.canvas);
    container.append($('<br>'));

    this.MinSize = 1.0;
    this.MaxSize = 60.0;
    this.size = 5.0;
    this.dragging = false;

    var myself = this;
    this.canvas.bind('mousedown', function(evt) { myself.onMouseDown(evt); });
    $(window).bind('mousemove', function(evt) { myself.onMouseMove(evt); });
    $(window).bind('mouseup', function(evt) { myself.onMouseUp(evt); });

    // Initialize the canvas.
    this.redrawSlider(this.size);
    this.text.text(this.size + 'px');
  },
  redrawSlider: function(size) {
    var context = this.canvas.get(0).getContext('2d');
    context.setTransform(2.0, 0.0, 0.0, 1.0, 0.0, 0.0);
    context.clearRect(0, 0, this.canvas.width(), this.canvas.height());

    // Draw the background triangle.
    context.fillStyle = '#aaa';
    context.beginPath();
    context.moveTo(10, 25);
    context.lineTo(140, 5);
    context.lineTo(140, 45);
    context.closePath();
    context.fill();

    // Draw the handle.
    var x = (size - this.MinSize) / (this.MaxSize - this.MinSize) * 130 + 10;
    context.strokeStyle = '#222';
    context.beginPath();
    context.moveTo(x - 2, 0);
    context.lineTo(x - 2, 50);
    context.stroke();
    context.beginPath();
    context.moveTo(x + 2, 0);
    context.lineTo(x + 2, 50);
    context.stroke();
  },
  updateControl: function(evt, is_final) {
    var x = evt.pageX - this.canvas.offset().left;
    var range = this.MaxSize - this.MinSize;
    var size = (x - 10) / 130 * range;
    var snap_size = Math.floor(size + 0.5);
    this.size = Math.min(Math.max(snap_size, 0.0), range) + this.MinSize;
    this.redrawSlider(is_final ? this.size :
        Math.min(Math.max(size, 0.0), range) + this.MinSize);

    // Update the text as well.
    this.text.text(this.size + 'px');
  },
  onMouseDown: function(evt) {
    this.updateControl(evt, false);
    this.dragging = true;
  },
  onMouseMove: function(evt) {
    if (this.dragging) {
      this.updateControl(evt, false);
    }
  },
  onMouseUp: function(evt) {
    if (this.dragging) {
      this.updateControl(evt, true);
      this.dragging = false;
    }
  },
  currentBrushSize: function() { return this.size; }
});
