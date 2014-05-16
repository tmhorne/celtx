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

var gWindow = new Object;
var gCloneMap = new Object;

/**
 * Get the nsIDOMWindow for an nsIXULWindow. This is just a convenience
 * method to save having to get an nsIInterfaceRequestor every time.
 * @param aWindow{nsIXULWindow} an nsIXULWindow object
 * @type nsIDOMWindow
 * @return the corresponding nsIDOMWindow object
 */
function XULToDOMWindow (aWindow) {
  var ifreq = aWindow.docShell.QueryInterface(
    Components.interfaces.nsIInterfaceRequestor);
  return ifreq.getInterface(Components.interfaces.nsIDOMWindow);
}

/*
 * Here's the deal: We can't use the project ID to track projects
 * because the clone needs to have the same project ID. If they had
 * different project IDs, we couldn't simulate a genuine refresh of
 * a project and we'd risk overlooking cached information that was not
 * refreshed properly.
 *
 * Consequently, the approach we use is to store the file URL for the
 * project window, since that's guaranteed to be unique per project
 * window. Unfortunately, any new projects won't have a file URL, so
 * the user will have to save them before opening the debug window.
 */

var gWindowTracker = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIWindowMediatorListener))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  onCloseWindow: function (aWindow) {
    // If it's an original project window that's closing, delete the
    // row from the list and remove its entry from the clone map.
    // If it's a clone project window that's closing, remove its
    // entry from the clone map and update the row in the list to reflect
    // a lack of a clone.
    try {
      var domwin = XULToDOMWindow(aWindow);
      if (! domwin.gProject)
        return;

      var projfile = domwin.getProjectFile();
      if (! projfile)
        return;

      var projuri = fileToFileURL(projfile);
      var rows = gWindow.projlist.view.rowCount;
      var firstCol = gWindow.projlist.columns.getColumnAt(0);
      var secondCol = gWindow.projlist.columns.getColumnAt(1);
      for (var i = 0; i < rows.length; ++i) {
        if (gWindow.projlist.view.getCellValue(i, firstCol) == projuri) {
          if (origuri in gCloneMap)
            delete gCloneMap[origuri];
          var treeitem = gWindow.projlist.view.getItemAtIndex(i);
          treeitem.parentNode.removeChild(treeitem);
          break;
        }
        else if (gWindow.projlist.view.getCellValue(i, secondCol) == projuri) {
          gWindow.projlist.view.setCellValue(i, secondCol, "");
          gWindow.projlist.view.setCellText(i, secondCol, "n/a");
          var origuri = gWindow.projlist.view.getCellValue(i, firstCol);
          if (origuri in gCloneMap)
            delete gCloneMap[origuri];
          break;
        }
      }
    }
    catch (ex) {
      dump("*** onCloseWindow: " + ex + "\n");
    }
  },

  onOpenWindow: function (aWindow) {
    // Only pick up original project windows that have opened. We'll
    // track them separately when we create them.
    try {
      var domwin = XULToDOMWindow(aWindow);
      if (! domwin.gProject)
        return;

      var projfile = domwin.getProjectFile();
      if (! projfile)
        return;

      var projuri = fileToFileURL(projfile);

      // Check that we aren't already tracking it
      var rows = gWindow.projlist.view.rowCount;
      var firstCol = gWindow.projlist.columns.getColumnAt(0);
      for (var i = 0; i < rows.length; ++i) {
        if (gWindow.projlist.view.getCellValue(i, firstCol) == projuri)
          return;
      }

      // Nope, create it.
      var treeitem = document.createElementNS(Cx.NS_XUL, "treeitem");
      var treerow = document.createElementNS(Cx.NS_XUL, "treerow");
      treeitem.appendChild(treerow);
      var origcell = document.createElementNS(Cx.NS_XUL, "treecell");
      origcell.setAttribute("label", domwin.title);
      origcell.setAttribute("value", projuri);
      treerow.appendChild(origcell);
      var modcell = document.createElementNS(Cx.NS_XUL, "treecell");
      modcell.setAttribute("label", "n/a");
      modcell.setAttribute("value", "");
      treerow.appendChild(modcell);
      gWindow.projlist.lastChild.appendChild(treeitem);

      // Delete any stale clone mapping
      if (projuri in gCloneMap)
        delete gCloneMap[projuri];
    }
    catch (ex) {
      dump("*** onOpenWindow: " + ex + "\n");
    }
  },

  onWindowTitleChange: function (aWindow, aNewTitle) {
    try {
      var domwin = XULToDOMWindow(aWindow);
      if (! domwin.gProject)
        return;

      var projfile = domwin.getProjectFile();
      if (! projfile)
        return;

      var projuri = fileToFileURL(projfile);
      var rows = gWindow.projlist.view.rowCount;
      var firstCol = gWindow.projlist.columns.getColumnAt(0);
      var secondCol = gWindow.projlist.columns.getColumnAt(1);
      for (var i = 0; i < rows.length; ++i) {
        if (gWindow.projlist.view.getCellValue(i, firstCol) == projuri) {
          gWindow.projlist.view.setCellText(i, firstCol, aNewTitle);
          break;
        }
        else if (gWindow.projlist.view.getCellValue(i, secondCol) == projuri) {
          gWindow.projlist.view.setCellText(i, secondCol, aNewTitle);
          break;
        }
      }
    }
    catch (ex) {
      dump("*** onWindowTitleChange: " + ex + "\n");
    }
  }
};


var gController = {
  commands: {
    "cmd-close": 1
  },
  supportsCommand: function (cmd) {
    return (cmd in this.commands);
  },
  isCommandEnabled: function (cmd) {
    return this.supportsCommand(cmd);
  },
  doCommand: function (cmd) {
    switch (cmd) {
      case "cmd-close":
        if (tryToClose())
          window.close();
        break;
      default:
    }
  }
};


function tryToClose () {
  getWindowMediator().removeListener(gWindowTracker);
  window.controllers.removeController(gController);
  window.controllers.removeController(gApp);
  return true;
}


function loaded () {
  gWindow.projwindow = window.opener;
  gWindow.tablist = document.getElementById("opentabslist");
  gWindow.projlist = document.getElementById("projectlist");

  window.tryToClose = tryToClose;
  window.controllers.appendController(gController);
  window.controllers.appendController(gApp);

  var children = gWindow.tablist.lastChild;
  var frames = gWindow.projwindow.gFrameLoader.frames;
  for (var i = 0; i < frames.length; ++i) {
    var frame = frames[i];
    // gWindow.tablist.appendItem(frame.tab.label, frame.docres.Value);
    var treeitem = document.createElementNS(Cx.NS_XUL, "treeitem");
    treeitem.setAttribute("id", frame.docres.Value);
    var treerow = document.createElementNS(Cx.NS_XUL, "treerow");
    treeitem.appendChild(treerow);
    var origcell = document.createElementNS(Cx.NS_XUL, "treecell");
    origcell.setAttribute("label", frame.tab.label);
    origcell.setAttribute("value", frame.docres.Value);
    treerow.appendChild(origcell);
    var modcell = document.createElementNS(Cx.NS_XUL, "treecell");
    modcell.setAttribute("label", "n/a");
    modcell.setAttribute("value", "");
    treerow.appendChild(modcell);
    children.appendChild(treeitem);
  }

  var treechildren = gWindow.projlist.lastChild;
  var wm = getWindowMediator();
  var windows = wm.getEnumerator("celtx:main");
  while (windows.hasMoreElements()) {
    var win = windows.getNext();
    if (! win.gProject)
      continue;

    var projfile = win.getProjectFile();
    if (! projfile)
      continue;

    var projuri = fileToFileURL(projfile);

    var treeitem = document.createElementNS(Cx.NS_XUL, "treeitem");
    var treerow = document.createElementNS(Cx.NS_XUL, "treerow");
    treeitem.appendChild(treerow);
    var origcell = document.createElementNS(Cx.NS_XUL, "treecell");
    origcell.setAttribute("label", win.gProject.title);
    origcell.setAttribute("value", projuri);
    treerow.appendChild(origcell);
    var modcell = document.createElementNS(Cx.NS_XUL, "treecell");
    modcell.setAttribute("label", "n/a");
    modcell.setAttribute("value", "");
    treerow.appendChild(modcell);
    treechildren.appendChild(treeitem);
  }

  wm.addListener(gWindowTracker);

  refreshUnassociatedMediaFiles();
  refreshBrokenMediaResources();
}


function refreshUnassociatedMediaFiles () {
  // Clear the existing list
  var medialist = document.getElementById("medialist");
  while (medialist.getRowCount() > 0)
    medialist.removeItemAt(medialist.getRowCount() - 1);

  var files = gWindow.projwindow.getUnassociatedMediaFiles();
  for (var i = 0; i < files.length; ++i)
    medialist.appendItem(files[i].leafName, fileToFileURL(files[i]));
}


function refreshBrokenMediaResources () {
  // Clear the existing list
  var mediareslist = document.getElementById("mediareslist");
  while (mediareslist.getRowCount() > 0)
    mediareslist.removeItemAt(mediareslist.getRowCount() - 1);

  // Scrape the project RDF
  var ds = gWindow.projwindow.gProject.ds;
  var rdfsvc = getRDFService();
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

  var medialist = gWindow.projwindow.getBrokenMediaResources();

  for (var i = 0; i < medialist.length; ++i) {
    var title = getRDFString(ds, medialist[i], titlearc);
    if (title)
      mediareslist.appendItem(title, medialist[i].Value);
    else
      mediareslist.appendItem(medialist[i].Value, medialist[i].Value);
  }
}


function mediaFilesSelected () {
  var deletebutton = document.getElementById("deletemediabutton");
  var medialist = document.getElementById("medialist");
  deletebutton.disabled = (medialist.selectedCount == 0);
}


function mediaResourcesSelected () {
  var deletebutton = document.getElementById("deletemediaresbutton");
  var medialist = document.getElementById("mediareslist");
  deletebutton.disabled = (medialist.selectedCount == 0);
}


function deleteMediaFiles () {
  var medialist = document.getElementById("medialist");
  var fileuris = [];
  for (var i = 0; i < medialist.selectedCount; ++i) {
    var idx = medialist.getIndexOfItem(medialist.getSelectedItem(i));
    fileuris.push(medialist.removeItemAt(idx).getAttribute("value"));
  }
  while (fileuris.length > 0) {
    var file = fileURLToFile(fileuris.pop());
    try {
      file.remove(false);
    }
    catch (ex) {
      dump("*** deleteMediaFiles: " + ex + "\n");
    }
  }
}


function deleteMediaResources () {
  var medialist = document.getElementById("mediareslist");
  var mediauris = [];
  for (var i = medialist.selectedCount - 1; i >= 0; --i) {
    var idx = medialist.getIndexOfItem(medialist.getSelectedItem(i));
    mediauris.push(medialist.removeItemAt(idx).getAttribute("value"));
  }

  var ds = gWindow.projwindow.gProject.ds;
  var rdfsvc = getRDFService();
  var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  ds.beginUpdateBatch();
  while (mediauris.length > 0) {
    var mediares = rdfsvc.GetResource(mediauris.pop());
    try {
      deleteAllRDFArcsIn(ds, mediares);
      var typeres = ds.GetTarget(mediares, typearc, true);
      if (typeres)
        ds.Unassert(mediares, typearc, typeres);
    }
    catch (ex) {
      dump("*** deleteMediaResources: " + ex + "\n");
    }
  }
  ds.endUpdateBatch();
}


function projectSelected () {
  var clonebutton = document.getElementById("cloneproject");
  var reloadbutton = document.getElementById("reloadproject");

  var idx = gWindow.projlist.currentIndex;
  if (idx < 0) {
    clonebutton.disabled = true;
    reloadbutton.disabled = true;
  }

  clonebutton.disabled = false;
  var firstCol = gWindow.projlist.columns.getColumnAt(0);
  var projuri = gWindow.projlist.view.getCellValue(idx, firstCol);

  if (projuri in gCloneMap)
    reloadbutton.disabled = false;
  else
    reloadbutton.disabled = true;
}


function promptForCloneLocation (title) {
  var fp = getFilePicker();
  var IFilePicker = Components.interfaces.nsIFilePicker;
  fp.init(window, gApp.getText("SaveProject"), IFilePicker.modeSave);
  fp.appendFilter(gApp.getText("CeltxProject"), "*.celtx");
  fp.defaultExtension = "celtx";
  fp.defaultString = title + ".celtx";
  if (fp.show() == IFilePicker.returnCancel)
    return null;
  if (! fp.file.leafName.match(/\.celtx$/))
    fp.file.leafName += ".celtx";
  return fp.file;
}


function cloneProject () {
  var idx = gWindow.projlist.currentIndex;
  if (idx < 0) {
    alert("No project is selected.");
    return;
  }

  var firstCol = gWindow.projlist.columns.getColumnAt(0);
  var secondCol = gWindow.projlist.columns.getColumnAt(1);

  var origuri = gWindow.projlist.view.getCellValue(idx, firstCol);
  var origfile = null;

  // Find the project's window
  var projwin = null;
  var wm = getWindowMediator();
  var windows = wm.getEnumerator("celtx:main");
  while (windows.hasMoreElements()) {
    var win = windows.getNext();
    if (! win.gProject)
      continue;

    var projfile = win.getProjectFile();
    if (! projfile)
      continue;

    if (fileToFileURL(projfile) == origuri) {
      projwin = win;
      origfile = projfile;
      break;
    }
  }

  if (! projwin) {
    alert("The selected project is no longer open.");
    return;
  }

  var clonefile = promptForCloneLocation(
    origfile.leafName.replace(/\.celtx$/, "") + " (clone)");
  if (! clonefile)
    return;

  origfile.copyTo(clonefile.parent, clonefile.leafName);
  var cloneuri = fileToFileURL(clonefile);

  gWindow.projlist.view.setCellValue(idx, secondCol, cloneuri);
  gWindow.projlist.view.setCellText(idx, secondCol,
    clonefile.leafName.replace(/\.celtx$/, ""));
  gCloneMap[origuri] = cloneuri;

  var clonewin = window.openDialog(Cx.CONTENT_PATH, "", Cx.NEW_WINDOW_FLAGS,
    cloneuri);
}


function reloadProject () {
  var idx = gWindow.projlist.currentIndex;
  if (idx < 0) {
    alert("No project is selected.");
    return;
  }

  var firstCol = gWindow.projlist.columns.getColumnAt(0);
  var secondCol = gWindow.projlist.columns.getColumnAt(1);

  var origuri = gWindow.projlist.view.getCellValue(idx, firstCol);
  var cloneuri = gWindow.projlist.view.getCellValue(idx, secondCol);

  // Find the original and cloned project windows
  var projwin = null;
  var clonewin = null;
  var wm = getWindowMediator();
  var windows = wm.getEnumerator("celtx:main");
  while (windows.hasMoreElements()) {
    var win = windows.getNext();
    if (! win.gProject)
      continue;

    var projfile = win.getProjectFile();
    if (! projfile)
      continue;

    var projuri = fileToFileURL(projfile);
    if (projuri == origuri)
      projwin = win;
    else if (projuri == cloneuri)
      clonewin = win;

    if (projwin && clonewin)
      break;
  }

  if (! projwin) {
    alert("The source project window is no longer open.");
    return;
  }

  if (! clonewin) {
    alert("The cloned project window is no longer open.");
    return;
  }

  // Step 1: Lock the original project
  // Step 2: Save the cloned project
  // Step 3: Replace the contents of original project folder with the clone
  // Step 4: Reload the original project
  // Step 5: Unlock the original project
  // Step 6: Partray!!
}


function reloadSelectedTab () {
  var idx = gWindow.tablist.currentIndex;
  if (idx < 0) {
    alert("No item is selected.");
    return;
  }

  var firstCol = gWindow.tablist.columns.getColumnAt(0);
  var secondCol = gWindow.tablist.columns.getColumnAt(1);

  var origuri = gWindow.tablist.view.getCellValue(idx, firstCol);
  var cloneuri = gWindow.tablist.view.getCellValue(idx, secondCol);

  var frame = gWindow.projwindow.gFrameLoader.frameForDocument(origuri);
  if (! frame) {
    alert("Oops, that tab is no longer open.");
    return;
  }

  var rdfsvc = getRDFService();
  var origres = rdfsvc.GetResource(origuri);
  var cloneres = rdfsvc.GetResource(cloneuri);

  var origfile = gWindow.projwindow.gProject.localFileFor(origres);
  var clonefile = gWindow.projwindow.gProject.localFileFor(cloneres);

  try {
    origfile.remove(false);
  }
  catch (ex) {
    dump("*** origfile.remove: " + ex + "\n");
  }

  try {
    clonefile.copyTo(origfile.parent, origfile.leafName);
  }
  catch (ex) {
    dump("*** clonefile.copyTo: " + ex + "\n");
  }

  try {
    frame.controller.reload();
  }
  catch (ex) {
    dump("*** reloadSelectedTab: " + ex + "\n");
    alert("Failed to reload: " + ex);
  }
}

function cloneSelectedTab () {
  var idx = gWindow.tablist.currentIndex;
  if (idx < 0) {
    alert("No item is selected.");
    return;
  }

  var firstCol = gWindow.tablist.columns.getColumnAt(0);
  var secondCol = gWindow.tablist.columns.getColumnAt(1);

  var origuri = gWindow.tablist.view.getCellValue(idx, firstCol);

  gWindow.projwindow.selectAndShowDocument(origuri);
  var cloneres = gWindow.projwindow.cmdCopyDocument();
  gWindow.tablist.view.setCellValue(idx, secondCol, cloneres.Value);

  // Give it a cloney sounding title
  var title = gWindow.tablist.view.getCellText(idx, firstCol) + " (cloned)";
  var ds = gWindow.projwindow.gProject.ds;
  var titlearc = getRDFService().GetResource(Cx.NS_DC + "title");
  ds.beginUpdateBatch();
  setRDFString(ds, cloneres, titlearc, title);
  ds.endUpdateBatch();
  gWindow.tablist.view.setCellText(idx, secondCol, title);

  gCloneMap[origuri] = cloneres.Value;

  // Now update the button
  documentSelected();
}

function documentSelected () {
  var reloadbutton = document.getElementById("reloadbutton");
  var lockbutton = document.getElementById("lockdocumentbutton");
  var saveorigbutton = document.getElementById("saveorigbutton");
  var saveclonebutton = document.getElementById("saveclonebutton");

  var idx = gWindow.tablist.currentIndex;
  if (idx < 0) {
    reloadbutton.label = "Reload";
    reloadbutton.disabled = true;
    lockbutton.label = "Lock";
    lockbutton.disabled = true;
    saveorigbutton.disabled = true;
    saveclonebutton.disabled = true;
  }

  var firstCol = gWindow.tablist.columns.getColumnAt(0);
  var secondCol = gWindow.tablist.columns.getColumnAt(1);

  var origuri = gWindow.tablist.view.getCellValue(idx, firstCol);

  if (origuri in gCloneMap) {
    reloadbutton.label = "Reload";
    reloadbutton.setAttribute("oncommand", "reloadSelectedTab();");
    saveclonebutton.disabled = false;
  }
  else {
    reloadbutton.label = "Clone";
    reloadbutton.setAttribute("oncommand", "cloneSelectedTab();");
    saveclonebutton.disabled = true;
  }
  saveorigbutton.disabled = false;
  reloadbutton.disabled = false;

  var frame = gWindow.projwindow.gFrameLoader.frameForDocument(origuri);
  if (! frame) {
    lockbutton.label = "Lock";
    lockbutton.disabled = true;
  }
  else {
    if (frame.controller.locked) {
      lockbutton.label = "Unlock";
      lockbutton.setAttribute("oncommand", "unlockSelectedTab();");
    }
    else {
      lockbutton.label = "Lock";
      lockbutton.setAttribute("oncommand", "lockSelectedTab();");
    }
    lockbutton.disabled = false;
  }
}

function lockSelectedTab () {
  setSelectedTabLockState(true);
}

function unlockSelectedTab () {
  setSelectedTabLockState(false);
}

function setSelectedTabLockState (val) {
  var idx = gWindow.tablist.currentIndex;
  if (idx < 0) {
    alert("Oops, that tab is no longer open.");
    return;
  }

  var firstCol = gWindow.tablist.columns.getColumnAt(0);
  var origuri = gWindow.tablist.view.getCellValue(idx, firstCol);
  var frame = gWindow.projwindow.gFrameLoader.frameForDocument(origuri);
  if (! frame) {
    alert("Oops, that tab is no longer open.");
    return;
  }

  if (val)
    frame.controller.lock();
  else
    frame.controller.unlock();

  documentSelected();
}

function saveOriginalDocument () {
  var idx = gWindow.tablist.currentIndex;
  if (idx < 0) {
    alert("No item is selected.");
    return;
  }

  var firstCol = gWindow.tablist.columns.getColumnAt(0);
  var origuri = gWindow.tablist.view.getCellValue(idx, firstCol);

  var frame = gWindow.projwindow.gFrameLoader.frameForDocument(origuri);
  if (! frame) {
    alert("Oops, that tab is no longer open.");
    return;
  }

  try {
    frame.controller.save();
  }
  catch (ex) {
    dump("*** saveOriginalDocument: " + ex + "\n");
    alert("Failed to save: " + ex);
  }
}

function saveClonedDocument () {
  var idx = gWindow.tablist.currentIndex;
  if (idx < 0) {
    alert("No item is selected.");
    return;
  }

  var secondCol = gWindow.tablist.columns.getColumnAt(1);
  var cloneuri = gWindow.tablist.view.getCellValue(idx, secondCol);

  var frame = gWindow.projwindow.gFrameLoader.frameForDocument(cloneuri);
  if (! frame) {
    alert("Oops, that tab is no longer open.");
    return;
  }

  try {
    frame.controller.save();
  }
  catch (ex) {
    dump("*** saveClonedDocument: " + ex + "\n");
    alert("Failed to save: " + ex);
  }
}


function exportJSONTree () {
  try {
    var fp = getFilePicker();
    var IFilePicker = Components.interfaces.nsIFilePicker;
    fp.init(window, "Save JSON Tree", IFilePicker.modeSave);
    fp.appendFilter("JSON Object", "*.js");
    fp.defaultExtension = "js";
    fp.defaultString = "JSONTree.js";

    if (fp.show() == IFilePicker.returnCancel)
      return;
    if (! fp.file.leafName.match(/\.js$/))
      fp.file.leafName += ".js";

    var ds = gWindow.projwindow.gProject.ds;
    var projtree = CreateProjectTree(ds);
    var jsonstr = JSON.stringify(projtree);
    writeFile("var json = " + jsonstr + ";\n", fp.file);
  }
  catch (ex) {
    celtxBugAlert(ex, Components.stack, ex);
  }
}
