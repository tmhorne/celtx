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

function ServerItem () {
  this.id = null;
  this.type = null;
  this.subType = null;
  this.title = "";
  this.owner = "";
  this.savedBy = "";
  this.editURL = null;
  this.fetchURL = null;
  this.exportURL = null;
  this.isStandalone = false;
  this.lastModified = null;
  this.children = null;
}


// Similar to Google Closure's goog.async.Deferred. All code is original.

function Deferred () {
  this._callbacks = new Array();
  this._errbacks = new Array();
  this._awaitCount = 0;
  this._result = null;
  this._success = true;
  this._fired = false;
}

Deferred.prototype = {
  addCallback: function (aCallback, aScope) {
    this._callbacks.push(function (aResult) {
      aCallback.call(aScope, aResult);
    });
  },

  addErrback: function (aErrback, aScope) {
    this._errbacks.push(function (aResult) {
      aErrback.call(aScope, aResult);
    });
  },

  awaitDeferred: function (aDeferred) {
    ++this._awaitCount;
    aDeferred.addCallback(this._awaitCallback, this);
    aDeferred.addErrback(this._awaitErrback, this);
  },

  callback: function (aResult) {
    if (this._success)
      this._result = aResult;

    if (this._awaitCount == 0 && ! this._fired)
      this._fire();
  },

  errback: function (aResult) {
    this._success = false;
    this._result = aResult;

    if (this._awaitCount == 0 && ! this._fired)
      this._fire();
  },

  _fire: function () {
    var list = this._success ? this._callbacks : this._errbacks;
    for (var i = 0; i < list.length; ++i) {
      try {
        list[i].call(null, this._result);
      }
      catch (ex) {
        dump("*** Deferred callback threw an exception: " + ex + "\n");
      }
    }
    this._fired = true;
  },

  _awaitCallback: function () {
    if (--this._awaitCount == 0 && ! this._fired)
      this._fire();
  },

  _awaitErrback: function (aResult) {
    this._success = false;
    this._result = aResult;
    if (--this._awaitCount == 0 && ! this._fired)
      this._fire();
  }
};


function CloudEnumerator () {
  this.cxsvc = getCeltxService();
  this.contents = null;
  this.supportedTypes = {
    // Ignore folders (collections) for the moment, since the feed is
    // already flattened, so we don't need to recurse into them
    // "collection": 1,
    "project": 1,
    "script": 1
  };
  this.supportedScriptTypes = {
    "film": 1,
    "screenplay": 1,
    "theatre": 1,
    "av": 1,
    "audiovisual": 1,
    "radio": 1,
    "comic": 1,
    "novel": 1
  };
}

// Returns a Deferred
CloudEnumerator.prototype.fetch = function () {
  var url = this.cxsvc.STUDIO_BASEURL + "/feeds/default/private/full";
  this.contents = new Array();
  this.result = new Deferred();
  this.enumerationLimit = 10;
  this.result.awaitDeferred(this.enumerateContents(url, this.contents));
  this.result.callback(this.contents);
  return this.result;
};

CloudEnumerator.prototype.convertServerItem = function (aItem) {
  var serverItem = new ServerItem();
  serverItem.id = aItem.id;
  serverItem.type = aItem.kind;
  serverItem.self = aItem.self;
  serverItem.editURL = aItem.editMedia;
  if (aItem.kind == "project") {
    serverItem.exportURL = aItem.desktopExport;
  }
  else if (aItem.kind == "script") {
    serverItem.fetchURL = aItem.content;
    serverItem.isStandalone = true;
    var matches = aItem.type.match(/celtxType=(\w+)/);
    if (matches)
      serverItem.subType = matches[1];
  }
  if ("title" in aItem)
    serverItem.title = aItem.title;
  if ("updated" in aItem)
    serverItem.lastModified = isoDateStringToDate(aItem.updated);
  else if ("published" in aItem)
    serverItem.lastModified = isoDateStringToDate(aItem.published);
  if ("author" in aItem)
    serverItem.savedBy = aItem.author;
  return serverItem;
};

CloudEnumerator.prototype.enumerateContents = function (aURL, aContext, aNextKey) {
  var result = new Deferred();
  var xhr = new XMLHttpRequest();
  var ios = getIOService();
  var url = ios.newURI(aURL, null, null).QueryInterface(
    Components.interfaces.nsIURL);
  if (aNextKey) {
    var query = url.query;
    if (query.length > 0)
      url.query += "&next-key=" + encodeURIComponent(aNextKey);
    else
      url.query = "next-key=" + encodeURIComponent(aNextKey);
  }
  xhr.open("GET", url.spec, true);
  xhr.setRequestHeader("Accept", "application/json");
  var self = this;
  xhr.onload = function () {
    try {
      var container = JSON.parse(xhr.responseText);
      var items = container.items;
      for (var i = 0; i < items.length; ++i) {
        var item = items[i];
        if (! (item.kind in self.supportedTypes) ||
            item.embedded || item.deleted)
          continue;

        var serverItem = self.convertServerItem(item);

        if (serverItem.type == "script" && ! (serverItem.subType
            && serverItem.subType in self.supportedScriptTypes))
          continue;

        aContext.push(serverItem);

        // Recurse for collections and await contents
        /*
         * Re-enable this when a structured feed is available, right now
         * it is just a flattened feed
        if (item.kind == "collection") {
          serverItem.children = new Array();
          result.awaitDeferred(
            self.enumerateContents(item.contents, serverItem.children));
        }
        */
      }
      if ("next_key" in container && --self.enumerationLimit > 0)
        result.awaitDeferred(self.enumerateContents(aURL, aContext,
          container.next_key));
      result.callback();
    }
    catch (ex) {
      result.errback(ex);
    }
  };
  xhr.onerror = function () {
    result.errback(new Error("Failed to load " + aURL));
  };
  xhr.send(null);

  return result;
};


function StudioEnumerator () {
}

StudioEnumerator.prototype.convertServerItem = function (aItem, aBaseURL) {
  var serverItem = new ServerItem();
  serverItem.id = aItem.id;
  serverItem.type = "project";
  serverItem.fetchURL = aBaseURL + aItem.id;
  serverItem.editURL = aBaseURL + aItem.id;
  if ("title" in aItem)
    serverItem.title = aItem.title;
  try {
    if ("updated" in aItem)
      serverItem.lastModified = isoDateStringToDate(aItem.updated);
    else if ("created" in aItem)
      serverItem.lastModified = isoDateStringToDate(aItem.created);
  }
  catch (ex) {
    dump("*** convertServerItem: Invalid date string, " + ex + "\n");
  }
  if ("author" in aItem)
    serverItem.savedBy = aItem.author;
  return serverItem;
};

StudioEnumerator.prototype.fetch = function () {
  var result = new Deferred();
  var xhr = new XMLHttpRequest();
  var workspace = getCeltxService().workspaceURI;
  var fetchURL = workspace + "/projects";
  xhr.open("GET", fetchURL, true);
  var self = this;
  xhr.onload = function () {
    try {
      var list = JSON.parse(xhr.responseText);
      var count = list.length;
      var convertedList = new Array(count);
      var baseURL = workspace + "/project/";
      for (var i = 0; i < count; ++i)
        convertedList[i] = self.convertServerItem(list[i], baseURL);
      result.callback(convertedList);
    }
    catch (ex) {
      result.errback(ex);
    }
  };
  xhr.onerror = function () {
    result.errback(new Error("Failed to load " + aURL));
  };
  xhr.send(null);

  return result;
};