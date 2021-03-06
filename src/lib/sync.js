define(['./wireClient', './store', './util'], function(wireClient, store, util) {

  "use strict";

  // Namespace: sync
  //
  // Sync is where all the magic happens. It connects the <store> and <wireClient>
  //

  var prefix = '_remoteStorage_', busy=false, stateCbs=[];

  var logger = util.getLogger('sync');

  function getState(path) {//should also distinguish between synced and locally modified for the path probably
    if(busy) {
      return 'busy';
    } else {
      return 'connected';
    }
  }
  function setBusy(val) {
    busy=val;
    for(var i=0;i<stateCbs.length;i++) {
      stateCbs[i](val?'busy':'connected');
    }
  }
  function on(eventType, cb) {
    if(eventType=='state') {
      stateCbs.push(cb);
    }
  }
  function dirMerge(dirPath, remote, cached, diff, force, access, startOne, finishOne, clearCb) {
    for(var i in remote) {
      if((!cached[i] && !diff[i]) || cached[i] < remote[i]) {//should probably include force and keep in this decision
        pullNode(dirPath+i, force, access, startOne, finishOne);
      }
    }
    for(var i in cached) {
      if(!remote[i] || cached[i] > remote[i]) {
        if(i.substr(-1)=='/') {
          pullNode(dirPath+i, force, access, startOne, finishOne);
        } else {//recurse
          var childNode = store.getNode(dirPath+i);
          var childData = store.getNodeData(dirPath + i);
          startOne();
          if(typeof(childData) === 'object') {
            childData = JSON.stringify(childData);
          }
          wireClient.set(dirPath+i, childData, 'application/json', function(err) {
            finishOne();
          });
        }
      }
    }
    for(var i in diff) {
      if(!cached[i]) {//outgoing delete
        if(remote[i]) {
          startOne();
          wireClient.set(dirPath+i, undefined, undefined, function(err) {
            finishOne();
          });
        } else {
          clearCb(i);
        }
      } else if(remote[i] === cached[i]) {//can either be same timestamp or both undefined
        clearCb(i);
      }
    }
  }
  function pullNode(path, force, access, startOne, finishOne) {
    var thisNode = store.getNode(path);
    var thisData = store.getNodeData(path);
    if((! thisData) && (path.substr(-1) == '/')) {
      thisData = {};
    }
    logger.debug('pullNode "'+path+'"', thisNode);
    if(thisNode.startAccess == 'rw' || !access) {
      access = thisNode.startAccess;
    }
    if(thisNode.startForce) {
      force = thisNode.startForce;
    }
    if(access) {
      startOne();
      wireClient.get(path, function(err, data) {
        if(!err && data) {
          if(path.substr(-1)=='/') {
            dirMerge(path, data, thisData, thisNode.diff, force, access, startOne, finishOne, function(i) {
              store.clearDiff(path, i);
            });
          } else {
            store.setNodeData(path, data, false);
          }
        }
        finishOne(err);
      });
    } else {
      for(var i in thisData) {
        if(i.substr(-1)=='/') {
          pullNode(path+i, force, access, startOne, finishOne);
        }
      }
    }
  }

  // TODO: DRY those two:

  function fetchNow(path, callback) {
    var outstanding = 0, errors=[];
    function startOne() {
      outstanding++;
    }
    function finishOne(err) {
      if(err) {
        errors.push(err);
      }
      outstanding--;
      if(outstanding == 0) {
        setBusy(false);
        callback(errors || null, store.getNode(path));
      }
    }
    setBusy(true);
    pullNode(path, false, true, startOne, finishOne)
  }

  function syncNow(path, callback) {

    if(wireClient.getState() == 'anonymous') {
      if(callback) {
        callback(['not connected']);
      }
      return;
    }

    var outstanding=0, errors=[];
    function startOne() {
      outstanding++;
    }
    function finishOne(err) {
      if(err) {
        errors.push(path);
      }
      outstanding--;
      if(outstanding==0) {
        setBusy(false);
        if(callback) {
          callback(errors.length > 0 ? errors : null);
        }
      }
    }
    logger.info('syncNow '+path);
    setBusy(true);
    pullNode(path, false, false, startOne, finishOne);
  }

  return {
    syncNow: syncNow,
    fetchNow: fetchNow,
    getState : getState,
    on: on
  };

});
