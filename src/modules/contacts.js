
/**
 ** Skeleton for new modules
 **/

define([
  // don't change these weird paths.
  // required due to builder issues hopefully to be resolved by
  // https://github.com/RemoteStorage/remoteStorage.js/issues/84
  '../remoteStorage',
  '../modules/deps/vcardjs-0.2'
], function(remoteStorage, vCardJS) {

  // Namespace: remoteStorage.contacts
  //
  // Section: Tutorial
  //
  //   > // TODO!
  //
  // Section: Data Format
  //
  // The contacts module deals with information about people and connections between people.
  //
  // Data is stored as vcards, in a JSON representation.
  //
  // Here's an example:
  //
  //   (start code)
  //   {
  //     // FN stands for "formatted name". it's required.
  //     "fn": "Hagbard Celine",
  //     // N is an (optional) detailed representation of the name
  //     "n": {
  //       "first-name": "Hagbard"
  //       "last-name": "Celine"
  //     },
  //     // a vcard can have multiple email addresses, so it's stored as an array.
  //     "email" : [{
  //       "type": "work",
  //       "value": "hagbard@leifericson.no"
  //     }]
  //   }
  //   (end code)
  //

  var moduleName = "contacts";

  var VCard = vCardJS.VCard, VCF = vCardJS.VCF;

  remoteStorage.defineModule(moduleName, function(base) {

    var DEBUG = true, contacts = {};

    // Copy over all properties from source to destination.
    // Return destination.
    function extend() {
      var destination = arguments[0], source;
      for(var i=1;i<arguments.length;i++) {
        source = arguments[i];
        var keys = Object.keys(source);
        for(var j=0;j<keys.length;j++) {
          var key = keys[j];
          destination[key] = source[key];
        }
      }
      return destination;
    }


    var bindContext = (
      ( (typeof (function() {}).bind === 'function') ?
        // native version
        function(cb, context) { return cb.bind(context); } :
        // custom version
        function(cb, context) {
          return function() { return cb.apply(context, arguments); }
        } )
    );

    var debug = DEBUG ? bindContext(console.log, console) : function() {};

    // VCard subtypes:

    var Contact = function() {
      VCard.apply(this, arguments);
      this.setAttribute('kind', 'individual');
    }

    function makeVcardInstance(data) {
      var type = (data.kind == 'individual' ? Contact :
                  (data.kind == 'group' ? Group : VCard));
      return new type(data);
    }

    var Group = function(name) {
      VCard.apply(this, arguments);
      this.setAttribute('kind', 'group');
    }

    var groupMembers = {

      getMembers: function() {
        var members = [];
        for(var i=0;i<this.member.length;i++) {
          members.push(this.lookupMember(member[i]));
        }
        return members;
      },

      // resolve a URI to a contact an return it.
      lookupMember: function(uri) {
        var md = uri.match(/^([^:]):(.*)$/), scheme = md[1], rest = md[2];
        var key;
        switch(scheme) {
          // URN and UUID directly resolve to the contact's key.
          // if they don't, there is nothing we can do about it.
        case 'urn':
        case 'uuid':
          return contacts.get(uri);
        case 'mailto':
        case 'xmpp':
        case 'sip':
        case 'tel':
          var query = {};
          query[{
            mailto: 'email',
            xmpp: 'impp',
            sip: 'impp',
            tel: 'tel'
          }[scheme]] = rest;
          var results = contacts.search(query);
          if(results.length > 0) {
            return results[0];
          }
          if(scheme == 'tel') {
            break; // no fallback for TEL
          }
          // fallback for MAILTO, XMPP, SIP schems is webfinger:
        case 'acct':
          console.error("FIXME: implement contact-lookup via webfinger!");
          break;
          // HTTP could resolve to a foaf profile, a vcard, a jcard...
        case 'http':
          console.error("FIXME: implement contact-lookup via HTTP!");
          break;
        default:
          console.error("FIXME: unknown URI scheme " + scheme);
        }
        return undefined;
      }

    };

    // Namespace: exports

    extend(contacts, {

      // Property: Contact
      // A VCard constructor for contacts (kind: "individual")
      Contact: Contact,

      // Property: Group
      // A VCard constructor for groups (kind: "group")
      //
      Group: Group,

      //
      // Method: on
      //
      // Install an event handler.
      //
      // "change" events will be altered, so the newValue and oldValue attributes contain VCard instances.
      //
      // For documentation on events see <BaseClient> and <BaseClient.on>.
      on: function(eventType, callback) {
        base.on(eventType, function(event) {
          if(event.oldValue) {
            event.oldValue = contacts._wrap(event.oldValue);
          }
          if(event.newValue) {
            event.newValue = contacts._wrap(event.newValue);
          }
          callback(event);
        });
      },

      //
      // Method: sync
      //
      // Set the "force sync" flag for all contacts.
      //
      // This causes the complete data to be synced, next time <syncNow> is called on either /contacts/ or /.
      //
      sync: function() {
        debug("contacts.sync()");
        base.sync('');
      },

      //
      // Method: list
      //
      // Get a list of contact objects.
      //
      // Parameters:
      //   limit - (optional) maximum number of objects to return
      //   offset - (optional) index to start at.
      //
      //   you can use limit / offset to implement pagination or load-on-scroll flows.
      //
      // Returns:
      //   An Array of VCard objects (or descendants)
      //
      // Example:
      //   > remoteStorage.contacts.list().forEach(function(contact) {
      //   >   console.log(contact.getAttribute('fn'));
      //   > });
      //
      list: function(limit, offset) {
        var list = base.getListing('');
        if(! offset) {
          offset = 0;
        }
        if(! limit) {
          limit = list.length - offset;
        }
        for(var i=0;i<limit;i++) {
          if(list[i + offset]) {
            list[i + offset] = this.get(list[i + offset]);
          }
        }
        return list;
      },

      //
      // Method: get
      //
      // Retrieve a single contact.
      //
      // Parameters:
      //   uid - UID of the contact
      //   callback - (optional)
      //   context - (optional)
      //
      // The callbacks follow the semantics described in <BaseClient.getObject>
      //
      get: function(uid, cb, context) {
        if(cb) {
          base.getObject(uid, function(data) {
            bindContext(cb, context)(this._wrap(data));
          }, this);
        } else {
          return this._wrap(base.getObject(uid));
        }
      },

      //
      // Method: build
      //
      // Build a new (unsaved) contact object.
      //
      // If you want to store the object later, use <put>.
      //
      // Parameters:
      //   attributes - (optional) initial attributes to add
      //
      build: function(attributes) {
        return this._wrap(attributes);
      },

      //
      // Method: put
      //
      // Update or create a contact.
      //
      // Parameters:
      //   contact - a VCard object
      //
      // Returns:
      //   the (possibly altered) VCard object
      //
      // Sets UID and REV attributes as needed.
      //
      //
      // Example:
      //   (start code)
      //   var contact = remoteStorage.contacts.build({ "kind":"individual" });
      //   contact.fn = "Donald Duck";
      //   // (at this point you could contact.validate(), to check if everything is in order)
      //   remoteStorage.contacts.put(contact);
      //   // contact now persisted.
      //   (end code)
      //
      put: function(contact) {
        var contact = this.build(contact);
        contact.validate();
        // TODO: do something with the errors!
        base.storeObject('vcard+' + (contact.kind || 'individual'), contact.uid, contact.attributes);
        return contact;
      },

      filter: function(cb, context) {
        // this is highly ineffective. go fix it!
        var list = this.list();
        var results = [];
        var item;
        for(var i=0;i<list.length;i++) {
          item = bindContext(cb, context)(list[i]);
          if(item) {
            results.push(item)
          }
        }
        return results;
      },

      search: function(filter) {
        var keys = Object.keys(filter);

        return this.filter(function(item) {
          return this.searchMatch(item, filter, keys);
        }, this);
      },

      searchMatch: function(item, filter, filterKeys) {
        if(! filterKeys) {
          filterKeys = Object.keys(filter);
        }

        var check = function(value, ref) {
          if(value instanceof Array) {
            // multiples, such as MEMBER, EMAIL, TEL
            for(var i=0;i<value.length;i++) {
              check(value[i], ref);
            }
          } else if(typeof value === 'object' && value.value) {
            // compounds, such as EMAIL, TEL, IMPP
            check(value.value, ref);
          } else {
            if(typeof(ref) === 'string' && ref.length === 0) {
              return true; // the empty string always matches
            } else if(ref instanceof RegExp) {
              if(! ref.test(value)) {
                return false;
              }
            } else if(value !== ref) {
              // equality is fallback.
              return false;
            }
          }
        }

        return this.filter(function(item) {
          for(var i=0;i<keys.length;i++) {
            var k = keys[i], v = filter[k];
            if(! check(item[k], v)) {
              return false;
            }
          }
          debug('success');
          return item;
        });
      },

      _wrap: function(data) {
        return(data instanceof VCard ? data : makeVcardInstance(data));
      }

    });


    return {
      name: moduleName,

      dataHints: {
      },

      exports: contacts
    }
  });


  return remoteStorage[moduleName];

});
