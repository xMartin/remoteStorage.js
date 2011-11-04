(function(define){
define(function(){

return function(params) {
  var xhr = new XMLHttpRequest();
  if(!params.method) {
	params.method='GET';
  }
  if(!params.data) {
	params.data = null;
  }
  xhr.open(params.method, params.url, true);
  if(params.headers) {
	for(var header in params.headers) {
	  xhr.setRequestHeader(header, params.headers[header]);
	}
  }
//      if(params.fields) {
//        for(var field in params.fields) {
//          xhr[field] = params.fields[field];
//        }
//      }
  xhr.onreadystatechange = function() {
	if(xhr.readyState == 4) {
	  if(xhr.status == 0) {
		//alert('looks like '+params.url+' has no CORS headers on it! try copying this scraper and that file both onto your localhost')
		params.error(xhr);
	  } else {
		params.success(xhr.responseText);
	  }
	}
  }
  xhr.send(params.data);
};

});

})(typeof define == "undefined" ? function(factory){
	ajax = factory();
} : define);
