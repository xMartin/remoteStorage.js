if(!window.remoteStorage) {//shim switch
	require([
		'js/remote-storage/main',
		'js/remote-storage/oauth',
		'js/remote-storage/backend'
	], function(remoteStorage, oauth, backend){
		window.remoteStorage = remoteStorage;
	
		// poor man's jQuery  
		//implementing $(document).ready(embody):
		document.addEventListener('DOMContentLoaded', function() {
			document.removeEventListener('DOMContentLoaded', arguments.callee, false );
			{
			  var scripts = document.getElementsByTagName('script');
			  for(i in scripts) {
				if(/remoteStorage-future.js$/.test(scripts[i].src)) {
				  var options = (new Function('return ' + scripts[i].innerHTML.replace(/\n|\r/g, '')))();
				  window.remoteStorage.init(options);
				}
			  }
			  oauth.harvestToken(function(token) {
				backend.setToken(token);
				//backend.sync();
			  });
			  //remoteStorage.init('sandwiches');
			}
		}, false);
	});
}

  ////////
 // UI //
////////
function DisplayConnectionState() {
  if(remoteStorage.isConnected()) {
    //button to disconnect:
    document.getElementById('userButton').value='Disconnect';
    //display span:
    document.getElementById('userAddress').style.display='inline';
    document.getElementById('userAddress').innerHTML=remoteStorage.getUserAddress();
    //hide input:
    document.getElementById('userAddressInput').style.display='none';
    document.getElementById('userAddressInput').disabled='disabled';
  } else {
    //button to Sign in:
    document.getElementById('userButton').value='Sign in';
    //display input:
    document.getElementById('userAddressInput').value='';
    document.getElementById('userAddressInput').style.display='inline';
    document.getElementById('userAddressInput').disabled='';
    //hide input:
    document.getElementById('userAddress').style.display='none';
    document.getElementById('userAddress').disabled='disabled';
  }
}

function InputKeyUp(el) {
  if(el.value=='') {
    document.getElementById('userButton').className='';
    document.getElementById('userButton').disabled='disabled';
    el.parentNode.style.opacity='.5';
  } else {
    document.getElementById('userButton').disabled='';
    document.getElementById('userButton').className='green';
    el.parentNode.style.opacity='1';
  }
}
function SpanMouseOver(el) {
  el.className='red';
}
function SpanMouseOut(el) {
  el.className='';
}
function SpanClick(el) {
  window.remoteStorage.disconnect();
}
function ButtonClick(el, dataScope) {
  if(window.remoteStorage.isConnected()) {
    window.remoteStorage.disconnect();
    DisplayConnectionState();
  } else {
    if(document.getElementById('userAddressInput').value!='') {
      window.remoteStorage.connect(document.getElementById('userAddressInput').value, dataScope);
      DisplayConnectionState();
    }
  }
}

require(['js/remote-storage/main'], function(remoteStorage){
	remoteStorage.init = function(options) {
	  if(!options) {
		options = {};
	  }
	  if (!(options.dataScope)) {
		options.dataScope = location.host;
	  }
	  var divEl = document.createElement('div');
	  divEl.id = 'remoteStorageDiv';
	  divEl.innerHTML = '<link rel="stylesheet" href="../../remoteStorage.css" />'
		+'<input id="userAddressInput" type="text" placeholder="you@yourremotestorage" onkeyup="InputKeyUp(this);">'
		+'<span id="userAddress" style="display:none" onmouseover="SpanMouseOver(this);" onmouseout="SpanMouseOut(this);" onclick="SpanClick(this)"></span>'
		+'<input id="userButton" type="submit" value="Sign in" onclick="ButtonClick(this,'
		+'\''+options.dataScope+'\')">';
	  document.body.insertBefore(divEl, document.body.firstChild);
	  if(remoteStorage.isConnected()) {
		remoteStorage._init();
	  }
	  DisplayConnectionState();
	  remoteStorage.options = options;
	};
});
