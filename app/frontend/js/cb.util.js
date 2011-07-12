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

cb.util = {};
cb.util.canvas = {};

cb.util.canvas.paintFill = function(canvas, x, y, color) {
  var tolerance = 30;
  var checked = [];
  var x0 = Math.floor(x / cb.PixelSize);
  var y0 = Math.floor(y / cb.PixelSize);
  var context = canvas.getContext('2d');
  var stack = [x0, y0];

  var color_matches = /rgba\((\d{1,3}),\W(\d{1,3}),\W(\d{1,3}),\W(\d{1,3})\)/.exec(color);
  var color_r = parseInt(color_matches[1], 10);
  var color_g = parseInt(color_matches[2], 10);
  var color_b = parseInt(color_matches[3], 10);
  var color_a = Math.round(parseFloat(color_matches[4]) * 255);

  // Read the image pixels into memory array and prepare a function for
  // accessing that array.
  var image = context.getImageData(0, 0, canvas.width, canvas.height);
  var newimage = context.createImageData(image.width, image.height);
  var pixel = function(bx, by) {
    // Read the color of the specified pixel.
    var x = bx * cb.PixelSize;
    var y = by * cb.PixelSize;
    var p = (x + y * canvas.width) * 4;
    return [
      image.data[p],
      image.data[p + 1],
      image.data[p + 2],
      image.data[p + 3]];
  };

  // Remember the first pixel color because that's the color of the pixels we
  // fill.
  var seed_color = pixel(x0, y0);
  var is_open = function(x, y) {
    if (checked[y * canvas.width + x] === true) {
      return false;
    }
    
    var c = pixel(x, y);
    var status = Math.abs(c[0] - seed_color[0]) < tolerance &&
                 Math.abs(c[1] - seed_color[1]) < tolerance &&
                 Math.abs(c[2] - seed_color[2]) < tolerance ||
                 c[3] <= 250;
    return status;
  };

  // Set the pixel color and at the same time push the pixels above and below
  // to the stack.
  var set_pixel = function(bx, by) {
    // Set the pixel color to both the in memory image and the rendering
    // surface.
    var x = bx * cb.PixelSize;
    var y = by * cb.PixelSize;
    checked[y * canvas.width + x] = true;
    
    var p = (x + y * canvas.width) * 4;
    var p_mod = 0;
    for (var i = 0; i < cb.PixelSize; i++) {
      for (var j = 0; j < cb.PixelSize; j++) {
        p_mod = ((x + i) + (y + j) * canvas.width) * 4;
        image.data[p_mod] = color_r;
        image.data[p_mod + 1] = color_g;
        image.data[p_mod + 2] = color_b;
        image.data[p_mod + 3] = color_a;
      }
    }

    // Later we need to check the scanlines above and blow this line.
    if (by > 0) {
      stack.push(bx);
      stack.push(by - 1);
    }
    if (by + 1 < canvas.height / cb.PixelSize) {
      stack.push(bx);
      stack.push(by + 1);
    }
  };

  // Fill the pixels to left and right as much as possible.
  var fillLine = function(x, y) {
    // Check if the seed pixel is still open.
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height ||
        !is_open(x, y)) {
      return;
    }

    // Extend the line to left.
    for (var x_min = x; x_min >= 0 && is_open(x_min, y); x_min--) {
      set_pixel(x_min, y);
    }

    // Extend the line to right.
    if (x + 1 < canvas.width) {
      // Skip the first pixel because it's already colored.
      for (var x_max = x + 1;
           x_max < canvas.width / cb.PixelSize && is_open(x_max, y);
           x_max++) {
        set_pixel(x_max, y);
      }
    }
  };

  // Repeat until we finish all the items in the stack.
  while (stack.length > 0) {
    // We pushed in x, y order, need to pop y, x.
    var y = stack.pop();
    var x = stack.pop();
    fillLine(x, y);
  }
  
  context.putImageData(image, 0, 0);
};

cb.util.canvas.paintLine = function(canvas, x0, y0, x1, y1, brush_size, color) {
  var context = canvas.getContext('2d');
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.lineWidth = brush_size;
  context.lineCap = 'round';
  context.strokeStyle = color;
  context.stroke();
};
cb.util.canvas.paintSquareLine = function(canvas, x0, y0, x1, y1, brush_size, color) {
  var delta_x = x1 >= x0 ? 1 : -1;
  var delta_y = y1 >= y0 ? 1 : -1;
  var distance_x = (x1 - x0) * delta_x;
  var distance_y = (y1 - y0) * delta_y;
  if (distance_x > distance_y) {
    var slope = distance_y / distance_x;
    for (var i = 0; i < distance_x; i++) {
      cb.util.canvas.paintPixel(
          canvas,
          x0 + delta_x * i,
          y0 + Math.floor(slope * delta_y * i),
          brush_size, 
          color);
    }
  } else {
    var slope = distance_x / distance_y;
    for (var i = 0; i < distance_y; i++) {
      cb.util.canvas.paintPixel(
          canvas,
          x0 + Math.floor(slope * delta_x * i),
          y0 + delta_y * i,
          brush_size, 
          color);
    }
  }
  cb.util.canvas.paintPixel(canvas, x1, y1, brush_size, color);
};

cb.util.canvas.paintPixel = function(canvas, x, y, brush_size, color) {
  var block_x = Math.floor(x / cb.PixelSize - brush_size / 2.0 + 0.5);
  var block_y = Math.floor(y / cb.PixelSize - brush_size / 2.0 + 0.5);
  var context = canvas.getContext('2d');
  context.beginPath();
  context.fillStyle = color;
  context.fillRect(
      Math.round(block_x * cb.PixelSize), 
      Math.round(block_y * cb.PixelSize), 
      cb.PixelSize * brush_size, 
      cb.PixelSize * brush_size);  
};

cb.util.normalizedColor = function(r, g, b) {
  // Convert RGB in [0, 1] range to a color string we can use with canvas.
  var r_value = Math.floor(r * 256);
  var g_value = Math.floor(g * 256);
  var b_value = Math.floor(b * 256);
  return 'rgba(' + r_value + ', ' + g_value + ', ' + b_value + ', 255)';
};

cb.util.hueToRGB = function(hue) {
  // Takes hue in degrees and produces RGB.
  hue = hue % 360;
  var h = (Math.floor(hue) % 60) / 60.0;
  if (hue < 60) {
    return [1.0, h, 0.0];
  } else if (hue < 120) {
    return [1.0 - h, 1.0, 0.0];
  } else if (hue < 180) {
    return [0.0, 1.0, h];
  } else if (hue < 240) {
    return [0.0, 1.0 - h, 1.0];
  } else if (hue < 300) {
    return [h, 0.0, 1.0];
  } else {
    return [1.0, 0.0, 1.0 - h];
  }
};
