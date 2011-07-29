(function(purchases)){
  var xhr = new XMLHttpRequest();
  
function buy(item){
  xhr.open('POST', window.location.href + 'purchase', true);
  xhr.onreadystatechange = function(jwt){
    if(xhr.reqdystate == 4){
      if(xhr.status == 200){
        goog.payments.inapp.buy({
          'jwt' : xhr.responseText,
          'success' : successHandler,
          'failure' : failureHandler
        });
      }
    }
  }
}

function successHandler(notification){
  
}

function failureHandler(notification){
  
}
purchases.iap = {
  buy: buy
};
})(window);

