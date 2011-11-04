(function(define){
define([
	"./backend"
], function(backend){

backend = backend || window.backend;

// INTERFACE:
//
// 1) interface for data is the same as localStorage and sessionStorage, namely:
//
// window.remoteStorage.length
// window.remoteStorage.key(i)
// window.remoteStorage.getItem(key)
// window.remoteStorage.setItem(key, value);
// window.remoteStorage.removeItem(key);
// window.remoteStorage.clear();
//
// Note: we don't support syntactic sugar like localStorage.key or localStorage['key'] - please stick to getItem()/setItem()
//
//
// 2) additional interface to connect/check/disconnect backend:
//
// window.remoteStorage.connect('user@host', 'sandwiches');
// window.remoteStorage.isConnected();//boolean
// window.remoteStorage.getUserAddress();//'user@host'
// window.remoteStorage.disconnect();


// asynchronous synchronization queue

function work() {
  if(!(localStorage.getItem('_remoteStorageOauthToken'))) {
	return;
  }
  var time = 1;
  var dirties = JSON.parse(localStorage.getItem('_remoteStorageDirties'));
  for(dirty in dirties) {
	//var alreadyWorking = localStorage.getItem('_remoteStorageWorking_'+dirty);
	//if(!alreadyWorking) {
	if(true) {
	  //localStorage.setItem('_remoteStorageWorking_'+dirty, time);
	  localStorage.setItem('_remoteStorageDirties', JSON.stringify(dirties));
	  if(dirties[dirty]) {
		backend.tryOutbound(dirty, function() {
		  //localStorage.removeItem('_remoteStorageWorking_'+dirty);
		});
	  } else {
		backend.tryInbound(dirty, function() {
		  //localStorage.removeItem('_remoteStorageWorking_'+dirty);
		});
	  }
	  delete dirties[dirty];
	}
  }
}
function markDirty(key, outbound) {
  if(outbound==undefined) {
	outbound = true;
  }
  var dirties = JSON.parse(localStorage.getItem('_remoteStorageDirties'));
  if(dirties==null){
	dirties={};
  }
  var time;
  if(outbound) {
	time = new Date().getTime();
  } else {
	time = 0;
  }
  dirties[key] = time;
  localStorage.setItem('_remoteStorageDirties', JSON.stringify(dirties));
}
work();

  //////////////////
 // DOM API shim //
//////////////////

function calcLength() {
  var len = 0;
  for(var i=0; i<localStorage.length; i++) {
	if(localStorage.key(i).substring(0,15)=='_remoteStorage_') {
	  len++;
	}
  }
  return len;
}


return {
  length: calcLength(),
  key: function(req) {
	for(var i=0; i<localStorage.length; i++) {
	  if(localStorage.key(i).substring(0,15)=='_remoteStorage_') {
		if(req == 0) {
		  return localStorage.key(i).substring(15);
		}
		req--;
	  }
	}
  },
  getItem: function(k) {
	var cacheObj = localStorage.getItem('_remoteStorage_'+k);
	if(cacheObj) {
	  try {
		return JSON.parse(cacheObj).value;
	  }catch(e) {}
	}
	return null;
  },
  setItem: function(k,v) {
	var cacheObj = {};
	var cacheStr = localStorage.getItem('_remoteStorage_'+k);
	if(cacheStr) {
	  try {
		var cacheObj = JSON.parse(cacheStr);
		var oldValue = cacheObj.value;
		if(v == oldValue) {
		  return;
		}
	  }catch(e) {}
	}
	cacheObj.value=v;
	localStorage.setItem('_remoteStorage_'+k, JSON.stringify(cacheObj));
	window.remoteStorage.length = calcLength();
	markDirty(k);
	work();
  },
  removeItem: function(k) {
	localStorage.removeItem('_remoteStorage_'+k);
	window.remoteStorage.length = calcLength();
	markDirty(k);
	work();
  },
  clear: function() {
	for(var i=0;i<localStorage.length;i++) {
	  if(localStorage.key(i).substring(0,15)=='_remoteStorage_') {
		localStorage.removeItem(localStorage.key(i));
		localStorage.removeItem('_remoteStorageWorking_'+localStorage.key(i));
		markDirty(localStorage.key(i));
	  }
	}
	window.remoteStorage.length = 0;
	work();
  },
  connect: function(userAddress, dataScope) {
	backend.connect(userAddress, dataScope, function() {
	  work();
	})
  },
  isConnected: function() {
	return (localStorage.getItem('_remoteStorageOauthToken') != null);
  },
  getUserAddress: function() {
	return localStorage.getItem('_remoteStorageUserAddress');
  },
  disconnect: function() {
	localStorage.removeItem('_remoteStorageUserAddress');
	localStorage.removeItem('_remoteStorageDataScope');
	localStorage.removeItem('_remoteStorageKV');
	localStorage.removeItem('_remoteStorageAPI');
	localStorage.removeItem('_remoteStorageAuthAddress');
	localStorage.removeItem('_remoteStorageOauthToken');
	localStorage.removeItem('_remoteStorageDirties');
	localStorage.removeItem('remoteStorageIndex');
	for(var i=0; i<localStorage.length; i++) {
	  if(localStorage.key(i).substring(0,15)=='_remoteStorage_') {
		var keyName = localStorage.key(i);
		localStorage.removeItem(keyName);
		if(window.remoteStorage.options.onChange) {
		  remoteStorage.options.onChange(keyName.substring(15), localStorage.getItem(keyName), null);
		}
		localStorage.removeItem(keyName);
	  }
	}
  },
  _init: function() {
	backend.sync();
  }
}

});

})(typeof define == "undefined" ? function(deps, factory){
	remoteStorage = factory();
} : define);
