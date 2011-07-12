function ImageDiffer() {
  this.lastData = null;
};

ImageDiffer.prototype.diff = function(imageData, diffData) {
  //var diffData = [];
  if (this.lastData != null) {
    for (var i = 0; i < imageData.data.length; i++) {
      diffData.data[i] = Math.abs(imageData.data[i] - this.lastData.data[i]);
    }
  }
  this.lastData = imageData;
  return diffData;
};