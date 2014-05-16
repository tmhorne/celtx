/* ***** BEGIN LICENCE BLOCK *****
 * Version: MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Celtx Script Manager.
 * 
 * The Initial Developer of the Original Code is 4067479 Canada Inc.
 * t/a CELTX.
 * 
 * Portions created by Celtx are Copyright (C) 4067479 Canada Inc. All
 * Rights Reserved.
 * 
 * Contributor(s):
 *
 ***** END LICENCE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

function nsCeltxService () {
  var rdfsvc = Cc["@mozilla.org/rdf/rdf-service;1"]
    .getService(Ci.nsIRDFService);
  var rdfcu = Cc["@mozilla.org/rdf/container-utils;1"]
    .getService(Ci.nsIRDFContainerUtils);

  var ds = Cc["@mozilla.org/file/directory_service;1"]
    .getService(Ci.nsIProperties);
  var dir = ds.get("ProfD", Ci.nsIFile);
  dir.append("temp");
  if (! dir.exists() || ! (dir.isReadable() && dir.isWritable()))
    dir.createUnique(1, 0700);
  this._tempDir = dir;

  var os = Cc["@mozilla.org/observer-service;1"]
    .getService(Ci.nsIObserverService);
  os.addObserver(this, "quit-application", false);

  this.startup();
  this.fetchBannerData();
}

nsCeltxService.prototype = {
  QueryInterface: function cxsvc_QI(iid) {
    if (iid.equals(Ci.nsISupports) ||
        iid.equals(Ci.nsIObserver) ||
        iid.equals(Ci.nsICeltxService))
      return this
    throw Cr.NS_ERROR_NO_INTERFACE;
  },


  _offline: true,
  _loggedIn: false,
  _username: null,
  _workspaceURI: null,
  _autologinChecked: false,
  _banners: null,

  get VERSION ()      { return "2.9.7"; },

  get PUBLISH_SERVER () {
    var ps = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefService);
    return ps.getBranch("celtx.server.").getCharPref("publish.selection");
  },
  get STARTUP_URL () {
    return "http://" + this.PUBLISH_SERVER + "/pub/startup";
  },
  get SPLASH_URL () {
    return "http://" + this.PUBLISH_SERVER + "/pub/splash";
  },
  get POW_URL () {
    return "http://" + this.PUBLISH_SERVER + "/pub/potw";
  },
  get BANNER_URL () {
    return "http://" + this.PUBLISH_SERVER + "/pub/banners";
  },

  get STUDIO_SERVER () {
    var ps = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefService);
    return ps.getBranch("celtx.server.").getCharPref("studio.selection");
  },
  get STUDIO_SCHEME () {
    var ps = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefService);
    return ps.getBranch("celtx.server.").getCharPref("studio.scheme");
  },
  get STUDIO_BASEURL () {
    return this.STUDIO_SCHEME + "://" + this.STUDIO_SERVER;
  },

  get PDF_SERVER () {
    var ps = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefService);
    return ps.getBranch("celtx.server.").getCharPref("render.selection");
  },
  get PDF_CONVERT_URL () {
    return "https://" + this.PDF_SERVER + "/as/pdf";
  },
  get PDF_PREVIEW_URL () {
    return "https://" + this.PDF_SERVER + "/as/html";
  },


  startup: function startup () {
    // If celtx.server.ping is false, this will not store the stats cookie
    var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Components.interfaces.nsIJSXMLHttpRequest);
    request.onload = function () {
      var cxsvc = Components.classes["@celtx.com/celtx-service;1"]
        .getService(Components.interfaces.nsICeltxService);
      if (this.status >= 200 && this.status < 300)
        cxsvc.offline = false;
      else
        cxsvc.offline = true;
    };
    request.onerror = function () {
      var cxsvc = Components.classes["@celtx.com/celtx-service;1"]
        .getService(Components.interfaces.nsICeltxService);
      cxsvc.offline = true;
    };
    request = request.QueryInterface(Ci.nsIXMLHttpRequest);
    request.open("GET", this.STARTUP_URL + "/" + this.VERSION, true);
    request.send(null);
  },


  shutdown: function shutdown () {
    try {
      this._tempDir.remove(true);
    }
    catch (ex) {
      dump("*** nsCeltxService.shutdown: " + ex + "\n");
    }

    var os = Cc["@mozilla.org/observer-service;1"]
      .getService(Ci.nsIObserverService);
    os.removeObserver(this, "quit-application");
  },


  fetchBannerData: function fetchBannerData () {
    var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Components.interfaces.nsIJSXMLHttpRequest);
    request.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var cxsvc = Components.classes["@celtx.com/celtx-service;1"]
          .getService(Components.interfaces.nsICeltxService);
        cxsvc.banners = this.responseXML;
      }
    };
    request.onerror = function () {
      dump("*** fetchBannerData: Unknown error\n");
    };
    request = request.QueryInterface(Ci.nsIXMLHttpRequest);
    request.open("GET", this.BANNER_URL, true);
    request.send(null);
  },


  observe: function (subject, topic, data) {
    if (topic == "quit-application") {
      this.shutdown();
    }
  },


  get tempDirSpec () {
    var ios = Cc["@mozilla.org/network/io-service;1"]
      .getService(Ci.nsIIOService);
    return ios.newFileURI(this._tempDir).spec;
  },


  get offline () {
    return this._offline;
  },


  set offline (val) {
    if (this._offline != val) {
      this._offline = val;
      var os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
      os.notifyObservers(this, "celtx:network-status-changed",
        val ? "offline" : "online");
    }
    return val;
  },


  get loggedIn () {
    return this._loggedIn;
  },


  loginSuccessful: function cxsvc_loginSuccessful () {
    this._loggedIn = true;
  },


  get username () {
    return this.loggedIn ? this._username : null;
  },


  get workspaceURI () {
    dump("--- get workspaceURI () : loggedIn = "
      + this.loggedIn + " ; workspaceURI = " + this._workspaceURI + "\n");
    return this.loggedIn ? this._workspaceURI : null;
  },


  get banners () {
    return this._banners;
  },
  set banners (val) {
    this._banners = val;

    var os = Cc["@mozilla.org/observer-service;1"]
      .getService(Ci.nsIObserverService);
    os.notifyObservers(this, "celtx:banner-data-changed", null);
  },


  checkLoginFromCookie: function () {
    var ICookie = Components.interfaces.nsICookie;
    var cookiesvc = Components.classes["@mozilla.org/cookiemanager;1"]
      .getService(Components.interfaces.nsICookieManager);
    var cookieenum = cookiesvc.enumerator;
    var username = null;
    var workspace = null;
    var session = null;
    var kServerName = this.STUDIO_SERVER;
    while (cookieenum.hasMoreElements()) {
      var cookie = cookieenum.getNext().QueryInterface(ICookie);
      if (cookie.host != kServerName)
        continue;

      switch (cookie.name) {
        case "cx_studio_whoami":
        case "cx_whoami":
          username = decodeURIComponent(cookie.value);  break;
        case "cx_studio_wsurl":
        case "cx_wsurl":
          workspace = decodeURIComponent(cookie.value); break;
        case "cx_studio_session":
        case "cx_session":
          session = decodeURIComponent(cookie.value);   break;
      }
    }
    if (username && workspace) {
      this._username = username;
      this._workspaceURI = workspace;
      dump("--- checkLoginFromCookie: username = " + username
         + " ; workspace = " + workspace + " ; session = "
         + session + "\n");
      if (session) {
        this.loginSuccessful();
        var obssvc = Cc["@mozilla.org/observer-service;1"]
          .getService(Ci.nsIObserverService);
        obssvc.notifyObservers(this, "celtx:login-status-changed", "loggedin");
      }
    }
    else {
      dump("*** checkLoginFromCookie: username = " + username
         + " ; workspace = " + workspace + "\n");
    }
  },


  checkAutoLogin: function (win) {
    if (this._autologinChecked)
      return;

    this._autologinChecked = true;

    var ps = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefService).getBranch("celtx.");
    if (! ps.getBoolPref("user.loginOnStartup"))
      return;

    try {
      var userid = ps.getCharPref("user.id");
      var pass = ps.getCharPref("user.encpassword");
      pass = base64_decodew(pass);
      this.loginAs(userid, pass, null, {onLogin: function (success) {}}, win);
    }
    catch (ex) {
      dump("*** nsCeltxService: " + ex + "\n");
    }
  },


  checkLogin: function (observer, win) {
    var request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Ci.nsIJSXMLHttpRequest);
    request.onload = function () {
      observer.onLogin(request.status == 200);
    };
    request.onerror = function () {
      observer.onLogin(false);
    };
    request = request.QueryInterface(Ci.nsIXMLHttpRequest);
    request.open("GET", this.STUDIO_BASEURL + "/auth/check", true);
    request.send(null);
  },


  // |service| is unused, but consumers expect it
  login: function (service, observer, reattempt, win) {
    if (this.loggedIn) {
      var self = this;
      var checkObserver = {
        onLogin: function (result) {
          if (result) {
            observer.onLogin(true);
          }
          else {
            self._loggedIn = false;
            self.login(service, observer, reattempt, win);
          }
        }
      };
      this.checkLogin(checkObserver, win);
      return;
    }

    var logindata = {
      username: "",
      password: "",
      prompt: true,
      reattempt: reattempt
    };
    this.attemptLogin(observer, win, logindata);
  },


  loginAs: function (username, password, service, observer, win) {
    var logindata = {
      username: username,
      password: password,
      prompt: false,
      reattempt: false
    };
    this.attemptLogin(observer, win, logindata);
  },


  attemptLogin: function (observer, win, logindata) {
    if (logindata.prompt) {
      var auth = {
        username: logindata.username,
        password: logindata.password,
        reattempt: logindata.reattempt,
        message: logindata.message,
        location: logindata.location,
        canceled: false
      };
      win.openDialog("chrome://celtx/content/authenticate.xul", "",
        "chrome,modal,centerscreen,titlebar", auth);
      if (auth.canceled) {
        observer.onLogin(false);
        return;
      }
      logindata.username = auth.username;
      logindata.password = auth.password;
    }

    // Trim leading and trailing white space
    logindata.username = logindata.username.replace(/^\s+/, "");
    logindata.username = logindata.username.replace(/\s+$/, "");

    var self = this;

    var request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Ci.nsIJSXMLHttpRequest);
    request.onload  = function () {
      if (request.status == 200) {
        var response = JSON.parse(request.responseText);
        self.loginSuccessful();
        self._username = response.whoami;
        self._workspaceURI = response.wsurl;
        var obssvc = Cc["@mozilla.org/observer-service;1"]
          .getService(Ci.nsIObserverService);
        obssvc.notifyObservers(this, "celtx:login-status-changed", "loggedin");
        logindata.message = "";
        logindata.location = "";
        if (observer)
          observer.onLogin(true);
      }
      // If unauthorized, only reattempt if we prompted for login info
      else if (logindata.prompt) {
        // Not Authorized
        dump("*** nsCeltxService.login: " + request.status + " "
          + request.statusText + "\n");
        logindata.message = "";
        logindata.location = "";
        if (request.status >= 400 && request.status < 500) {
          logindata.message = request.responseText;
          try {
            logindata.location = request.getResponseHeader("Location");
          }
          catch (ex) {}
        }
        else {
          logindata.message = request.statusText;
          logindata.location = "";
        }
        // Retry
        logindata.reattempt = true;
        self.attemptLogin(observer, win, logindata);
      }
      else {
        dump("*** nsCeltxService.login: status: " + request.status + "\n");
        if (observer)
          observer.onLogin(false);
      }
    };
    request.onerror = function () {
      if (observer)
        observer.onLogin(false);
    };
    request.onreadystatechange = function () {
      var uninitialized = 0;
      var completed = 4;
      if (! observer)
        return;

      // If the request is aborted, it broadcasts a change to COMPLETED and
      // then silently switches to UNINITIALIZED, so we need to check on
      // a timeout if the state changes after we're notified.
      if (request.readyState == completed) {
        try {
          var jswin = win.QueryInterface(Components.interfaces.nsIDOMJSWindow);
          jswin.setTimeout(function () {
            if (request.readyState == uninitialized)
              observer.onLogin(false);
          }, 0);
        }
        catch (ex) {
          dump("*** attemptLogin: " + ex + "\n");
        }
      }
    };
    request = request.QueryInterface(Ci.nsIXMLHttpRequest);
    request.open("POST", this.STUDIO_BASEURL + "/auth/login", true);
    request.setRequestHeader("Content-Type",
      "application/x-www-form-urlencoded");
    request.setRequestHeader("Accept", "application/json");
    var poststr = "u=" + encodeURIComponent(logindata.username)
      + "&p=" + encodeURIComponent(logindata.password);
    request.send(poststr);
  },


  logout: function cxsvc_logout () {
    this._loggedIn = false;
    var obssvc = Cc["@mozilla.org/observer-service;1"]
      .getService(Ci.nsIObserverService);
    obssvc.notifyObservers(this, "celtx:login-status-changed", "loggedout");

    var request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Ci.nsIXMLHttpRequest);
    request.open("GET", this.STUDIO_BASEURL + "/auth/logout", true);
    request.send(null);
  }
};


var initModule = {
  ServiceCID: Components.ID("{879e5daa-510e-4e1c-9420-66ac2b7bf7a3}"),
  ServiceContractID: "@celtx.com/celtx-service;1",
  ServiceName: "Celtx Service",


  registerSelf: function (compMgr, fileSpec, location, type) {
    compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(this.ServiceCID, this.ServiceName,
      this.ServiceContractID, fileSpec, location, type);
  },


  unregisterSelf: function (compMgr, fileSpec, location) {
    compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(this.ServiceCID, fileSpec);
  },


  getClassObject: function (compMgr, cid, iid) {
    if (! cid.equals(this.ServiceCID))
      throw Cr.NS_ERROR_NO_INTERFACE;
    if (! iid.equals(Ci.nsIFactory))
      throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    return this.instanceFactory;
  },


  canUnload: function (compMgr) {
    return true;
  },


  instanceFactory: {
    createInstance: function (outer, iid) {
      if (outer != null)
        throw Cr.NS_ERROR_NO_AGGREGATION;
      return new nsCeltxService().QueryInterface(iid);
    }
  }
};


function NSGetModule (compMgr, fileSpec) {
  return initModule;
}


function base64_decodew (str) {
  var table =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var result = "";
  var i = 0;
  var accum = -1;
  while (i < str.length) {
    var src = [
      table.indexOf(str.charAt(i++)), table.indexOf(str.charAt(i++)),
      table.indexOf(str.charAt(i++)), table.indexOf(str.charAt(i++))
    ];
    if (isNaN(src[0]) || isNaN(src[1]) || isNaN(src[2]) || isNaN(src[3]) ||
        src[0] < 0 || src[1] < 0 || src[2] < 0 || src[3] < 0)
      throw "String does not appear to be base64";
    // Masking guarantees any '=' will be trimmed from 0x40 to 0x00
    var dst = [
      (src[0] << 2) | ((src[1] & 0x3F) >> 4),
      ((src[1] & 0x0F) << 4) | ((src[2] & 0x3F) >> 2),
      ((src[2] & 0x03) << 6) | (src[3] & 0x3F)
    ];
    if (i % 8 == 4) {
      // First char and a half
      result += String.fromCharCode((dst[0] << 8) | dst[1]);
      if (src[3] == 64) {
        break;
      }
      accum = dst[2] << 8;
    }
    else {
      result += String.fromCharCode(accum | dst[0]);
      accum = -1;
      if (dst[1] == 0 && dst[2] == 0) {
        break;
      }
      result += String.fromCharCode((dst[1] << 8) | dst[2]);
    }
  }
  return result;
}


/*
    http://www.JSON.org/json2.js
    2008-09-01

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html

    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the object holding the key.

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be used to
            select the members to be serialized. It filters the results such
            that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.

    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/

/*jslint evil: true */

/*global JSON */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", call,
    charCodeAt, getUTCDate, getUTCFullYear, getUTCHours, getUTCMinutes,
    getUTCMonth, getUTCSeconds, hasOwnProperty, join, lastIndex, length,
    parse, propertyIsEnumerable, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/

// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (!this.JSON) {
    JSON = {};
}
(function () {

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z';
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapeable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapeable.lastIndex = 0;
        return escapeable.test(string) ?
            '"' + string.replace(escapeable, function (a) {
                var c = meta[a];
                if (typeof c === 'string') {
                    return c;
                }
                return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// If the object has a dontEnum length property, we'll treat it as an array.

            if (typeof value.length === 'number' &&
                    !value.propertyIsEnumerable('length')) {

// The object is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/.
test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
})();
