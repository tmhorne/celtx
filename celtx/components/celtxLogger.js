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

function CeltxLogService () {
}

CeltxLogService.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Ci.nsISupports) ||
        aIID.equals(Ci.nsIObserver) ||
        aIID.equals(Ci.celtxILogService))
      return this;

    throw Cr.NS_ERROR_NO_INTERFACE;
  },


  startup: function startup () {
    this.logs = new Array();
  },


  shutdown: function shutdown () {
    for (var name in this.logs)
      this.logs[name].close();

    this.logs = null;
  },


  openNamedLog: function openNamedLog (aName) {
    if (! (aName in this.logs))
      this.logs[aName] = new CeltxLogger(aName);

    return this.logs[aName];
  },


  observe: function (subject, topic, data) {
    if (topic == "app-startup") {
      var os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
      os.addObserver(this, "final-ui-startup", false);
      os.addObserver(this, "quit-application", false);
    }
    else if (topic == "final-ui-startup") {
      try {
        this.startup();
      }
      catch (ex) {
        dump("*** startup: " + ex + "\n");
      }
    }
    else if (topic == "quit-application") {
      try {
        this.shutdown();
      }
      catch (ex) {
        dump("*** shutdown: " + ex + "\n");
      }

      var os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
      os.removeObserver(this, "quit-application");
      os.removeObserver(this, "final-ui-startup");
    }
  }
};


function CeltxLogger (aName) {
  this.name = aName;

  /*
   * If the log file is as big or bigger than kMaxFileSize, rename it and
   * start a new one. That way, the log doesn't grow endlessly, and the risk
   * of destroying log information related to a recent event is reduced.
   */
  var kMaxFileSize = 1 * 1024 * 1024; // 1MB
  var ds = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties);
  var profdir = ds.get('ProfD', Components.interfaces.nsIFile);
  var file = profdir.clone();
  file.append(aName + ".log");
  if (file.exists() && file.fileSize >= kMaxFileSize)
    file.moveTo(null, aName + ".old.log");

  var fstream = Components.classes[
    "@mozilla.org/network/file-output-stream;1"]
    .createInstance(Components.interfaces.nsIFileOutputStream);
  // PR_WRONLY | PR_CREATE_FILE | PR_APPEND
  fstream.init(file, 0x02 | 0x08 | 0x10, 0, 0);

  this.bstream = Components.classes[
    "@mozilla.org/network/buffered-output-stream;1"]
    .createInstance(Components.interfaces.nsIBufferedOutputStream);
  this.bstream.init(fstream, 4096);

  this.ostream = Components.classes[
    "@mozilla.org/intl/converter-output-stream;1"]
    .createInstance(Components.interfaces.nsIConverterOutputStream);
  this.ostream.init(this.bstream, null, 0, '?');
  this.ostream = this.ostream.QueryInterface(
    Components.interfaces.nsIUnicharOutputStream);

  var now = new Date().toString();
  this.ostream.writeString("=== Started logging: " + now + " ===\n");
}


CeltxLogger.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Ci.nsISupports) ||
        aIID.equals(Ci.celtxILogger))
      return this;

    throw Cr.NS_ERROR_NO_INTERFACE;
  },


  logMessage: function (aMsg) {
    this.ostream.writeString(aMsg + "\n");
    // Note: This only flushes the converter output stream, not the
    // underlying stream
    this.ostream.flush();
  },


  flush: function () {
    this.bstream.flush();
  },


  close: function () {
    var now = new Date().toString();
    this.ostream.writeString("=== Stopped logging: " + now + " ===\n");
    this.ostream.close();
    this.ostream = null;
  }
};


var initModule = {
  ServiceCID: Components.ID("{106a2ff9-9511-4506-b338-3a7f64533dd4}"),
  ServiceContractID: "@celtx.com/log-service;1",
  ServiceName: "Celtx Log Service",


  registerSelf: function (compMgr, fileSpec, location, type) {
    compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(this.ServiceCID, this.ServiceName,
      this.ServiceContractID, fileSpec, location, type);

    var catman = Cc["@mozilla.org/categorymanager;1"]
      .getService(Ci.nsICategoryManager);
    catman.addCategoryEntry("app-startup", "Celtx Log Service",
      "service," + this.ServiceContractID, true, true);
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
      return new CeltxLogService().QueryInterface(iid);
    }
  }
};


function NSGetModule (compMgr, fileSpec) {
  return initModule;
}
