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

cb.Layer = Class.extend({
  init: function(width, height, zindex) {
    this.canvas = $('<canvas></canvas>');
    this.width = width;
    this.height = height;
    this.view_width = width;
    this.view_height = height;
    this.canvas.attr('width', width)
               .attr('height', height)
               .css('position', 'absolute')
               .css('left', '0')
               .css('top', '0')
               .css('z-index', zindex);
    this._last_updated = 0;
  },
  _onUpdated: function() {
    var now = new Date().getTime();
    if (now - this._last_updated > 500) {
      this._last_updated = now;
      $(this).trigger('updated');
    }
  },
  clear: function() {
    var context = this.getContext();
    context.clearRect(0, 0, this.width, this.height);
    this._onUpdated();
  },
  erasePixel: function(x, y, brush_size) {
    var block_x = Math.floor(x / cb.PixelSize - brush_size / 2.0 + 0.5);
    var block_y = Math.floor(y / cb.PixelSize - brush_size / 2.0 + 0.5);
    var context = this.getContext();
    context.beginPath();
    context.clearRect(
        Math.round(block_x * cb.PixelSize), 
        Math.round(block_y * cb.PixelSize), 
        cb.PixelSize * brush_size, 
        cb.PixelSize * brush_size);
    this._onUpdated();
  },
  fill: function(color) {
    var context = this.getContext();
    context.beginPath();
    context.fillStyle = color;
    context.fillRect(0, 0, this.width, this.height);
    this._onUpdated();
  },
  getCanvas: function() {
    return this.canvas.get(0);
  },
  getContext: function() {
    return this.canvas.get(0).getContext('2d');
  },
  getDataUrl: function(width, height) {
    if (!width) { width = this.width; }
    if (!height) { height = this.height; }
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    context.drawImage(this.getCanvas(), 0, 0, width, height);
    return canvas.toDataURL();
  },
  paintFill: function(x, y, color) {
    cb.util.canvas.paintFill(this.getCanvas(), x, y, color);
    this._onUpdated();
  },
  paintGrid: function(step, color) {
    var context = this.getContext();
    console.log(this.width, this.height);
    for (var x = 0.5; x <= this.width; x += step) {
      context.moveTo(x, 0);
      context.lineTo(x, this.height);
    }
    for (var y = 0.5; y <= this.height; y += step) {
      context.moveTo(0, y);
      context.lineTo(this.width, y);
    }
    context.strokeStyle = color;
    context.stroke();
    context.beginPath();
    this._onUpdated();
  },
  paintImage: function(img, x, y) {
    var context = this.getContext();
    context.drawImage(img, x, y);
    this._onUpdated();
  },
  paintLine: function(x0, y0, x1, y1, brush_size, color) {
    var canvas = this.getCanvas();
    var context = this.getContext();
    context.beginPath();
    cb.util.canvas.paintLine(canvas, x0, y0, x1, y1, brush_size, color);
    this._onUpdated();
  },
  paintCircle: function(x, y, radius, brush_size, color) {
    var context = this.getContext();
    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = brush_size;
    context.arc(x, y, radius, 0, Math.PI * 2, false);
    context.stroke();
    this._onUpdated();
  },
  paintRect: function(x, y, w, h, brush_size, color) {
    var context = this.getContext();
    context.strokeStyle = color;
    context.lineWidth = brush_size;
    context.strokeRect(x, y, w, h);
    this._onUpdated();
  },
  fillCircle: function(x, y, radius, color) {
    var context = this.getContext();
    context.beginPath();
    context.fillStyle = color;
    context.arc(x, y, radius, 0, Math.PI * 2, false);
    context.fill();
    this._onUpdated();
  },
  paintLayerBox: function(layer, line_size, color) {
    var pos = layer.getPosition();
    var size = layer.getSize();
    var x = pos.x - line_size / 2.0;
    var y = pos.y - line_size / 2.0;
    var w = size.w + line_size;
    var h = size.h + line_size;
    this.paintRect(x, y, w, h, line_size, color);
  },
  /**
   * Paints a square pixel on this canvas.
   * The square pixels are aligned in a grid, so the grid box containing the
   * x and y coordinates will be painted.
   */
  paintPixel: function(x, y, brush_size, color) {
    cb.util.canvas.paintPixel(this.getCanvas(), x, y, brush_size, color);
    this._onUpdated();
  },
  setZIndex: function(zindex) {
    this.canvas.css('z-index', zindex);
  },
  getPosition: function() {
    var x = this.canvas.css('left');
    var y = this.canvas.css('top');
    return {
      x: x.substring(0, x.length - 2) - 0,
      y: y.substring(0, y.length - 2) - 0
    };
  },
  setPosition: function(x, y) {
    this.canvas.css('left', x + 'px');
    this.canvas.css('top', y + 'px');
  },
  lockPosition: function(x, y) {
    if (x < 0) {
      var new_width = this.width;
      if ((this.width + x) < this.view_width) { 
        new_width = this.view_width + Math.abs(x);
      }
      var new_left = x;
    } else {
      var new_width = this.width + x;
      var new_left = 0;
    }
    
    if (y < 0) {
      var new_height = this.height;
      if ((this.height + y) < this.view_height) {
        new_height = this.view_height + Math.abs(y);
      } 
      var new_top = y;
    } else {
      var new_height = this.height + y;
      var new_top = 0;
    }  
    
    var old_canvas = this.canvas.get(0);

    this.width = new_width;
    this.height = new_height;
    
    this.canvas = $('<canvas>');
    this.canvas
        .css('position', 'absolute')
        .css('z-index', $(old_canvas).css('z-index'))
        .attr('width', new_width)
        .attr('height', new_height)
        .css('left', new_left)
        .css('top', new_top);
    
    this.paintImage(old_canvas, x - new_left, y - new_top);
    $(old_canvas).before(this.canvas).remove();
  },
  getSize: function() {
    return {
      w: this.width,
      h: this.height
    };
  },
  getImageData: function() {
   var data = this.getContext().getImageData(0, 0, this.width, this.height);
   return data;
  },
  setImageData: function(data) {
    var context = this.getContext();
    context.putImageData(data, 0, 0);
  }
});
