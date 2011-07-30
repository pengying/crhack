var iap = {};

(function(context){
  var xhr = new XMLHttpRequest();
  
  context.buy = function (item){
  xhr.open('POST', window.location.href + 'buy', true);
  xhr.onreadystatechange = function(jwt){
    if(xhr.readyState == 4){
      if(xhr.status == 200){
        goog.payments.inapp.buy({
          'jwt' : xhr.responseText,
          'success' : successHandler,
          'failure' : failureHandler
        });
      }
      else{
        console.log("error" + xhr.status)
      }
    }
  }
  xhr.send(item);
}

function successHandler(notification){
  
}

function failureHandler(notification){
  
}

})(iap);

