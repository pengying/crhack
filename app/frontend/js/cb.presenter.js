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

cb.PixelSize = 1;

cb.Presenter = Class.extend({
  init: function() {
    this.canvas_width = 600;
    this.canvas_height = 400;
    this.layers = [];
    this.brushes = {};
    this.currentbrush = null;
    this.currentbrushicon = null;
    this.currentlayer = -1;
    this.history_last_update = null;
    this.history_timeout = null;
    this.transform = { x: 0.0, y: 0.0, r: 0.0, s: 1.0 };
    var myself = this;
    
    $(window).bind('unload', $.proxy(this, '_cleanup'));

    var body = $('body');
    //body.empty();

    var vbox1 = $('<div class="vbox"></div>');
    vbox1.css('height', '100%');
    body.append(vbox1);
  
    this.menu_box = $('<div class="box boxFlex0" id="menu_box"></div>');
    vbox1.append(this.menu_box);
  
    var hbox1 = $('<div class="hbox boxFlex"></div>');
    vbox1.append(hbox1);
  
    this.control_box = $('<div class="box boxFlex0" id="control_box"></div>');
    hbox1.append(this.control_box);
    this.color_selector = new cb.ColorSelector(this.control_box);
    this.brush_size_selector = new cb.BrushSizeSelector(this.control_box);

    var vbox2 = $('<div class="vbox boxFlex"></div>');
    hbox1.append(vbox2);
  
    var canvas_wrap = $('<div class="box boxFlex vbox center canvas-wrap"></div>');
    canvas_wrap.css('overflow', 'auto')
               .css('position', 'relative');
    
    vbox2.append(canvas_wrap);
    
    var logo_box = $('<div id="logo">Chromabrush</div>');
    canvas_wrap.append(logo_box);
    
    this.canvas_box = $('<div id="canvas_box"></div>');
    this.canvas_box.css('position', 'relative')
                   .css('width', this.canvas_width + 'px')
                   .css('height', this.canvas_height + 'px')
                   .css('-webkit-box-shadow', '2px 2px 4px #666')
                   .css('margin', '0 auto')
                   .css('overflow', 'hidden');
    canvas_wrap.append(this.canvas_box);
    this.setCanvasTransform();
  
    this.brush_box = $('<div class="hbox boxFlex0" id="brush_box"></div>');
    vbox2.append(this.brush_box);
  
    this.panel_box = $('<div class="box boxFlex0" id="panel_box"></div>');
    hbox1.append(this.panel_box);

    this.layer_add_button = new cb.ui.Icon('/img/icon-plus.png', 25, 25);
    $(this.layer_add_button).bind('selected', function(evt) {
      this.deselect();
      myself.addLayer();
      myself._triggerEvent('controlchange');
    });
    this.layer_add_button.appendTo(this.panel_box);

    this.layer_del_button = new cb.ui.Icon('/img/icon-minus.png', 25, 25);
    $(this.layer_del_button).bind('selected', function(evt) {
      this.deselect();
      myself.removeLayer();
      myself._triggerEvent('controlchange');
    });
    this.layer_del_button.appendTo(this.panel_box);
    this.panel_box.append($('<hr />'));
  
    this.layer_box = $('<div class="panel" id="layer_box"></div>');
    this.layer_box.sortable({
      'axis' : 'y',
      'update' : $.proxy(this, '_setLayerOrder')
    });
    this.panel_box.append(this.layer_box);
    
    this.base_layer = new cb.Layer(this.canvas_width, this.canvas_height, 0);
    this.base_layer.fill('#fff');
    this.base_layer.paintGrid(10, '#eee');
    this.base_layer.paintGrid(100, '#ccc');
    this.canvas_box.append(this.base_layer.getCanvas());

    this.tool_layer = new cb.Layer(this.canvas_width, this.canvas_height, 100);
    this.canvas_box.append(this.tool_layer.getCanvas());
    
    this.history_worker = new Worker('/js/worker.history.js');
    this.history_worker.addEventListener(
        'message', 
        $.proxy(this, '_onHistoryMessage'), 
        false); 
    
    $(this.tool_layer.getCanvas()).bind('mousedown', $.proxy(this, '_onToolMouseDown'));
    $(window).bind('mousemove', $.proxy(this, '_onToolMouseMove'));
    $(window).bind('mouseup', $.proxy(this, '_onToolMouseUp'));
    $(document).bind('selectstart', function() { return false; });
    $(this.tool_layer.getCanvas())
        .bind('dragover', $.proxy(this, '_onDragOver'))
        .bind('drop', $.proxy(this, '_onDrop'));
  },
  _onHistoryMessage: function(evt) {
    switch (evt.data.status) {
      case 'ready':
        break;
      case 'undo':
        var layer = this.layers[evt.data.index];
        layer.setImageData(evt.data.imagedata);
        $(layer).trigger('updated');
    }
    $(this).trigger('historychanged', [
      evt.data.length,
      evt.data.type
    ]);
  },
  _sendHistory: function(action, index) {
    if (!action) {
      action = 'sethistory';
    }
    
    if (!index) {
      index = this.currentlayer;
    }
    
    var timestamp = new Date().getTime();
    if (this.history_last_update != null && 
        timestamp - this.history_last_update < 200) {
      return;
    }
    
    this.history_last_update = timestamp;
    
    var layer = this.layers[index];
    var pos = layer.getPosition();
    var size = layer.getSize();
    this.history_worker.postMessage({
      'action': action,
      'imagedata': layer.getImageData(),
      'index': index,
      'x': pos.x,
      'y': pos.y,
      'w': size.w,
      'h': size.h
    });
  },
  _requestSendHistory: function(action, index) {
    if (this.history_timeout != null) {
      clearTimeout(this.history_timeout);
    }
    this.history_timeout = setTimeout($.proxy(this, '_sendHistory'), 1000, action, index);
  },
  _cleanup: function(evt) {
    this.history_worker.terminate();
    this.history_worker = null;
    
    // Clean up brush references.
    for (var name in this.brushes) {
      if (this.brushes.hasOwnProperty(name)) {
        this.brushes[name].setPresenter(null);
        delete this.brushes[name];
      }
    }
  },
  _getRelativeMousePos: function(evt, elem) {
    // TODO: This doesn't work when the canvas view is rotated because
    // offset is the position of top-most and left-most pixel of
    // the canvas, and not of any particular point.
    var offset = $(elem).offset();
    var xfm = this.transform;
    var s = Math.sin(xfm.r * Math.PI / 180.0);
    var c = Math.cos(xfm.r * Math.PI / 180.0);
    var x = (evt.pageX - offset.left) / xfm.s - this.canvas_width / 2.0;
    var y = (evt.pageY - offset.top) / xfm.s - this.canvas_height / 2.0;

    return {
      'x' : (c * x + s * y) + this.canvas_width / 2.0,
      'y' : (-s * x + c * y) + this.canvas_height / 2.0
    };
  },
  _onDragOver: function(evt) {
    return false;
  },
  _onDrop: function(evt) {
    var files = evt.originalEvent.dataTransfer.files;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var myself = this;
      var xhr = new XMLHttpRequest();

      xhr.open('post', '/image', true);
      xhr.onreadystatechange = function() {
        if (this.readyState != 4) { return; }
        if (this.responseText.indexOf('http') == 0) {
          var img = new Image();
          img.src = this.responseText;
          img.addEventListener('load', function() {
            var layer_width = Math.max(img.width, this.canvas_width);
            var layer_height = Math.max(img.height, this.canvas_height);
            var layer = myself.addLayer(layer_width, layer_height);
            layer.paintImage(img, 0, 0);
            myself._triggerEvent('import');
          });
        }
      };
      xhr.setRequestHeader('Content-Type', 'multipart/form-data');
      xhr.setRequestHeader('X-File-Name', file.fileName);
      xhr.setRequestHeader('X-File-Size', file.fileSize);
      xhr.setRequestHeader('X-File-Type', file.type);
      xhr.send(file);
    }
    return false;
  },
  _onToolMouseDown: function(evt) {
    if (this.currentbrush) {
      var pos = this._getRelativeMousePos(evt,
          this.getCurrentLayer().getCanvas());
      this.currentbrush.onMouseDown(pos.x, pos.y, evt);
    }
  },
  _onToolMouseUp: function(evt) {
    if (this.currentbrush) {
      var pos = this._getRelativeMousePos(evt,
          this.getCurrentLayer().getCanvas());
      this.currentbrush.onMouseUp(pos.x, pos.y, evt);
    }
  },
  _onToolMouseMove: function(evt) {
    if (this.currentbrush) {
      var pos = this._getRelativeMousePos(evt,
          this.getCurrentLayer().getCanvas());
      this.currentbrush.onMouseMove(pos.x, pos.y, evt);
    }
  },
  _setLayerOrder: function() {
    var myself = this;
    var num_layers = this.layers.length;
    this.layer_box.find('.layer').each(function(index) {
      var layer_index = $(this).attr('layer');
      myself.layers[layer_index].setZIndex(num_layers - index);
    });
    this._triggerEvent('layerorderchange');
  },
  _triggerEvent: function(name) {
    $(this).trigger(name);
  },
  undo: function() {
    this._sendHistory('undo');
  },
  newImage: function() {
    while (this.layers.length > 0) {
      var layer = this.layers.pop();
      $(layer.getCanvas()).remove();
    }
    
    this.layer_box.find('div[layer]').remove();
    this.addLayer();
    this._sendHistory('clearhistory');
  },
  addLayer: function(width, height) {
    if (!width) {
      width = this.canvas_width;
      height = this.canvas_height;
    }
    var new_index = this.layers.length;
    var layer = new cb.Layer(width, height, new_index);
    this.layers.push(layer);
    this.canvas_box.append(layer.getCanvas());
    
    var thumb_width = 50;
    var thumb_height = (height / width) * thumb_width;
    var thumb_src = layer.getDataUrl(thumb_width, thumb_height);
    var dom_thumb = $('<img/>')
        .attr('src', thumb_src)
        .css('width', thumb_width)
        .css('height', thumb_height);
                               
    var dom_layer = $('<div></div>')
        .addClass('layer')
        .addClass('hbox')
        .css('line-height', thumb_height + 'px')
        .attr('layer', new_index)
        .append(dom_thumb)
        .append('<span>Layer ' + new_index + '</span>');
    
    var myself = this;
    
    $(layer).bind('updated', function() { 
      var thumb_src = layer.getDataUrl(thumb_width, thumb_height);
      dom_thumb.attr('src', thumb_src);
      myself._requestSendHistory(null, new_index);
    });
    
    dom_layer.bind('mousedown', function() {
      // This callback can be invoked after the index of this layer has been
      // changed by removeLayer, so we can't use new_index.
      myself.selectLayer(dom_layer.attr('layer') - 0);
    });
    
    this.layer_box.prepend(dom_layer);
    this.selectLayer(new_index);
    
    return layer;
  },
  removeLayer: function() {
    // Avoid deleting the last layer.
    if (this.layers.length <= 1) { return; }

    // Shift the layers up and delete the last element in layers array.
    var index = this.currentlayer;
    var layer = this.layers[index];
    for (var i = index; i < this.layers.length - 1; i++) {
      this.layers[i] = this.layers[i + 1];
    }
    this.layers.pop();

    // Remove the corresponding HTML elements.
    this.layer_box.find('div[layer=' + index + ']').remove();
    for (var i = index; i < this.layers.length; i++) {
      this.layer_box.find('div[layer=' + (i + 1) + ']').attr('layer', i);
    }
    $(layer.getCanvas()).remove();

    // Select another layer.
    this.selectLayer(index == 0 ? 0 : index - 1);
  },
  addBrush: function(name, icon, brush) {
    this.brushes[name] = brush;
    brush.setPresenter(this);

    var myself = this;    
    $(icon)
        .bind('selected', function(evt) {
            myself.selectBrush(name);
            myself._triggerEvent('controlchange');
            if (myself.currentbrushicon != null) {
              myself.currentbrushicon.deselect();
            }
            myself.currentbrushicon = icon;
        });

    icon.appendTo(this.brush_box);
  },
  getCurrentLayer: function() {
    if (this.currentlayer > -1) {
      return this.layers[this.currentlayer];
    } else {
      return null;
    }
  },
  getToolLayer: function() {
    return this.tool_layer;
  },
  selectBrush: function(name) {
    if (this.currentbrush) {
      this.brush_box.children().css('color', 'gray');
      this.currentbrush.reset();
    }

    if (name == null) {
      this.currentbrush = null;
    } else if (this.brushes.hasOwnProperty(name)) {
      this.brush_box.find('#brush_select_' + name).css('color', 'black');
      this.currentbrush = this.brushes[name];
    } 
  },
  selectLayer: function(index) {
    if (index > this.layers.length || index < 0) {
      return;
    }
    $('.layer.selected').removeClass('selected');
    this.currentlayer = index;
    $('.layer[layer=' + index + ']').addClass('selected');
  },
  currentColor: function() {
    return this.color_selector.currentColor();
  },
  currentBrushSize: function() {
    return this.brush_size_selector.currentBrushSize();
  },
  // Event position in canvas coordinate system.
  getCanvasMousePos: function(evt) {
    var offset = $(this.tool_layer.getCanvas()).offset();
    return {
      'x' : evt.pageX - offset.left,
      'y' : evt.pageY - offset.top
    };
  },
  // Canvas center position in page coordinate system.
  getCanvasCenterPos: function() {
    var offset = $(this.tool_layer.getCanvas()).offset();
    return {
      'x' : offset.left + this.canvas_width / 2.0,
      'y' : offset.top + this.canvas_height / 2.0
    };
  },
  addToolbar: function(toolbar) {
    toolbar.appendTo(this.menu_box);
  },
  getCanvasSize: function() {
    return {
      'w' : this.canvas_width,
      'h' : this.canvas_height
    };
  },
  getCanvasTransform: function() {
    var xfm = this.transform;
    return { x: xfm.x, y: xfm.y, r: xfm.r, s: xfm.s };
  },
  setCanvasTransform: function(xfm) {
    if (arguments.length > 0) {
      this.transform = { x: xfm.x, y: xfm.y, r: xfm.r, s: xfm.s };
    }
    this.canvas_box.css('-webkit-transform',
        'translate(' + this.transform.x + 'px,' + this.transform.y + 'px) ' +
        'rotate(' + this.transform.r + 'deg) ' +
        'scale(' + this.transform.s + ')');
  }
});
