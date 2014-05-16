/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Mozilla Firefox browser.
 *
 * The Initial Developer of the Original Code is
 * Benjamin Smedberg <benjamin@smedbergs.us>
 *
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const nsISupports            = Components.interfaces.nsISupports;

const nsICeltxHandler        = Components.interfaces.nsICeltxHandler;
const nsIChannel             = Components.interfaces.nsIChannel;
const nsICommandLine         = Components.interfaces.nsICommandLine;
const nsICommandLineHandler  = Components.interfaces.nsICommandLineHandler;
const nsIContentHandler      = Components.interfaces.nsIContentHandler;
const nsIDocShellTreeItem    = Components.interfaces.nsIDocShellTreeItem;
const nsIDOMChromeWindow     = Components.interfaces.nsIDOMChromeWindow;
const nsIDOMWindow           = Components.interfaces.nsIDOMWindow;
const nsIFactory             = Components.interfaces.nsIFactory;
const nsIFileURL             = Components.interfaces.nsIFileURL;
const nsIInterfaceRequestor  = Components.interfaces.nsIInterfaceRequestor;
const nsIMacAppHelper        = Components.interfaces.nsIMacAppHelper;
const nsIPrefBranch          = Components.interfaces.nsIPrefBranch;
const nsIPrefLocalizedString = Components.interfaces.nsIPrefLocalizedString;
const nsISupportsString      = Components.interfaces.nsISupportsString;
const nsIURIFixup            = Components.interfaces.nsIURIFixup;
const nsIWindowMediator      = Components.interfaces.nsIWindowMediator;
const nsIWindowWatcher       = Components.interfaces.nsIWindowWatcher;
const nsICategoryManager     = Components.interfaces.nsICategoryManager;

const NS_BINDING_ABORTED = 0x804b0002;
const NS_ERROR_WONT_HANDLE_CONTENT = 0x805d0001;
const NS_ERROR_ABORT = Components.results.NS_ERROR_ABORT;

function shouldLoadURI(aURI) {
  // Celtx supports file: and celtx: schemes. That's it.
  if (aURI && (aURI.schemeIs("file") || aURI.schemeIs("celtx") ||
    aURI.schemeIs("celtxs")))
    return true;

  dump("*** Preventing external load of " + aURI.scheme
    + " URI into Celtx window\n");
  return false;
}

function resolveURIInternal(aCmdLine, aArgument) {
  var uri = aCmdLine.resolveURI(aArgument);

  if (!(uri instanceof nsIFileURL)) {
    return uri;
  }

  try {
    if (uri.file.exists())
      return uri;
  }
  catch (e) {
    Components.utils.reportError(e);
  }

  // We have interpreted the argument as a relative file URI, but the file
  // doesn't exist. Try URI fixup heuristics: see bug 290782.
 
  try {
    var urifixup = Components.classes["@mozilla.org/docshell/urifixup;1"]
                             .getService(nsIURIFixup);

    uri = urifixup.createFixupURI(aArgument, 0);
  }
  catch (e) {
    Components.utils.reportError(e);
  }

  return uri;
}

function openWindow(parent, url, target, features, args) {
  var wwatch = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                         .getService(nsIWindowWatcher);

  var argstring;
  if (args) {
    argstring = Components.classes["@mozilla.org/supports-string;1"]
                            .createInstance(nsISupportsString);
    argstring.data = args;
  }
  return wwatch.openWindow(parent, url, target, features, argstring);
}

function openPreferences() {
  var features = "chrome,titlebar,toolbar,centerscreen,dialog=no";
  var url = "chrome://celtx/content/preferences/preferences.xul";

  var win = getMostRecentWindow("Celtx");
  if (win) {
    win.focus();
  } else {
    openWindow(null, url, "_blank", features);
  }
}

function getMostRecentWindow(aType) {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(nsIWindowMediator);
  return wm.getMostRecentWindow(aType);
}

#ifdef XP_UNIX
#ifndef XP_MACOSX
#define BROKEN_WM_Z_ORDER
#endif
#endif

// this returns the most recent Celtx window
function getMostRecentCeltxWindow() {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator);

#ifdef BROKEN_WM_Z_ORDER
  var win = wm.getMostRecentWindow("celtx:main", true);

  // if we're lucky, this isn't a popup, and we can just return this
  if (win && !win.toolbar.visible) {
    var windowList = wm.getEnumerator("celtx:main", true);
    // this is oldest to newest, so this gets a bit ugly
    while (windowList.hasMoreElements()) {
      var nextWin = windowList.getNext();
      if (nextWin.toolbar.visible)
        win = nextWin;
    }
  }
#else
  var windowList = wm.getZOrderDOMWindowEnumerator("celtx:main", true);
  if (!windowList.hasMoreElements())
    return null;

  var win = windowList.getNext();
  while (!win.toolbar.visible) {
    if (!windowList.hasMoreElements()) 
      return null;

    win = windowList.getNext();
  }
#endif

  return win;
}

var nsCeltxContentHandler = {
  /* helper functions */

  mChromeURL : null,

  get chromeURL() {
    if (! this.mChromeURL) {
      var prefb = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(nsIPrefBranch);
      this.mChromeURL = prefb.getCharPref("browser.chromeURL");
    }
    return this.mChromeURL;
  },

  /* nsISupports */
  QueryInterface : function cch_QI(iid) {
    if (!iid.equals(nsISupports) &&
        !iid.equals(nsICommandLineHandler) &&
        !iid.equals(nsIContentHandler) &&
        !iid.equals(nsIFactory))
      throw Components.errors.NS_ERROR_NO_INTERFACE;

    return this;
  },

  /* nsICommandLineHandler */
  handle : function cch_handle(cmdLine) {
    if (cmdLine.handleFlag("celtx", false)) {
      openWindow(null, "chrome://celtx/content/templates.xul", "_blank",
                 "chrome,centerscreen,titlebar=no,border=no", "");
      cmdLine.preventDefault = true;
    }

    var chromeParam = cmdLine.handleFlagWithParam("chrome", false);
    if (chromeParam) {
      var features = "chrome,dialog=no,all";
      openWindow(null, chromeParam, "_blank", features, "");
      cmdLine.preventDefault = true;
    }

  },

  helpInfo : "  -celtx            Open a Celtx window.\n",

  /* nsIContentHandler */

  handleContent : function cch_handleContent(contentType, context, request) {
    switch (contentType) {
      case "text/rdf":
      case "text/xml":
      case "application/x-celtx-project":
      case "application/x-celtx-extension":
        return true;
      default:
        return false;
    }

    var parentWin;
    try {
      parentWin = context.getInterface(nsIDOMWindow);
    }
    catch (e) {
    }

    request.QueryInterface(nsIChannel);

    openWindow(parentWin, request.URI, "_blank", null, null);
    request.cancel(NS_BINDING_ABORTED);
  },

  /* nsIFactory */
  createInstance: function cch_CI(outer, iid) {
    if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;

    return this.QueryInterface(iid);
  },

  lockFactory : function cch_lock(lock) {
    /* no-op */
  }
};

const cch_contractID = "@celtx.com/celtx/clh;1";
const cch_CID = Components.ID("{5d0ce354-df01-421a-83fb-7ead0990c24e}");
const CONTRACTID_PREFIX = "@mozilla.org/uriloader/content-handler;1?type=";


var nsDefaultCommandLineHandler = {
  /* nsISupports */
  QueryInterface : function dch_QI(iid) {
    if (!iid.equals(nsISupports) &&
        !iid.equals(nsICommandLineHandler) &&
        !iid.equals(nsIMacAppHelper) &&
        !iid.equals(nsIFactory))
      throw Components.errors.NS_ERROR_NO_INTERFACE;

    return this;
  },

  // List of uri's that were passed via the command line without the app
  // running and have already been handled. This is compared against uri's
  // opened using DDE on Win32 so we only open one of the requests.
  _handledURIs: [ ],
#ifdef XP_WIN
  _haveProfile: false,
#endif

  /* nsICommandLineHandler */
  handle : function dch_handle(cmdLine) {
    var urilist = [];

#ifdef XP_WIN
    // If we don't have a profile selected yet (e.g. the Profile Manager is
    // displayed) we will crash if we open an url and then select a profile. To
    // prevent this handle all url command line flags and set the command line's
    // preventDefault to true to prevent the display of the ui. The initial
    // command line will be retained when nsAppRunner calls LaunchChild though
    // urls launched after the initial launch will be lost.
    if (!this._haveProfile) {
      try {
        // This will throw when a profile has not been selected.
        var fl = Components.classes["@mozilla.org/file/directory_service;1"]
                           .getService(Components.interfaces.nsIProperties);
        var dir = fl.get("ProfD", Components.interfaces.nsILocalFile);
        this._haveProfile = true;
      }
      catch (e) {
        while ((ar = cmdLine.handleFlagWithParam("url", false))) { }
        cmdLine.preventDefault = true;
      }
    }
#endif

    try {
      var ar;
      while ((ar = cmdLine.handleFlagWithParam("url", false))) {
        var found = false;
        var uri = resolveURIInternal(cmdLine, ar);
        // count will never be greater than zero except on Win32.
        var count = this._handledURIs.length;
        for (var i = 0; i < count; ++i) {
          if (this._handledURIs[i].spec == uri.spec) {
            this._handledURIs.splice(i, 1);
            found = true;
            cmdLine.preventDefault = true;
            break;
          }
        }
        if (!found) {
          urilist.push(uri);
          // The requestpending command line flag is only used on Win32.
          if (cmdLine.handleFlag("requestpending", false) &&
              cmdLine.state == nsICommandLine.STATE_INITIAL_LAUNCH)
            this._handledURIs.push(uri)
        }
      }
    }
    catch (e) {
      Components.utils.reportError(e);
    }

    var count = cmdLine.length;

    for (var i = 0; i < count; ++i) {
      var curarg = cmdLine.getArgument(i);
      if (curarg.match(/^-/)) {
        Components.utils.reportError("Warning: unrecognized command line flag " + curarg + "\n");
        // To emulate the pre-nsICommandLine behavior, we ignore
        // the argument after an unrecognized flag.
        ++i;
      } else {
        try {
          urilist.push(resolveURIInternal(cmdLine, curarg));
        }
        catch (e) {
          Components.utils.reportError("Error opening URI '" + curarg + "' from the command line: " + e + "\n");
        }
      }
    }

    if (urilist.length) {
      var speclist = [];
      for (var uri in urilist) {
        if (shouldLoadURI(urilist[uri]))
          speclist.push(urilist[uri].spec);
      }

      var ios = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
      var IFileURL = Components.interfaces.nsIFileURL;

      // Focus the windows for already opened files
      for (var i = 0; i < speclist.length; ++i) {
        var fileurl = ios.newURI(speclist[i], null, null);
        if (! (fileurl instanceof IFileURL)) {
          openWindow(null, "chrome://celtx/content/", "_blank",
            "chrome,dialog=no,all", speclist[i]);
          continue;
        }
        var file = fileurl.file;
        this.openFile(file);
      }
    }
    else if (!cmdLine.preventDefault) {
      openWindow(null, "chrome://celtx/content/templates.xul", "_blank",
                 "chrome,centerscreen,titlebar=no,border=no", "");
    }
  },


  openFile: function (aFile) {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator);
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);

    var windows = wm.getEnumerator("celtx:main");
    while (windows.hasMoreElements()) {
      var win = windows.getNext();
      var celtxfile = win.getProjectFile();
      if (celtxfile && celtxfile.equals(aFile)) {
        win.focus();
        return;
      }
    }

    var fileurl = ios.newFileURI(aFile).spec;
    openWindow(null, nsCeltxContentHandler.chromeURL, "_blank",
      "chrome,dialog=no,all", fileurl);

    var splashes = wm.getEnumerator("celtx:splash");
    while (splashes.hasMoreElements())
      splashes.getNext().close();
  },

  // XXX localize me... how?
  helpInfo : "Usage: celtx [-flags] [<url>]\n",

  /* nsIFactory */
  createInstance: function dch_CI(outer, iid) {
    if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;

    return this.QueryInterface(iid);
  },
    
  lockFactory : function dch_lock(lock) {
    /* no-op */
  }
};

const dch_contractID = "@celtx.com/celtx/final-clh;1";
const dch_CID = Components.ID("{47cd0651-b1be-4a0f-b5c4-10e5a573ef71}");

var Module = {
  /* nsISupports */
  QueryInterface: function mod_QI(iid) {
    if (iid.equals(Components.interfaces.nsIModule) ||
        iid.equals(Components.interfaces.nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  /* nsIModule */
  getClassObject: function mod_getco(compMgr, cid, iid) {
    if (cid.equals(cch_CID))
      return nsCeltxContentHandler.QueryInterface(iid);

    if (cid.equals(dch_CID))
      return nsDefaultCommandLineHandler.QueryInterface(iid);

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  registerSelf: function mod_regself(compMgr, fileSpec, location, type) {
    if (Components.classes["@mozilla.org/xre/app-info;1"]) {
      // Don't register these if Celtx is launching a XULRunner application
      const CELTX_UID = "celtx@celtx.com";
      var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                              .getService(Components.interfaces.nsIXULAppInfo);
      if (appInfo.ID != CELTX_UID)
        return;
    }

    var compReg =
      compMgr.QueryInterface( Components.interfaces.nsIComponentRegistrar );

    compReg.registerFactoryLocation( cch_CID,
                                     "nsCeltxContentHandler",
                                     cch_contractID,
                                     fileSpec,
                                     location,
                                     type );
    compReg.registerFactoryLocation( dch_CID,
                                     "nsDefaultCommandLineHandler",
                                     dch_contractID,
                                     fileSpec,
                                     location,
                                     type );

    function registerType(contentType) {
      compReg.registerFactoryLocation( cch_CID,
                                       "Celtx Cmdline Handler",
                                       CONTRACTID_PREFIX + contentType,
                                       fileSpec,
                                       location,
                                       type );
    }

    registerType("text/rdf");
    registerType("text/xml");
    registerType("application/x-celtx-project");
    registerType("application/x-celtx-extension");

    var catMan = Components.classes["@mozilla.org/categorymanager;1"]
                           .getService(nsICategoryManager);

    catMan.addCategoryEntry("command-line-handler",
                            "g-celtx",
                            cch_contractID, true, true);
    catMan.addCategoryEntry("command-line-handler",
                            "x-default",
                            dch_contractID, true, true);
  },

  unregisterSelf : function mod_unregself(compMgr, location, type) {
    var compReg = compMgr.QueryInterface(nsIComponentRegistrar);
    compReg.unregisterFactoryLocation(cch_CID, location);
    compReg.unregisterFactoryLocation(dch_CID, location);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"]
                           .getService(nsICategoryManager);

    catMan.deleteCategoryEntry("command-line-handler",
                               "g-celtx", true);
    catMan.deleteCategoryEntry("command-line-handler",
                               "x-default", true);
  },

  canUnload: function(compMgr) {
    return true;
  }
};

// NSGetModule: Return the nsIModule object.
function NSGetModule(compMgr, fileSpec) {
  return Module;
}
