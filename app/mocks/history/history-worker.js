importScripts('history-lib.js');

var imageDiffer = new ImageDiffer();
onmessage = function (event) {
  postMessage(imageDiffer.diff(event.data.imageData, event.data.diffData));
};