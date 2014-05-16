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

var MAX_OPEN_TABS = 15;

var gWindow = {
  documentTree: null,
  outlineDeck: null,
  documentTabbox: null,
  toolSpecificMenu: null
};

var gProject = null;
var gCatalogManager = null;

var gExternalEditors = {};


function getProjectFile () {
  if (! window._celtxfiledesc)
    return null;
  try {
    var file = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsILocalFile);
    file.persistentDescriptor = window._celtxfiledesc;
    return file;
  }
  catch (ex) {
    return null;
  }
}


function setProjectFile (file) {
  if (file && file instanceof Components.interfaces.nsILocalFile) {
    try {
      file = file.QueryInterface(Components.interfaces.nsILocalFile);
      window._celtxfiledesc = file.persistentDescriptor;
    }
    catch (ex) {
      window._celtxfiledesc = null;
    }
  }
  else {
    window._celtxfiledesc = null;
  }
}


function loaded () {
  gApp.init();
  gWindow.documentTree      = document.getElementById("document-tree");
  gWindow.outlineDeck       = document.getElementById("outline-deck");
  gWindow.documentTabbox    = document.getElementById("document-tabbox");
  gWindow.toolSpecificMenu  = document.getElementById("tool-specific-menu");
  gWindow.tabboxHiderDeck   = document.getElementById("tabbox-hider-deck");
  gWindow.recentProjects    = document.getElementById("menu-recent-projects");
  gWindow.recentPopup       = document.getElementById("recent-popup");

  try {
    showDevWarningIfNeeded();
  }
  catch (ex) {
    dump("*** showDevWarningIfNeeded: " + ex + "\n");
  }

  window.tryToClose = function () { return tryToCloseProject("quit"); };

  var obsvc = getObserverService();
  obsvc.addObserver(gController, "network:offline-status-changed", false);
  obsvc.addObserver(gController, "celtx:login-status-changed", false);
  obsvc.addObserver(gController, "celtx:recent-projects-changed", false);
  obsvc.addObserver(gController, "celtx:notification-count-changed", false);

  var cxsvc = getCeltxService();
  cxsvc.checkAutoLogin(window);
  updateStatusbar();

  if (window.arguments && window.arguments.length > 0) {
    var openarg = window.arguments[0];
    if (openarg.fetchURL || openarg.exportURL)
      setTimeout(function () { loadServerItem(openarg); }, 0);
    else if (openarg.match(/^celtxs?:\/\//))
      setTimeout(function () { loadCeltxURI(openarg); }, 0);
    else
      setTimeout(function () { loadProject(openarg); }, 0);
  }
  else {
    // We should not be open.
    window.open(Cx.CONTENT_PATH + "templates.xul", "_blank",
      Cx.NEW_WINDOW_FLAGS + ",centerscreen");
    setTimeout(function () { window.close(); }, 0);
  }
}


function showDevWarningIfNeeded () {
  var devWarningItem = document.getElementById("devWarningItem");
  var devWarningLabel = document.getElementById("devWarningLabel");

  var prefs = getPrefService().getBranch("celtx.server.");
  var studioServer = prefs.getCharPref("studio.selection");
  var publishServer = prefs.getCharPref("publish.selection");
  var renderServer = prefs.getCharPref("render.selection");
  if (studioServer.match(/dev/) || publishServer.match(/dev/) ||
      renderServer.match(/dev/)) {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
    devWarningLabel.value = "DEBUG: " + appInfo.appBuildID;
    devWarningItem.collapsed = false;
  }
}


function updateStatusbar () {
  var networkmenu = document.getElementById("networkmenu");
  var loginmenuitem = document.getElementById("loginmenuitem");
  var logoutmenuitem = document.getElementById("logoutmenuitem");

  var cxsvc = getCeltxService();
  if (cxsvc.loggedIn) {
    loginmenuitem.hidden = true;
    logoutmenuitem.hidden = false;
    networkmenu.label = cxsvc.username;
    networkmenu.setAttribute("image", "chrome://celtx/skin/online.png");
  }
  else {
    loginmenuitem.hidden = false;
    logoutmenuitem.hidden = true;
    networkmenu.label = gApp.getText("SignedOut");
    networkmenu.setAttribute("image", "chrome://celtx/skin/offline.png");
  }
  updateNotifierLabel();
}


function loadServerItem (aItem) {
  if (! aItem.fetchURL && aItem.exportURL) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", aItem.exportURL, true);
    xhr.onload = function () {
      var url = xhr.responseText.replace(/^celtx/, "http");
      aItem.fetchURL = xhr.responseText;
      aItem.editURL = aItem.fetchURL;
      setTimeout(function () { loadServerItem(aItem); }, 0);
    };
    xhr.onerror = function () {
      var ex = new Error(gApp.getText("RemoteFetchFailed"));
      celtxBugAlert(ex, Components.stack, ex);
    };
    xhr.send(null);
    return;
  }

  try {
    var tmpfile = getTempDir();
    if (aItem.type == "project")
      tmpfile.append("download-0.celtx");
    else if (aItem.type == "script")
      tmpfile.append("script-0.html");
    else
      throw new Error("Unrecognized download type: " + tmpfile.type);
    tmpfile.createUnique(0, 0600);

    var listener = {
      progress: 0,
      succeeded: false,
      aborted: false,
      wsref: null,

      onProgressChange: function (webProgress, request,
                      curSelfProgress, maxSelfProgress,
                      curTotalProgress, maxTotalProgress) {
        if (this.aborted) {
          request.cancel(NS_BINDING_ABORTED);
          this.progress = 100;
        }
        else if (maxSelfProgress == 0)
          this.progress = 0;
        else
          this.progress = 100.0 * curSelfProgress / maxSelfProgress;
      },
      onStateChange: function (prog, request, stateFlags, status) {
        var IProg = Components.interfaces.nsIWebProgressListener;

        try {
          var channel = request.QueryInterface(
            Components.interfaces.nsIHttpChannel);

          if (! this.wsref) {
            try {
              this.wsref = channel.getResponseHeader("X-Celtx-WSRef");
            }
            catch (ex) {}
          }
        }
        catch (ex) {
          dump("*** onStateChange: " + ex + "\n");
        }

        if (stateFlags & IProg.STATE_STOP) {
          if (! this.aborted)
            this.succeeded = true;
        }
      },
      onLocationChange: function (prog, request, location) {},
      onStatusChange: function (prog, request, status, message) {},
      onSecurityChange: function (prog, request, state) {}
    };

    var persist = getWebBrowserPersist();
    persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;
    persist.progressListener = listener;
    persist.saveURI(getIOService().newURI(aItem.fetchURL, null, null), null,
      null, null, null, tmpfile);

    var progress = {
      progressListener: listener,
      message: gApp.getText("ContactingServerProgressMsg"),
      performNextTask: function () { return true; },
      get progress () {
        this.message = gApp.getText("DownloadingFile", [ aItem.title ]);

        if (this.progressListener.aborted)
          return 100;
        else
          return this.progressListener.progress;
      },
      get finished () {
        return (this.progressListener.aborted ||
                this.progressListener.succeeded);
      },
      abort: function () {
        this.progressListener.aborted = true;
      },
    };
    window.openDialog(Cx.CONTENT_PATH + "progress.xul", "_blank",
      Cx.MODAL_DIALOG_FLAGS, progress);

    if (listener.succeeded) {
      if (aItem.type == "project")
        loadProject(fileToFileURL(tmpfile), true, listener.wsref);
      else if (aItem.type == "script")
        loadScript(tmpfile, aItem);
      else
        throw new Error(gApp.getText("UnableToOpenItemMsg"));
    }
    else if (listener.aborted) {
      window.close();
    }
    else {
      throw new Error(gApp.getText("RemoteFetchFailed"));
    }
  }
  catch (ex) {
    dump("*** loadServerItem: " + ex + "\n");
    celtxBugAlert(ex, Components.stack, ex);
  }
}


function loadCeltxURI (uri) {
  try {
    var tmpfile = getTempDir();
    var filename = "celtx-download-0.cxext";
    tmpfile.append(filename);
    tmpfile.createUnique(0, 0600);

    var listener = {
      filename: null,
      type: null,
      wsref: null,
      progress: 0,
      succeeded: false,
      aborted: false,

      onProgressChange: function (webProgress, request,
                      curSelfProgress, maxSelfProgress,
                      curTotalProgress, maxTotalProgress) {
        if (this.aborted) {
          request.cancel(NS_BINDING_ABORTED);
          this.progress = 100;
        }
        else if (maxSelfProgress == 0)
          this.progress = 0;
        else
          this.progress = 100.0 * curSelfProgress / maxSelfProgress;
      },
      onStateChange: function (prog, request, stateFlags, status) {
        try {
          var channel = request.QueryInterface(
            Components.interfaces.nsIHttpChannel);

          if (! this.type) {
            try {
              this.type = channel.getResponseHeader("Content-Type");
            }
            catch (ex) {}
          }

          if (! this.wsref) {
            try {
              this.wsref = channel.getResponseHeader("X-Celtx-WSRef");
            }
            catch (ex) {}
          }

          if (! this.filename) {
            var disp = null;
            try {
              disp = channel.getResponseHeader("Content-Disposition");
            }
            catch (ex) {}
            if (disp) {
              var hdrparam = Components.classes[
                "@mozilla.org/network/mime-hdrparam;1"]
                .createInstance(Components.interfaces.nsIMIMEHeaderParam);
              this.filename = hdrparam.getParameter(disp, "filename",
                "ASCII", null, {});
              if (! this.filename)
                this.filename = hdrparam.getParameter(disp, "name",
                  "ASCII", null, {});
            }
          }
        }
        catch (ex) {
          dump("*** onStateChange: " + ex + "\n");
        }

        var IProg = Components.interfaces.nsIWebProgressListener;
        if (stateFlags & IProg.STATE_STOP) {
          if (! this.aborted)
            this.succeeded = true;
        }
      },
      onLocationChange: function (prog, request, location) {},
      onStatusChange: function (prog, request, status, message) {},
      onSecurityChange: function (prog, request, state) {}
    };

    var persist = getWebBrowserPersist();
    persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;
    persist.progressListener = listener;
    persist.saveURI(getIOService().newURI(uri, null, null), null, null, null,
      null, tmpfile);
    var progress = {
      progressListener: listener,
      message: gApp.getText("ContactingServerProgressMsg"),
      performNextTask: function () { return true; },
      get progress () {
        var filename = this.progressListener.filename;
        if (filename)
          this.message = gApp.getText("DownloadingFile", [ filename ]);

        if (this.progressListener.aborted)
          return 100;
        else
          return this.progressListener.progress;
      },
      get finished () {
        return (this.progressListener.aborted ||
                this.progressListener.succeeded);
      },
      abort: function () {
        this.progressListener.aborted = true;
      },
    };
    window.openDialog(Cx.CONTENT_PATH + "progress.xul", "_blank",
      Cx.MODAL_DIALOG_FLAGS, progress);
    if (listener.succeeded) {
      var dstfile = tmpfile.clone();
      if (listener.filename) {
        dstfile.leafName = listener.filename;
        dstfile.createUnique(0, 0600);
        tmpfile.moveTo(null, dstfile.leafName);
      }
      getCeltxService().checkLoginFromCookie();

      switch (listener.type) {
        case "application/x-celtx-project":
          loadProject(fileToFileURL(dstfile), true, listener.wsref);
          break;
        case "application/x-celtx-extension":
          loadXPI(fileToFileURL(dstfile));
          setTimeout(function () { window.close() }, 0);
          break;
        default:
          dump("*** Can't open content-type: " + listener.type + "\n");
          throw new Error(gApp.getText("UnableToOpenItemMsg"));
      }
    }
    else if (listener.aborted) {
      window.close();
    }
    else {
      throw new Error(gApp.getText("RemoteFetchFailed"));
    }
  }
  catch (ex) {
    celtxBugAlert(ex, Components.stack, ex);
  }
}


function loadXPI (uri) {
  var wm = getWindowMediator();  
  var emwin = wm.getMostRecentWindow("Extension:Manager");
  if (emwin) {
    emwin.focus();
    emwin.showView("extensions");
  }
  else {
    openDialog("chrome://mozapps/content/extensions/extensions.xul", "",
      "chrome,menubar,extra-chrome,toolbar,dialog=no,resizable");
  }

  var extmgr = Components.classes["@mozilla.org/extensions/manager;1"]
    .getService(Components.interfaces.nsIExtensionManager);
  extmgr.installItemFromFile(fileURLToFile(uri), "app-profile");
}


function loadProjectPreflight () {
  if (gWindow.tabboxHiderDeck.selectedIndex != 0)
    gWindow.tabboxHiderDeck.selectedIndex = 0;

  window.controllers.appendController(gController);
  window.controllers.appendController(gApp);

  gController.ruleds = getRDFService().GetDataSourceBlocking(
    Cx.CONTENT_PATH + "docrules.rdf");

  gWindow.documentTabbox.addTabListener(gFrameLoader);

  // gController isn't truly registered until an idle cycle passes
  window.setTimeout("updateProjectCommands()", 100);

  var ps = getPrefService();
  var branch = ps.getBranch("celtx.spelling.");
  ps = ps.QueryInterface(Components.interfaces.nsIPrefBranch2);
  ps.addObserver("celtx.spelling.", gController, false);

  var menuitem = document.getElementById("toggle-inline-spellcheck-menu");
  var inlineSpellCheck = false;
  try {
    inlineSpellCheck = branch.getBoolPref("inline");
  }
  catch (ex) { }
  
  if (menuitem)
    menuitem.setAttribute("checked", inlineSpellCheck);
  else
    dump("*** no inline spellcheck menu!\n");
}


function loadProjectPostflight () {
  // Update moz-icon specs for external docs
  try {
    updateExternalFileIcons();
  }
  catch (ex) {
    dump("*** updateExternalFileIcons: " + ex + "\n");
  }
  cacheExternalFileModificationTimes();

  try {
    ensureBreakdownItemsForDocuments();
  }
  catch (ex) {
    dump("*** ensureBreakdownItemsForDocuments: " + ex + "\n");
  }

  // For some reason, XUL templates don't load correctly if they
  // are initialized with a datasource in the same event loop
  // that the datasource is loaded.
  window.setTimeout(initDocumentTree, 0);

  // I can't even remember why we do this... to trigger a notification
  // that updates the project manager?
  gProject.title = gProject.title;
  gProject.description = gProject.description;

  // Add the Catalog Manager
  gCatalogManager = new CatalogManager(gProject);

  try {
    // Initialize the Banner controller
    gBannerController.init();
    gBannerController.restart();
  }
  catch (ex) {
    dump("*** Initializing gBannerController: " + ex + "\n");
  }

  if (! gProject.standalone)
    window.setTimeout("restoreOpenTabs()", 200);

  try {
    var ps = getPrefService();
    ps.addObserver("celtx.autosave", gController, false);
    var saveInterval = getPrefService().getIntPref("celtx.autosave");
    if (saveInterval > 0) {
      gWindow.autosaveTimer = setInterval("autosave()",
        saveInterval * 60000); // measured in minutes
    }
  }
  catch (ex) {
    dump("*** autosave timer: " + ex + "\n");
  }
}


/**
 * Loads a project into the current window.
 *
 * @param projuri  a file uri referring to a .celtx file (or a project.rdf file)
 * @param isremote{boolean}  true if project is loaded from the server
 * @param wsref{String}  the project's remote wsref on the server [optional]
 */
function loadProject (projuri, isremote, wsref) {
  loadProjectPreflight();

  try {
    var celtxfile = null;

    var doConvertCheck = projuri.search(/project\.rdf$/) != -1;

    // The nsFilePicker implementation on OS X doesn't support filtering
    // by file name, only by extension, so it's possible the user chose
    // an RDF file other than project.rdf in the project directory. If
    // extractCeltxProject reverts to using zipped .celtx files, this
    // needs to be special-cased.
    if (projuri.match(/\.(t?celtx|rdf)$/)) {
      celtxfile = fileURLToFile(projuri);
      if (! (celtxfile.leafName.match(/\.t?celtx$/) && celtxfile.fileSize > 0))
        celtxfile = null;
      projuri = extractCeltxProject(projuri);
    }

    setProjectFile(celtxfile);

    if (! projuri.match(/\.rdf$/))
      throw "Project file must be a .rdf file";

    var converted = false;

    // If we weren't launched from a .celtx file, check if conversion needed
    if (doConvertCheck) {
      var rv = needsConversion(projuri);
      if (rv) {
        convertProject(projuri, rv);
        converted = true;
      }
    }

    gProject = new Project(projuri);
    gProject.isModified = false;
    if (wsref)
      gProject.wsref = wsref;

    var curFileVersion = new Version(Cx.FILE_VERSION);
    var projFileVersion = new Version(gProject.fileVersion);
    if (curFileVersion.compare(projFileVersion) > 0) {
      // Backup the project.rdf, except if we just did that as a result of
      // pre-097 project conversion.
      if (! converted) {
        try {
          var projFile = gProject.projectFolder;
          projFile.append(Cx.PROJECT_FILE);
          copyToUnique(projFile, projFile.parent, "project_097.rdf.backup");
          gProject.isModified = true;
        }
        catch (ex) {
          dump("*** upgrade backup failed: " + ex + "\n");
        }
      }
      upgradeFileVersion();
    }

    if (gProject.isTemplate) {
      var newprojres = gProject.changeProjectID();
      gProject.isModified = true;
      if (! newprojres)
        throw "Failed to convert template to new project";
      setProjectFile(null);
      var samplesFolder = currentProfileDir();
      samplesFolder.append(Cx.SAMPLES_DIR);
      gProject.isTemplate = false;
      // Don't reset the name on sample projects
      if (! (celtxfile && celtxfile.parent.equals(samplesFolder))) {
        gProject.title = gApp.getText("Untitled");
        setWindowTitle(gApp.getText("Untitled"));
      }
      else {
        setWindowTitle(gProject.title);
      }
      var iconarc = getRDFService().GetResource(Cx.NS_CX + "icon");
      var icon = gProject.ds.GetTarget(gProject.res, iconarc, true);
      if (icon)
        gProject.ds.Unassert(gProject.res, iconarc, icon);
    }
    else {
      if (isremote)
        gProject.saveLocation = Project.SAVE_TO_SERVER;
      else if (celtxfile)
        gProject.saveLocation = Project.SAVE_TO_DISK;

      var localfile = getProjectFile();
      // Use the file name for the window, unless it's a server-side project,
      // in which case the file name is just a random, unique combination.
      if (localfile && ! isremote) {
        setWindowTitle(localfile.leafName.replace(/\.t?celtx$/, ""));
        addToRecentProjects(localfile.persistentDescriptor);
      }
      else {
        setWindowTitle(gProject.title);
      }
    }

    loadProjectPostflight();
  }
  catch (ex) {
    delayedAlert(gApp.getText("ProjectOpenErrorMsg"), Components.stack, ex);
    // window.setTimeout("window.close()", 100);
  }
}


/**
 * Loads a single script into a new project.
 *
 * @param fileURI  a file uri referring to a .html file
 * @param serverItem  the server item description
 */
function loadScript (scriptFile, serverItem) {
  try {
    var projFileURL = gProjMgr.createProject(null, serverItem.title);
    gProject = new Project(projFileURL);
  }
  catch (ex) {
    dump("*** loadScript: " + ex + "\n");
    throw ex;
  }

  loadProjectPreflight();

  try {
    var rdfsvc = getRDFService();
    var scriptTypeMap = {
      film: "ScriptDocument",
      screenplay: "ScriptDocument",
      theatre: "TheatreDocument",
      av: "AVDocument",
      audiovisual: "AVDocument",
      radio: "RadioDocument",
      comic: "ComicDocument",
      novel: "TextDocument"
    };
    var docres = null;

    gProject.ds.beginUpdateBatch();
    try {
      var doctype = rdfsvc.GetResource(
        Cx.NS_CX + scriptTypeMap[serverItem.subType]);
      docres = gProject.createDocument(serverItem.title, doctype);
      var destFile = copyToUnique(scriptFile, gProject.projectFolder);
      gProject.addFileToDocument(destFile, docres);
    }
    catch (ex) {
      celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
      return;
    }
    finally {
      gProject.ds.endUpdateBatch();
    }
  }
  catch (ex) {
    dump("*** loadScript: " + ex + "\n");
    throw ex;
  }

  gProject.saveLocation = Project.SAVE_TO_SERVER;
  gProject.standalone = true;
  gProject.scriptURI = docres.Value;
  gProject.remoteURL = serverItem.editURL;

  loadProjectPostflight();

  try {
    // Make sure the item is visible, and select it
    setTimeout(function () {
      try {
        if (makeTreeResourceVisible(docres, gWindow.documentTree)) {
          var idx = gWindow.documentTree.builder.getIndexOfResource(docres);
          if (idx >= 0)
            gWindow.documentTree.view.selection.select(idx);
        }
      }
      catch (ex) {
        dump("*** loadScript: " + ex + "\n");
      }

      openDocument(docres);
    }, 0);
  }
  catch (ex) {
    dump("*** loadScript: " + ex + "\n");
    throw ex;
  }
}


/**
 * Initializes the document tree in the project library with the appropriate
 * RDF datasource and reference URI. If the top-level project item is
 * toggled closed, it will toggle it open. This also initializes the
 * document drag and drop observer gDocDNDObserver.
 */
function initDocumentTree () {
  gWindow.documentTree.ref = gProject.components.res.Value;
  gWindow.documentTree.database.AddDataSource(gProject.ds);
  gWindow.documentTree.database.AddDataSource(gProject.localDS);
  gWindow.documentTree.builder.rebuild();
  gDocDNDObserver.setTree(gWindow.documentTree);
  try {
    if (gWindow.documentTree.view.isContainer(0) &&
      ! gWindow.documentTree.view.isContainerOpen(0))
      gWindow.documentTree.view.toggleOpenState(0);
  }
  catch (ex) {
    dump("*** loaded: " + ex + "\n");
  }
}


/**
 * Performs any necessary housekeeping to bring projects created with older
 * versions of Celtx up to date.
 */
function upgradeFileVersion () {
  var rdfsvc = getRDFService();
  var doctypes = new RDFModel(rdfsvc.GetDataSourceBlocking(Cx.DOCTYPES_URL));
  var model = gProject.model;

  function categoryFormName (category) {
    switch (category.value) {
      case Cx.NS_CX + "Actor":
        return 'actor';
      case Cx.NS_CX + "Cast":
        return 'character';
      case Cx.NS_CX + "Location":
        return 'location';
      case Cx.NS_CX + "Props":
        return 'prop';
      case Cx.NS_CX + "Wardrobe":
        return 'wardrobe';
      default:
        return null;
    }
  }

  // Documents created as a result of upgrading breakdown items will
  // be placed in a special folder.
  var folder = gProject.createFolder(gApp.getText("ConvertedItems"));

  // Iterate through the (doctype, category) pairs
  var docpairs = doctypes.find(null, PROP('cx:category'), null);
  for (var i = 0; i < docpairs.length; ++i) {
    var doctype = docpairs[i][0];
    var category = docpairs[i][2];
    
    // First half: Find all documents of type |doctype| and upgrade them
    var docs = model.sources(PROP('cx:doctype'), doctype);
    for (var j = 0; j < docs.length; ++j) {
      var doc = docs[j];
      // If the doc already has a dc:source, it might be from a pre-098 test
      // build project that's a hybrid of new and old. Assume the doc is good.
      if (model.target(doc, PROP('dc:source'))) continue;

      // Attempt a merge if there's an item with matching category and title,
      // using case-insensitive comparison on title
      var title = model.target(doc, PROP('dc:title'));
      if (! title) {
        dump("*** Found an untitled doc: " + doc.value + "\n");
        continue;
      }
      // var items = model.sources(PROP('dc:title'), title);
      var items = model.sources(PROP('rdf:type'), category);
      var match = null;
      var oldmedia = [];
      for (var k = 0; k < items.length; ++k) {
        // if (model.contains(items[k], PROP('rdf:type'), category)) {
        var itemtitle = model.target(items[k], PROP('dc:title'));
        if (itemtitle &&
            itemtitle.value.toUpperCase() == title.value.toUpperCase()) {
          match = items[k];
          // The document title takes precedence in the event of a case
          // mismatch
          if (title.value != itemtitle.value)
            model.change(items[k], PROP('dc:title'), itemtitle, title);
          var media = model.targets(items[k], PROP('cx:media'));
          while (media.length > 0) {
            oldmedia.push(media[0]);
            model.remove(items[k], PROP('cx:media'), media[0]);
            media.shift();
          }
          break;
        }
      }

      // 1. Create or bind a breakdown item as the doc's dc:source
      var item = null;
      if (match) {
        item = match;
      }
      else {
        var item = RES(gProject.mintURI());
        model.add(item, PROP('rdf:type'), category);
        model.add(item, PROP('dc:title'), title);
      }
      model.add(doc, PROP('dc:source'), item);
      // 2. Convert the remaining triples
      var ns = gProject.res.Value + '/NS/' + categoryFormName(category) + '-';
      var triples = model.find(doc, null, null);
      for (var k = 0; k < triples.length; ++k) {
        var prop = triples[k][1];
        var val = triples[k][2];
        if (prop.value.indexOf(ns) != 0) continue;
        var propname = prop.value.substring(ns.length);
        // Special case
        if (propname == "description") {
          if (match) {
            var oldDesc = model.target(item, PROP('dc:description'));
            if (oldDesc) {
              model.remove(item, PROP('dc:description'), oldDesc);
              model.add(item, PROP('dc:description'),
                LIT(oldDesc.value + "\n\n" + val.value));
            }
            else
              model.add(item, PROP('dc:description'), val);
          }
          else
            model.add(item, PROP('dc:description'), val);
        }
        else if (propname == "comments") {
          model.add(item, PROP('cx:comments'), val);
        }
        else if (propname == "media") {
          model.add(item, PROP('cx:media'), val);
        }
        // In 0.9.7.2, Wardrobe used scene-name when everything else
        // was using scenesUsed.
        else if (propname == "scene-name") {
          model.add(item, RES(ns + "scenesUsed"), val);
        }
        else {
          model.add(item, prop, val);
        }
        model.remove(doc, prop, val);
      }
      if (match && oldmedia.length > 0) {
        var media = model.target(item, PROP('cx:media'));
        if (media)
          media = model.container(media);
        else {
          media = RES();
          model.add(item, PROP('cx:media'), media);
          media = model.makeSeq(media);
        }
        while (oldmedia.length > 0)
          media.append(oldmedia.shift());
      }
    }

    // Second half: Find all breakdown items and upgrade them
    var items = model.sources(PROP('rdf:type'), category);
    for (var j = 0; j < items.length; ++j) {
      var item = items[j];
      // Make sure this wasn't one we created, or that's already bound
      if (model.source(PROP('dc:source'), item)) continue;
      var title = model.target(item, PROP('dc:title'));
      if (! title) {
        // Sometimes conversion leaves weird artifacts in the form of
        // untitled breakdown items. Prune and ignore them.
        model.remove(item, PROP('rdf:type'), category);
        continue;
      }
      // 1. Create the appropriate document
      var doc = gProject.createDocument(title.value, doctype.resource(rdfsvc),
        folder.res, item.resource(rdfsvc));
      // 2. Convert any cx:media arcs into a cx:media seq
      var media = model.targets(item, PROP('cx:media'));
      if (media.length == 0) continue;
      var mediaseq = model.makeSeq(RES());
      for (var k = 0; k < media.length; ++k) {
        model.remove(item, PROP('cx:media'), media[k]);
        mediaseq.append(media[k]);
      }
      model.add(item, PROP('cx:media'), RES(mediaseq.res.Value));
    }
  }

  // Upgrade this form separately: It doesn't have a corresponding category,
  // so it just needs to have its comments, media, and description transferred.
  var forms = [
    [ Cx.NS_CX + "SceneDocument", 'scene' ]
  ];
  for (var i = 0; i < forms.length; ++i) {
    var doctype = RES(forms[i][0]);
    var formName = forms[i][1];
    var ns = gProject.res.Value + '/NS/' + formName + '-';
    var docs = model.sources(PROP('cx:doctype'), doctype);
    for (var j = 0; j < docs.length; ++j) {
      var doc = docs[j];
      var desc = model.target(doc, RES(ns + "description"));
      var comments = model.target(doc, RES(ns + "comments"));
      var media = model.target(doc, RES(ns + "media"));
      if (desc) {
        model.add(doc, PROP('dc:description'), desc);
        model.remove(doc, RES(ns + "description"), desc);
      }
      if (comments) {
        model.add(doc, PROP('cx:comments'), comments);
        model.remove(doc, RES(ns + "comments"), comments);
      }
      if (media) {
        model.add(doc, PROP('cx:media'), media);
        model.remove(doc, RES(ns + "media"), media);
      }
    }
  }

  // Don't leave a converted items folder if it's empty
  if (folder.isEmpty())
    gProject.removeDocument(folder.res);

  gProject.fileVersion = Cx.FILE_VERSION;
}


/**
 * Sets the appropriate icons for documents that refer to external files.
 */
function updateExternalFileIcons () {
  var model = gProject.model;
  var local = new RDFModel(gProject.localDS);
  var exttype = RES(Cx.NS_CX + "ExternalDocument");
  var doctypearc = PROP("cx:doctype");
  var moziconarc = PROP("cx:mozicon");
  var extdocs = model.sources(doctypearc, exttype);
  for (var i = 0; i < extdocs.length; i++) {
    var file = gProject.fileForResource(extdocs[i].resource(model.RDF));
    setLiteralProp(local, extdocs[i], moziconarc, LIT(iconURLForFile(file)));
  }
}


/**
 * Returns an object that maps external file documents (as RDF resource URIs)
 * to modification times (as timestamps), i.e., string -> PRInt64.
 */
function getExternalFileModificationTimes () {
  var model = gProject.model;
  var exttype = RES(Cx.NS_CX + "ExternalDocument");
  var doctypearc = PROP("cx:doctype");
  var extdocs = model.sources(doctypearc, exttype);
  var modmap = new Object();
  for (var i = 0; i < extdocs.length; ++i) {
    var resource = extdocs[i].resource(model.RDF);
    var file = gProject.fileForResource(resource);
    modmap[resource.Value] = file.lastModifiedTime;
  }
  return modmap;
}


/**
 * Convenience function for caching modification times as a one-liner.
 */
function cacheExternalFileModificationTimes () {
  try {
    var modtimes = getExternalFileModificationTimes();
    gProject.externalFileModificationTimes = modtimes;
  }
  catch (ex) {
    dump("*** getExternalFileModificationTimes: " + ex + "\n");
    gProject.externalFileModificationTimes = new Object();
  }
}


/**
 * Ensures every document with a cx:category has a corresponding
 * breakdown item. If a document is found without one, all its form
 * attributes are copied over.
 */
function ensureBreakdownItemsForDocuments () {
  var IRes = Components.interfaces.nsIRDFResource;
  var rdfsvc = getRDFService();
  var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  var doctyperes = rdfsvc.GetResource(Cx.NS_CX + "DocType");
  var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
  var categoryarc = rdfsvc.GetResource(Cx.NS_CX + "category");
  var sourcearc = rdfsvc.GetResource(Cx.NS_DC + "source");

  var docds = rdfsvc.GetDataSourceBlocking(Cx.DOCTYPES_URL);
  var doctypes = docds.GetSources(typearc, doctyperes, true);
  while (doctypes.hasMoreElements()) {
    var doctype = doctypes.getNext().QueryInterface(IRes);
    var category = docds.GetTarget(doctype, categoryarc, true);
    if (! (category && category instanceof IRes))
      continue;
    category = category.QueryInterface(IRes);
    var docs = gProject.ds.GetSources(doctypearc, doctype, true);
    while (docs.hasMoreElements()) {
      var docres = docs.getNext().QueryInterface(IRes);
      if (gProject.ds.hasArcOut(docres, sourcearc))
        continue;

      // Okay, there's no corresponding breakdown item. Create one!
      var item = rdfsvc.GetResource(gProject.mintURI());
      gProject.ds.Assert(docres, sourcearc, item, true);
      gProject.ds.Assert(item, typearc, category, true);
      var arcs = gProject.ds.ArcLabelsOut(docres);
      while (arcs.hasMoreElements()) {
        var arc = arcs.getNext().QueryInterface(IRes);
        // Don't copy the document-specific triples
        if (arc.EqualsNode(typearc) || arc.EqualsNode(doctypearc))
          continue;
        var target = gProject.ds.GetTarget(docres, arc, true);
        gProject.ds.Assert(item, arc, target, true);
      }
    }
  }
}


var gDelayedAlertMsg = "";
var gDelayedAlertStack = null;
var gDelayedAlertException = null;

function delayedAlert (msg, stack, ex) {
  gDelayedAlertMsg = msg;
  gDelayedAlertStack = stack;
  gDelayedAlertException = ex;
  window.setTimeout("delayedAlertCallback()", 0);
}


function delayedAlertCallback () {
  celtxBugAlert(gDelayedAlertMsg, gDelayedAlertStack, gDelayedAlertException);
}


function docTreePopupShowing () {
  updateProjectCommands();

  var delSep = document.getElementById("popupDelSeparator");
  var delItem = document.getElementById("popupDelItem");
  var dupItem = document.getElementById("popupDuplicateItem");
  var dupAsMenu = document.getElementById("popupDuplicateAsMenu");
  var dupAsSep = document.getElementById("popupDuplicateAsSep");

  var treeview = gWindow.documentTree.view;
  var index = treeview.selection.currentIndex;
  var isProjFolder = true;
  if (index < 0) {
    isProjFolder = false;
  }
  else {
    var res = treeview.getResourceAtIndex(index);
    if (res.Value != gProject.rootFolder.res.Value)
      isProjFolder = false;
  }
  delSep.hidden = isProjFolder;
  delItem.hidden = isProjFolder;
  if (isProjFolder)
    dupItem.setAttribute("disabled", "true");
  else
    dupItem.removeAttribute("disabled");

  var isScript = false;
  var doctype = null;
  if (index >= 0) {
    var rdfsvc = getRDFService();
    var res = treeview.getResourceAtIndex(index);
    var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
    doctype = gProject.ds.GetTarget(res, doctypearc, true);
    if (doctype) {
      doctype = doctype.QueryInterface(Components.interfaces.nsIRDFResource);
      switch (doctype.Value) {
        case Cx.NS_CX + "ScriptDocument":
        case Cx.NS_CX + "TheatreDocument":
        case Cx.NS_CX + "AVDocument":
        case Cx.NS_CX + "RadioDocument":
        case Cx.NS_CX + "ComicDocument":
          isScript = true;
          break;
      }
    }
  }
  // Show the Duplicate As menu for scripts
  if (isScript) {
    var items = dupAsMenu.getElementsByTagName("menuitem");
    for (var i = 0; i < items.length; ++i)
      items[i].collapsed = (items[i].value == doctype.Value);
    dupAsSep.hidden = false;
    dupAsMenu.hidden = false;
  }
  else {
    dupAsSep.hidden = true;
    dupAsMenu.hidden = true;
  }
}


function buildDocumentList () {
  var rdfsvc = getRDFService();
  var catarc = rdfsvc.GetResource(Cx.NS_CX + "category");

  var rdfsrc = currentProfileDir();
  rdfsrc.append(Cx.PREFS_FILE);
  var deptds = rdfsvc.GetDataSourceBlocking(fileToFileURL(rdfsrc));
  var docsds = rdfsvc.GetDataSourceBlocking(Cx.DOCTYPES_URL);

  var ds = getInMemoryDataSource();
  var srcseq = new RDFSeq(docsds,
    rdfsvc.GetResource(Cx.DOCTYPES_URL + "#documents"));
  var checkseq = new RDFSeq(deptds,
    rdfsvc.GetResource(Cx.NS_CX + "Prefs/Categories"));
  var dstseq = new RDFSeq(ds,
    rdfsvc.GetResource(Cx.NS_CX + "EnabledDocuments"));
  for (var i = 0; i < srcseq.length; ++i) {
    var docres = srcseq.get(i);
    var category = docsds.GetTarget(docres, catarc, true);
    if (! category || checkseq.indexOf(category) >= 0)
      dstseq.push(docres);
  }
  return ds;
}


function quickAddPopupShowing (popup) {
  if (gWindow.documentListDS) {
    try {
      popup.database.RemoveDataSource(gWindow.documentListDS);
    }
    catch (ex) {}
  }
  gWindow.documentListDS = buildDocumentList();
  popup.database.AddDataSource(gWindow.documentListDS);
  popup.builder.rebuild();
}


var gController = {
  commands: {
    "cmd-add-document": 1,
    "cmd-add-folder": 1,
    "cmd-check-spelling": 1,
    "cmd-close": 1,
    "cmd-close-window": 1,
    "cmd-copy-project": 1,
    "cmd-create-storyboard": 1,
    "cmd-find": 1,
    "cmd-replace": 1,
    "cmd-find-again": 1,
    "cmd-find-previous": 1,
    "cmd-generate-report": 1,
    "cmd-open-document": 1,
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1,
    "cmd-remove-document": 1,
    "cmd-rename-document": 1,
    "cmd-reveal-project": 1,
    "cmd-save-project": 1,
    "cmd-save-project-as": 1,
    "cmd-save-project-template": 1,
    "cmd-schedule-script": 1,
    "cmd-toggle-inline-spelling": 1
  },

  supportsCommand: function supportsCommand (cmd) {
    if (this.commands[cmd] == 1)
      return true;
    else if (gFrameLoader.currentFrame &&
             gFrameLoader.currentFrame.loaded)
      return gFrameLoader.currentFrame.supportsCommand(cmd);
  },

  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-close":
      case "cmd-close-window":
      case "cmd-create-storyboard":
      case "cmd-toggle-inline-spelling":
        return true;
      case "cmd-add-document":
      case "cmd-add-folder":
      case "cmd-copy-project":
      case "cmd-save-project":
      case "cmd-save-project-as":
      case "cmd-save-project-template":
        return gProject != null;
      case "cmd-reveal-project":
        return gProject != null && getProjectFile() != null;
      case "cmd-open-document":
        return gProject != null &&
               gWindow.documentTree.view.selection.count > 0 &&
               ! gWindow.documentTree.view.isContainer(
                 gWindow.documentTree.view.selection.currentIndex);
      case "cmd-remove-document":
        // Can't rename the projec root or the master catalog list
        return gProject != null &&
               gWindow.documentTree.view.selection.count > 0 &&
               gWindow.documentTree.view.selection.currentIndex > 1;
      case "cmd-rename-document":
        return gProject != null &&
               gWindow.documentTree.view.selection.count > 0;
      default:
        if (gFrameLoader.currentFrame &&
            gFrameLoader.currentFrame.supportsCommand(cmd))
          return gFrameLoader.currentFrame.isCommandEnabled(cmd);
        else
          return false;
    }
  },

  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "cmd-add-document":
        cmdAddDocument();
        break;
      case "cmd-add-folder":
        cmdAddFolder();
        break;
      case "cmd-close":
        if (getTabCount() < 2) {
          if (tryToCloseProject("close"))
            window.close();
        }
        else
          closeCurrentTab();
        break;
      case "cmd-close-window":
        if (tryToCloseProject("close"))
          window.close();
        break;
      case "cmd-create-storyboard":
        quickAddDocument(Cx.NS_CX + "StoryboardDocument2");
        break;
      case "cmd-save-project":
        cmdSaveProject();
        break;
      case "cmd-save-project-as":
        cmdSaveProjectAsFile();
        break;
      case "cmd-save-project-template":
        cmdSaveProjectAsTemplate();
        break;
      case "cmd-open-document":
        cmdOpenDocument();
        break;
      case "cmd-remove-document":
        cmdRemoveDocument();
        break;
      case "cmd-rename-document":
        cmdRenameDocument();
        break;
      case "cmd-reveal-project":
        cmdRevealProject();
        break;
      case "cmd-toggle-inline-spelling":
        cmdToggleInlineSpelling();
        break;
      case "cmd-copy-project":
        cmdCopyProject();
        break;
      default:
        var frame = gFrameLoader.currentFrame;
        if (frame &&
            frame.supportsCommand(cmd) &&
            frame.isCommandEnabled(cmd)) {
          frame.doCommand(cmd);
        }
        // Control should never reach this spot
        else {
          dump("*** Unknown command: " + cmd + "\n");
        }
    }
  },


  observe: function (subject, topic, data) {
    if (topic == "nsPref:changed") {
      if (data == "celtx.spelling.inline") {
        var ps = getPrefService().getBranch("celtx.spelling.");
        var inline = ps.getBoolPref("inline");
        var menuitem = document.getElementById("toggle-inline-spellcheck-menu");
        if (! menuitem) {
          return;
        }
        menuitem.setAttribute("checked", inline);
      }
      else if (data == "celtx.autosave") {
        var ps = getPrefService().getBranch("celtx.");
        if (gWindow.autosaveTimer) {
          clearInterval(gWindow.autosaveTimer);
          gWindow.autosaveTimer = null;
        }
        var saveInterval = ps.getIntPref("autosave");
        if (saveInterval > 0) {
          gWindow.autosaveTimer = setInterval("autosave()",
            saveInterval * 60000); // measured in minutes
        }
      }
    }
    else if (topic == "network:offline-status-changed" ||
             topic == "celtx:login-status-changed" ||
             topic == "celtx:notification-count-changed") {
      updateStatusbar();
    }
    else if (topic == "celtx:recent-projects-changed") {
      rebuildRecentProjectsMenu();
    }
  }
};


function updateProjectCommands () {
  var cmd;
  for (cmd in gController.commands)
    goUpdateCommand(cmd);
}


function DocFrame (id) {
  this.id = id;
}


DocFrame.prototype = {
  docres: null,
  tab: null,
  outline: null,
  commandSet: null,
  menu: null,
  outlineLoaded: false,
  panelLoaded: false,
  
  supportsCommand: function supportsCommand (cmd) {
    if (! this.controller) return false;

    if (cmd.indexOf(this.id + "_") == 0)
      cmd = cmd.substring(this.id.length + 1);
    try {
      return this.controller.supportsCommand(cmd);
    }
    catch (ex) {
      return false;
    }
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    if (! this.controller) return false;

    if (cmd.indexOf(this.id + "_") == 0)
      cmd = cmd.substring(this.id.length + 1);
    try {
      return this.controller.isCommandEnabled(cmd);
    }
    catch (ex) {
      return false;
    }
  },


  doCommand: function doCommand (cmd) {
    if (! this.controller) return;

    if (cmd.indexOf(this.id + "_") == 0)
      cmd = cmd.substring(this.id.length + 1);
    try {
      this.controller.doCommand(cmd);
    }
    catch (ex) {
      dump("*** DocFrame.doCommand: " + ex + "\n");
    }
  },


  get panel () {
    return this.tab.linkedFrame;
  },


  get loaded () {
    return this.panelLoaded && this.outlineLoaded;
  },


  get controller () {
    if (this.loaded && "getController" in this.panel.contentWindow)
      return this.panel.contentWindow.getController();
    else
      return null;
  },

  get temporary () {
    if (this.loaded && "temporary" in this.panel.contentWindow) {
      return this.panel.contentWindow.temporary();
    }
    return false;
  }

};


var gFrameLoader = {
  frames: [],
  pendingDocuments: [],
  lastFrame: null,


  get currentFrame () {
    if (this.frames.length == 0)
      return null;
    try {
      var tab = gWindow.documentTabbox.selectedTab;
      for (var i = 0; i < this.frames.length; i++) {
        if (tab == this.frames[i].tab)
          return this.frames[i];
      }
    }
    catch (ex) {
      dump("*** gFrameLoader.currentFrame: " + ex + "\n");
    }
    return null;
  },


  addCommandSet: function addCommandSet (frame) {
    var controller = frame.controller;
    if (! (controller && controller.commands))
      return;
    frame.commandSet = document.createElement("commandset");
    frame.commandSet.id = frame.id + "_commandset";
    var cmdName = null;
    for (cmdName in controller.commands) {
      var command = document.createElement("command");
      command.id = frame.id + "_" + cmdName;
      command.disabled = true;
      command.setAttribute("oncommand", "goDoCommand('" + command.id + "')");
      frame.commandSet.appendChild(command);
    }
    document.documentElement.appendChild(frame.commandSet);
  },


  updateMenuCommands: function updateMenuCommands () {
    goUpdateCommand("cmd-page-setup");
    goUpdateCommand("cmd-print");
    goUpdateCommand("cmd-print-preview");

    var frame = this.currentFrame;
    if (! frame || ! frame.menupopup)
      return;

    var menuitems = [ frame.menupopup ];

    while (menuitems.length > 0) {
      var item = menuitems.shift();
      if (item.hasAttribute("command"))
        goUpdateCommand(item.getAttribute("command"));

      if (item.hasChildNodes()) {
        var children = item.childNodes;
        for (var j = 0; j < children.length; ++j)
          menuitems.push(children[j]);
      }
    }
  },


  addMenu: function addMenu (frame) {
    // Mac OS X doesn't implement run-time insertion of menus to the menubar
    // so everything has to be done to the popup instead.
    if (! ("getMenuPopup" in frame.panel.contentWindow))
      return;

    var menupopup = frame.panel.contentWindow.getMenuPopup();
    if (! menupopup) {
      dump("*** addMenu: Frame returned null menu popup\n");
      return;
    }

    frame.menupopup = document.importNode(menupopup, true);
    frame.menupopup.id = frame.id + "_" + frame.menupopup.id;

    var menuitems = [ frame.menupopup ];

    while (menuitems.length > 0) {
      var item = menuitems.shift();
      var command = item.getAttribute("command");
      if (command) {
        command = frame.id + "_" + command;
        item.setAttribute("command", command);
      }

      if (item.hasChildNodes()) {
        var children = item.childNodes;
        for (var j = 0; j < children.length; ++j)
          menuitems.push(children[j]);
      }
    }
  },


  frameFinishedLoading: function frameFinishedLoading (aFrame) {
    // The load event handler for the frame's contentWindow isn't called
    // until after our handler, so we need to let the event percolate and
    // respond to it properly in the next idle cycle.
    window.setTimeout("gFrameLoader._frameFinishedLoadingImpl('"
      + aFrame.docres.Value + "')", 0);
  },


  _frameFinishedLoadingImpl: function _frameFinishedLoadingImpl (aDocURI) {
    var frame = this.frameForDocument(aDocURI);
    if (frame) {
      if ("setOutlineView" in frame.panel.contentWindow)
        frame.panel.contentWindow.setOutlineView(frame.outline.contentWindow);
      try {
        this.addCommandSet(frame);
        this.addMenu(frame);
      }
      catch (ex) {
        dump("*** _frameFinishedLoadingImpl: " + ex + "\n");
      }
      try {
        frame.controller.open(gProject, frame.docres);
      }
      catch (ex) {
        var msg = gApp.getText("DocumentOpenFailedMsg");
        celtxBugAlert(msg, Components.stack, ex);
      }
    }
    else {
      dump("*** _frameFinishedLoadingImpl: No frame for " + aDocURI + "\n");
      return;
    }
    this.loadPending = false;
    if (this.pendingDocuments.length > 0)
      this.loadNextDocument();
    else
      this.tabSelected();
  },


  // TabListener methods
  onTabOpen: function onTabOpen (event) {},


  onTabLoad: function onTabLoad (event) {
    var frame = null;
    for (var i = 0; i < this.frames.length; ++i) {
      var docframe = this.frames[i];
      if (docframe.tab == event.target) {
        docframe.panelLoaded = true;
        frame = docframe;
        break;
      }
    }
    // frame implies frame.panelLoaded
    if (frame && frame.loaded)
      this.frameFinishedLoading(frame);
  },


  onTabSelect: function onTabSelect (event) {
    if (this.pendingDocuments.length > 0) return;
    var frame = this.frameForTab(event.target);
    if (frame && frame.loaded)
      this.tabSelected();
  },


  onTabWillClose: function onTabWillClose (event) {
    var frame = this.frameForTab(event.target);
    if (! frame) {
      dump("*** onTabWillClose: No frame for tab\n");
      return;
    }
    if (frame.suppressSavePrompt)
      return;
    if (! frame.controller) {
      dump("*** frame does not have a controller\n");
      return;
    }
    var ctrl = frame.controller;
    if (ctrl.modified) {
      var title = gApp.getText("SaveDocument");
      var msg = gApp.getText("SaveDocumentPrompt");
      var result = promptSaveDialog(title, msg);
      if (result == kPromptCancel) { // Cancel
        event.preventDefault();
        return;
      }
      else if (result == kPromptSave) { // Save
        try {
          frame.controller.save();
          gProject.isModified = true;
        }
        catch (ex) {
          dump("*** frame.controller.save: " + ex + "\n");
        }
      }
    }
  },


  onTabClosing: function onTabClosing (event) {
    var frame = this.frameForTab(event.target);
    if (frame) {
      if (frame.controller) {
        try {
          frame.controller.close();
        }
        catch (ex) {
          dump("*** frame.controller.close: " + ex + "\n");
        }
      }
      gWindow.outlineDeck.removeChild(frame.outline);
      frame.closed = true;
    }
    else
      dump("*** onTabClose: No frame for tab\n");
  },


  onTabClose: function onTabClose (event) {
    for (var i = 0; i < this.frames.length; ++i) {
      if (this.frames[i].docres.Value == event.target) {
        this.frames.splice(i, 1);
        break;
      }
    }
    if (this.currentFrame &&
        gWindow.outlineDeck.selectedPanel != this.currentFrame.outline) {
      // I don't recall what triggers this, but we used to output a message
      // here saying "Fixing focus due to background close"
      this.focusFrame(this.currentFrame);
    }
  },


  projectClosing: function projectClosing () {
    for (var i = 0; i < this.frames.length; ++i) {
      if (this.frames[i].controller) {
        try {
          this.frames[i].controller.close();
        }
        catch (ex) {}
      }
    }
  },


  onTabMove: function onTabMove (event) {},


  onPanelLoad: function onPanelLoad (event) {
    var frame = null;
    for (var i = 0; i < this.frames.length; ++i) {
      var docframe = this.frames[i];
      if (docframe.outline == event.target) {
        docframe.outlineLoaded = true;
        frame = docframe;
        break;
      }
    }
    // frame implies frame.outlineLoaded
    if (frame && frame.loaded)
      this.frameFinishedLoading(frame);
  },


  handleEvent: function handleEvent (event) {
    if (event.type == "load" && event.target instanceof XULDocument) {
      var cards = gWindow.outlineDeck.childNodes;
      for (var i = 0; i < cards.length; ++i) {
        if (cards[i].contentDocument == event.target) {
          var panelevent = {
            cancelable: false,
            cancelled: false,
            target: cards[i],
            type: "PanelLoad",
            preventDefault: function () {}
          };
          cards[i].contentWindow.removeEventListener("load", this, false);
          this.onPanelLoad(panelevent);
          return;
        }
      }
    }
  },


  blurFrame: function blurFrame (frame) {
    if (! frame)
      return;

    if (frame.loaded) {
      if (! frame.closed && frame.controller)
        frame.controller.blur();
      if (frame.menupopup &&
          frame.menupopup.parentNode == gWindow.toolSpecificMenu) {
        try {
          gWindow.toolSpecificMenu.removeChild(frame.menupopup);
        }
        catch (ex) {
          dump("*** blurFrame: " + ex + "\n");
        }
        if (! gWindow.toolSpecificMenu.hidden)
        gWindow.toolSpecificMenu.hidden = true;
      }
    }
    this.lastFrame = null;
  },


  focusFrame: function focusFrame (frame) {
    if (! frame) {
      dump("*** focusFrame: got null frame\n");
      return;
    }
    // gWindow.outlineDeck.selectedPanel = frame.outline;
    if (frame.outline.getAttribute("src") !=
        Cx.CONTENT_PATH + "editors/blank.xul") {
      gWindow.outlineDeck.collapsed = false;
    }
    else {
      gWindow.outlineDeck.collapsed = true;
    }
    setTimeout("gWindow.outlineDeck.selectedPanel = "
      + "gFrameLoader.currentFrame.outline;", 0);
    try {
      if (frame.loaded) {
        if (frame.menupopup) {
          gWindow.toolSpecificMenu.appendChild(frame.menupopup);
          var label = frame.menupopup.getAttribute("label");
          gWindow.toolSpecificMenu.setAttribute("label", label);
          var accesskey = frame.menupopup.getAttribute("accesskey");
          gWindow.toolSpecificMenu.setAttribute("accesskey", accesskey);
          gWindow.toolSpecificMenu.hidden = false;
          for (var i = 0; i < frame.menupopup.childNodes.length; ++i) {
            var menuitem = frame.menupopup.childNodes[i];
            if (menuitem.hasAttribute("command"))
              goUpdateCommand(menuitem.getAttribute("command"));
          }
        }
        if (frame.controller)
          frame.controller.focus();
        else
          dump("*** no controller for frame " + frame.id + "\n");
      }
    }
    catch (ex) {
      dump("*** focusFrame: " + ex + "\n");
    }
    this.lastFrame = frame;
  },


  tabSelected: function tabSelected () {
    if (this.pendingDocuments.length > 0)
      return;

    this.blurFrame(this.lastFrame);
    try {
      // setStatusMessageLeft("");
      // setStatusMessage("");
      // setStatusMessageRight("");
    }
    catch (ex) {
      dump("*** tabSelected: " + ex + "\n");
    }
    this.focusFrame(this.currentFrame);

    updateProjectCommands();
  },


  saveAllFrames: function saveAllFrames () {
    for (var i = 0; i < this.frames.length; i++) {
      try {
        if (this.frames[i].controller.modified) {
          gProject.isModified = true;
          this.frames[i].controller.save();
        }
      }
      catch (ex) {
        dump("*** saveAllFrames: " + ex + "\n");
      }
    }
  },


  frameForDocument: function frameForDocument (docuri) {
    for (var i = 0; i < this.frames.length; i++) {
      if (this.frames[i].docres.Value == docuri)
        return this.frames[i];
    }
    return null;
  },


  frameForTab: function frameForTab (tab) {
    for (var i = 0; i < this.frames.length; i++) {
      if (this.frames[i].tab == tab)
        return this.frames[i];
    }
    return null;
  },


  closeFrame: function closeFrame (frame) {
    gWindow.documentTabbox.removeTab(frame.tab);
  },


  closeByTab: function closeByTab (tab) {
    var frame = this.frameForTab(tab);
    if (frame)
      this.closeFrame(frame);
    else
      dump("*** gFrameLoader.closeByTab: Couldn't match tab to DocFrame\n");
  },


  loadDocument: function loadDocument (docres) {
    if (getTabCount() >= MAX_OPEN_TABS)
      return;

    var pending = (this.pendingDocuments.length > 0) || this.loadPending;
    this.pendingDocuments.push(docres);
    if (! pending)
      this.loadNextDocument();
  },


  loadNextDocument: function loadNextDocument () {
    if (this.pendingDocuments.length == 0)
      return;

    /*
    if (gWindow.tabboxHiderDeck.selectedIndex == 0)
      gWindow.tabboxHiderDeck.selectedIndex = 1;
    */

    // Perform all necessary sanity checking
    var IRes = Components.interfaces.nsIRDFResource;
    var ILit = Components.interfaces.nsIRDFLiteral;
    var rdfsvc = getRDFService();

    var docres = this.pendingDocuments.shift();

    // Check if it's a shortcut
    var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
    var categoryarc = rdfsvc.GetResource(Cx.NS_CX + "category");
    var sourcearc = rdfsvc.GetResource(Cx.NS_DC + "source");
    var doctype = gProject.ds.GetTarget(docres, doctypearc, true);
    if (doctype) {
      doctype = doctype.QueryInterface(IRes);
      var docds = rdfsvc.GetDataSourceBlocking(Cx.DOCTYPES_URL);
      if (docds.hasArcOut(doctype, categoryarc)) {
        var source = gProject.ds.GetTarget(docres, sourcearc, true);
        if (source && source instanceof IRes) {
          docres = source.QueryInterface(IRes);
          doctype = null;
        }
      }
    }

    // Check if it's already open
    var existingFrame = gFrameLoader.frameForDocument(docres.Value);
    if (existingFrame) {
      gWindow.documentTabbox.selectedTab = existingFrame.tab;
      // gWindow.documentTabbox.lastChild.selectedPanel = existingFrame.panel;
      gWindow.outlineDeck.selectedPanel = existingFrame.outline;
      if (this.pendingDocuments.length > 0)
        window.setTimeout("gFrameLoader.loadNextDocument()", 0);
      return;
    }

    try {
      // Use the documentTree database, because it includes doctypes.rdf
      var ds = gWindow.documentTree.database;
      if (! doctype) {
        // We allow breakdown items to be opened as documents, and use
        // the appropriate form's doctype instead
        var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
        var typeres = ds.GetTarget(docres, typearc, true);
        if (! typeres)
          throw "No handler for documents without doctypes: " + docres.Value;
        doctype = ds.GetSource(categoryarc, typeres, true);
        if (! doctype)
          throw "No handler for documents without doctypes: " + docres.Value;
        doctype = doctype.QueryInterface(IRes);
      }

      // Get the thumbnail image for it
      var thumbarc = rdfsvc.GetResource(Cx.NS_CX + "thumbnail");
      var thumbnail = ds.GetTarget(doctype, thumbarc, true);
      if (thumbnail)
        thumbnail = thumbnail.QueryInterface(ILit);

      var editsarc = rdfsvc.GetResource(Cx.NS_CX + "edits");
      var editors = ds.GetSources(editsarc, doctype, true);
      if (! editors.hasMoreElements()) {
        throw "No handler for doctypes without editors: " + doctype.Value;
      }
      var editor = editors.getNext().QueryInterface(IRes);

      if (! haveInternalEditorForDocType(doctype)) {
        // Check for an alternate handler
        var handlerarc = rdfsvc.GetResource(Cx.NS_CX + "handler");
        var handler = ds.GetTarget(editor, handlerarc, true);
        if (! handler) {
          throw "No handler for " + doctype.Value;
        }
        handler = handler.QueryInterface(ILit);
        var windowHandler = window[handler.Value];
        if (! windowHandler) {
          throw "No global object named " + handler.Value;
        }
        windowHandler.open(gProject, docres);
        if (this.pendingDocuments.length > 0)
          window.setTimeout("gFrameLoader.loadNextDocument()", 0);
        return;
      }

      // Determine if we have an internal viewer for it
      var viewerarc = rdfsvc.GetResource(Cx.NS_CX + "viewer");
      var viewer = ds.GetTarget(editor, viewerarc, true);
      if (! viewer) {
        throw "Editor does not specify viewer chrome";
      }
      viewer = viewer.QueryInterface(ILit);

      var outlinearc = rdfsvc.GetResource(Cx.NS_CX + "outline");
      var outline = ds.GetTarget(editor, outlinearc, true);
      if (! outline) {
        outline = rdfsvc.GetLiteral(Cx.CONTENT_PATH + "editors/blank.xul");
      }
      outline = outline.QueryInterface(ILit);

      var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
      var title = ds.GetTarget(docres, titlearc, true);
      if (! title) {
        dump("*** openDocument: Document doesn't have a title, using default\n");
        title = gApp.getText("Untitled");
      }
      else {
        title = title.QueryInterface(ILit).Value;
      }

      // Finally, create the actual tab!

      this.loadPending = true;

      var docframe = new DocFrame(generateID());
      docframe.docres = docres;
      gFrameLoader.frames.push(docframe);
      docframe.tab = gWindow.documentTabbox.addTab(title, thumbnail.Value,
        docres.Value, viewer.Value);
      // docframe.outline = gWindow.outlineDeck.addPanel(outline.Value);
      docframe.outline = document.createElementNS(Cx.NS_XUL, "iframe");
      docframe.outline.setAttribute("flex", "1");
      gWindow.outlineDeck.appendChild(docframe.outline);
      docframe.outline.contentWindow.addEventListener("load",
        gFrameLoader, false);
      docframe.outline.setAttribute("src", outline.Value);

      // The load event handler will call loadNextDocument when appropriate
    }
    catch (ex) {
      celtxBugAlert(gApp.getText("UnableToOpenItemMsg"), Components.stack, ex);

      if (this.pendingDocuments.length > 0)
        window.setTimeout("gFrameLoader.loadNextDocument()", 0);
    }

    if (getTabCount() > 1) {
      gWindow.documentTabbox.setStripVisibilityTo(true);
      document.getElementById("menu_closeWindow").hidden = false;
      var menuClose = document.getElementById("menu_close");
      menuClose.setAttribute("label", gApp.getText("CloseTab"));
    }
  }
};


var gDocDNDObserver = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsISupportsWeakReference) ||
        iid.equals(Components.interfaces.nsIXULTreeBuilder))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  
  DROP_BEFORE: Components.interfaces.nsIXULTreeBuilderObserver.DROP_BEFORE,
  DROP_ON: Components.interfaces.nsIXULTreeBuilderObserver.DROP_ON,
  DROP_AFTER: Components.interfaces.nsIXULTreeBuilderObserver.DROP_AFTER,


  _validFlavour: false,
  _droppingItems: false,


  setTree: function (tree) {
    this.dragsvc = Components.classes["@mozilla.org/widget/dragservice;1"]
      .getService(Components.interfaces.nsIDragService);
    this.tree = tree;
    tree.view.addObserver(this);
  },


  dragGesture: function dragGesture (event) {
    if (event.originalTarget.localName == "treechildren")
      nsDragAndDrop.startDrag(event, this);
  },


  onDragStart: function onDragStart (aEvent, aXferData, aDragAction) {
    var selection = this.tree.view.selection;
    if (selection.count != 1)
      return;
    var index = selection.currentIndex;
    var res = this.tree.view.getResourceAtIndex(index);
    // Don't allow the root project item or the master catalog to be moved
    if (index == 0 || index == 1)
      return;
    var data = new TransferData();
    data.addDataForFlavour("moz/rdfitem", res.Value + "\n" + gProject.id);
    aXferData.data = data;
  },


  // This information needs to be cached, because the drag session isn't
  // available when |canDrop| is called.
  onDragEnter: function onDragEnter (event) {
    this._validFlavour = false;
    this._droppingItems = false;

    var dragSession = this.dragsvc.getCurrentSession();
    if (! dragSession)
      return;

    if (dragSession.isDataFlavorSupported("moz/rdfitem")) {
      // True if all the items in the session are breakdown items
      var rdfsvc = getRDFService();
      var allItems = true;
      for (var i = 0; i < dragSession.numDropItems; ++i) {
        var tx = getTransferable();
        tx.addDataFlavor("moz/rdfitem");
        try {
          dragSession.getData(tx, i);
          var data = {};
          var dataLen = {};
          tx.getTransferData("moz/rdfitem", data, dataLen);
          data = data.value.QueryInterface(
            Components.interfaces.nsISupportsString);
          if (! data) {
            allItems = false;
            break;
          }
          data = data.toString().split("\n");
          // TODO: Handle out-of-project item drops
          var itemres = rdfsvc.GetResource(data[0]);
          if (! gCatalogManager.isBreakdownItem(itemres) &&
              ! gCatalogManager.isBreakdownShortcut(itemres)) {
            allItems = false;
            break;
          }
        }
        catch (ex) {
          dump("*** onDragEnter: " + ex + "\n");
          allItems = false;
          break;
        }
      }
      if (allItems) {
        this._droppingItems = true;
        return;
      }
    }

    if (dragSession.numDropItems != 1 ||
      ! dragSession.isDataFlavorSupported("moz/rdfitem")) {
      this._validFlavour = false;
      return;
    }
    this._validFlavour = true;
  },


  /**
   * Determines the sequence, and the index in a sequence, that
   * a drop corresponds to. Note: This applies only to drop targets
   * that are within a container. Drops on catalogs will return null
   * even though they are valid targets for items.
   *
   * @param {Number} row  the target row
   * @param orientation  the orientation of the drop
   *
   * @type Object
   * @return the RDFSeq container and the offset within it (or one past
   *         the end if it should be appended) as { seq, offset }, or
   *         null if invalid
   */
  getSeqAndIndexForDrop: function (row, orientation) {
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var cu = getRDFContainerUtils();

    var res = this.tree.view.getResourceAtIndex(row);
    var result = {
      seq: null,
      offset: -1
    }

    // Drop on is easy to calculate
    if (orientation == this.DROP_ON) {
      if (this.tree.view.isContainer(row)) {
        // Result is to append to the target sequence
        result.seq = new RDFSeq(gProject.ds, res);
        result.offset = result.seq.length;
      }
      else {
        return null;
      }
    }
    else {
      /*
       * Drops AFTER containers are non-trivial. Consider:
       *
       * + folder1
       *   o item11
       *   o item12
       * - folder2
       * + folder3
       * + folder4
       *
       * For a drop AFTER folder1 is a drop BEFORE item11, but
       * a drop AFTER folder2 is a drop BEFORE folder3. A drop
       * AFTER folder3 (which is empty) is a drop BEFORE folder4,
       * since it is more visually similar to the case of
       * folder2 than folder1, and a drop ON folder3 provides
       * the other behaviour.
       *
       * Drops BEFORE containers are trivial. They always insert
       * at the position before the container.
       */
      if (this.tree.view.isContainer(row) &&
          orientation == this.DROP_AFTER &&
          this.tree.view.isContainerOpen(row) &&
          ! this.tree.view.isContainerEmpty(row)) {
        result.seq = new RDFSeq(gProject.ds, res);
        result.offset = 0;
      }
      else {
        var parentidx = this.tree.view.getParentIndex(row);
        if (parentidx < 0)
          return null;
        var parentres = this.tree.view.getResourceAtIndex(parentidx);
        result.seq = new RDFSeq(gProject.ds, parentres);
        result.offset = result.seq.indexOf(res);
        if (orientation == this.DROP_AFTER)
          result.offset += 1;
      }
    }
    return result;
  },


  canDrop: function canDrop (index, orientation) {
    if (! this._validFlavour && ! this._droppingItems)
      return false;

    // Check for items being dropped on a catalog
    var dropres = this.tree.view.getResourceAtIndex(index);
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var doctyperes = rdfsvc.GetResource(Cx.NS_CX + "doctype");
    var doctype = gProject.ds.GetTarget(dropres, doctyperes, true);
    if (doctype && doctype instanceof IRes)
      doctype = doctype.QueryInterface(IRes);
    else
      doctype = null;

    if (doctype && doctype.Value == Cx.NS_CX + "CatalogDocument" &&
        orientation == this.DROP_ON) {
      var filterarc = rdfsvc.GetResource(Cx.NS_CX + "filter");
      var isFiltered = gProject.ds.hasArcOut(dropres, filterarc);
      return this._droppingItems && ! isFiltered;
    }

    // You can't drop something before the master catalog
    if (orientation == this.DROP_BEFORE && index == 1 ||
        orientation == this.DROP_AFTER && index == 0)
      return false;

    // Only allow drops "on" folders, otherwise must be before/after
    return (orientation != this.DROP_ON ||
            this.tree.view.isContainer(index));
  },


  onCycleCell: function (row, colid) {},
  onCycleHeader: function (colid, elt) {},


  attemptExternalDrop: function attemptExternalDrop (row, orientation,
                                                     res, projid) {
    var win = gApp.findProjectWindowByID(projid);
    var cu = getRDFContainerUtils();
    if (! win) {
      dump("*** attemptExternalDrop: no window for project " + projid + "\n");
      return;
    }
    var srcproj = win.gProject;
    var srcframe = win.gFrameLoader.frameForDocument(res.Value);
    if (srcframe) {
      try {
        var modified = srcframe.controller.modified;
        srcframe.controller.save();
        if (modified)
          win.gProject.isModified = modified;
      }
      catch (ex) {
        dump("*** attemptExternalDrop: " + ex + "\n");
      }
    }

    var dropdata = this.getSeqAndIndexForDrop(row, orientation);
    if (! dropdata)
      return;

    gProject.ds.beginUpdateBatch();
    try {
      var newres = cu.IsSeq(srcproj.ds, res) ?
        copyFolder(res, srcproj, gProject, gController.ruleds) :
        copyDocument(res, srcproj, gProject, gController.ruleds);
      // If it's a script document, we need to clean it of markup
      var doctypearc = getRDFService().GetResource(Cx.NS_CX + "doctype");
      var doctype = gProject.ds.GetTarget(newres, doctypearc, true);
      if (doctype) {
        doctype = doctype.QueryInterface(Components.interfaces.nsIRDFResource);
        if (doctype.Value == Cx.NS_CX + "ScriptDocument" ||
            doctype.Value == Cx.NS_CX + "TheatreDocument" ||
            doctype.Value == Cx.NS_CX + "AVDocument" ||
            doctype.Value == Cx.NS_CX + "RadioDocument" ||
            doctype.Value == Cx.NS_CX + "ComicDocument") {
          if (! this._scriptsToStrip)
            this._scriptsToStrip = [];
          var file = gProject.fileForResource(newres);
          if (file)
            this._scriptsToStrip.push(file);
          file = gProject.fileForResource(newres, 'secondary');
          if (file)
            this._scriptsToStrip.push(file);
          setTimeout("gDocDNDObserver.stripMarkupFromScripts()", 0);
        }
      }
      if (dropdata.offset >= dropdata.seq.length)
        dropdata.seq.push(newres);
      else
        dropdata.seq.insert(newres, dropdata.offset);
    }
    catch (ex) {
      celtxBugAlert(gApp.getText("UnableToCopy"), Components.stack, ex);
    }
    gProject.ds.endUpdateBatch();
    gProject.isModified = true;
  },


  stripMarkupFromScripts: function stripMarkupFromScripts () {
    // Wake me up when DOMParser can parse an HTML document and
    // we don't need an invisible iframe kludge...
    var tempframe = document.getElementById("welcomeframe");
    if (tempframe.docShell.busyFlags) {
      setTimeout("gDocDNDObserver.stripMarkupFromScripts()", 100);
      return;
    }

    if (this._currentScriptToStrip) {
      var xslt = document.implementation.createDocument("", "", null);
      xslt.async = false;
      xslt.load(Cx.TRANSFORM_PATH + "stripmarkup.xml");
      var proc = new XSLTProcessor();
      proc.importStylesheet(xslt);
      var txdoc = proc.transformToDocument(tempframe.contentDocument);
      serializeDOMtoFile(txdoc, this._currentScriptToStrip);
      this._currentScriptToStrip = null;
    }

    if (this._scriptsToStrip.length > 0) {
      this._currentScriptToStrip = this._scriptsToStrip.shift();
      tempframe.setAttribute("src", fileToFileURL(this._currentScriptToStrip));
      setTimeout("gDocDNDObserver.stripMarkupFromScripts()", 100);
    }
  },


  addItemsToCatalog: function (dragSession, catres) {
    var rdfsvc = getRDFService();
    gProject.ds.beginUpdateBatch();
    for (var i = 0; i < dragSession.numDropItems; ++i) {
      try {
        var tx = getTransferable();
        tx.addDataFlavor("moz/rdfitem");
        dragSession.getData(tx, i);
        var data = {};
        var dataLen = {};
        tx.getTransferData("moz/rdfitem", data, dataLen);
        data = data.value.QueryInterface(
          Components.interfaces.nsISupportsString);
        if (! data)
          throw "no moz/rdfitem data";
        data = data.toString().split("\n");

        // TODO: Handle out-of-project item drops
        var itemres = rdfsvc.GetResource(data[0]);
        if (gCatalogManager.isBreakdownShortcut(itemres))
          itemres = gCatalogManager.resolveBreakdownShortcut(itemres);
        gCatalogManager.addItemToCatalog(itemres, catres);
      }
      catch (ex) {
        dump("*** addItemsToCatalog: " + ex + "\n");
      }
    }
    gProject.ds.endUpdateBatch();

    gProject.isModified = true;
  },


  addItemsToTree: function (dragSession, row, orientation) {
    var dropdata = this.getSeqAndIndexForDrop(row, orientation);

    var rdfsvc = getRDFService();
    var docds = rdfsvc.GetDataSourceBlocking(Cx.DOCTYPES_URL);
    var categoryarc = rdfsvc.GetResource(Cx.NS_CX + "category");
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
    var rdftype = rdfsvc.GetResource(Cx.NS_CX + "Document");
    var sourcearc = rdfsvc.GetResource(Cx.NS_DC + "source");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

    gProject.ds.beginUpdateBatch();
    for (var i = 0; i < dragSession.numDropItems; ++i) {
      try {
        var tx = getTransferable();
        tx.addDataFlavor("moz/rdfitem");
        dragSession.getData(tx, i);
        var data = {};
        var dataLen = {};
        tx.getTransferData("moz/rdfitem", data, dataLen);
        data = data.value.QueryInterface(
          Components.interfaces.nsISupportsString);
        if (! data)
          throw "no moz/rdfitem data";
        data = data.toString().split("\n");

        // TODO: Handle out-of-project item drops
        var itemres = rdfsvc.GetResource(data[0]);
        var docres = null;
        if (gCatalogManager.isBreakdownItem(itemres)) {
          var category = gProject.ds.GetTarget(itemres, typearc, true);
          if (! category)
            throw "No type on catalog item";
          var doctype = docds.GetSource(categoryarc, category, true);
          if (! doctype)
            throw "No document type corresponds to item type";

          var title = getRDFString(gProject.ds, itemres, titlearc);

          // We should really have this done by project.createDocument, but it
          // only appends to sequences, it doesn't take an offset
          docres = rdfsvc.GetResource(gProject.mintURI());
          gProject.ds.Assert(docres, typearc, rdftype, true);
          gProject.ds.Assert(docres, doctypearc, doctype, true);
          gProject.ds.Assert(docres, sourcearc, itemres, true);
          setRDFString(gProject.ds, docres, titlearc, title);
        }
        else if (gCatalogManager.isBreakdownShortcut(itemres)) {
          docres = itemres;
          var oldindex = this.tree.view.getIndexOfResource(itemres);
          if (oldindex < 0)
            throw "Shortcut is not in the tree";

          var parentindex = this.tree.view.getParentIndex(oldindex);
          var parentres = null;
          if (parentindex < 0)
            parentres = gProject.rootFolder.res;
          else
            parentres = this.tree.view.getResourceAtIndex(parentindex);

          var parentseq = new RDFSeq(gProject.ds, parentres);

          // Adjust offset if moving within a sequence, and the new location
          // is after the current location
          if (parentres.EqualsNode(dropdata.seq.res)) {
            var idx = parentseq.indexOf(docres);
            if (idx < dropdata.offset)
              --dropdata.offset;
          }

          // Remove it from its original folder before placing it in the new one
          parentseq.remove(docres);
        }
        else {
          throw "Item is neither a breakdown item nor a shortcut to one";
        }
        dropdata.seq.insert(docres, dropdata.offset++);
      }
      catch (ex) {
        dump("*** addItemsToTree: " + ex + "\n");
      }
    }
    gProject.ds.endUpdateBatch();

    gProject.isModified = true;
  },


  onDrop: function onDrop (row, orientation) {
    var dragSession = this.dragsvc.getCurrentSession();
    if (! dragSession)
      return;

    if (this._droppingItems) {
      var rdfsvc = getRDFService();
      var IRes = Components.interfaces.nsIRDFResource;
      var dropres = this.tree.view.getResourceAtIndex(row);
      var doctyperes = rdfsvc.GetResource(Cx.NS_CX + "doctype");
      var doctype = gProject.ds.GetTarget(dropres, doctyperes, true);
      if (doctype && doctype instanceof IRes) {
        doctype = doctype.QueryInterface(IRes);
        if (doctype.Value == Cx.NS_CX + "CatalogDocument" &&
            orientation == this.DROP_ON) {
          this.addItemsToCatalog(dragSession, dropres);
          return;
        }
      }
      this.addItemsToTree(dragSession, row, orientation);
      return;
    }

    var trans = getTransferable();
    trans.addDataFlavor("moz/rdfitem");
    dragSession.getData(trans, 0);
    var data = {};
    var len = {};
    trans.getTransferData("moz/rdfitem", data, len);
    data = data.value.QueryInterface(Components.interfaces.nsISupportsString);
    if (! data) {
      dump("*** no moz/rdfitem on drop\n");
      return;
    }
    data = data.data.substring(0, len.value).split("\n");
    var projid = data.length > 1 ? data[1] : null;
    data = data[0];
    var rdfsvc = getRDFService();
    var res = rdfsvc.GetResource(data);
    if (projid && projid != gProject.id) {
      this.attemptExternalDrop(row, orientation, res, projid);
      return;
    }
    var oldindex = this.tree.view.getIndexOfResource(res);
    if (oldindex < 0) {
      dump("*** item is not in the tree\n");
      return;
    }

    var parentindex = this.tree.view.getParentIndex(oldindex);
    var parentres = null;
    if (parentindex < 0)
      parentres = gProject.rootFolder.res;
    else
      parentres = this.tree.view.getResourceAtIndex(parentindex);
    var parentseq = new RDFSeq(gProject.ds, parentres);

    var dropdata = this.getSeqAndIndexForDrop(row, orientation);
    if (! dropdata)
      return;

    if (isFolderAncestorOf(res, dropdata.seq.res)) {
      dump("*** can't add a folder to itself\n");
      return;
    }

    // If moving within a folder, and the new position is after the
    // current position, the new position will be shifted down one.
    if (parentseq.res.EqualsNode(dropdata.seq.res)) {
      oldindex = parentseq.indexOf(res);
      if (oldindex < dropdata.offset)
        --dropdata.offset;
    }

    gProject.ds.beginUpdateBatch();
    try {
      parentseq.remove(res);
      if (dropdata.offset < 0 || dropdata.offset >= dropdata.seq.length) {
        dropdata.seq.push(res);
      }
      else {
        dropdata.seq.insert(res, dropdata.offset);
      }
    }
    catch (ex) {
      dump("*** gDocDNDObserver.onDrop: " + ex + "\n");
    }
    gProject.ds.endUpdateBatch();
    gProject.isModified = true;
  },

  onPerformAction: function (action) {},
  onPerformActionOnCell: function (action, row, colid) {},
  onPerformActionOnRow: function (action, row) {},
  onSelectionChanged: function () {},
  onToggleOpenState: function (index) {}
};


/*
 * For local files, this is stored in the local.rdf file, but that file isn't
 * sent to the Studio server, so we store the value directly in the project
 * RDF (indexed by username) for Studio projects.
 */
function restoreOpenTabs () {
  var MAX_DEFAULT_OPEN = 5;
  var rdfsvc = getRDFService();
  var IRes = Components.interfaces.nsIRDFResource;
  var opentabsarc = rdfsvc.GetResource(Cx.NS_CX + "opentabs");
  var ds = gProject.localDS;
  var res = gProject.res;
  var cxsvc = getCeltxService();
  if (gProject.saveLocation == Project.SAVE_TO_SERVER && cxsvc.loggedIn) {
    ds = gProject.ds;
    var userdataarc = rdfsvc.GetResource(Cx.NS_CX + "userdata");
    var userdata = ds.GetTarget(res, userdataarc, true);
    if (userdata) {
      userdata = userdata.QueryInterface(IRes);
    }
    else {
      userdata = rdfsvc.GetAnonymousResource();
      ds.Assert(res, userdataarc, userdata, true);
    }
    var datalist = new RDFSeq(ds, userdata);
    res = rdfsvc.GetResource(res.Value + "/userdata/" + cxsvc.username);
    if (datalist.indexOf(res) < 0)
      datalist.push(res);
  }
  var opentabs = ds.GetTarget(res, opentabsarc, true);
  if (opentabs) {
    var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
    opentabs = new RDFSeq(ds, opentabs);
    var tabs = opentabs.toArray();
    for (var i = 0; i < tabs.length && i < MAX_OPEN_TABS; i++) {
      try {
        var tab = tabs[i].QueryInterface(IRes);
        var doctype = gProject.ds.GetTarget(tab, doctypearc, true);
        if (doctype)
            openDocument(tab);
      }
      catch (ex) {
        dump("*** restoreOpenTabs: " + ex + "\n");
      }
    }
  }
  else {
    // Open everything by default (new project behaviour)
    // ... to a maximum of MAX_DEFAULT_OPEN
    var rdftype = rdfsvc.GetResource(Cx.NS_CX + "Document");
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
    var sources = gProject.ds.GetSources(typearc, rdftype, true);
    var docs = [];
    var count = 0;
    // Make sure the script is the last opened...
    var scriptdoc = null;
    while (sources.hasMoreElements()) {
      var source = sources.getNext().QueryInterface(IRes);
      var doctype = gProject.ds.GetTarget(source, doctypearc, true);
      doctype = doctype.QueryInterface(IRes);
      if (doctype.Value == Cx.NS_CX + "ScriptDocument" ||
          doctype.Value == Cx.NS_CX + "TheatreDocument" ||
          doctype.Value == Cx.NS_CX + "AVDocument" ||
          doctype.Value == Cx.NS_CX + "RadioDocument" ||
          doctype.Value == Cx.NS_CX + "ComicDocument")
        scriptdoc = source;
      else if (haveInternalEditorForDocType(doctype))
        docs.push(source);
    }
    var last = Math.min(docs.length, scriptdoc ?
      MAX_DEFAULT_OPEN : MAX_DEFAULT_OPEN - 1);
    for (var i = 0; i < last; i++) {
      try {
        openDocument(docs[i]);
      }
      catch (ex) {
        dump("*** restoreOpenTabs: " + ex + "\n");
      }
    }
    if (scriptdoc) {
      try {
        openDocument(scriptdoc);
      }
      catch (ex) {
        dump("*** restoreOpenTabs: " + ex + "\n");
      }
    }
  }
}


function extractCeltxProject (fileuri) {
  var IFile = Components.interfaces.nsIFile;
  var IZipEntry = Components.interfaces.nsIZipEntry;
  var file = fileURLToFile(fileuri);
  // Check if it's a single-file format project
  if (file.leafName.match(/\.t?celtx$/) && file.fileSize > 0) {
    var tmpdir = getTempDir();
    tmpdir.append("project");
    tmpdir.createUnique(IFile.DIRECTORY_TYPE, 0700);
    tmpdir.permissions = 0700;
    var reader = getZipReader();
    // reader.init(file);
    reader.open(file);
    var entries = reader.findEntries("*");
    while (entries.hasMore()) {
      var entry = entries.getNext();
      var dstfile = tmpdir.clone();
      dstfile.append(entry);
      dstfile.create(IFile.NORMAL_FILE_TYPE, 0600);
      reader.extract(entry, dstfile);
      dstfile.permissions = 0600;
    }
    reader.close();
    var projectFile = tmpdir.clone();
    projectFile.append(Cx.PROJECT_FILE);
    if (! projectFile.exists())
      throw projectFile.path + " not found";
    return fileToFileURL(projectFile);
  }
  // Otherwise, assume we're opening a .rdf or .celtx in a project folder
  var projectFile = file.parent.clone();
  projectFile.append(Cx.PROJECT_FILE);
  if (! projectFile.exists())
    throw projectFile.path + " not found";
  return fileToFileURL(projectFile);
}


/**
 * This function is called when the project window is about to close. The
 * close cannot be cancelled. It takes care of any necessary housekeeping
 * required before closing the project window.
 *
 * @see tryToCloseProject
 */
function projectWindowWillClose () {
  // Remove network status observer
  try {
    window.controllers.removeController(gController);
    window.controllers.removeController(gApp);

    var obsvc = getObserverService();
    obsvc.removeObserver(gController, "network:offline-status-changed");
    obsvc.removeObserver(gController, "celtx:login-status-changed");
    obsvc.removeObserver(gController, "celtx:recent-projects-changed");
    obsvc.removeObserver(gController, "celtx:notification-count-changed");
  
    if (gProject) {
      // Remove preference observers
      try {
        var ps = getPrefService();
        var branch = ps.getBranch("celtx.spelling.");
        ps = ps.QueryInterface(Components.interfaces.nsIPrefBranch2);
        ps.removeObserver("celtx.spelling.", gController);
        ps.removeObserver("celtx.autosave", gController);
      }
      catch (ex) {
        dump("*** Removing pref observers: " + ex + "\n");
      }
    }

    if (gCatalogManager)
      gCatalogManager.shutdown();

    gBannerController.shutdown();
  }
  catch (ex) {
    dump("*** projectWindowWillClose: " + ex + "\n");
  }
}


/**
 * When a close request is initiated by an event, closeWrapper should be used
 * instead of tryToCloseProject, since it wraps a call to tryToCloseProject
 * and will prevent the close event from completing if it returns false.
 *
 * @param event  a window close event
 * @type boolean
 @ return the result of calling tryToCloseProject
 */
function closeWrapper (event) {
  try {
    if (tryToCloseProject("close"))
      return true;
  }
  catch (ex) {
    dump("*** closeWrapper: " + ex + "\n");
  }
  event.preventDefault();
  return false;
}


/**
 * This function is called when the window is about to close. It determines
 * whether or not it is okay to close the project window as a result of a
 * close request. If the project has been modified, or has never been saved
 * as a .celtx file, this will prompt the user to save the project and initiate
 * a save if necessary.
 *
 * @type boolean
 * @return true if it is okay to close the project window, false if an error
 *         occurs or the user cancels a save prompt at any point
 */
function tryToCloseProject (reason) {
  try {
  gProjMgr.flush();

  // If we don't have a valid project, or we're being called again because
  // we interrupted a close event, go ahead and confirm it right away.
  if (! gProject || window.closeContinuation) {
    projectWindowWillClose();
    return true;
  }

  // Let editors know a close is being attempted. This allows editors that
  // save their changes immediately (e.g., Schedule) to flag the project as
  // modified.
  var obsvc = getObserverService();
  obsvc.notifyObservers(gProject, "celtx:project-window-closing", null);

  var modified = isProjectModified();

  if (isSavePending()) {
     var isQuit = reason == "quit";

    if (! gAllowLocalSaveCancel) {
      var title = gApp.getText(
        isQuit ? "QuitCancelledTitle" : "CloseCancelledTitle");
      var msg = gApp.getText(
        isQuit ? "QuitCancelledMsg" : "CloseCancelledMsg");

      var ps = getPromptService();
      ps.alert(window, title, msg);

      return false;
    }

    var title = gApp.getText(isQuit ? "ConfirmQuitTitle" : "ConfirmCloseTitle");
    var msg = gApp.getText(isQuit ? "ConfirmQuitMsg" : "ConfirmCloseMsg");
    var denytitle = gApp.getText(isQuit ? "DontQuit" : "DontClose");
    var confirmtitle = gApp.getText(isQuit ? "Quit" : "Close");
    var IPrompt = Components.interfaces.nsIPromptService;
    var buttonflags = IPrompt.BUTTON_POS_0 * IPrompt.BUTTON_TITLE_IS_STRING
                    + IPrompt.BUTTON_POS_1 * IPrompt.BUTTON_TITLE_IS_STRING;

    var ps = getPromptService();
    var pressed = ps.confirmEx(window, title, msg, buttonflags,
      denytitle, confirmtitle, "", "", { value: false });

    if (pressed == 0) {
      return false;
    }
    else {
      cancelPendingSaveRequest();
      return true;
    }
  }
  else if (modified || ! gProject.saveLocation) {
    var title = gApp.getText("SaveProject");
    var msg = gApp.getText("SaveProjectPrompt");
    var result = promptSaveDialog(title, msg);

    if (result == kPromptCancel) {
      return false;
    }
    else if (result == kPromptDontSave) {
      projectWindowWillClose();
      try {
        gFrameLoader.projectClosing();
      }
      catch (ex) {
        dump("*** gFrameLoader.projectClosing: " + ex + "\n");
      }
      return true;
    }
    try {
      var callback = {
        succeeded: function () {
          window.closeContinuation = true;
          projectWindowWillClose();
          if (reason == "quit")
            goQuitApplication();
          else if (reason == "close")
            closeWindow(true);
        },
        failed: function () {
          window.closeContinuation = false;
        },
        cancelled: function () {
          window.closeContinuation = false;
        },
        progress: function (current, total) {}
      };
      cmdSaveProject(callback);
      return false;
    }
    catch (ex) {
      celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
      return false;
    }
  }
  projectWindowWillClose();
  return true;
  }
  catch (ex) {
    celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
    return false;
  }
}


function saveProjectToWorkspace () {
  try {
    writeProjectFiles();
    gProject.isModified = false;
  }
  catch (ex) {
    dump("*** saveProjectToWorkspace: " + ex + "\n");
  }
  var observer = {
    onLogin: function (result) {
      if (! result) return;
      var cfg = {
        wsref: gProject.wsref,
        path: gProject.projectFolder,
        comments: "Workspace Upload Test"
      };
      openDialog(Cx.CONTENT_PATH + "sync.xul", "", Cx.MODAL_DIALOG_FLAGS, cfg);
    }
  };
  var cxsvc = getCeltxService();
  cxsvc.login("", observer, false, window);
}


function addToTemplates (celtxfile) {
  var location = currentProfileDir();
  location.append(Cx.TEMPLATES_DIR);
  copyToUnique(celtxfile, location, celtxfile.leafName, true);
}


function isProjectModified () {
  if (gProject.isModified)
    return true;

  var modified = false;
  for (var i = 0; i < gFrameLoader.frames.length; i++) {
    var ctrl = gFrameLoader.frames[i].controller;
    try {
      if (ctrl && ctrl.modified)
        return true;
    }
    catch (ex) {
      dump("*** frame.modified: " + ex + "\n");
    }
  }

  // Check external files for changes
  var modtimes = getExternalFileModificationTimes();
  var oldtimes = gProject.externalFileModificationTimes;

  for (var docres in modtimes) {
    // If totally new, or modified since open
    if (! (docres in oldtimes) || modtimes[docres] > oldtimes[docres])
      return true;
  }

  return false;
}


function getSelectedDocumentFolder () {
  var treeview = gWindow.documentTree.view;
  var index = treeview.selection.currentIndex;
  if (index < 0)
    return gProject.rootFolder.res;
  if (treeview.isContainer(index))
    return treeview.getResourceAtIndex(index);
  index = treeview.getParentIndex(index);
  if (index < 0)
    return gProject.rootFolder.res;
  return treeview.getResourceAtIndex(index);
}


// If |folder| is the root folder, always returns true.
// If |folder| is not a folder at all, always returns false.
function isFolderAncestorOf (folder, item) {
  var view = gWindow.documentTree.view;
  if (! (folder && item))
    return false;

  if (folder.Value == gProject.rootFolder.res.Value ||
      folder.Value == item.Value)
    return true;

  var folderidx = view.getIndexOfResource(folder);
  if (folderidx < 0)
    return false;
  var itemidx = view.getIndexOfResource(item);
  if (itemidx < 0)
    return false;

  var parentidx = view.getParentIndex(itemidx);
  while (parentidx > 0) {
    var res = view.getResourceAtIndex(parentidx);
    if (res.Value == folder.Value)
      return true;
    parentidx = view.getParentIndex(parentidx);
  }
  return false;
}


function doctreeDoubleClicked (event) {
  var box = gWindow.documentTree.treeBoxObject;
  var row = {};
  var col = {};
  var obj = {};
  box.getCellAt(event.clientX, event.clientY, row, col, obj);

  if (row.value < 0)
    return;

  var treeview = gWindow.documentTree.view;
  if (treeview.isContainer(row.value))
    return;

  openDocument(treeview.getResourceAtIndex(row.value));
}


function cmdOpenDocument () {
  var treeview = gWindow.documentTree.view;
  var row = gWindow.documentTree.view.selection.currentIndex;
  if (row < 0 || treeview.isContainer(row))
    return;

  openDocument(treeview.getResourceAtIndex(row));
}


function getTabCount () {
  return gFrameLoader.frames.length;
}


function closeCurrentTab () {
  gFrameLoader.closeFrame(gFrameLoader.currentFrame);
}


function tabSelected (event) {
  dump("*** global tabSelected function called, please don't call it\n");
  if (gFrameLoader.pendingDocuments.length > 0 ||
      gFrameLoader.loadPending)
    return;
  gFrameLoader.tabSelected();
}


function openDocument (docres) {
  if (getTabCount() >= MAX_OPEN_TABS &&
      ! gFrameLoader.frameForDocument(docres.Value)) {
    var ps = getPromptService();
    var title = gApp.getText("TooManyTabsTitle");
    var msg = gApp.getText("TooManyTabs");
    ps.alert(window, title, msg);
    return;
  }

  gFrameLoader.loadDocument(docres);
}


function haveInternalEditorForDocType (doctype) {
  // Perform all necessary sanity checking
  var IRes = Components.interfaces.nsIRDFResource;
  var ILit = Components.interfaces.nsIRDFLiteral;
  var rdfsvc = getRDFService();

  // Use the documentTree database, because it includes doctypes.rdf
  var ds = gWindow.documentTree.database;

  var editsarc = rdfsvc.GetResource(Cx.NS_CX + "edits");
  var editors = ds.GetSources(editsarc, doctype, true);
  while (editors.hasMoreElements()) {
    var editor = editors.getNext().QueryInterface(IRes);
    var viewerarc = rdfsvc.GetResource(Cx.NS_CX + "viewer");
    var viewer = ds.GetTarget(editor, viewerarc, true);
    if (viewer)
      return true;
  }
  return false;
}


function quickAddDocument (doctype) {
  var ps = getPromptService();
  var rdfsvc = getRDFService();
  var docres = null;

  var doctitle = null;
  var docsrc = null;
  var typeres = rdfsvc.GetResource(doctype);
  var location = getSelectedDocumentFolder();
  var addedfile = null;
  if (doctype == Cx.NS_CX + "ExternalDocument") {
    var dlgTitle = gApp.getText("ChooseFile");
    var fp = getFilePicker();
    fp.init(window, dlgTitle, fp.modeOpen);
    fp.displayDirectory = getMiscFileDir();
    fp.appendFilters(fp.filterAll);
    if (fp.show() != fp.returnOK)
      return;
    doctitle = fp.file.leafName;
    docsrc = rdfsvc.GetLiteral(fileToFileURL(fp.file));
    var dstname = safeFileName(doctitle);
    addedfile = copyToUnique(fp.file, gProject.projectFolder, dstname);
  }
  else if (doctype == Cx.NS_CX + "BookmarkDocument") {
    var config = {
      accepted: false,
      title: null,
      url: null
    };
    window.openDialog(Cx.CONTENT_PATH + "editbookmark.xul", "_blank",
                      Cx.MODAL_DIALOG_FLAGS, config);
    if (! config.accepted)
      return;
    doctitle = config.title;
    docsrc = rdfsvc.GetLiteral(config.url);
  }
  else {
    var dlgTitle = gApp.getText("ItemNameTitle");
    var dlgMsg = gApp.getText("ItemNameMsg");
    var title = { value: "" };
    var check = { value: false };
    if (! ps.prompt(window, dlgTitle, dlgMsg, title, null, check))
      return;
    doctitle = title.value;

    // Create the corresponding breakdown item (if necessary)
    var docsds = rdfsvc.GetDataSourceBlocking(Cx.DOCTYPES_URL);
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var catarc = rdfsvc.GetResource(Cx.NS_CX + "category");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var catres = docsds.GetTarget(typeres, catarc, true);
    if (catres) {
      docsrc = rdfsvc.GetResource(Cx.DOCUMENTS_URL + generateID());
      gProject.ds.Assert(docsrc, typearc, catres, true);
      gProject.ds.Assert(docsrc, titlearc,
        rdfsvc.GetLiteral(title.value), true);
    }
  }
  gProject.ds.beginUpdateBatch();
  try {
    var location = getSelectedDocumentFolder();
    var typeres = rdfsvc.GetResource(doctype);
    docres = gProject.createDocument(doctitle, typeres, location, docsrc);
    if (addedfile) {
      gProject.addFileToDocument(addedfile, docres);
      updateExternalFileIcons();
    }
  }
  catch (ex) {
    celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
    gProject.ds.endUpdateBatch();
    return;
  }
  gProject.ds.endUpdateBatch();

  gProject.isModified = true;

  // Make sure the item is visible, and select it
  try {
    if (makeTreeResourceVisible(docres, gWindow.documentTree)) {
      var idx = gWindow.documentTree.builder.getIndexOfResource(docres);
      if (idx >= 0)
        gWindow.documentTree.view.selection.select(idx);
    }
  }
  catch (ex) {
    dump("*** quickAddDocument: " + ex + "\n");
  }

  if (haveInternalEditorForDocType(typeres))
    openDocument(docres);
}


function cmdAddDocument () {
  var config = {
    project: gProject,
    title: null,
    type: null,
    location: getSelectedDocumentFolder(),
    accepted: false
  };
  window.openDialog(Cx.CONTENT_PATH + "adddocument.xul", "_blank",
                    Cx.MODAL_DIALOG_FLAGS, config);
  if (! config.accepted)
    return;

  var IRes = Components.interfaces.nsIRDFResource;
  var rdfsvc = getRDFService();
  var docres = null;

  // Special case for breakdown items, which aren't actual documents
  if (gCatalogManager.isBreakdownType(config.type)) {
    var itemres = null;
    gProject.ds.beginUpdateBatch();
    try {
      var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
      var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
      itemres = rdfsvc.GetResource(gProject.mintURI());
      setRDFString(gProject.ds, itemres, titlearc, config.title);
      gProject.ds.Assert(itemres, typearc, config.type, true);
    }
    catch (ex) {
      dump("*** cmdAddDocument: " + ex + "\n");
      celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
      itemres = null;
    }
    gProject.ds.endUpdateBatch();

    gProject.isModified = true;

    if (itemres)
      setTimeout(function () { openInMasterCatalog(itemres); }, 0);

    return;
  }

  gProject.ds.beginUpdateBatch();
  try {
    // Special case for external files
    if (config.type.Value == Cx.NS_CX + "ExternalDocument") {
      var srcfile = fileURLToFile(config.source.Value);
      var dstname = safeFileName(srcfile.leafName);
      var dstfile = copyToUnique(srcfile, gProject.projectFolder, dstname);
      docres = gProject.createDocument(config.title, config.type,
                                       config.location);
      gProject.addFileToDocument(dstfile, docres);
      updateExternalFileIcons();
    }
    else {
      // Special case hack for catalogs (for prototyping)
      var filter = null;
      if (config.type.Value == Cx.NS_CX + "CatalogDocument") {
        if (config.source)
          filter = config.source;
        config.source = null;
      }

      docres = gProject.createDocument(config.title, config.type,
                                       config.location, config.source);

      // Another hack for Storyboards based on scripts
      if (config.type.Value == Cx.NS_CX + "StoryboardDocument2") {
        var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
        var sourcearc = rdfsvc.GetResource(Cx.NS_DC + "source");
        // Make a storyboard XML file
        var storyboard = <storyboard title={config.title}/>;
        var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
        if (config.source) {
          var scenes = gProject.ds.GetTarget(config.source, scenesarc, true);
          scenes = new RDFSeq(gProject.ds, scenes.QueryInterface(IRes));
          for (var i = 0; i < scenes.length; ++i) {
            var sceneres = scenes.get(i).QueryInterface(IRes);
            var scenetitle = getRDFString(gProject.ds, sceneres, titlearc);
            storyboard.appendChild(
              <sequence title={scenetitle} source={sceneres.Value}>
                <shot title="" ratio="4x3"/>
              </sequence>
            );
          }
        }
        else {
          var untitled = gApp.getText("Untitled");
          storyboard.appendChild(
            <sequence title={untitled}>
              <shot title="" ratio="4x3"/>
            </sequence>
          );
        }
        var dstfile = gProject.projectFolder;
        dstfile.append("storyboard.xml");
        dstfile.createUnique(0, 0644 & dstfile.parent.permissions);
        var xmlstr = "<?xml version='1.0' encoding='UTF-8'?>\n\n"
          + storyboard.toXMLString();
        writeFile(xmlstr, dstfile);
        gProject.addFileToDocument(dstfile, docres);
        clearRDFObject(gProject.ds, docres, sourcearc);
      }

      if (filter) {
        var filterarc = rdfsvc.GetResource(Cx.NS_CX + "filter");
        var filterseq = rdfsvc.GetAnonymousResource();
        filterseq = new RDFSeq(gProject.ds, filterseq);
        filterseq.push(filter);
        gProject.ds.Assert(docres, filterarc, filterseq.res, true);
        gCatalogManager.updateCatalog(docres);
      }
    }
  }
  catch (ex) {
    dump("*** cmdAddDocument: " + ex + "\n");
    celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
  }
  gProject.ds.endUpdateBatch();

  gProject.isModified = true;

  // Make sure the item is visible, and select it
  try {
    if (makeTreeResourceVisible(docres, gWindow.documentTree)) {
      var idx = gWindow.documentTree.builder.getIndexOfResource(docres);
      if (idx >= 0)
        gWindow.documentTree.view.selection.select(idx);
    }
  }
  catch (ex) {
    dump("*** cmdAddDocument: " + ex + "\n");
  }

  try {
    if (haveInternalEditorForDocType(config.type))
      openDocument(docres);
  }
  catch (ex) {
    dump("*** cmdAddDocument: " + ex + "\n");
  }
}


function quickAddFolder () {
  var ps = getPromptService();
  var rdfsvc = getRDFService();
  var docres = null;

  gProject.ds.beginUpdateBatch();
  try {
    var dlgTitle = gApp.getText("AddFolder");
    var dlgMsg = gApp.getText("AddFolderPrompt");
    var title = { value: "" };
    var check = { value: false };
    if (! ps.prompt(window, dlgTitle, dlgMsg, title, null, check))
      return;
    var location = getSelectedDocumentFolder();
    docres = gProject.createFolder(title.value, location);
  }
  catch (ex) {
    celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
  }
  gProject.ds.endUpdateBatch();

  gProject.isModified = true;

  // Make sure the item is visible, and select it
  try {
    if (makeTreeResourceVisible(docres, gWindow.documentTree)) {
      var idx = gWindow.documentTree.builder.getIndexOfResource(docres);
      if (idx >= 0)
        gWindow.documentTree.view.selection.select(idx);
    }
  }
  catch (ex) {
    dump("*** quickAddFolder: " + ex + "\n");
  }
}


function cmdAddFolder () {
  var config = {
    project: gProject,
    title: null,
    location: getSelectedDocumentFolder(),
    accepted: false
  };
  window.openDialog(Cx.CONTENT_PATH + "addfolder.xul", "_blank",
                    Cx.MODAL_DIALOG_FLAGS, config);
  if (! config.accepted)
    return;

  gProject.ds.beginUpdateBatch();
  try {
    var folder = gProject.createFolder(config.title, config.location);
  }
  catch (ex) {
    celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
  }
  gProject.ds.endUpdateBatch();

  gProject.isModified = true;

  // Make sure the item is visible, and select it
  try {
    if (makeTreeResourceVisible(folder.res, gWindow.documentTree)) {
      var idx = gWindow.documentTree.builder.getIndexOfResource(folder.res);
      if (idx >= 0)
        gWindow.documentTree.view.selection.select(idx);
    }
  }
  catch (ex) {
    dump("*** cmdAddFolder: " + ex + "\n");
  }
}


function removeFolderRecursive (folderres) {
  var cu = getRDFContainerUtils();
  var seq = new RDFSeq(gProject.ds, folderres);
  while (! seq.isEmpty()) {
    var res = seq.get(0).QueryInterface(Components.interfaces.nsIRDFResource);
    if (cu.IsSeq(gProject.ds, res))
      removeFolderRecursive(res);
    else
      removeDocument(res);
  }
  gProject.removeDocument(folderres);
}


function removeDocument (docres) {
  // Close the document if it's currently open
  var docframe = gFrameLoader.frameForDocument(docres.Value);
  if (docframe) {
    docframe.suppressSavePrompt = true;
    try {
      gFrameLoader.closeFrame(docframe);
    }
    catch (ex) {
      celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
    }
    docframe.suppressSavePrompt = false;
  }

  try {
    var parent = gProject.parentFolder(docres);
    parent.remove(docres);
    clearDocument(docres, gProject, gController.ruleds);
  }
  catch (ex) {
    dump("*** clearDocument: " + ex + "\n");
  }

  gProject.isModified = true;
}


function removeBreakdownItem (itemRes) {
  var rdfsvc = getRDFService();
  var IRes = Components.interfaces.nsIRDFResource;
  var ILit = Components.interfaces.nsIRDFLiteral;

  gProject.ds.beginUpdateBatch();
  try {
    // Close any single-form tabs corresponding to the item
    var frame = gFrameLoader.frameForDocument(itemRes.Value);
    while (frame) {
      gFrameLoader.closeFrame(frame);
      frame = gFrameLoader.frameForDocument(itemRes.Value);
    }

    // Is this used anywhere?
    var markupProp = rdfsvc.GetResource(Cx.NS_CX + 'markup');
    var markupSrc  = gProject.ds.GetSource(markupProp, itemRes, true);
    if (markupSrc) {
      gProject.ds.Unassert(markupSrc, markupProp, itemRes, true);
    }

    // Find all the shortcuts to this
    var sourcearc = rdfsvc.GetResource(Cx.NS_DC + "source");
    var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
    var shortcuts = gProject.ds.GetSources(sourcearc, itemRes, true);
    while (shortcuts.hasMoreElements()) {
      var shortcut = shortcuts.getNext().QueryInterface(IRes);
      if (gProject.ds.hasArcOut(shortcut, doctypearc))
        removeDocument(shortcut);
    }

    // Find all scenes that have this (other containers will have to sort
    // themselves out accordingly)
    var scenesToUpdate = scenesContainingItem(gProject.ds, itemRes);
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    for (var i = 0; i < scenesToUpdate.length; ++i) {
      var scene = new Scene(gProject.ds, scenesToUpdate[i]);
      scene.removeItem(itemRes);
    }

    // Clear all the outgoing arcs. Is this really necessary? Mark and sweep on
    // save should clear these out anyway.
    var arcs = gProject.ds.ArcLabelsOut(itemRes);
    while (arcs.hasMoreElements()) {
      var arc = arcs.getNext().QueryInterface(IRes);
      var targets = gProject.ds.GetTargets(itemRes, arc, true);
      while (targets.hasMoreElements()) {
        var target = targets.getNext();
        gProject.ds.Unassert(itemRes, arc, target);
      }
    }
  }
  catch (ex) {
    dump("*** removeBreakdownItem: " + ex + "\n");
  }
  gProject.ds.endUpdateBatch();

  gProject.isModified = true;
}


function cmdRemoveDocument () {
  var rdfsvc = getRDFService();
  var psvc = getPromptService();
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var treeview = gWindow.documentTree.view;
  var index = treeview.selection.currentIndex;
  var docres = treeview.getResourceAtIndex(index);
  var doctitle = getRDFString(gProject.ds, docres, titlearc);

  gProject.ds.beginUpdateBatch();
  try {
    if (treeview.isContainer(index)) {
      var title = gApp.getText("RemoveFolder");
      var msg = gApp.getText("RemoveFolderPrompt", [ doctitle ]);
      if (! psvc.confirm(window, title, msg)) {
        gProject.ds.endUpdateBatch();
        return;
      }
      removeFolderRecursive(docres);
    }
    else {
      var frame = Components.stack;
      var title = gApp.getText("DeleteItem");
      // Check if it's a document or just a shortcut to a breakdown item
      var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
      var categoryarc = rdfsvc.GetResource(Cx.NS_CX + "category");
      var doctype = gProject.ds.GetTarget(docres, doctypearc, true);
      doctype = doctype.QueryInterface(Components.interfaces.nsIRDFResource);
      var docds = rdfsvc.GetDataSourceBlocking(Cx.DOCTYPES_URL);
      var msg = null;
      if (docds.hasArcOut(doctype, categoryarc))
        msg = gApp.getText("DeleteShortcutPrompt", [ doctitle ]);
      else
        msg = gApp.getText("DeleteItemPrompt", [ doctitle ]);
      if (! psvc.confirm(window, title, msg)) {
        gProject.ds.endUpdateBatch();
        return;
      }
      removeDocument(docres);
    }
  }
  catch (ex) {
    celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
  }
  gProject.ds.endUpdateBatch();
}


function cmdRenameDocument () {
  var IRes = Components.interfaces.nsIRDFResource;
  var rdfsvc = getRDFService();
  var psvc = getPromptService();
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var treeview = gWindow.documentTree.view;
  var index = treeview.selection.currentIndex;
  var docres = treeview.getResourceAtIndex(index);

  // Special case: The project pseudo-folder
  var isProjFolder = docres.Value == gProject.rootFolder.res.Value;

  var doctitle = gProject.ds.GetTarget(isProjFolder ? gProject.res : docres,
    titlearc, true);
  doctitle = doctitle.QueryInterface(Components.interfaces.nsIRDFLiteral);

  var dlgtitle = gApp.getText("RenameItem");
  var msg = gApp.getText("RenameItemPrompt");
  var title = { value: doctitle.Value };
  var checkstate = { value: false };
  if (! psvc.prompt(window, dlgtitle, msg, title, null, checkstate))
    return;

  if (title.value == "")
    return;

  gProject.ds.beginUpdateBatch();
  try {
    if (isProjFolder) {
      gProject.title = title.value;
    }
    else {
      gProject.ds.Change(docres, titlearc, doctitle,
                         rdfsvc.GetLiteral(title.value));
      // Look for a matching breakdown item...
      var schemads    = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
      var rdftypearc  = rdfsvc.GetResource(Cx.NS_RDF + "type");
      var sourcearc   = rdfsvc.GetResource(Cx.NS_DC + "source");
      var bdtype      = rdfsvc.GetResource(Cx.NS_CX + "Breakdown");
      var source      = gProject.ds.GetTarget(docres, sourcearc, true);
      if (source && source instanceof IRes) {
        var srctype   = gProject.ds.GetTarget(source, rdftypearc, true);
        if (srctype &&
            schemads.HasAssertion(srctype, rdftypearc, bdtype, true)) {
          var srctitle  = gProject.ds.GetTarget(source, titlearc, true);
          gProject.ds.Change(source, titlearc, srctitle,
                             rdfsvc.GetLiteral(title.value));
        }
      }
    }
  }
  catch (ex) {
    celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
  }
  gProject.ds.endUpdateBatch();

  gProject.isModified = true;

  try {
    var frame = gFrameLoader.frameForDocument(docres.Value);
    if (frame)
      frame.tab.setAttribute("label", title.value);
  }
  catch (ex) {
    dump("*** cmdRenameDocument: " + ex + "\n");
  }
}


function cmdToggleInlineSpelling () {
  var ps = getPrefService().getBranch("celtx.spelling.");
  ps.setBoolPref("inline", ! ps.getBoolPref("inline"));
}


function selectAndShowDocument (docuri) {
  var rdfsvc = getRDFService();
  var treeview = gWindow.documentTree.view;
  var docres = rdfsvc.GetResource(docuri);
  var index = treeview.getIndexOfResource(docres);
  if (index < 0) {
    dump("*** selectAndShowDocument: " + docuri + " is not in the tree\n");
    return;
  }
  treeview.selection.select(index);
  gWindow.documentTree.treeBoxObject.ensureRowIsVisible(index);
}


function cmdCopyDocument () {
  var treeview = gWindow.documentTree.view;
  var index = treeview.selection.currentIndex;
  var docres = treeview.getResourceAtIndex(index);
  var frame = gFrameLoader.frameForDocument(docres.Value);
  if (frame) {
    try {
      frame.controller.save();
    }
    catch (ex) {
      dump("*** cmdCopyDocument: " + ex + "\n");
    }
  }
  var rdfsvc = getRDFService();
  var cu = getRDFContainerUtils();
  var copy = null;
  gProject.ds.beginUpdateBatch();
  try {
    var location = new RDFSeq(gProject.ds, getSelectedDocumentFolder());
    // getSelectedDocumentFolder will return the folder itself if a
    // folder is selected, so we really want the parent folder
    if (cu.IsSeq(gProject.ds, docres)) {
      var parentidx = treeview.getParentIndex(index);
      if (parentidx < 0)
        throw "no parent for folder copy";
      location = new RDFSeq(gProject.ds,
        treeview.getResourceAtIndex(parentidx));
    }
    copy = cu.IsSeq(gProject.ds, docres) ?
      copyFolder(docres, gProject, gProject, gController.ruleds) :
      copyDocument(docres, gProject, gProject, gController.ruleds);
    location.insert(copy, location.indexOf(docres) + 1);
    setTimeout("selectAndShowDocument('" + copy.Value + "')", 0);
  }
  catch (ex) {
    dump("*** cmdCopyDocument: " + ex + "\n");
    throw ex;
  }
  finally {
    gProject.ds.endUpdateBatch();

    gProject.isModified = true;
  }

  return copy;
}


function cmdCopyDocumentAs (event) {
  var IRes = Components.interfaces.nsIRDFResource;
  var rdfsvc = getRDFService();
  var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
  var doctype = rdfsvc.GetResource(event.target.value);
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

  var docds = rdfsvc.GetDataSourceBlocking(Cx.DOCTYPES_URL);
  var doctitle = getRDFString(docds, doctype, titlearc);

  // Converting from one script type to another leverages cmdCopyDocument
  if (event.target.value != Cx.NS_CX + "StoryboardDocument2") {
    gProject.ds.beginUpdateBatch();
    try {
      var docres = cmdCopyDocument();
      var oldtype = gProject.ds.GetTarget(docres, doctypearc, true);
      gProject.ds.Change(docres, doctypearc, oldtype, doctype);
      var convertArc = rdfsvc.GetResource(Cx.NS_CX + "needsConversion");
      setRDFString(gProject.ds, docres, convertArc, "true");
      setRDFString(gProject.ds, docres, titlearc, doctitle);
      setTimeout(function () { gFrameLoader.loadDocument(docres); }, 0);
    }
    catch (ex) {
      celtxBugAlert(gApp.getText("CopyDocumentFailed"), Components.stack, ex);
    }
    gProject.ds.endUpdateBatch();

    return;
  }

  // Converting to Storyboard is a whole other story. We need to make an
  // XML document from scratch, based on the script's RDF
  gProject.ds.beginUpdateBatch();
  try {
    var treeview = gWindow.documentTree.view;
    var index = treeview.selection.currentIndex;
    var srcres = treeview.getResourceAtIndex(index);

    // Save it if necessary
    var frame = gFrameLoader.frameForDocument(srcres.Value);
    if (frame) {
      try {
        frame.controller.save();
      }
      catch (ex) {
        dump("*** cmdCopyDocumentAs: " + ex + "\n");
      }
    }

    var location = getSelectedDocumentFolder();
    var docres = gProject.createDocument(doctitle, doctype, location);

    // Make a storyboard XML file
    var storyboard = <storyboard title={doctitle}/>;
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
    var scenes = gProject.ds.GetTarget(srcres, scenesarc, true);
    scenes = new RDFSeq(gProject.ds, scenes.QueryInterface(IRes));
    for (var i = 0; i < scenes.length; ++i) {
      var sceneres = scenes.get(i).QueryInterface(IRes);
      var scenetitle = getRDFString(gProject.ds, sceneres, titlearc);
      storyboard.appendChild(
        <sequence title={scenetitle} source={sceneres.Value}/>
      );
    }
    var dstfile = gProject.projectFolder;
    dstfile.append("storyboard.xml");
    dstfile.createUnique(0, 0644 & dstfile.parent.permissions);
    var xmlstr = "<?xml version='1.0' encoding='UTF-8'?>\n\n"
      + storyboard.toXMLString();
    writeFile(xmlstr, dstfile);

    gProject.addFileToDocument(dstfile, docres);

    setTimeout(function () {
      selectAndShowDocument(docres.Value);
      gFrameLoader.loadDocument(docres);
    }, 0);
  }
  catch (ex) {
    celtxBugAlert(gApp.getText("CopyDocumentFailed"), Components.stack, ex);
  }
  gProject.ds.endUpdateBatch();

  gProject.isModified = true;
}


function cmdCopyProject () {
  try {
    writeProjectFiles();

    var projuri = copyToUnique(gProject.projectFolder,
      gProject.projectFolder.parent, "celtx_project");
    projuri.append(Cx.PROJECT_FILE);
    projuri = fileToFileURL(projuri);
    var newproj = new Project(projuri);
    newproj.changeAllIDs();
    newproj.flush();
    window.openDialog(Cx.CONTENT_PATH, "_blank", Cx.NEW_WINDOW_FLAGS, projuri);
  }
  catch (ex) {
    var msg = gApp.getText("CopyProjectErrorMsg");
    celtxBugAlert (msg, Components.stack, ex);
  }
}


function needsConversion (fileURL) {
  var f = fileURLToFile(fileURL);
  var t = tempFile('rdf');
  t.remove(false);
  f.copyTo(t.parent, t.leafName);
  
  var ds = loadDataSource(fileToFileURL(t));
  var m  = new RDFModel(ds);

  var projRes = m.source(PROP('rdf:type'), RES(Cx.NS_CX + 'Project'));
  if (! projRes) throw "No project resource found";

  var compRes = m.target(projRes, PROP('cx:components'));
  if (compRes) return null;

  // Flush the datasource to yet another temporary file to ensure it's
  // in the semi-regular mozilla rdfxml format prior to transforming.
  var convertURL  = fileToFileURL(tempFile('rdf'));
  ds.FlushTo(convertURL);
  return convertURL;
}


function convertProject (fileURL, convertURL) {
  var origFile = fileURLToFile(fileURL);
  var backupName = Cx.PROJECT_FILE + '.orig';
  try {
    origFile.moveTo(null, backupName);
  }
  catch (ex) {
    dump("convertProject: moveTo: " + ex + "\n");
  }

  var xslt = document.implementation.createDocument("", "", null);
  xslt.async = false;
  xslt.load(Cx.TRANSFORM_PATH + "convert.xml");

  var proc = new XSLTProcessor();
  proc.importStylesheet(xslt);

  var rdfDoc = document.implementation.createDocument("", "", null);
  rdfDoc.async = false;
  rdfDoc.load(convertURL);

  var converted = proc.transformToDocument(rdfDoc);

  var projFile = fileURLToFile(fileURL);

  serializeDOMtoFile(converted, projFile);

  return;
  // XXX: Obsolete
  // Create a launcher file, if necessary
  var projDir = projFile.parent;
  var celtxFile = projDir.clone();
  celtxFile.append(projDir.leafName + '.celtx');
  if (! celtxFile.exists()) {
    celtxFile.create(0, 0600);
  }
}


function openInMasterCatalog (itemres) {
  var catalog = gProject.masterCatalog;
  var catframe = gFrameLoader.frameForDocument(catalog.Value);
  if (catframe) {
    catframe.controller.selectItem(itemres);
    gWindow.documentTabbox.selectedTab = catframe.tab;
    return;
  }

  var rdfsvc = getRDFService();
  var selectedarc = rdfsvc.GetResource(Cx.NS_CX + "selected");
  setRDFObject(gProject.ds, catalog, selectedarc, itemres);
  gFrameLoader.loadDocument(catalog);
}


function cmdRevealProject () {
  var file = getProjectFile();
  if (file && file.exists())
    file.reveal();
}


function openExtensionsManager () {
  var wm = getWindowMediator();
  var toolwin = wm.getMostRecentWindow("Extension:Manager");
  if (toolwin) {
    toolwin.focus();
    return;
  }
  const EMURL = "chrome://mozapps/content/extensions/extensions.xul";
  const EMFEATURES = "chrome,menubar,extra-chrome,toolbar,dialog=no,resizable";
  window.openDialog(EMURL, "", EMFEATURES);
}


function notificationToPopupContent (notification) {
  if (! notification)
    return null;

  // The surrounding vbox
  var vbox = document.createElement("vbox");
  vbox.setAttribute("class", "notification");
  vbox.setAttribute("flex", "1");
  vbox.setAttribute("pack", "start");

  // The header hbox
  var top = document.createElement("hbox");
  top.setAttribute("align", "center");
  vbox.appendChild(top);

  /*
  // The badge
  var image = document.createElement("image");
  image.setAttribute("src", "chrome://celtx/skin/splash/star.png");
  top.appendChild(image);
  */

  // The header title
  var header = document.createElement("label");
  header.setAttribute("class", "header");
  header.setAttribute("flex", "1");
  header.setAttribute("value", notification.title);
  top.appendChild(header);

  // The close button
  var closebtn = document.createElement("toolbarbutton");
  closebtn.setAttribute("class", "close-button");
  closebtn.setAttribute("onclick", "hideNotificationPopup()");
  top.appendChild(closebtn);

  // The author
  if (notification.author) {
    var author = document.createElement("label");
    author.setAttribute("style", "font-style: italic;");
    author.setAttribute("value", notification.author);
    vbox.appendChild(author);
  }

  // The date
  if (notification.date) {
    var date = document.createElement("description");
    date.setAttribute("style", "font-style: italic;");
    // Get rid of trailing milliseconds
    var datestr = notification.date;
    if (datestr.match(/\./))
      datestr = datestr.replace(/\..*/, "") + "Z";
    datestr = datestr.replace(/ /, "T");
    var isodate = isoDateStringToDate(datestr);
    date.appendChild(document.createTextNode(isodate.toLocaleDateString()
      + "\n" + isodate.toLocaleTimeString()));
    vbox.appendChild(date);
  }

  // The message
  var message = document.createElement("description");
  message.appendChild(document.createTextNode(notification.description));
  vbox.appendChild(message);

  // The vertical spacer
  var vspacer = document.createElement("spacer");
  vspacer.setAttribute("flex", "1");
  vbox.appendChild(vspacer);

  // The footer hbox
  var bottom = document.createElement("hbox");
  vbox.appendChild(bottom);

  // The action
  if (notification.source) {
    var action = document.createElement("label");
    action.setAttribute("class", "text-link");
    action.setAttribute("value", gApp.getText("ShowDetails"));
    action.setAttribute("onclick",
      "hideNotificationPopup(); openBrowser('" + notification.source + "')");
    bottom.appendChild(action);
  }

  // The horizontal spacer
  var hspacer = document.createElement("spacer");
  hspacer.setAttribute("flex", "1");
  bottom.appendChild(hspacer);

  // The next button
  if (getCeltxService().notificationCount > 1) {
    var nextbtn = document.createElement("toolbarbutton");
    nextbtn.setAttribute("class", "messagenextbtn");
    nextbtn.setAttribute("oncommand", "showNextNotification()");
    bottom.appendChild(nextbtn);
  }

  return vbox;
}


function showNotificationPopup (sender) {
  var cxsvc = getCeltxService();
  var notification = cxsvc.peekNotification();
  if (! notification)
    return;
  var popupContent = notificationToPopupContent(notification);
  var popup = document.getElementById("messagepopup");
  while (popup.hasChildNodes())
    popup.removeChild(popup.lastChild);
  popup.setAttribute("id", "messagepopup");
  popup.appendChild(popupContent);
  popup.showPopup(sender, -1, -1, "popup", "bottomright", "topright");
}


function hideNotificationPopup () {
  var popup = document.getElementById("messagepopup");
  if (popup) {
    popup.hidePopup();
    var cxsvc = getCeltxService();
    // Clear the next notification
    var notification = cxsvc.nextNotification();
  }
}


function showNextNotification () {
  var popup = document.getElementById("messagepopup");

  var cxsvc = getCeltxService();
  cxsvc.nextNotification();
  var notification = cxsvc.peekNotification();
  if (! notification) {
    popup.hidePopup();
    return;
  }
  var popupContent = notificationToPopupContent(notification);
  while (popup.hasChildNodes())
    popup.removeChild(popup.lastChild);
  popup.appendChild(popupContent);
}


function openDebugWindow () {
  window.open(Cx.CONTENT_PATH + 'debugwin.xul', "",
    Cx.RESIZABLE_WINDOW_FLAGS + ",centerscreen");
}


function getUnassociatedMediaFiles () {
  // Scrape the project folder
  var ds = gProject.ds;
  var rdfsvc = getRDFService();
  var localfilearc = rdfsvc.GetResource(Cx.NS_CX + "localFile");
  var auxfilearc = rdfsvc.GetResource(Cx.NS_CX + "auxFile");
  var thumbnailarc = rdfsvc.GetResource(Cx.NS_CX + "thumbnail");

  var filelist = [];

  var projfolder = gProject.projectFolder;
  var entries = projfolder.directoryEntries;
  while (entries.hasMoreElements()) {
    var entry = entries.getNext().QueryInterface(
      Components.interfaces.nsIFile);

    // Ignore non-files
    if (! entry.isFile())
      continue;

    // Ignore our own special files
    if (entry.leafName == "project.rdf" ||
        entry.leafName == "local.rdf" ||
        entry.leafName.match(/\.celtx$/))
      continue;

    // Ignore files that the RDF refers to
    var filelit = rdfsvc.GetLiteral(entry.leafName);
    if (ds.hasArcIn(filelit, localfilearc) ||
        ds.hasArcIn(filelit, auxfilearc) ||
        ds.hasArcIn(filelit, thumbnailarc))
      continue;

    filelist.push(entry);
  }

  return filelist;
}


function getBrokenMediaResources () {
  // Scrape the project RDF
  var ds = gProject.ds;
  var IRes = Components.interfaces.nsIRDFResource;
  var rdfsvc = getRDFService();
  var rdftypearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  var imagetype = rdfsvc.GetResource(Cx.NS_CX + "Image");
  var audiotype = rdfsvc.GetResource(Cx.NS_CX + "Audio");
  var videotype = rdfsvc.GetResource(Cx.NS_CX + "Video");
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var localfilearc = rdfsvc.GetResource(Cx.NS_CX + "localFile");

  function isBrokenMedia (mediares) {
    if (! ds.hasArcOut(mediares, localfilearc))
      return true;
    if (! getRDFString(ds, mediares, titlearc))
      return true;
  }

  var medialist = [];

  var types = [ imagetype, audiotype, videotype ];
  for (var i = 0; i < types.length; ++i) {
    var media = ds.GetSources(rdftypearc, types[i], true);
    while (media.hasMoreElements()) {
      var mediares = media.getNext().QueryInterface(IRes);
      if (isBrokenMedia(mediares))
        medialist.push(mediares);
    }
  }

  return medialist;
}


function updateNotifierLabel () {
  var cxsvc = getCeltxService();

  var frame = document.getElementById("notifierframe");
  frame.addEventListener("load", function () {
    var channel = frame.docShell.currentDocumentChannel.QueryInterface(
      Components.interfaces.nsIHttpChannel);
    if (channel.responseStatus < 200 || channel.responseStatus >= 300)
      throw new Error("Unable to load notifier: " + channel.responseStatus);
    var title = frame.contentDocument.title;
    var label = document.getElementById("notifierlabel");
    label.value = title;
    label.setAttribute("closedvalue", title);
  }, true);
  frame.setAttribute("src", cxsvc.SPLASH_URL);

  document.getElementById("powframe").setAttribute("src", cxsvc.POW_URL);
}


function toggleStatusNotifier () {
  var label = document.getElementById("notifierlabel");
  var box = document.getElementById("notifierbox");
  if (box.collapsed) {
    label.value = gApp.getText("Close");
    box.collapsed = false;
  }
  else {
    label.value = label.getAttribute("closedvalue");
    box.collapsed = true;
  }
}

function celtxDebugBreak () {
  // var breaker = Components.classes["@celtx.com/debug-breaker;1"]
  //   .createInstance(Components.interfaces.nsICeltxDebugBreaker);
  // breaker.breakToDebug();
}

function fixWindowFocus () {
  // var breaker = Components.classes["@celtx.com/debug-breaker;1"]
  //   .createInstance(Components.interfaces.nsICeltxDebugBreaker);
  // breaker.fixWindowFocus(window);
}
