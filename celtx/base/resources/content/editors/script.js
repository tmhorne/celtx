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

var gWindow = {
  inCardView: false,
  inPrintPreview: false
};


var gController = new MultiController;


gController.QueryInterface = function (iid) {
  if (iid.equals(Components.interfaces.nsISupports) ||
      iid.equals(Components.interfaces.nsISupportsWeakReference) ||
      iid.equals(Components.interfaces.nsIController) ||
      iid.equals(Components.interfaces.nsIObserver) ||
      iid.equals(Components.interfaces.nsIDOMEventListener) ||
      iid.equals(Components.interfaces.nsIClipboardDragDropHooks))
    return this;
  else
    throw Components.results.NS_NOINTERFACE;
};


gController._controllers = [
  gTitleController,
  gCastController,
  gScriptController,
  gCardController,
  gReportController,
  gPDFController
];


gController._activeController = gScriptController;


gController.commands = {
  "cmd-edit-title-page": 1,
  "cmd-export-script": 1,
  "cmd-find-characters": 1,
  "cmd-generate-report": 1,
  "cmd-import-script": 1,
  "cmd-schedule-script": 1,
  "cmd-script-format": 1,
  "cmd-toggle-pagination": 1,
  "cmd-toggle-sidebar": 1,
  "cmd-toggle-breakdown": 1,
  "cmd-copy-as-script": 1,
  "cmd-copy-as-theatre": 1,
  "cmd-copy-as-av": 1,
  "cmd-copy-as-radio": 1,
  "cmd-copy-as-comic": 1,
  "cmd-copy-as-storyboard": 1,
  "cmd-lock-script": 1,
  "cmd-create-revision": 1,
  "cmd-manage-revisions": 1,
  "cmd-toggle-revision-marks": 1,
  "cmd-clear-revision-marks": 1,
  "cmd-show-scene-numbers": 1,
  "cmd-edit-scene-numbers": 1,
  "cmd-omit-scene": 1,
  "cmd-reset-locking": 1
};


gController.isCommandEnabled = function (cmd) {
  if (gWindow.inPrintPreview)
    return false;

  var rdfsvc = getRDFService();
  var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
  var doctype = { Value: null };
  if (this.docres) {
    doctype = this.project.ds.GetTarget(this.docres, doctypearc, true);
    doctype = doctype.QueryInterface(Components.interfaces.nsIRDFResource);
  }

  switch (cmd) {
    case "cmd-schedule-script":
      return true;
    case "cmd-copy-as-script":
      return doctype.Value != Cx.NS_CX + "ScriptDocument";
    case "cmd-copy-as-theatre":
      return doctype.Value != Cx.NS_CX + "TheatreDocument";
    case "cmd-copy-as-av":
      return doctype.Value != Cx.NS_CX + "AVDocument";
    case "cmd-copy-as-radio":
      return doctype.Value != Cx.NS_CX + "RadioDocument";
    case "cmd-copy-as-comic":
      return doctype.Value != Cx.NS_CX + "ComicDocument";
    case "cmd-copy-as-storyboard":
      return true;
    default:
      return this._activeController.supportsCommand(cmd) &&
             this._activeController.isCommandEnabled(cmd);
  }
};


gController.doCommand = function (cmd) {
  var rdfsvc = getRDFService();
  switch (cmd) {
    case "cmd-schedule-script":
      this.cmdScheduleScript();
      break;
    case "cmd-copy-as-script":
      cmdCopyDocumentAs(rdfsvc.GetResource(Cx.NS_CX + "ScriptDocument"));
      break;
    case "cmd-copy-as-theatre":
      cmdCopyDocumentAs(rdfsvc.GetResource(Cx.NS_CX + "TheatreDocument"));
      break;
    case "cmd-copy-as-av":
      cmdCopyDocumentAs(rdfsvc.GetResource(Cx.NS_CX + "AVDocument"));
      break;
    case "cmd-copy-as-radio":
      cmdCopyDocumentAs(rdfsvc.GetResource(Cx.NS_CX + "RadioDocument"));
      break;
    case "cmd-copy-as-comic":
      cmdCopyDocumentAs(rdfsvc.GetResource(Cx.NS_CX + "ComicDocument"));
      break;
    case "cmd-copy-as-storyboard":
      cmdCopyDocumentAs(rdfsvc.GetResource(Cx.NS_CX + "StoryboardDocument2"));
      break;
    default:
      this._activeController.doCommand(cmd);
  }
};


gController.onScriptLoad = function () {
  for (var i = 0; i < this._controllers.length; ++i) {
    if ("onScriptLoad" in this._controllers[i]) {
      try {
        this._controllers[i].onScriptLoad();
      }
      catch (ex) {
        dump("*** onScriptLoad: " + ex + "\n");
      }
    }
  }
  this.updateCommands();

  if (this.project.standalone && this.project.scriptURI == this.docres.Value) {
    document.getElementById("scriptOnlyMessage").collapsed = false;
    getObserverService().addObserver(this, "celtx:project-saved", false);
    this.observingSaves = true;
  }
};


gController.observe = function (subject, topic, data) {
  if (topic == "celtx:project-saved" && ! this.project.standalone) {
    hideScriptOnlyMessage();
    getObserverService().removeObserver(this, "celtx:project-saved");
    this.observingSaves = false;
  }
};


gController.close = function () {
  try {
    if (this.observingSaves) {
      getObserverService().removeObserver(this, "celtx:project-saved");
      this.observingSaves = false;
    }
  }
  catch (ex) {
    dump("*** gController.close: " + ex + "\n");
  }

  if (this._focused) {
    dump("*** receiving a close event without blurring…\n");
    this.blur();
  }
  for (var i = 0; i < this._controllers.length; ++i) {
    try {
      this._controllers[i].close();
    }
    catch (ex) {
      dump("*** MultiController.close: " + ex + "\n");
    }
  }
  window.controllers.removeController(this);
};


function hideScriptOnlyMessage () {
  document.getElementById("scriptOnlyMessage").collapsed = true;
}


function showScriptOnlyFAQ () {
  top.gApp.openBrowser("https://www.celtx.com/faq.html#scriptOnly");
}


gController.cmdScheduleScript = function () {
  this.save();
  var rdfsvc = getRDFService();

  // Get the localized name of the Schedule document
  var dtds = rdfsvc.GetDataSourceBlocking(Cx.CONTENT_PATH + "doctypes.rdf");
  var typeres = rdfsvc.GetResource(Cx.NS_CX + "ScheduleDocument");
  var schedname = getRDFString(dtds, typeres,
    rdfsvc.GetResource(Cx.NS_DC + "title"));
  if (! schedname || schedname == "") {
    dump("*** cmdScheduleScript: Failed to extract Schedule document name\n");
    schedname = "Schedule";
  }

  var title = this.project.model.target(RES(this.docres.Value),
    PROP("dc:title")).value;
  title = schedname + " (" + title + ")";

  var docres = null;
  this.project.ds.beginUpdateBatch();
  try {
    var location = top.getSelectedDocumentFolder();
    docres = this.project.createDocument(title, typeres, location,
      this.docres);
  }
  catch (ex) {
    celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
  }
  this.project.ds.endUpdateBatch();

  // Make sure the item is visible, and select it
  try {
    if (top.makeTreeResourceVisible(docres, top.gWindow.documentTree)) {
      var idx = top.gWindow.documentTree.builder.getIndexOfResource(docres);
      if (idx >= 0)
        top.gWindow.documentTree.view.selection.select(idx);
    }
  }
  catch (ex) {
    dump("*** cmdScheduleScript: " + ex + "\n");
  }

  top.openDocument(docres);
};

gController.load = function () {
  for (var i = 0; i < this._controllers.length; ++i) {
    try {
      this._controllers[i].loaded();
    }
    catch (ex) {
      dump("*** this._controllers[" + i + "].loaded: " + ex + "\n");
    }
  }

  window.controllers.appendController(gController);
};


function loaded () {
  gController.load();
}


// Since menuitems are imported into the top-level document, we can't just
// check the ones in the current document, we need to pass it up to the top.
function setMenuChecked (menuid, checked) {
  var menuitem = top.document.getElementById(menuid);
  if (! menuitem)
    return;
  if (checked)
    menuitem.setAttribute("checked", true);
  else
    menuitem.removeAttribute("checked");
}


function getBrowser () {
  if ("browser" in gController._activeController)
    return gController._activeController.browser;
  return null;
}


function getPPBrowser () {
  return getBrowser();
}

function getNavToolbox () {
  if ("navtoolbox" in gController._activeController)
    return gController._activeController.navtoolbox;
  return getPPBrowser();
}

function getWebNavigation () {
  var browser = getBrowser();
  return browser ? browser.webNavigation : null;
}


function getController () {
  return gController;
}


function getMenuPopup () {
  return document.getElementById("script-popup");
}


function setOutlineView (view) {
  gController.outlineView = view;
}


function viewTabSelected (event) {
  var cardname = event.target.getAttribute("value");
  if (! cardname)
    return;
  var card = cardname == "scratchcard" ? document.getElementById("scriptcard")
    : document.getElementById(cardname);
  if (! card)
    return;
  var deck = document.getElementById("cardsdeck");
  var oldcardname = deck.selectedPanel.id;
  if (cardname != "scriptcard" && oldcardname == cardname)
    return;
  gController._activeController.blur();

  switch (cardname) {
    case "scriptcard":
      gController._activeController = gScriptController;
      gScriptController.hideScratchpad();
      break;
    case "scratchcard":
      gController._activeController = gScriptController;
      gScriptController.showScratchpad();
      break;
    case "indexcard":
      gController._activeController = gCardController;   break;
    case "titlecard":
      gController._activeController = gTitleController;  break;
    case "castcard":
      gController._activeController = gCastController;   break;
    case "reportcard":
      gController._activeController = gReportController; break;
    case "pdfcard":
      gController._activeController = gPDFController;    break;
  }
  deck.selectedPanel = card;
  gController._activeController.focus();
  gController.updateCommands();
  gController.outlineView.updateTreeCommands();
}


// This is essentially duplicated from celtx.js, with some modifications


function cmdCopyDocument () {
  var docres = gController.docres;
  var project = gController.project;
  gController.save();

  var rdfsvc = getRDFService();
  var cu = getRDFContainerUtils();
  var copy = null;
  project.ds.beginUpdateBatch();
  try {
    var location = new RDFSeq(project.ds, top.getSelectedDocumentFolder());
    // getSelectedDocumentFolder will return the folder itself if a
    // folder is selected, so we really want the parent folder
    if (cu.IsSeq(project.ds, docres)) {
      var parentidx = treeview.getParentIndex(index);
      if (parentidx < 0)
        throw "no parent for folder copy";
      location = new RDFSeq(project.ds,
        treeview.getResourceAtIndex(parentidx));
    }
    copy = top.copyDocument(docres, project, project, top.gController.ruleds);
    location.insert(copy, location.indexOf(docres) + 1);
    setTimeout(function () {  top.selectAndShowDocument(copy.Value) }, 0);
  }
  catch (ex) {
    dump("*** cmdCopyDocument: " + ex + "\n");
    throw ex;
  }
  finally {
    project.ds.endUpdateBatch();

    project.isModified = true;
  }

  return copy;
}


// This is essentially duplicated from celtx.js, with some modifications
function cmdCopyDocumentAs (doctype) {
  var IRes = Components.interfaces.nsIRDFResource;
  var rdfsvc = getRDFService();
  var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

  var docds = rdfsvc.GetDataSourceBlocking(Cx.DOCTYPES_URL);
  var doctitle = getRDFString(docds, doctype, titlearc);

  top.selectAndShowDocument(gController.docres.Value);

  var project = gController.project;

  // Converting from one script type to another leverages cmdCopyDocument
  if (doctype.Value != Cx.NS_CX + "StoryboardDocument2") {
    project.ds.beginUpdateBatch();
    try {
      var docres = cmdCopyDocument();
      var oldtype = project.ds.GetTarget(docres, doctypearc, true);
      project.ds.Change(docres, doctypearc, oldtype, doctype);
      var convertArc = rdfsvc.GetResource(Cx.NS_CX + "needsConversion");
      setRDFString(project.ds, docres, convertArc, "true");
      setRDFString(project.ds, docres, titlearc, doctitle);
      setTimeout(function () {
        top.selectAndShowDocument(docres.Value);
        top.gFrameLoader.loadDocument(docres);
      }, 0);
    }
    catch (ex) {
      celtxBugAlert(gApp.getText("CopyDocumentFailed"), Components.stack, ex);
    }
    project.ds.endUpdateBatch();

    return;
  }

  // Converting to Storyboard is a whole other story. We need to make an
  // XML document from scratch, based on the script's RDF
  project.ds.beginUpdateBatch();
  try {
    gController.save();

    var srcres = gController.docres;

    var location = top.getSelectedDocumentFolder();
    var docres = project.createDocument(doctitle, doctype, location);

    // Make a storyboard XML file
    var storyboard = <storyboard title={doctitle}/>;
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
    var scenes = project.ds.GetTarget(srcres, scenesarc, true);
    scenes = new RDFSeq(project.ds, scenes.QueryInterface(IRes));
    for (var i = 0; i < scenes.length; ++i) {
      var sceneres = scenes.get(i).QueryInterface(IRes);
      var scenetitle = getRDFString(project.ds, sceneres, titlearc);
      storyboard.appendChild(
        <sequence title={scenetitle} source={sceneres.Value}/>
      );
    }
    var dstfile = project.projectFolder;
    dstfile.append("storyboard.xml");
    dstfile.createUnique(0, 0644 & dstfile.parent.permissions);
    var xmlstr = "<?xml version='1.0' encoding='UTF-8'?>\n\n"
      + storyboard.toXMLString();
    writeFile(xmlstr, dstfile);

    project.addFileToDocument(dstfile, docres);

    setTimeout(function () {
      top.selectAndShowDocument(docres.Value);
      top.gFrameLoader.loadDocument(docres);
    }, 0);
  }
  catch (ex) {
    celtxBugAlert(gApp.getText("CopyDocumentFailed"), Components.stack, ex);
  }
  project.ds.endUpdateBatch();

  project.isModified = true;
}
