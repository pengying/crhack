importScripts('ejohn.Class.js');

var HistoryWorker = Class.extend({
  init: function() {
    this._MAX_UNDO = 10;
    this._history = [];
    this._lastdata = [];
  },
  _addState: function(state) {
    this._history.push(state);
    if (this._history.length > this._MAX_UNDO) {
      this._history.shift();
    }
  },
  getNextUndoType: function() {
    if (this._history.length > 0) {
      return this._history[this._history.length - 1].type;
    } else {
      return null;
    }
  },
  getLength: function() {
    return this._history.length;
  },
  clear: function() {
    this._history = [];
    this._lastdata = [];
  },
  parseState: function(data) {
    var isnew = false;
    if (this._lastdata[data.index] == null) {
      this._lastdata[data.index] = data;
      isnew = true;
    }
    
    // We don't handle canvas movement or resizing correctly right now, so
    // clear the history.
    if (this._lastdata[data.index].x != data.x || 
        this._lastdata[data.index].y != data.y ||
        this._lastdata[data.index].w != data.w ||
        this._lastdata[data.index].h != data.h) {
      this.clear();
      this._lastdata[data.index] = data;
      return;
    }
    
    var image_diff = this.diffImageData(
        this._lastdata[data.index].imagedata, 
        data.imagedata,
        isnew);
    
    if (image_diff != null) {
      this._addState({
        'type': 'paint',
        'diff': image_diff,
        'index': data.index
      });
    }
    
    this._lastdata[data.index] = data;
  },
  diffImageData: function(last, curr, isnew) {
    var minW = Math.min(last.width, curr.width);
    var minH = Math.min(last.height, curr.height);
    var changed = false;
    var diff = {
        'data': new Array(minW * minH * 4),
        'width': minW,
        'height': minH
    };
        
    for (var i = 0; i < minW * minH * 4; i++) {
      if (last.data[i] != curr.data[i] || isnew == true) {
        if (isnew) {
          diff.data[i] = -curr.data[i];
        } else {
          diff.data[i] = last.data[i] - curr.data[i];
        }
        if (changed == false) {
          changed = true;
        }
      } else {
        diff.data[i] = 0;
      }
    }
    return (changed) ? diff : null;
  },
  mergeImageData: function(last, diff) {
    for (var i = 0; i < diff.width * diff.height * 4; i++) {
      last.data[i] += diff.data[i];
    }
    return last;
  },
  undo: function(data) {
    this.parseState(data);
    var diff = this._history.pop();
    if (diff == null) {
      return null;
    }
    var data = this._lastdata[diff.index];
    
    switch (diff.type) {
      case 'translate':
        data.x += diff.x;
        data.y += diff.y;
        break;
      case 'paint':
        data.imagedata = this.mergeImageData(data.imagedata, diff.diff);
        break;
    }    
    
    return data;
  }
});

var history = new HistoryWorker();
onmessage = function (evt) {
  switch (evt.data.action) {
    case 'sethistory':
      history.parseState(evt.data);
      postMessage({
          'status': 'ready', 
          'length': history.getLength(),
          'type': history.getNextUndoType()
      });
      break;
    case 'clearhistory':
      history.clear();
      postMessage({
          'status': 'ready', 
          'length': history.getLength(),
          'type': history.getNextUndoType()
      });
      break;
    case 'undo':
      var data = history.undo(evt.data);
      if (data) {
        data.status = 'undo';
        data.length = history.getLength();
        data.type = history.getNextUndoType();
        postMessage(data);
      }
      break;
  }
};