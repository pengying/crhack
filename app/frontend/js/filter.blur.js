

onmessage = function (event) {
  var imagedata = event.data.imagedata;
  var width = event.data.width;
  var height = event.data.height;
  var radius = event.data.radius;
  
  var sum_r, sum_g, sum_b, sum_a;
  var scale = (radius * 2 + 1) * (radius * 2 + 1);
  var num_pixels = width * height;
  
  function getPixel(x, y) {
    if (x < 0) { x = 0; }
    if (y < 0) { y = 0; }
    if (x >= width) { x = width - 1; }
    if (y >= height) { y = height - 1; }
    var index = (y * width + x) * 4;
    return [
      imagedata.data[index + 0],
      imagedata.data[index + 1],
      imagedata.data[index + 2],
      imagedata.data[index + 3],
    ];
  };
  
  function setPixel(x, y, r, g, b, a) {
    var index = (y * width + x) * 4;
    imagedata.data[index + 0] = r;
    imagedata.data[index + 1] = g;
    imagedata.data[index + 2] = b;
    imagedata.data[index + 3] = a;
  };
  
  var lastprogress = 0;
  for (y = 0; y < height; y++) {
    for (x = 0; x < width; x++) {
      var progress = Math.round((((y * width) + height) / num_pixels) * 100);
      if (progress > lastprogress) {
        lastprogress = progress;
        postMessage({status: 'progress', progress: progress});
      }
    
      sum_r = 0;
      sum_g = 0;
      sum_b = 0;
      sum_a = 0;
      
      for (var dy = -radius; dy <= radius; dy++) {
        for (var dx = -radius; dx <= radius; dx++) {
          var pixeldata = getPixel(x + dx, y + dy);
          sum_r += pixeldata[0];
          sum_g += pixeldata[1];
          sum_b += pixeldata[2];
          sum_a += pixeldata[3];
        }
      }

      setPixel(
        x, y, 
        Math.round(sum_r / scale),
        Math.round(sum_g / scale),
        Math.round(sum_b / scale),
        Math.round(sum_a / scale));
    }
  }
  
  postMessage({status: 'complete', imagedata: imagedata});
};