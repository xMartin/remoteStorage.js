(function(define){
define([
	"./ajax",
	"./oauth"
], function(ajax, oauth){

ajax = ajax || window.ajax;
oauth = oauth || window.oauth;

// GET, PUT, DELETE

function keyToAddress(key) {
  var userAddressParts = localStorage.getItem('_remoteStorageUserAddress').split('@')
  var resource = localStorage.getItem('_remoteStorageDataScope');
  var address = localStorage.getItem('_remoteStorageKV') + key
  return address
}
function doCall(method, key, obj, cb) {
  var ajaxObj = {
	url: keyToAddress(key),
	method: method,
	success: function(text){
	  var retObj={};
	  try {//this is not necessary for current version of protocol, but might be in future:
		retObj = JSON.parse(text);
		retObj.success = true;
		if(retObj.rev) {//store rev as _rev in localStorage
		  obj._rev = retObj.rev;
		  localStorage.setItem('_remoteStorage_'+key, JSON.stringify(obj));
		}
	  } catch(e){
		retObj.success = false;
	  }
	  cb(retObj);
	},
	error: function(xhr) {
	  if(xhr.status==409) {//resolve CouchDB conflict:
		doCall('GET', key, null, function(text) {
		  var correctVersion=JSON.parse(text);
		  correctVersion.value=obj.value;
		  doCall('PUT', key, correctVersion, cb);
		});
	  } else {
		cb({
		  success:false,
		  error: xhr.status
		});
	  }
	},
  }
  ajaxObj.headers= {Authorization: 'Bearer '+localStorage.getItem('_remoteStorageOauthToken')};
  ajaxObj.fields={withCredentials: 'true'};
  if(method!='GET') {
	ajaxObj.data=JSON.stringify(obj);
  }
  ajax(ajaxObj);
}

////////////////////////////////////////
// asynchronous synchronization tasks //
////////////////////////////////////////

return {
  tryOutbound: function(key, cb) {//presumably we don't have to re-check versions here
	var value=JSON.parse(localStorage.getItem('_remoteStorage_'+key));
	doCall('PUT', key, value, function() {
	  //index[key]=revision;
	  //localStorage.setItem('remoteStorageIndex', JSON.stringify(index));
	  //doCall('PUT', 'remoteStorageIndex', index, cb);
	  cb();
	});
  },
  removeItem: function(key, revision, cb) {
	var index = JSON.parse(localStorage.getItem('remoteStorageIndex'));
	if((!index[key]) || (index[key]<revision)) {
	  doCall('DELETE', key, null, function() {
		//index[keys]=revision;
		//localStorage.setItem('remoteStorageIndex', JSON.stringify(index));
		//doCall('PUT', 'remoteStorageIndex', index, cb);
		cb();
	  });
	}
  },
  connect: function(userAddress, dataScope, cb) {
	var onError = function(errorMsg) {
	  alert(errorMsg);
	}
	var callback = function(rsAuth, rStemplate, rSapi) {
	  cb();
	  var rSkvParts = rStemplate.split('{scope}');
	  var rSkv = rSkvParts[0]+dataScope+rSkvParts[1];
	  localStorage.setItem('_remoteStorageUserAddress', userAddress);
	  localStorage.setItem('_remoteStorageDataScope', dataScope);
	  localStorage.setItem('_remoteStorageKV', rSkv)
	  localStorage.setItem('_remoteStorageAPI', rSapi)
	  localStorage.setItem('_remoteStorageAuthAddress', rSauth)
	  oauth.go(rSauth, dataScope, userAddress);
	}
	webfinger.getDavBaseAddress(userAddress, onError, callback);
  },
  setToken: function(token) {
	localStorage.setItem('_remoteStorageOauthToken', token);
  },
  sync: function() {
	var localIndex = JSON.parse(localStorage.getItem('remoteStorageIndex'));
	if(!localIndex) {
	  localIndex = {};
	}
	doCall('GET', 'remoteStorageIndex', null, function(data) {
	  var remoteIndex;
	  try {
		remoteIndex = JSON.parse(data.value);
	  } catch(e) {
		remoteIndex = {};
	  }
	  for(var i in remoteIndex) {
		if((localIndex[i] == undefined) || (remoteIndex[i] > localIndex[i])) {//need to pull it
		  doCall('GET', i, null, function(data) {
			localStorage.setItem('_remoteStorage_'+i, data.value);
			var localIndex = JSON.parse(localStorage.getItem('remoteStorageIndex'));
			if(!localIndex) {
			  localIndex = {};
			}
			localIndex[i]=data.revision;
			localStorage.setItem('remoteStorageIndex', JSON.stringify(localIndex));
			var oldValue = localStorage.getItem('_remoteStorage_'+i);
			if(window.remoteStorage.options.onChange) {
			  window.remoteStorage.options.onChange(i, oldValue, data.value);
			}
		  });
		} else if(remoteIndex[i] < localIndex[i]) {//need to push it
		  localValue = localStorage.getItem('_remoteStorage_'+i);
		  var obj = JSON.parse(localValue);
		  obj.revision = localIndex[i];
		  doCall('PUT', i, obj, function() {});
		}
	  }
	});
  }
}

});

})(typeof define == "undefined" ? function(deps, factory){
	backend = factory();
} : define);
