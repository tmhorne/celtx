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

// Test protocol related
const kSCHEME = "celtx";
const kSSL_SCHEME = "celtxs";
const kPROTOCOL_NAME = "Celtx Protocol";
const kSSL_PROTOCOL_NAME = "Secure Celtx Protocol";
const kPROTOCOL_CONTRACTID = "@mozilla.org/network/protocol;1?name=" + kSCHEME;
const kSSL_PROTOCOL_CONTRACTID = "@mozilla.org/network/protocol;1?name=" + kSSL_SCHEME;
const kPROTOCOL_CID = Components.ID("02cc887e-4aeb-4e23-8dc6-824f45f8a02c");
const kSSL_PROTOCOL_CID = Components.ID("a12484aa-0994-4e88-a487-774f9a96d3fd");

// Mozilla defined
const kStandardURL = "@mozilla.org/network/standard-url;1";
const kIOService = "@mozilla.org/network/io-service;1";
const nsISupports = Components.interfaces.nsISupports;
const nsIIOService = Components.interfaces.nsIIOService;
const nsIProtocolHandler = Components.interfaces.nsIProtocolHandler;
const nsIProxiedProtocolHandler =
  Components.interfaces.nsIProxiedProtocolHandler;
const nsIURI = Components.interfaces.nsIURI;

function Protocol() {
  var ios = Components.classes[kIOService].getService(nsIIOService);
  this.mHandler = ios.getProtocolHandler("http")
    .QueryInterface(nsIProxiedProtocolHandler);
  if (! this.mHandler)
    Components.utils.reportError("Uh oh, getProtocolHandler returned null for http!");
}

Protocol.prototype = {
  QueryInterface: function(iid) {
    if (!iid.equals(nsIProtocolHandler) &&
        !iid.equals(nsIProxiedProtocolHandler) &&
        !iid.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  },

  scheme: kSCHEME,
  defaultPort: 80,
  protocolFlags: nsIProtocolHandler.URI_STD |
                 nsIProtocolHandler.ALLOWS_PROXY |
                 nsIProtocolHandler.ALLOWS_PROXY_HTTP,

  allowPort: function(port, scheme) {
    return this.mHandler.allowPort(port, scheme);
  },

  newURI: function(spec, charset, baseURI) {
    var url = Components.classes[kStandardURL]
      .createInstance(Components.interfaces.nsIStandardURL);
    url.init(Components.interfaces.nsIStandardURL.URLTYPE_AUTHORITY,
      this.defaultPort, spec, charset, baseURI);
    return url;
  },

  newChannel: function (aURI) {
    if (! aURI.schemeIs("celtx"))
      throw Components.results.NS_ERROR_UNEXPECTED;
    var httpURI = aURI.clone();
    httpURI.scheme = "http";
    return this.mHandler.newChannel(httpURI);
  },

  newProxiedChannel: function(aURI, aProxyInfo) {
    if (! aURI.schemeIs("celtx"))
      throw Components.results.NS_ERROR_UNEXPECTED;
    var httpURI = aURI.clone();
    httpURI.scheme = "http";
    return this.mHandler.newProxiedChannel(httpURI, aProxyInfo);
  },
};

var ProtocolFactory = {
  createInstance: function (outer, iid) {
    if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsIProtocolHandler) &&
        !iid.equals(nsIProxiedProtocolHandler) &&
        !iid.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;

    return new Protocol();
  }
};

function SecureProtocol() {
  var ios = Components.classes[kIOService].getService(nsIIOService);
  this.mHandler = ios.getProtocolHandler("http")
    .QueryInterface(nsIProxiedProtocolHandler);
  if (! this.mHandler)
    Components.utils.reportError("Uh oh, getProtocolHandler returned null for http!");
}

SecureProtocol.prototype = {
  QueryInterface: function(iid) {
    if (!iid.equals(nsIProtocolHandler) &&
        !iid.equals(nsIProxiedProtocolHandler) &&
        !iid.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  },

  scheme: kSSL_SCHEME,
  defaultPort: 443,
  protocolFlags: nsIProtocolHandler.URI_STD |
                 nsIProtocolHandler.ALLOWS_PROXY |
                 nsIProtocolHandler.ALLOWS_PROXY_HTTP,

  allowPort: function(port, scheme) {
    return this.mHandler.allowPort(port, scheme);
  },

  newURI: function(spec, charset, baseURI) {
    var url = Components.classes[kStandardURL]
      .createInstance(Components.interfaces.nsIStandardURL);
    url.init(Components.interfaces.nsIStandardURL.URLTYPE_AUTHORITY,
      this.defaultPort, spec, charset, baseURI);
    return url;
  },

  newChannel: function (aURI) {
    if (! aURI.schemeIs("celtxs"))
      throw Components.results.NS_ERROR_UNEXPECTED;
    var httpURI = aURI.clone();
    httpURI.scheme = "https";
    return this.mHandler.newChannel(httpURI);
    // return this.newProxiedChannel(aURI, null);
  },

  newProxiedChannel: function(aURI, aProxyInfo) {
    if (! aURI.schemeIs("celtxs"))
      throw Components.results.NS_ERROR_UNEXPECTED;
    var httpURI = aURI.clone();
    httpURI.scheme = "https";
    return this.mHandler.newProxiedChannel(httpURI, aProxyInfo);
  },
};

var SecureProtocolFactory = {
  createInstance: function (outer, iid) {
    if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsIProtocolHandler) &&
        !iid.equals(nsIProxiedProtocolHandler) &&
        !iid.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;

    return new SecureProtocol();
  }
};


/**
 * JS XPCOM component registration goop:
 *
 * We set ourselves up to observe the xpcom-startup category.  This provides
 * us with a starting point.
 */

var Module = {
  QueryInterface: function mod_QI(iid) {
    if (iid.equals(Components.interfaces.nsIModule) ||
        iid.equals(Components.interfaces.nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  registerSelf: function (compMgr, fileSpec, location, type) {
    compMgr =
      compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(kPROTOCOL_CID,
                                    kPROTOCOL_NAME,
                                    kPROTOCOL_CONTRACTID,
                                    fileSpec, 
                                    location, 
                                    type);
    compMgr.registerFactoryLocation(kSSL_PROTOCOL_CID,
                                    kSSL_PROTOCOL_NAME,
                                    kSSL_PROTOCOL_CONTRACTID,
                                    fileSpec, 
                                    location, 
                                    type);
  },

  getClassObject: function (compMgr, cid, iid) {
    var secure = false;
    if (cid.equals(kPROTOCOL_CID))
      secure = false;
    else if (cid.equals(kSSL_PROTOCOL_CID))
      secure = true;
    else
      throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return secure ? SecureProtocolFactory : ProtocolFactory;
  },

  canUnload: function (compMgr) {
    return true;
  }
};

function NSGetModule(compMgr, fileSpec) {
  return Module;
}

