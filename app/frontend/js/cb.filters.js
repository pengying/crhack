var cb = cb || {};

cb.filters = {};

cb.filters.Filter = Class.extend({
  init: function() {
    this._LAST_PROGRESS = 0;
  },
  filter: function(canvas) {
    return canvas;
  },
  _setProgress: function(progress) {
    if (this._LAST_PROGRESS != progress) {
      $(this).trigger('progress', progress);
      this._LAST_PROGRESS = progress;
    }
  }
});

cb.filters.Blur = cb.filters.Filter.extend({
  init: function(radius) {
    this.RADIUS = radius;
  },
  filter: function(layer) {
    worker = new Worker('/js/filter.blur.js');
    worker.addEventListener('message', $.proxy(this, 'onMessage'), false);
    this.LAYER = layer;
    var size = layer.getSize();
    worker.postMessage({
        'imagedata': layer.getImageData(),
        'width': size.w,
        'height': size.h,
        'radius': this.RADIUS
    });
  },
  onMessage: function(evt) {
    if (evt.data.status == 'progress') {
      this._setProgress(evt.data.progress);
    } else if (evt.data.status == 'complete') {
      this.LAYER.setImageData(evt.data.imagedata); 
    }
  }
});
